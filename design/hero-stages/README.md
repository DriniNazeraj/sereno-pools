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
