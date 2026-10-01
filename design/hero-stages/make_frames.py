"""Builds hero frame sequences from the 4 AI-generated stage images (GENERATED PLACEHOLDERS, not real projects).
Crossfades are centred on the caption boundaries (25/50/75% scroll), plus a slow 1.00->1.05 push-in."""
from PIL import Image
import os, sys
S = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]
keys = [Image.open(f"{S}/{n}.png").convert("RGB") for n in ["stage-01-start","stage-02-dig","stage-03-build","stage-04-finish"]]
W0, H0 = keys[0].size
def smooth(x): x = max(0.0, min(1.0, x)); return x*x*(3-2*x)
def mix(p, half=0.07):
    for b in (1, 2, 3):
        c = b / 4
        if p < c - half: return keys[b-1]
        if p <= c + half: return Image.blend(keys[b-1], keys[b], smooth((p - (c - half)) / (2*half)))
    return keys[3]
def render(p, w, h):
    img = mix(p)
    z = 1.0 + 0.05 * p
    ar = w / h
    ch = H0 / z; cw = ch * ar
    if cw > W0 / z: cw = W0 / z; ch = cw / ar
    cx, cy = W0 / 2, H0 * 0.52
    top = min(max(0, cy - ch/2), H0 - ch); left = min(max(0, cx - cw/2), W0 - cw)
    box = (left, top, left + cw, top + ch)
    return img.resize((w, h), Image.LANCZOS, box=box)
for name, count, w, h, q in [("desktop",120,1280,720,58),("mobile",60,720,900,58)]:
    d = f"{OUT}/{name}"; os.makedirs(d, exist_ok=True)
    for i in range(count):
        render(i/(count-1), w, h).save(f"{d}/frame_{i+1:03d}.webp", "WEBP", quality=q, method=6)
    print(name, "done")
