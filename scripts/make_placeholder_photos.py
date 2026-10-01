#!/usr/bin/env python3
"""
PLACEHOLDER gallery + outdoor-living images, derived ONLY from the designer's AI-generated
FINISHED-pool render (stage 04, /workspace/sereno/assets/hero-stages/stage-04-finish.png;
a copy lives in design/hero-stages/). Crops + colour grades (day, golden hour, dusk, night).
No construction stages, no people, nothing downloaded. These are NOT real Sereno projects:
replace with real photography before launch. Outputs AVIF + WebP into public/images/ and
writes src/config/gallery.generated.json (sizes for the Gallery component).
"""
import json, os
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

SRC = os.environ.get("STAGES_SRC", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "design", "hero-stages"))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "images")
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    os.remove(os.path.join(OUT, f))

S4 = Image.open(os.path.join(SRC, "stage-04-finish.png")).convert("RGB")

def save(img, slug, widths, q_webp=74, q_avif=54):
    out = []
    for w in widths:
        h = round(img.height * w / img.width)
        im = img.resize((w, h), Image.LANCZOS)
        if w > img.width:  # light sharpen after upscaling
            im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=45, threshold=2))
        im.save(os.path.join(OUT, f"{slug}-{w}.webp"), "WEBP", quality=q_webp, method=6)
        im.save(os.path.join(OUT, f"{slug}-{w}.avif"), "AVIF", quality=q_avif, speed=5)
        out.append((w, h))
    print(slug, img.size, out)
    return out

# ---- Outdoor living: day-for-night grade of the finished render
a = np.asarray(S4, np.float32) / 255.0
H, W = a.shape[:2]
r, g, b = a[..., 0], a[..., 1], a[..., 2]
lum = 0.3 * r + 0.59 * g + 0.11 * b
yy = np.linspace(0, 1, H)[:, None] * np.ones((1, W))
# pool water mask: strongly blue/cyan pixels in the lower half
water = np.clip(((b - r) - 0.12) * 4, 0, 1) * (yy > 0.6)
water = np.asarray(Image.fromarray((water * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2)), np.float32) / 255.0
# sky mask: bright + blue-ish in the top part
sky = np.clip((lum - 0.55) * 4, 0, 1) * np.clip((b - r + 0.05) * 6, 0, 1) * (yy < 0.55)
sky = np.asarray(Image.fromarray((sky * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3)), np.float32) / 255.0
# warm interior: orange-ish mid-tones inside the house band
xx = np.linspace(0, 1, W)[None, :] * np.ones((H, 1))
def soft_rect(x0, x1, y0, y1, f=0.02):
    return (np.clip((xx - x0) / f, 0, 1) * np.clip((x1 - xx) / f, 0, 1) * np.clip((yy - y0) / f, 0, 1) * np.clip((y1 - yy) / f, 0, 1))
house = soft_rect(0.29, 0.80, 0.42, 0.64)
warm = np.clip(((r - b) - 0.12) * 3, 0, 1) * (r > g) * house * np.clip((lum - 0.2) * 3, 0, 1)
glass = soft_rect(0.40, 0.60, 0.46, 0.63, 0.015) + soft_rect(0.72, 0.77, 0.52, 0.63, 0.01) * 0.8
night = a * 0.16 * np.array([0.62, 0.78, 1.0]) + lum[..., None] * 0.03
night_sky = (np.array([0.03, 0.06, 0.13]) * (1 - yy[..., None]) + np.array([0.09, 0.13, 0.22]) * yy[..., None])
night = night * (1 - sky[..., None]) + night_sky * sky[..., None]
pool_col = a * np.array([0.25, 0.85, 1.05]) + np.array([0.0, 0.10, 0.14])
night = night * (1 - water[..., None]) + np.clip(pool_col, 0, 1) * water[..., None]
glow = np.asarray(Image.fromarray((water * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(60)), np.float32)[..., None] / 255.0
night += glow * np.array([0.02, 0.16, 0.2])
night += warm[..., None] * np.array([0.75, 0.45, 0.18]) * 0.7
night += glass[..., None] * (a * np.array([0.55, 0.36, 0.18]) + np.array([0.10, 0.05, 0.01]))
wglow = np.asarray(Image.fromarray((np.clip(warm + glass, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(40)), np.float32)[..., None] / 255.0
night += wglow * np.array([0.35, 0.2, 0.08])
night = np.clip(night, 0, 1) ** 0.9
out = Image.fromarray((night * 255).astype(np.uint8))
out = ImageEnhance.Contrast(out).enhance(1.05)
NIGHT = out
save(NIGHT, "outdoor-living", [1280, 1920])


# ---- grades of the finished render
A = np.asarray(S4, np.float32) / 255.0
N = np.asarray(NIGHT, np.float32) / 255.0
def to_img(x): return Image.fromarray((np.clip(x, 0, 1) * 255).astype(np.uint8))
# golden hour: warm highlights, slightly lifted shadows, warm light from the left
gx = np.linspace(1, 0, W)[None, :, None]
golden = A ** 1.05 * np.array([1.08, 0.98, 0.84]) + gx * np.array([0.06, 0.03, 0.0]) * (1 - yy[..., None])
golden = np.asarray(ImageEnhance.Color(to_img(golden)).enhance(1.08), np.float32) / 255.0
# dusk / blue hour: halfway to night, violet-to-amber sky, pool + windows already lit
dusk_sky = (np.array([0.20, 0.24, 0.42]) * (1 - yy[..., None] / 0.55) + np.array([0.86, 0.56, 0.42]) * (yy[..., None] / 0.55))
dusk = A * 0.42 * np.array([0.85, 0.85, 1.0]) * (1 - sky[..., None]) + np.clip(dusk_sky, 0, 1) * sky[..., None]
dusk = dusk * 0.55 + N * 0.6
dusk = np.asarray(ImageEnhance.Contrast(to_img(dusk)).enhance(1.06), np.float32) / 255.0
GRADES = {"day": A, "golden": golden, "dusk": dusk, "night": N}

# slug, grade, crop box (x0, y0, x1, y1) on the 1280x720 render. Every crop shows the finished pool.
CROPS = [  # order + aspect ratios chosen so the 3-column masonry balances (~equal column heights)
    ("finished-pool", "day", (0, 0, 1280, 720)),
    ("dusk-pool", "dusk", (140, 150, 1140, 720)),
    ("night-glass", "night", (330, 300, 950, 710)),
    ("golden-hour", "golden", (60, 190, 1220, 720)),
    ("coping-detail", "day", (700, 430, 1240, 720)),
    ("night-water", "night", (150, 370, 750, 720)),
]
manifest = []
for slug, g, box in CROPS:
    im = to_img(GRADES[g]).crop(box)
    w2 = min(1200, round(im.width * 1.6 / 8) * 8)  # never upscale more than 1.6x
    sizes = save(im, slug, [640, w2])
    manifest.append({"slug": slug, "grade": g, "widths": [640, w2], "w": sizes[-1][0], "h": sizes[-1][1]})
with open(os.path.join(ROOT, "src", "config", "gallery.generated.json"), "w") as f:
    json.dump(manifest, f, indent=2)
print("manifest written")
