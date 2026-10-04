"""Builds hero frame sequences from the 4 AI-generated stage images (GENERATED PLACEHOLDERS, not real projects).
Crossfades are centred on the caption boundaries (25/50/75% scroll), plus a slow 1.00->1.05 push-in.

Usage: python3 make_frames.py <out_dir> [set ...]        sets: desktop mobile hd hd2560 (default: desktop mobile)
  desktop/mobile render from the 1280x720 stage PNGs in this folder; hd (1920x1080) and hd2560 (2560x1440) render
  from the super-resolved 2560x1440 sources in hd-2560/ (Real-ESRGAN x4plus + SwinIR-L, see upscale_stages.py). The crop maths is in relative source coordinates, so every
  set has the same motion and framing."""
from PIL import Image
import os, sys
S = os.path.dirname(os.path.abspath(__file__))
NAMES = ["stage-01-start", "stage-02-dig", "stage-03-build", "stage-04-finish"]
def load_keys(sub=""):
    return [Image.open(os.path.join(S, sub, f"{n}.png")).convert("RGB") for n in NAMES]
keys = load_keys()
W0, H0 = keys[0].size
def smooth(x): x = max(0.0, min(1.0, x)); return x*x*(3-2*x)
def mix(p, half=0.07, ks=None):
    ks = ks or keys
    for b in (1, 2, 3):
        c = b / 4
        if p < c - half: return ks[b-1]
        if p <= c + half: return Image.blend(ks[b-1], ks[b], smooth((p - (c - half)) / (2*half)))
    return ks[3]
def render(p, w, h, ks=None):
    ks = ks or keys
    img = mix(p, ks=ks)
    W0, H0 = img.size
    z = 1.0 + 0.05 * p
    ar = w / h
    ch = H0 / z; cw = ch * ar
    if cw > W0 / z: cw = W0 / z; ch = cw / ar
    cx, cy = W0 / 2, H0 * 0.52
    top = min(max(0, cy - ch/2), H0 - ch); left = min(max(0, cx - cw/2), W0 - cw)
    box = (left, top, left + cw, top + ch)
    return img.resize((w, h), Image.LANCZOS, box=box)
# name: (count, w, h, webp quality, source subfolder)
SETS = {
    "desktop": (120, 1280, 720, 58, ""),
    "mobile": (60, 720, 900, 58, ""),
    "hd": (120, 1920, 1080, 50, "hd-2560"),
    "hd2560": (120, 2560, 1440, 50, "hd-2560"),
}
def _job(args):
    name, i = args
    count, w, h, q, sub = SETS[name]
    render(i/(count-1), w, h, _KS[sub]).save(f"{_OUT}/{name}/frame_{i+1:03d}.webp", "WEBP", quality=q, method=6)

if __name__ == "__main__":
    from multiprocessing import Pool
    _OUT = sys.argv[1]
    names = sys.argv[2:] or ["desktop", "mobile"]
    _KS = {sub: load_keys(sub) for sub in {SETS[n][4] for n in names}}  # loaded before the fork, shared by workers
    for name in names:
        os.makedirs(f"{_OUT}/{name}", exist_ok=True)
        with Pool(os.cpu_count() or 4) as pool:
            pool.map(_job, [(name, i) for i in range(SETS[name][0])])
        print(name, "done")
