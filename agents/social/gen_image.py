#!/usr/bin/env python3
"""RTFCLMGZN image generator — Nano Banana (Gemini image models).

Usage:
  python gen_image.py "<prompt>" <output.png|output.jpg> [aspect] [model]

  aspect : optional aspect ratio, e.g. 16:9, 3:4, 3:2, 9:16, 1:1 (default 16:9)
  model  : optional model id (default gemini-3.1-flash-lite-image = Nano Banana 2 Lite,
           ~$0.034/image; auto-falls back to gemini-2.5-flash-image if unavailable)

  The founder-locked HOUSE ART STYLE (cyberpunk/futurist/photoreal; NO old-fashioned/
  magical look) is auto-appended to every prompt — pass a SCENE description only.
  Add `--raw` to bypass the style (rare; you then supply all styling yourself).

If the output path ends in .jpg/.jpeg, the PNG bytes from the API are re-encoded
to JPEG q85 (needs Pillow: run under `uv run --with pillow`). JPEG is the site
standard — ~80% smaller than PNG for this art style. Falls back to writing the
raw PNG bytes (with a warning) if Pillow is unavailable.

Reads the Gemini key from agents/social/.secrets.json. Never prints the key.
"""
import sys, os, json, base64, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
SECRETS = os.path.join(HERE, ".secrets.json")
DEFAULT_MODEL = "gemini-3.1-flash-lite-image"
FALLBACK_MODEL = "gemini-2.5-flash-image"
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent"

# ── HOUSE ART STYLE (founder-locked 2026-07-12) ───────────────────────────────
# Auto-appended to EVERY prompt so no generation can drift. Founder's bar: sleek
# CYBERPUNK / FUTURISTIC with a photoreal edge — like the chip/neon/tech images he
# loved (Primer p8/p17). He rejected the "old-fashioned / Harry-Potter / magical"
# look outright (candles, quills, parchment, floating-book libraries, misty fantasy
# staircases — Primer p25/p30). Pass gen_image a SCENE description only; the style
# is applied here. Use `--raw` to bypass (rare). See MAGAZINE-STANDARD §5 / N-018.
HOUSE_STYLE = ("Cyberpunk-futurist editorial illustration: sleek high-tech science-fiction, "
    "glowing neon circuitry, holographic light and advanced machinery, rendered with near-photorealistic "
    "detail and a cinematic finish. Volumetric violet and indigo lighting, deep ink-black atmosphere, "
    "dramatic rim light, subtle film grain. Modern, premium, forward-looking.")
STYLE_NEGATIVE = ("Absolutely NOT old-fashioned, vintage or antique; NO candles, lanterns, quills, parchment "
    "or scrolls; NO magic, wizardry, spells or glowing runes; NO fantasy, fairy-tale or storybook look; NO "
    "floating books or ornate old libraries; NO medieval or baroque ornament; NO painterly oil-painting fantasy. "
    "No text, letters, numbers, watermark, borders or black letterbox bars — fill the frame edge to edge.")

def styled(prompt):
    return prompt.rstrip(" .") + ". " + HOUSE_STYLE + " " + STYLE_NEGATIVE

def load_key():
    with open(SECRETS, "r", encoding="utf-8") as f:
        data = json.load(f)
    key = (data.get("gemini") or {}).get("api_key")
    if not key:
        sys.exit("No gemini.api_key in .secrets.json")
    return key

def call(model, prompt, aspect, key):
    gen_cfg = {"responseModalities": ["IMAGE"]}
    if aspect:
        gen_cfg["imageConfig"] = {"aspectRatio": aspect}
    body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": gen_cfg
    }).encode("utf-8")
    req = urllib.request.Request(ENDPOINT.format(model), data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("x-goog-api-key", key)
    with urllib.request.urlopen(req, timeout=180) as resp:
        return json.loads(resp.read().decode("utf-8"))

def generate(prompt, out_path, aspect, model):
    key = load_key()
    tried = []
    for m in [model, FALLBACK_MODEL] if model != FALLBACK_MODEL else [model]:
        try:
            payload = call(m, prompt, aspect, key)
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "replace")[:300]
            tried.append("{} -> HTTP {}: {}".format(m, e.code, detail))
            # 404/400 model issues: try fallback; other errors: keep trying fallback too
            continue
        except Exception as e:
            tried.append("{} -> {}".format(m, e))
            continue
        for cand in payload.get("candidates", []):
            for part in (cand.get("content") or {}).get("parts", []):
                inline = part.get("inlineData") or part.get("inline_data")
                if inline and inline.get("data"):
                    raw = base64.b64decode(inline["data"])
                    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
                    if out_path.lower().endswith((".jpg", ".jpeg")):
                        try:
                            import io
                            from PIL import Image
                            Image.open(io.BytesIO(raw)).convert("RGB").save(out_path, quality=85, optimize=True)
                            raw = open(out_path, "rb").read()
                        except ImportError:
                            print("WARN: Pillow unavailable — writing raw PNG bytes to .jpg name; run under `uv run --with pillow`")
                            with open(out_path, "wb") as f:
                                f.write(raw)
                    else:
                        with open(out_path, "wb") as f:
                            f.write(raw)
                    print("OK [{}] {} ({} bytes, {})".format(m, out_path, len(raw), aspect or "default"))
                    return
        tried.append("{} -> no image in response: {}".format(m, json.dumps(payload)[:200]))
    sys.exit("FAILED. Attempts:\n" + "\n".join(tried))

if __name__ == "__main__":
    argv = [a for a in sys.argv[1:] if a != "--raw"]
    raw = "--raw" in sys.argv
    if len(argv) < 2:
        sys.exit(__doc__)
    prompt, out = argv[0], argv[1]
    aspect = argv[2] if len(argv) > 2 else "16:9"
    model = argv[3] if len(argv) > 3 else DEFAULT_MODEL
    generate(prompt if raw else styled(prompt), out, aspect, model)
