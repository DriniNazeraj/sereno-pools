#!/usr/bin/env python3
"""Re-encode the designer's hero frames (AI-generated PLACEHOLDER renders, not real projects)
to the size budget (desktop <= 60 KB/frame).

Source (default, best quality): the designer's lossless stage renders in
/workspace/sereno/assets/hero-stages/*.png, rendered in memory with the designer's own
make_frames.py `render()` (same crossfades / push-in / crop as the delivered frames), so the
WebP encoder never has to spend bits on a previous lossy pass. No blur pre-filter: grass keeps
its texture. Fallback (--from-originals): re-encode /workspace/sereno/frames-designer-originals/<set>/.
Picks the highest WebP quality (method 6) that fits the target. Writes public/frames/<set>/.

Usage: python3 scripts/reencode_frames.py desktop 60 [--from-originals]
"""
import io, os, sys, types
from multiprocessing import Pool
from PIL import Image

SET = sys.argv[1] if len(sys.argv) > 1 else "desktop"
TARGET_KB = int(sys.argv[2]) if len(sys.argv) > 2 else 60
FROM_ORIG = "--from-originals" in sys.argv
STAGES = os.environ.get("STAGES_SRC", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "design", "hero-stages"))
ORIG = os.environ.get("FRAMES_SRC", "/workspace/sereno/frames-designer-originals")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DST = os.path.join(ROOT, "public", "frames", SET)
SIZES = {"desktop": (120, 1280, 720), "mobile": (60, 720, 900)}

_render = None
def renderer():
    global _render
    if _render is None:
        src = open(os.path.join(STAGES, "make_frames.py")).read().split('if __name__ == "__main__":')[0]
        src = src.replace("S = os.path.dirname(os.path.abspath(__file__))", f"S = {STAGES!r}")
        mod = types.ModuleType("make_frames"); exec(src, mod.__dict__); _render = mod.render
    return _render

def encode(im, q):
    b = io.BytesIO(); im.save(b, "WEBP", quality=q, method=6); return b.getvalue()

def job(i):
    count, w, h = SIZES[SET]
    name = f"frame_{i + 1:03d}.webp"
    if FROM_ORIG:
        im = Image.open(os.path.join(ORIG, SET, name)).convert("RGB")
    else:
        im = renderer()(i / (count - 1), w, h)
    lo, hi, best = 5, 90, None
    while lo <= hi:  # binary search for the highest quality under budget
        q = (lo + hi) // 2; data = encode(im, q)
        if len(data) <= TARGET_KB * 1024: best = (q, data); lo = q + 1
        else: hi = q - 1
    if best is None: best = (5, encode(im, 5))
    with open(os.path.join(DST, name), "wb") as f: f.write(best[1])
    return name, best[0], len(best[1])

if __name__ == "__main__":
    os.makedirs(DST, exist_ok=True)
    with Pool(os.cpu_count() or 4) as p: res = p.map(job, range(SIZES[SET][0]))
    qs = [q for _, q, _ in res]; sz = [s for *_, s in res]
    print(f"{SET}: {len(res)} frames, total {sum(sz)/1024:.0f} KB, max {max(sz)/1024:.1f} KB, avg {sum(sz)/len(sz)/1024:.1f} KB, q {min(qs)}-{max(qs)}")
