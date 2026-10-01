#!/usr/bin/env python3
"""OG image (1200x630) from the FINAL hero frame (AI-generated placeholder render, stage 04).
Renders frame 120 losslessly via the designer's make_frames.py render(), crops 1280x672 (keeps the
pool and roofline), resizes to 1200x630, writes public/og-image.jpg."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from reencode_frames import renderer  # noqa: E402
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
im = renderer()(1.0, 1280, 720)
top = 30
og = im.crop((0, top, 1280, top + 672)).resize((1200, 630), Image.LANCZOS)
og.save(os.path.join(ROOT, "public", "og-image.jpg"), "JPEG", quality=86, optimize=True, progressive=True)
print("og-image.jpg", og.size, os.path.getsize(os.path.join(ROOT, "public", "og-image.jpg")) // 1024, "KB")
