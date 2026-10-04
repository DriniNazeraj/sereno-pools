#!/usr/bin/env python3
"""
PLACEHOLDER gallery + outdoor-living images, derived ONLY from the designer's AI-generated FINISHED-pool render
(stage 04). Crops + colour grades (day, golden hour, dusk, night). No construction stages, no people, nothing
downloaded. These are NOT real Sereno projects: replace with real photography before launch.

Source: design/hero-stages/hd-5120/stage-04-finish.webp, a 5120x2880 (4x) super-resolved copy of
stage-04-finish.png made with the SAME two-model blend as hd-2560/ (Real-ESRGAN x4plus + SwinIR-L, 50/50; see
design/hero-stages/upscale_stages.py and the README), just without the final downscale to 2560. Downscaled, it IS
hd-2560/stage-04-finish.png; the extra resolution is needed because most gallery photos are tight crops (the
smallest is 540 px wide in the 1280 render, i.e. 2160 px at 4x), so every exported size is a DOWNscale with no
interpolated upscaling. The grades and crop boxes are written in 1280x720 coordinates and scaled by K = width/1280,
so the framing is exactly the same as the earlier 1280-based export.

Outputs WebP (q80) + AVIF (q65) into public/images/ for each slug at about 800/1600/2400 px wide (never wider than the
crop's native size), outdoor-living also at 3200, and writes src/config/gallery.generated.json.
Run: python3 scripts/make_placeholder_photos.py   (Pillow >= 11 with AVIF, numpy)
"""
import json, os, glob
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.environ.get("STAGE4_SRC", os.path.join(ROOT, "design", "hero-stages", "hd-5120", "stage-04-finish.webp"))
OUT = os.path.join(ROOT, "public", "images")
# AVIF q65 matches WebP q80 (PSNR 33.9 vs 34.0 dB on finished-pool-1600) at ~25% fewer bytes; WebP is the fallback.
Q_WEBP, Q_AVIF = 80, 65
CAP_1600 = 250 * 1024  # budget: a ~1600w file stays <= 250 KB (only the two busiest day crops need WebP q77-78)
os.makedirs(OUT, exist_ok=True)

S4 = Image.open(SRC).convert("RGB")
K = S4.width / 1280  # 4.0 for the hd-5120 source; every pixel radius / box below is in 1280 coordinates
def blur(m, r): return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r * K)), np.float32) / 255.0
def to_img(x): return Image.fromarray((np.clip(x, 0, 1) * 255 + 0.5).astype(np.uint8))

def save(img, slug, widths):
    """Lanczos DOWNscale to each width (never upscales), then WebP + AVIF. Returns [(w, h, webp_bytes, avif_bytes)]."""
    for f in glob.glob(os.path.join(OUT, f"{slug}-*.*")):
        os.remove(f)
    out = []
    for w in widths:
        assert w <= img.width, (slug, w, img.width)
        h = round(img.height * w / img.width)
        im = img.resize((w, h), Image.LANCZOS) if w != img.width else img
        pw, pa = os.path.join(OUT, f"{slug}-{w}.webp"), os.path.join(OUT, f"{slug}-{w}.avif")
        q = Q_WEBP
        im.save(pw, "WEBP", quality=q, method=6)
        while w == 1600 and os.path.getsize(pw) > CAP_1600 and q > 70:
            q -= 1
            im.save(pw, "WEBP", quality=q, method=6)
        im.save(pa, "AVIF", quality=Q_AVIF, speed=4)
        out.append((w, h, os.path.getsize(pw), os.path.getsize(pa)))
    print(slug, img.size, [(w, h, f"webp {b // 1024} KB", f"avif {c // 1024} KB") for w, h, b, c in out], flush=True)
    return out

# ---- Night grade of the finished render (also the outdoor-living image). float32 throughout: the 5120 source is big.
a = np.asarray(S4, np.float32) / 255.0
H, W = a.shape[:2]
r, g, b = a[..., 0], a[..., 1], a[..., 2]
lum = 0.3 * r + 0.59 * g + 0.11 * b
yy = (np.linspace(0, 1, H, dtype=np.float32)[:, None] * np.ones((1, W), np.float32))
xx = (np.linspace(0, 1, W, dtype=np.float32)[None, :] * np.ones((H, 1), np.float32))
water = blur(np.clip(((b - r) - 0.12) * 4, 0, 1) * (yy > 0.6), 2)          # pool water: blue/cyan in the lower part
sky = blur(np.clip((lum - 0.55) * 4, 0, 1) * np.clip((b - r + 0.05) * 6, 0, 1) * (yy < 0.55), 3)
def soft_rect(x0, x1, y0, y1, f=0.02):
    return (np.clip((xx - x0) / f, 0, 1) * np.clip((x1 - xx) / f, 0, 1) * np.clip((yy - y0) / f, 0, 1) * np.clip((y1 - yy) / f, 0, 1))
house = soft_rect(0.29, 0.80, 0.42, 0.64)
warm = np.clip(((r - b) - 0.12) * 3, 0, 1) * (r > g) * house * np.clip((lum - 0.2) * 3, 0, 1)
glass = soft_rect(0.40, 0.60, 0.46, 0.63, 0.015) + soft_rect(0.72, 0.77, 0.52, 0.63, 0.01) * 0.8
del house
night = a * 0.16 * np.array([0.62, 0.78, 1.0], np.float32) + lum[..., None] * 0.03
night_sky = (np.array([0.03, 0.06, 0.13], np.float32) * (1 - yy[..., None]) + np.array([0.09, 0.13, 0.22], np.float32) * yy[..., None])
night = night * (1 - sky[..., None]) + night_sky * sky[..., None]
del night_sky
pool_col = a * np.array([0.25, 0.85, 1.05], np.float32) + np.array([0.0, 0.10, 0.14], np.float32)
night = night * (1 - water[..., None]) + np.clip(pool_col, 0, 1) * water[..., None]
del pool_col
night += blur(water, 60)[..., None] * np.array([0.02, 0.16, 0.2], np.float32)
night += warm[..., None] * np.array([0.75, 0.45, 0.18], np.float32) * 0.7
night += glass[..., None] * (a * np.array([0.55, 0.36, 0.18], np.float32) + np.array([0.10, 0.05, 0.01], np.float32))
night += blur(np.clip(warm + glass, 0, 1), 40)[..., None] * np.array([0.35, 0.2, 0.08], np.float32)
del warm, glass, water, r, g, b, lum
night = np.clip(night, 0, 1) ** 0.9
NIGHT = ImageEnhance.Contrast(to_img(night)).enhance(1.05)
del night

# outdoor-living: full-bleed (100vw, object-cover, parallax), so it gets a 3200 size for 1920+ at DPR 2
OUTDOOR_W = [800, 1600, 2400, 3200]
save(NIGHT, "outdoor-living", OUTDOOR_W)

# ---- grades of the finished render
N = np.asarray(NIGHT, np.float32) / 255.0
gx = np.linspace(1, 0, W, dtype=np.float32)[None, :, None]
golden = a ** 1.05 * np.array([1.08, 0.98, 0.84], np.float32) + gx * np.array([0.06, 0.03, 0.0], np.float32) * (1 - yy[..., None])
GOLDEN = ImageEnhance.Color(to_img(golden)).enhance(1.08)
del golden, gx
dusk_sky = (np.array([0.20, 0.24, 0.42], np.float32) * (1 - yy[..., None] / 0.55) + np.array([0.86, 0.56, 0.42], np.float32) * (yy[..., None] / 0.55))
dusk = a * 0.42 * np.array([0.85, 0.85, 1.0], np.float32) * (1 - sky[..., None]) + np.clip(dusk_sky, 0, 1) * sky[..., None]
del dusk_sky
dusk = dusk * 0.55 + N * 0.6
DUSK = ImageEnhance.Contrast(to_img(dusk)).enhance(1.06)
del dusk, N, a, sky, xx, yy
GRADES = {"day": S4, "golden": GOLDEN, "dusk": DUSK, "night": NIGHT}

# slug, grade, crop box (x0, y0, x1, y1) in 1280x720 coordinates (unchanged framing). Every crop shows the finished pool.
CROPS = [  # order + aspect ratios chosen so the 3-column masonry balances (~equal column heights)
    ("finished-pool", "day", (0, 0, 1280, 720)),
    ("dusk-pool", "dusk", (140, 150, 1140, 720)),
    ("night-glass", "night", (330, 300, 950, 710)),
    ("golden-hour", "golden", (60, 190, 1220, 720)),
    ("coping-detail", "day", (700, 430, 1240, 720)),
    ("night-water", "night", (150, 370, 750, 720)),
]
TARGETS = [800, 1600, 2400]
manifest = []
for slug, g, box in CROPS:
    im = GRADES[g].crop(tuple(round(v * K) for v in box))
    widths = [w for w in TARGETS if w <= im.width]
    if len(widths) < len(TARGETS):  # crop narrower than 2400 at 4x (coping-detail: 2160): top size = native width
        widths.append(im.width // 8 * 8)
    sizes = save(im, slug, widths)
    manifest.append({"slug": slug, "grade": g, "widths": widths, "w": sizes[-1][0], "h": sizes[-1][1]})
with open(os.path.join(ROOT, "src", "config", "gallery.generated.json"), "w") as f:
    json.dump(manifest, f, indent=2)
    f.write("\n")
print("manifest written")
