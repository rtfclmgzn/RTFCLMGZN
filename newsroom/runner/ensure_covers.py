#!/usr/bin/env python3
"""Self-healing cover gate: no published article stays coverless. Ever.

WHY THIS EXISTS (2026-08-13). The breaking-scan published "DeepSeek ships
V4-Pro to general availability" with "image": null, and the homepage hero
rendered as a blank violet rectangle for hours. The workflows DID have a cover
gate — verify_covers.py check, running after the agent — but the agent pushes
mid-run, so by the time the gate went red the coverless article was already
live. A gate that can only report a failure that already shipped is an alarm,
not a gate.

This script is the missing half: it REPAIRS instead of reporting. CI runs
`--fix` after every agent run and commits whatever it heals, so the set of
published articles with no cover is empty within one scan of appearing:

  1. Parse web/data/newsroom-articles.js (the store every CI publisher writes).
     An article is coverless when "image" is null/"" OR names a file that does
     not exist in the checkout — the second test assumes a FULL checkout, which
     CI and the real repo both are.
  2. For each, SYNTHESIZE a branded cover deterministically with Pillow — dark
     canvas, violet glow field, the RTFC glyph — seeded from the article id, so
     every cover is unique (the 90-day no-reuse rule is never violated) and a
     re-run produces identical output (idempotent; no commit churn).
  3. Write the cover jpg + the 4:5 Instagram crop, patch the article's "image"
     field in place with a one-line surgical edit — the 1.3MB store is never
     re-serialized, so the diff is exactly one line per healed article.

The synthesized cover is deliberately a FALLBACK, not the ambition: the real
pipeline still generates editorial art, and any later cycle can replace a
synthesized cover by writing a better file to the same path. The invariant this
buys is narrow and absolute: a reader never sees the blank-gradient hero again.

Exit codes: 0 = nothing missing, or everything missing was fixed.
            1 = check mode (no --fix) and at least one article is coverless.
            2 = a fix was attempted and failed (missing glyph, bad store).
"""

from __future__ import annotations

import hashlib
import io
import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
WEB = ROOT / "web"
STORE = WEB / "data" / "newsroom-articles.js"
GLYPH = WEB / "assets" / "brand" / "rtfc-glyph-512.png"

BG_TOP = (13, 8, 22)
BG_BOT = (4, 3, 8)
VIOLET = (96, 24, 240)      # #6018f0 — the glyph's own violet
TEAL = (34, 210, 190)
SECTION_HUES = {            # a per-section second glow so sections differ
    "Frontier": (140, 90, 255), "Markets": (255, 90, 140),
    "Products": (255, 130, 60), "Compute": (60, 170, 255),
    "Robotics": (60, 255, 170), "Research": (200, 120, 255),
    "Policy": (255, 200, 80), "Culture": (255, 110, 200),
    "Health": (120, 235, 160), "Ethics": (235, 200, 255),
}

ASSIGN = re.compile(r"window\.[A-Za-z_0-9]+\s*=\s*(?=\[)")


def load_store() -> tuple[str, list[dict]]:
    text = io.open(STORE, encoding="utf-8", newline="").read()
    m = list(ASSIGN.finditer(text))[-1]
    arr = json.loads(text[m.end(): text.rindex("]") + 1])
    return text, arr


def _seed(article_id: str) -> list[int]:
    return list(hashlib.md5(article_id.encode()).digest())


def synthesize(article_id: str, section: str, out_jpg: Path, out_ig: Path) -> None:
    from PIL import Image, ImageDraw, ImageFilter

    W, H = 1536, 864
    s = _seed(article_id)

    im = Image.new("RGB", (W, H))
    px = im.load()
    for y in range(H):
        t = y / H
        row = tuple(int(BG_TOP[i] + (BG_BOT[i] - BG_TOP[i]) * t) for i in range(3))
        for x in range(W):
            px[x, y] = row
    glow = Image.new("RGB", (W, H), (0, 0, 0))
    gd = ImageDraw.Draw(glow)
    accent = SECTION_HUES.get(section, TEAL)
    for k in range(3):  # glow orbs placed by the id hash → unique per article
        cx = int((s[k * 3] / 255) * W)
        cy = int((s[k * 3 + 1] / 255) * H)
        r = 220 + int((s[k * 3 + 2] / 255) * 260)
        col = [VIOLET, accent, VIOLET][k]
        gd.ellipse([cx - r, cy - r, cx + r, cy + r],
                   fill=tuple(int(c * 0.55) for c in col))
    glow = glow.filter(ImageFilter.GaussianBlur(160))
    im = Image.blend(im, Image.blend(im, glow, 0.9), 0.75)

    deco = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dd = ImageDraw.Draw(deco)
    ang = (s[9] / 255) * math.pi
    dcx, dcy = int(W * 0.72), int(H * 0.42)
    dr = 190 + int((s[10] / 255) * 90)
    pts = [(dcx + dr * math.cos(ang + i * math.pi / 2),
            dcy + dr * math.sin(ang + i * math.pi / 2) * 0.62) for i in range(4)]
    dd.polygon(pts, outline=(*VIOLET, 200))
    dd.polygon([(x + 8, y + 5) for x, y in pts], outline=(*accent, 90))
    im = Image.alpha_composite(im.convert("RGBA"), deco).convert("RGB")

    if not GLYPH.is_file():
        raise RuntimeError(f"brand glyph missing at {GLYPH}")
    g = Image.open(GLYPH).convert("RGBA").resize((300, 300), Image.LANCZOS)
    gx, gy = int(W * 0.28) - 150, H // 2 - 150
    halo = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo)
    hd.ellipse([gx - 90, gy - 90, gx + 390, gy + 390], fill=(*VIOLET, 70))
    halo = halo.filter(ImageFilter.GaussianBlur(70))
    im = Image.alpha_composite(im.convert("RGBA"), halo).convert("RGB")
    im.paste(g, (gx, gy), g)

    out_jpg.parent.mkdir(parents=True, exist_ok=True)
    im.save(out_jpg, quality=88, optimize=True)
    cw = int(H * 0.8)
    ig = im.crop(((W - cw) // 2, 0, (W + cw) // 2, H)).resize(
        (1080, 1350), Image.LANCZOS)
    ig.save(out_ig, quality=88, optimize=True)


def coverless(arr: list[dict]) -> list[dict]:
    out = []
    for a in arr:
        img = a.get("image")
        if not img:
            out.append(a)
            continue
        if not (WEB / str(img).split("?")[0]).is_file():
            out.append(a)
    return out


def run(fix: bool) -> int:
    if not STORE.is_file():
        print(f"ensure_covers: store missing: {STORE}")
        return 2
    text, arr = load_store()
    missing = coverless(arr)
    if not missing:
        print(f"ensure_covers: all {len(arr)} published articles have covers on disk.")
        return 0
    for a in missing:
        print(f"ensure_covers: MISSING cover — {a.get('id')} ({a.get('section') or 'no section'})")
    if not fix:
        return 1

    for a in missing:
        aid = str(a.get("id"))
        rel = f"assets/img/newsroom/{aid}.jpg"
        if (WEB / rel).is_file():
            # A real cover already sits at the canonical path — the store just
            # never got wired to it (e.g. art landed but the "image" write was
            # lost). Wiring beats synthesizing: never overwrite real art.
            print(f"ensure_covers: found existing art for {aid}, wiring it")
        else:
            try:
                synthesize(aid, str(a.get("section") or ""), WEB / rel,
                           WEB / f"assets/img/newsroom/{aid}-ig.jpg")
            except Exception as exc:                    # noqa: BLE001
                print(f"ensure_covers: FAILED to synthesize for {aid}: {exc}")
                return 2
        # Surgical one-line edit. "image" sits AFTER "id" in some records and
        # BEFORE it in others (key order is whatever the writing agent used),
        # so try both directions, anchored to this article id, closest first.
        fwd = re.compile(r'("id":\s*"' + re.escape(aid) +
                         r'"[\s\S]{0,6000}?"image":\s*)(null|"[^"]*")')
        rev = re.compile(r'("image":\s*)(null|"[^"]*")([\s\S]{0,6000}?"id":\s*"' +
                         re.escape(aid) + r'")')
        if fwd.search(text):
            text = fwd.sub(lambda m: m.group(1) + json.dumps(rel), text, count=1)
        elif rev.search(text):
            text = rev.sub(lambda m: m.group(1) + json.dumps(rel) + m.group(3),
                           text, count=1)
        else:
            print(f"ensure_covers: could not locate the image field for {aid}")
            return 2
        print(f"ensure_covers: synthesized + wired {rel}")

    io.open(STORE, "w", encoding="utf-8", newline="").write(text)
    # prove the store still parses before letting CI commit it
    _, arr2 = load_store()
    still = [a.get("id") for a in coverless(arr2)]
    if still:
        print(f"ensure_covers: STILL coverless after fix: {still}")
        return 2
    print(f"ensure_covers: healed {len(missing)} article(s); store re-parses clean.")
    return 0


if __name__ == "__main__":
    sys.exit(run(fix="--fix" in sys.argv))
