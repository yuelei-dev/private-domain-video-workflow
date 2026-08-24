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

1. Resolve material scope. For the default test-server library, list candidates and stage only the selected files with `scripts/test_server_materials.py`; never edit the server library. Then inspect source media with `scripts/inspect_media.py` or `ffprobe`. Record duration, dimensions, frame rate, audio presence, and orientation.
2. Sample representative frames from reference and candidate footage. Select clips by narrative function, not merely visual similarity.
3. Decompose the copy using [copy-decomposition.md](references/copy-decomposition.md). Preserve user-provided numbers and claims verbatim unless the user asks for fact-checking or rewriting.
4. Write `DESIGN.md` before composition code. Define visual hierarchy, timing, selected files, music direction, and at least one rejected alternative.
5. Build a 1080x1920, 30 fps HyperFrames composition using [layout-spec.md](references/layout-spec.md).
6. Add only subtle entrance motion. Keep the main copy fixed and readable after the first 0.6 seconds; this format is not word-by-word karaoke captions.
7. Use supplied licensed music when available. Otherwise create an original instrumental with `scripts/generate_bgm.py`, following [music-and-editing.md](references/music-and-editing.md). Mute source speech unless the user explicitly wants it retained.
8. Run `hyperframes lint`, `hyperframes inspect`, and `hyperframes render`. If the bundled browser is unavailable, locate installed Chrome or Edge and set the documented browser-path environment variable for the command.
9. Perform visual QA on a contact sheet containing the opening, each major copy state, and the ending. Check text clipping, contrast, footage crop, CTA legibility, and unintended blank frames.
10. Verify the final MP4 with `ffprobe`, measure loudness, and calculate SHA-256. Deliver the playable local file plus a compact statement of duration, resolution, codec, audio, and any unverified user claims.

## Material selection order

For each copy beat, prefer:

1. Direct proof: meetings, workshops, conversations, product/service activity, or real group interaction.
2. Emotional reinforcement: confident people, attentive listening, cooperation, movement, or achievement.
3. Atmosphere: city, venue, decor, food, travel, or luxury details.

Avoid repetitive shots that all serve the same function. For an 8-second video, 4-6 distinct shots are usually enough.

## Default editorial decisions

- Duration: 7.2-9.0 seconds; allow up to 10.5 seconds for unusually dense copy.
- Structure: hook/statistic at top, real-world proof in the middle, conclusion and CTA at bottom.
- Typography: bold white/yellow/red Chinese text with a strong black stroke or shadow.
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

When delivering, report the exact output path, technical verification, music source, and whether factual claims were independently checked.
Also record selected material provenance in `SOURCES.md`: use test-server-relative paths and SHA-256 values, never credentials or server absolute paths outside the fixed library root.
