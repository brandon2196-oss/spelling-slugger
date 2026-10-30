# Phase 0: Art Contract Plan

**Goal:** Give the artist one plain-language contract and give the game an empty art manifest that lists every expected file, so Phase 1 can build on placeholders and validate real art when it lands.

**Architecture:** Docs and data only. `docs/art/ART-CONTRACT.md` is the artist-facing spec. `public/art/manifest.json` lists every expected asset with `"status": "missing"` plus the stadium coordinate schema. `art-src/` is gitignored for 2x masters. No game code changes.

**Tech Stack:** Markdown, JSON.

**Global Constraints:** The design is the fun overhaul brief (`docs/superpowers/specs/2026-10-30-fun-overhaul-grok-brief.md`), section 3; acceptance is 3.8. Bots never generate character or stadium art. No em dashes or en dashes. Do not merge or publish without Brandon's explicit yes.

## Task A: ART-CONTRACT.md

- [ ] Cover brief 3.1 to 3.7 in plain language: style sheet, canvas and scale, layered batter, every clip and frame count, stadium layers and coordinates, UI chrome list, file layout.
- [ ] End with a checklist the artist can tick.

## Task B: Empty manifest

- [ ] Write `public/art/manifest.json` with every expected file at `"status": "missing"`, the batter clip and layer schema, and null coordinate placeholders for every 3.5 position.
- [ ] Add `art-src/` to `.gitignore`.
- [ ] Check the JSON parses and that no em or en dashes appear.
