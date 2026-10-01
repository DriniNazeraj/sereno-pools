# Hero stage images: GENERATED PLACEHOLDERS

These four images are AI-generated placeholders for the Sereno Pools hero. They are not photos of real Sereno projects and must be replaced or clearly approved before launch.

- stage-01-start.png, stage-02-dig.png, stage-03-build.png, stage-04-finish.png (1280x720, same camera angle)
- make_frames.py builds the scroll sequences: desktop 120 frames at 1280x720, mobile 60 frames at 720x900 (centre crop), crossfades centred on the 25/50/75% caption boundaries, slow 1.00 to 1.05 push-in.
- Run: `python3 make_frames.py <out_dir>` then copy <out_dir>/desktop and /mobile into site/public/frames/.
- The illustrated fallback frames are backed up at /workspace/sereno/frames-illustrated-backup/.
