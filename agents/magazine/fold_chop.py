#!/usr/bin/env python3
"""RTFCLMGZN — gatefold chopper.

The magazine reader (spreadPageV3 in web/assets/app.js) does NOT load a gatefold's
base image. It loads two PRE-CUT halves:

    assets/img/<name>-1.jpg   and   assets/img/<name>-2.jpg

each rendered full-bleed on its own normal 3:4 page. This script makes those halves
from the single wide/tall image gen_image.py produced. Without it a gatefold renders
as two broken-image pages — which is exactly what happens if you generate
`i2-centerfold.jpg` and stop there.

Usage:
    uv run --with pillow python agents/magazine/fold_chop.py <image.jpg> center
    uv run --with pillow python agents/magazine/fold_chop.py <image.jpg> vertical

  center   — splits LEFT | RIGHT   (source generated at 3:2)
  vertical — splits TOP  | BOTTOM  (source generated at 9:16)

Why there is a crop step: two 3:4 pages side by side are exactly 3:2, so a centerfold
splits with no crop at all. Stacked, two 3:4 pages are 3:8 — much narrower than the
9:16 the generator can actually produce — so a verticalfold is centre-cropped on the
WIDTH down to 3:8 before splitting. Cropping the width (not the height) is deliberate:
it preserves the whole top-to-bottom progression, which is the entire point of the fold.
"""
import sys, os

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow required — run under: uv run --with pillow python agents/magazine/fold_chop.py ...")

PAGE_W, PAGE_H = 3.0, 4.0          # one magazine page
TARGET = {                          # required source ratio for the joined art
    "center":   (PAGE_W * 2) / PAGE_H,   # 6:4  = 1.5   (3:2)
    "vertical": PAGE_W / (PAGE_H * 2),   # 3:8  = 0.375
}


def center_crop_to(im, ratio):
    """Centre-crop im to exactly `ratio` (w/h), trimming whichever axis is oversized."""
    w, h = im.size
    if abs((w / h) - ratio) < 1e-6:
        return im
    if (w / h) > ratio:                     # too wide -> trim width
        nw = int(round(h * ratio))
        left = (w - nw) // 2
        return im.crop((left, 0, left + nw, h))
    nh = int(round(w / ratio))              # too tall -> trim height
    top = (h - nh) // 2
    return im.crop((0, top, w, top + nh))


def chop(path, mode):
    if mode not in TARGET:
        sys.exit(f"mode must be 'center' or 'vertical', got {mode!r}")
    im = Image.open(path).convert("RGB")
    src_ratio = im.size[0] / im.size[1]
    im = center_crop_to(im, TARGET[mode])
    w, h = im.size

    if mode == "center":
        halves = [im.crop((0, 0, w // 2, h)), im.crop((w // 2, 0, w, h))]
    else:
        halves = [im.crop((0, 0, w, h // 2)), im.crop((0, h // 2, w, h))]

    stem, ext = os.path.splitext(path)
    out = []
    for i, half in enumerate(halves, 1):
        p = f"{stem}-{i}{ext}"
        half.save(p, quality=85, optimize=True)
        out.append((p, half.size, half.size[0] / half.size[1]))

    print(f"{os.path.basename(path)}  source {im.size} (was {src_ratio:.3f}) -> {mode} halves:")
    for p, size, r in out:
        warn = "" if abs(r - 0.75) < 0.01 else f"  !! expected 3:4 (0.750), got {r:.3f}"
        print(f"   {os.path.basename(p)}  {size}  ratio {r:.3f}{warn}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    chop(sys.argv[1], sys.argv[2])
