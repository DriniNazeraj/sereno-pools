"""Builds the 2560x1440 HD stage sources in hd-2560/ from the 1280x720 stage PNGs (AI-generated PLACEHOLDERS).

CPU-only super-resolution, two GAN models ensembled 50/50 (each alone has a tell: Real-ESRGAN smears grass and
stone into "painted" blobs, SwinIR-L adds a fine stipple to foliage; the average looks like a photo):
  1. Real-ESRGAN x4plus      https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth
  2. SwinIR-L real-world x4  https://github.com/JingyunLiang/SwinIR/releases/download/v0.0/003_realSR_BSRGAN_DFOWMFC_s64w8_SwinIR-L_x4_GAN.pth
Each runs at 4x (5120x2880) in 256px tiles with 24px overlap, is resized to 2560x1440 with Lanczos, then blended.

Setup (any CPU, ~8 min per image with 8 threads; no GPU needed):
  python3 -m venv .venv && .venv/bin/pip install --index-url https://download.pytorch.org/whl/cpu torch torchvision
  .venv/bin/pip install spandrel pillow numpy
Usage: .venv/bin/python upscale_stages.py <dir with the two .pth files>
"""
import os, sys, torch, numpy as np
from PIL import Image
from spandrel import ModelLoader

S = os.path.dirname(os.path.abspath(__file__))
MODELS = ["RealESRGAN_x4plus.pth", "003_realSR_BSRGAN_DFOWMFC_s64w8_SwinIR-L_x4_GAN.pth"]
NAMES = ["stage-01-start", "stage-02-dig", "stage-03-build", "stage-04-finish"]
OUT_W, OUT_H, TILE, PAD = 2560, 1440, 256, 24
torch.set_num_threads(os.cpu_count() or 4)

def upscale(model, img):
    sc = model.scale
    a = np.asarray(img).astype(np.float32) / 255
    H, W, _ = a.shape
    out = np.zeros((H * sc, W * sc, 3), np.float32)
    with torch.inference_mode():
        for y in range(0, H, TILE):
            for x in range(0, W, TILE):
                y0, x0, y1, x1 = max(0, y - PAD), max(0, x - PAD), min(H, y + TILE + PAD), min(W, x + TILE + PAD)
                t = torch.from_numpy(a[y0:y1, x0:x1].transpose(2, 0, 1).copy())[None]
                o = model.model(t)[0].clamp(0, 1).numpy().transpose(1, 2, 0)
                ch, cw = (min(H, y + TILE) - y) * sc, (min(W, x + TILE) - x) * sc
                out[y * sc:y * sc + ch, x * sc:x * sc + cw] = o[(y - y0) * sc:(y - y0) * sc + ch, (x - x0) * sc:(x - x0) * sc + cw]
    return Image.fromarray((out * 255 + 0.5).clip(0, 255).astype(np.uint8)).resize((OUT_W, OUT_H), Image.LANCZOS)

if __name__ == "__main__":
    mdir = sys.argv[1]
    models = [ModelLoader().load_from_file(os.path.join(mdir, m)).eval() for m in MODELS]
    os.makedirs(os.path.join(S, "hd-2560"), exist_ok=True)
    for n in NAMES:
        src = Image.open(os.path.join(S, f"{n}.png")).convert("RGB")
        a, b = (upscale(m, src) for m in models)
        Image.blend(a, b, 0.5).save(os.path.join(S, "hd-2560", f"{n}.png"), optimize=True)
        print(n, "done")
