---
name: private-domain-short-video
description: Create concise 7-10 second vertical Chinese private-domain conversion videos from user copy and an approved material library, including the Huangque test-server library. Use for same-city networking, community recruitment, industry opportunity, female-growth, business-circle, health, beauty, or similar lead-generation clips that need bold fixed typography, proof-oriented real footage, music, rendering, and visual QA. Do not use for long-form explainers, narration-led talking heads, or automatic publishing.
---

# Private-Domain Short Video

Turn Chinese conversion copy plus local footage into a finished, reviewable vertical video. Preserve the user's claim and intent while making the hierarchy readable within one glance.

## Required companion skills

Use `hyperframes:hyperframes`, `hyperframes:hyperframes-cli`, and `hyperframes:gsap` for implementation, animation, rendering, and validation. Read those skills before taking HyperFrames actions.

## Inputs

Collect or infer these inputs without blocking on nonessential choices:

- Copy: the user's exact hook, evidence/comparison, conclusion, and CTA.
- Material scope: explicit files, a supplied material-library directory, files the user has placed in scope, or the default Huangque test-server library.
- Reference style: supplied videos or this skill's default layout.
- Delivery: default to a reviewable MP4; never publish automatically.

When the user supplies no footage, query the Huangque test-server library at `/home/ubuntu/material-libraries/huangque-media/` before asking for another source. Use [test-server-material-library.md](references/test-server-material-library.md) for access and staging. Do not silently substitute web stock footage.

## Workflow

1. Resolve material scope. For the default test-server library, list candidates and stage only the selected visual files and BGM with `scripts/test_server_materials.py`; never edit the server library. BGM must come from `/home/ubuntu/material-libraries/huangque-media/` and be chosen randomly from the audio files in that library. Then inspect source media with `scripts/inspect_media.py` or `ffprobe`. Record duration, dimensions, frame rate, audio presence, and orientation.
2. Sample representative frames from reference and candidate footage. Select clips and still images by narrative function, not merely visual similarity.
3. Decompose every copy independently into four visual needs: problem, comparison, judgment, and CTA. Use [copy-decomposition.md](references/copy-decomposition.md). Preserve user-provided numbers and claims verbatim unless the user asks for fact-checking or rewriting. Extract 1-3 exact emphasis keywords or numbers and render them at 1.18-1.35 times the surrounding text size.
4. Write `DESIGN.md` before composition code. Define visual hierarchy, timing, selected files, music direction, and at least one rejected alternative.
5. Build a 1080x1920, 30 fps HyperFrames composition using [layout-spec.md](references/layout-spec.md). Start with a still image visible from frame zero; never begin with black, an empty background, a fade-in, or an undecoded video frame.
6. Add only subtle entrance motion. Keep the main copy fixed and readable after the first 0.6 seconds; this format is not word-by-word karaoke captions.
7. Randomly select BGM only from the fixed Huangque test-server material library, following [music-and-editing.md](references/music-and-editing.md). Do not generate or silently substitute BGM. For a batch, shuffle once and assign without replacement while enough tracks remain. If the library cannot supply a usable track for every requested video, stop before rendering and report the shortage. Mute source speech unless the user explicitly wants it retained.
8. Render once with `hyperframes render`; do not run the pre-render full `inspect` or contact-sheet visual-QA pass by default. If rendering fails, fix the reported error and retry. If the bundled browser is unavailable, locate installed Chrome or Edge and set the documented browser-path environment variable for the command.
9. Run a fast post-render technical check with `ffprobe` plus a single frame-zero decode: confirm the MP4 opens, has the expected duration, resolution, H.264 video, AAC audio, and a non-empty first picture. Deliver the playable local file plus a compact statement of those results and any unverified user claims.

## Batch material uniqueness

- Default every video to three distinct visual assets: image A for the first frame/problem, one video for comparison and judgment, and image B for the CTA.
- Do not reuse a visual asset in another video in the same batch unless the user explicitly approves reuse. For 20 videos, require at least 40 unique images and 20 unique video clips.
- Shuffle the test-library BGM pool once and assign tracks without replacement while enough tracks remain. For 20 videos, require 20 unique BGM files unless the user explicitly approves repeats.
- Record library-relative paths and SHA-256 values in the batch material map. Reject duplicate paths or hashes before rendering.

## Material selection order

For each copy beat, prefer:

1. Direct proof: meetings, workshops, conversations, product/service activity, or real group interaction.
2. Emotional reinforcement: confident people, attentive listening, cooperation, movement, or achievement.
3. Atmosphere: city, venue, decor, food, travel, or luxury details.

Avoid repetitive shots that all serve the same function. For an 8-second video, use three distinct assets by default: image, video, image.

## Default editorial decisions

- Duration: 7.2-9.0 seconds; allow up to 10.5 seconds for unusually dense copy.
- Structure: hook/statistic at top, real-world proof in the middle, conclusion and CTA at bottom.
- Typography: bold white/yellow/red Chinese text with a strong black stroke or shadow.
- Keyword emphasis: enlarge 1-3 exact keywords, figures, or CTA terms to 1.18-1.35 times the surrounding text.
- Pacing: hard cuts or one short crossfade; avoid ornamental transitions.
- Audio: upbeat instrumental, no vocals competing with reading, target -14 to -12 LUFS and true peak at or below -1 dBTP.
- Claims: treat metrics as user-provided creative copy, not verified facts, unless verification is explicitly requested.

## Completion gate

Do not call the video finished unless all of these pass:

- Main text is readable on a phone-sized preview without pausing.
- No text enters platform-edge danger zones.
- The primary footage is not unintentionally cropped.
- CTA and reply keyword match the user's wording exactly.
- HyperFrames reports no runtime, layout, or motion errors.
- Final output is H.264 video with AAC audio in an MP4 container.
- The file opens, has the expected duration, and contains no black or frozen ending.
- Frame zero is backed by the selected still image and a fast one-frame decode confirms a non-empty picture; this does not require a whole-video visual review.
- For a batch, the material map proves the 2-image/1-video mix and contains no duplicate visual or BGM paths/hashes unless the user explicitly approved reuse.

When delivering, report the exact output path, technical verification, music source, and whether factual claims were independently checked.
Also record selected material provenance in `SOURCES.md`: use test-server-relative paths and SHA-256 values, never credentials or server absolute paths outside the fixed library root.
