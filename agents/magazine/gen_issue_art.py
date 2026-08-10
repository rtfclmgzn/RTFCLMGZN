#!/usr/bin/env python3
"""RTFCLMGZN — batch art generator for a magazine issue.

Reads a prompts manifest and drives agents/social/gen_image.py (Nano Banana / Gemini,
house style auto-appended) once per image, then chops the two gatefolds into the
-1/-2 halves the reader actually loads.

    uv run --with pillow python agents/magazine/gen_issue_art.py <prompts.json>

The manifest is a JSON array of {"file","ratio","prompt"}. `file` is a bare filename;
output lands in web/assets/img/.

Safe to re-run: an image that already exists on disk is skipped, so a run interrupted
half way resumes where it stopped instead of paying for the first half twice. Pass
--force to regenerate everything anyway.

On finish it writes web/assets/img/_issue-art-manifest.json with the real counts and
the cost at the house per-image rate, which is what the issue's Ledger page prints.
"""
import sys, os, json, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
IMGDIR = os.path.join(ROOT, "web", "assets", "img")
sys.path.insert(0, os.path.join(ROOT, "agents", "social"))

RATE_USD = 0.034          # gemini-3.1-flash-lite-image, per MAGAZINE-STANDARD §5

try:
    import gen_image
except ImportError:
    sys.exit(f"could not import gen_image from {os.path.join(ROOT,'agents','social')}")

try:
    from PIL import Image  # noqa: F401  (gen_image needs it for jpg re-encode)
except ImportError:
    sys.exit("Pillow required — run under: uv run --with pillow python ...")

sys.path.insert(0, HERE)
import fold_chop


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--force" in sys.argv
    if not args:
        sys.exit(__doc__)
    prompts = json.load(open(args[0], encoding="utf-8"))
    os.makedirs(IMGDIR, exist_ok=True)

    made, skipped, failed = [], [], []
    total = len(prompts)
    for i, e in enumerate(prompts, 1):
        out = os.path.join(IMGDIR, e["file"])
        if os.path.exists(out) and not force:
            skipped.append(e["file"])
            print(f"[{i}/{total}] skip (exists)  {e['file']}", flush=True)
            continue
        print(f"[{i}/{total}] generating     {e['file']}  ({e['ratio']})", flush=True)
        try:
            gen_image.generate(gen_image.styled(e["prompt"]), out,
                               e["ratio"], gen_image.DEFAULT_MODEL)
            made.append(e["file"])
        except SystemExit as ex:              # gen_image calls sys.exit on failure
            print(f"    FAILED: {ex}", flush=True)
            failed.append(e["file"])
        except Exception as ex:
            print(f"    FAILED: {ex}", flush=True)
            failed.append(e["file"])
        time.sleep(1)                          # be polite to the API

    # ---- gatefolds: the reader loads <name>-1.jpg / <name>-2.jpg, never the base ----
    print("\nchopping gatefolds", flush=True)
    for base, mode in (("i2-centerfold.jpg", "center"), ("i2-verticalfold.jpg", "vertical")):
        p = os.path.join(IMGDIR, base)
        if os.path.exists(p):
            try:
                fold_chop.chop(p, mode)
            except Exception as ex:
                print(f"    CHOP FAILED {base}: {ex}", flush=True)
                failed.append(base + " (chop)")
        else:
            print(f"    missing {base} — cannot chop", flush=True)
            failed.append(base + " (missing)")

    # the issue ships 55 images; the 2 spare cover concepts are generated but not placed
    placed = [f for f in (made + skipped) if not f.startswith("i2-cover-")]
    manifest = {
        "generated_this_run": len(made),
        "already_present": len(skipped),
        "failed": failed,
        "images_in_issue": len(placed),
        "billable_images": len(made),
        "cost_usd_this_run": round(len(made) * RATE_USD, 2),
        "cost_usd_all_images": round(len(made + skipped) * RATE_USD, 2),
        "rate_usd_per_image": RATE_USD,
    }
    mpath = os.path.join(IMGDIR, "_issue-art-manifest.json")
    json.dump(manifest, open(mpath, "w", encoding="utf-8"), indent=2)

    print("\n" + "=" * 58)
    print(f"generated {len(made)}   skipped {len(skipped)}   failed {len(failed)}")
    print(f"cost this run: ${manifest['cost_usd_this_run']}   "
          f"all images: ${manifest['cost_usd_all_images']}")
    if failed:
        print("FAILED:", ", ".join(failed))
        print("Re-run this same command to retry only the failures.")
    print(f"manifest: {mpath}")
    print("=" * 58)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
