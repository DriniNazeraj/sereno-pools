# Hero stage images: GENERATED PLACEHOLDERS

These four images are AI-generated placeholders for the Sereno Pools hero. They are not photos of real Sereno projects and must be replaced or clearly approved before launch.

- stage-01-start.png, stage-02-dig.png, stage-03-build.png, stage-04-finish.png (1280x720, same camera angle)
- make_frames.py builds the scroll sequences: desktop 120 frames at 1280x720, mobile 60 frames at 720x900 (centre crop), crossfades centred on the 25/50/75% caption boundaries, slow 1.00 to 1.05 push-in.
- Run: `python3 make_frames.py <out_dir>` then copy <out_dir>/desktop and /mobile into site/public/frames/.
- The illustrated fallback frames are backed up at /workspace/sereno/frames-illustrated-backup/.

## HD sources (hd-2560/) and the HD frame set

- `hd-2560/stage-0N-*.png` are 2560x1440 versions of the four stages, made on CPU by `upscale_stages.py`: each 1280x720 PNG is run through two super-resolution GAN models at 4x (Real-ESRGAN x4plus and SwinIR-L real-world x4, 256px tiles, 24px overlap), Lanczos-resized to 2560x1440 and blended 50/50. Alone, Real-ESRGAN smears grass and stone into "painted" blobs and SwinIR adds a fine stipple to foliage; the blend keeps natural grass blades, stone joints and water. Checked by eye at 1:1. Still AI-generated placeholders. The `hd-2560/` PNGs are not committed; available on request.
- `python3 make_frames.py <out_dir> hd` renders `hd/` (120 frames, 1920x1080, WebP q50, ~205 KB/frame, ~24 MB total) with the same motion, crossfades and crop as `desktop/`. Copy it to `site/public/frames/hd/`.
- `hd2560` (2560x1440) also works but is ~36 MB per sequence, so it is not shipped.
- The site uses `hd/` when the viewport is >= 1401 CSS px, or >= 1280 CSS px at DPR >= 1.1 (see `HD_MEDIA` in `src/config/hero.ts`); 900-1400 px at DPR 1 keeps `desktop/` (1280x720), phones keep `mobile/` (720x900).

## 4x source for the gallery / outdoor-living photos (hd-5120/)

- `hd-5120/stage-04-finish.webp` (lossless, 5120x2880) is stage 04 run through the same Real-ESRGAN x4plus + SwinIR-L 50/50 blend as `hd-2560/`, kept at the models' native 4x instead of being downscaled to 2560 (downscaled, it matches `hd-2560/stage-04-finish.png` to within 0.2/255 on average). It was made with `upscale_stages.upscale()` and `OUT_W, OUT_H = 5120, 2880`.
- `scripts/make_placeholder_photos.py` cuts the six gallery photos and the outdoor-living night shot from it. The gallery crops are tight (the smallest is 540 px wide in the 1280 render, which is 2160 px at 4x), so every exported size (about 800/1600/2400 px, WebP q80 + AVIF q65) is a downscale. `scripts/make_og.py` renders the OG image from it too (downscaled to 2560x1440, i.e. the `hd-2560/` version).
