#!/usr/bin/env python3
"""OG image (1200x630) from the FINAL hero frame (AI-generated placeholder render, stage 04).
Renders frame 120 (same 1.05 push-in as the hero) at 2560x1440 from the super-resolved stage 04
(design/hero-stages/hd-5120/stage-04-finish.webp, Lanczos-downscaled to 2560x1440, which is what hd-2560/ holds) via
the designer's make_frames.py render(), crops 2560x1344 (keeps the pool and
roofline; same framing as the old 1280x672 crop at y=30), downsizes to 1200x630, writes public/og-image.jpg (q85).
Earlier versions rendered from the 1280x720 source, so the 1.05 zoom left only ~1219 px of real detail for 1200."""
import os, types
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STAGES = os.path.join(ROOT, "design", "hero-stages")
src = open(os.path.join(STAGES, "make_frames.py")).read().split('if __name__ == "__main__":')[0]
src = src.replace("S = os.path.dirname(os.path.abspath(__file__))", f"S = {STAGES!r}")
mf = types.ModuleType("make_frames"); exec(src, mf.__dict__)
s4 = Image.open(os.path.join(STAGES, "hd-5120", "stage-04-finish.webp")).convert("RGB").resize((2560, 1440), Image.LANCZOS)
im = mf.render(1.0, 2560, 1440, ks=[s4] * 4)  # progress 1.0 only uses the stage-04 key
top = 60
og = im.crop((0, top, 2560, top + 1344)).resize((1200, 630), Image.LANCZOS)
out = os.path.join(ROOT, "public", "og-image.jpg")
og.save(out, "JPEG", quality=85, optimize=True, progressive=True)
print("og-image.jpg", og.size, os.path.getsize(out) // 1024, "KB")
