"""Nano Banana (Gemini image) generation, gated by the shared newsroom budget.

Reuses the founder-locked house art style and API-call pattern already proven
in agents/social/gen_image.py, but reads its key from the newsroom's own
CredentialVault (consistent with every other provider) and checks/records
against the SAME budget_ledger the article pipeline and Buzz cycle share —
image generation is real spend and must never be a second, unaccounted pool.

Called only when the art library has no fitting, unused-within-90-days image;
the library is free and should be preferred (see publishing.agent.md).
"""

from __future__ import annotations

import base64
import io
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import error as urlerror
from urllib import request as urlrequest

from .budget import BudgetError, BudgetGuard
from .config import load_config
from .repository import AutonomyRepository
from ..core.database import Database
from ..security.vault import CredentialVault

DEFAULT_MODEL = "gemini-3.1-flash-lite-image"
FALLBACK_MODEL = "gemini-2.5-flash-image"
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent"

# Mirrors agents/social/gen_image.py's HOUSE_STYLE / STYLE_NEGATIVE verbatim
# (founder-locked 2026-07-12) -- keep the two in sync if the house look changes.
HOUSE_STYLE = (
    "Cyberpunk-futurist editorial illustration: sleek high-tech science-fiction, "
    "glowing neon circuitry, holographic light and advanced machinery, rendered with near-photorealistic "
    "detail and a cinematic finish. Volumetric violet and indigo lighting, deep ink-black atmosphere, "
    "dramatic rim light, subtle film grain. Modern, premium, forward-looking."
)
STYLE_NEGATIVE = (
    "Absolutely NOT old-fashioned, vintage or antique; NO candles, lanterns, quills, parchment "
    "or scrolls; NO magic, wizardry, spells or glowing runes; NO fantasy, fairy-tale or storybook look; NO "
    "floating books or ornate old libraries; NO medieval or baroque ornament; NO painterly oil-painting fantasy. "
    "No text, letters, numbers, watermark, borders or black letterbox bars — fill the frame edge to edge."
)

# A cushion above Nano Banana Lite's real ~$0.034/image, checked against the
# SAME shared ledger article generation and Buzz use -- one budget, not three.
ESTIMATED_IMAGE_COST_USD = 0.06


class ImageGenerationError(RuntimeError):
    pass


def styled_prompt(scene: str, raw: bool = False) -> str:
    if raw:
        return scene
    return scene.rstrip(" .") + ". " + HOUSE_STYLE + " " + STYLE_NEGATIVE


def _call(model: str, prompt: str, aspect: str | None, api_key: str) -> dict[str, Any]:
    gen_cfg: dict[str, Any] = {"responseModalities": ["IMAGE"]}
    if aspect:
        gen_cfg["imageConfig"] = {"aspectRatio": aspect}
    body = json.dumps({"contents": [{"parts": [{"text": prompt}]}], "generationConfig": gen_cfg}).encode("utf-8")
    req = urlrequest.Request(ENDPOINT.format(model), data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("x-goog-api-key", api_key)
    with urlrequest.urlopen(req, timeout=180) as resp:
        return json.loads(resp.read().decode("utf-8"))


def generate_cover_image(
    repo_root: Path,
    *,
    prompt: str,
    out_path: Path,
    aspect: str = "16:9",
    raw: bool = False,
    model: str = DEFAULT_MODEL,
) -> dict[str, Any]:
    """Generate one cover image, gated by and recorded against the shared budget.

    Raises BudgetError (caught by callers to fall back to a library image) if
    there isn't headroom, and ImageGenerationError on any API/decoding failure.
    """
    config = load_config()
    vault = CredentialVault()
    api_key = vault.get("gemini_api_key")
    if not api_key:
        raise ImageGenerationError("Gemini is not configured (no gemini_api_key in the vault).")

    database = Database(repo_root / "newsroom" / "data" / "newsroom.db")
    repository = AutonomyRepository(database)
    budget = BudgetGuard(repository, config["limits"])
    budget.assert_cycle_allowed(reserve_usd=ESTIMATED_IMAGE_COST_USD)  # raises BudgetError if exhausted

    full_prompt = styled_prompt(prompt, raw=raw)
    started_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    tried: list[str] = []
    raw_bytes: bytes | None = None
    used_model = model
    for candidate_model in ([model, FALLBACK_MODEL] if model != FALLBACK_MODEL else [model]):
        try:
            payload = _call(candidate_model, full_prompt, aspect, api_key)
        except urlerror.HTTPError as exc:
            detail = exc.read().decode("utf-8", "replace")[:300]
            tried.append(f"{candidate_model} -> HTTP {exc.code}: {detail}")
            continue
        except Exception as exc:  # noqa: BLE001 - surfaced in the raised error below
            tried.append(f"{candidate_model} -> {exc}")
            continue
        for candidate in payload.get("candidates", []):
            for part in (candidate.get("content") or {}).get("parts", []):
                inline = part.get("inlineData") or part.get("inline_data")
                if inline and inline.get("data"):
                    raw_bytes = base64.b64decode(inline["data"])
                    used_model = candidate_model
                    break
            if raw_bytes:
                break
        if raw_bytes:
            break
        tried.append(f"{candidate_model} -> no image in response")

    if raw_bytes is None:
        raise ImageGenerationError("Image generation failed. Attempts: " + " | ".join(tried))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    if out_path.suffix.lower() in (".jpg", ".jpeg"):
        try:
            from PIL import Image

            Image.open(io.BytesIO(raw_bytes)).convert("RGB").save(out_path, quality=85, optimize=True)
        except ImportError:
            out_path.write_bytes(raw_bytes)
    else:
        out_path.write_bytes(raw_bytes)

    # Estimated cost (Gemini image responses don't return token usage the same
    # way text calls do) -- recorded into the SAME shared ledger so this run,
    # and every future budget check, sees it.
    repository.record_provider_call(
        cycle_id=None,
        story_id=None,
        checkpoint=None,
        agent_id="image-generate-cli",
        provider="gemini",
        model=used_model,
        request_hash="",
        response_hash="",
        status="succeeded",
        usage={"input_tokens": 0, "output_tokens": 0},
        started_at=started_at,
        finished_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        cost_usd=ESTIMATED_IMAGE_COST_USD,
    )

    return {
        "ok": True,
        "path": str(out_path),
        "bytes": out_path.stat().st_size,
        "model": used_model,
        "cost_usd": ESTIMATED_IMAGE_COST_USD,
    }


__all__ = ["generate_cover_image", "styled_prompt", "ImageGenerationError", "BudgetError"]
