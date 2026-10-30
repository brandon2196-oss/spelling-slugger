# Cartoon stadium (Phase 1) plan

**Goal:** a placeholder cartoon stadium behind the existing FieldController, switchable with the pixel scene.
**Spec:** `docs/superpowers/specs/2026-10-30-cartoon-stadium-design.md`
**Architecture:** new CartoonScene plus manifest, camera, rig modules; Field.tsx picks the scene.
**Tech:** Phaser 3, React, Vitest.

- [ ] 1. [TDD] `src/field/controller.contract.test.ts`: every method resolves on both scenes with a stubbed Phaser, motionScale 0.
- [ ] 2. Add `FieldBeat` and optional `onBeat` to `controller.ts`.
- [ ] 3. [TDD] `src/field/manifest.ts` + test: missing assets listed, null coordinates use defaults.
- [ ] 4. `src/field/camera.ts`: pushIn, followBall, panToStands, reset, all through motion.
- [ ] 5. `src/field/rig.ts` stub: appearance hash and placeholder colors.
- [ ] 6. `src/field/CartoonScene.ts` placeholders and plays with brief timings; beats at the five points.
- [ ] 7. [TDD] `src/field/fieldChoice.ts` + test: VITE_FIELD default cartoon, localStorage override.
- [ ] 8. `Field.tsx` picks scene and Phaser config; hidden 5-tap toggle on the booth heading.
- [ ] 9. pack-art: deferred until art exists.
- [ ] 10. Chrome DOM score bug: deferred to SVG chrome art; Scoreboard test ids untouched.
- [ ] 11. `npm run typecheck && npm run lint && npm test`; draft PR. No merge, no publish.
