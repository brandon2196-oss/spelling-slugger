# Plan: difficulty selection + pacing

1. TDD `weeklyWords` ramp in `src/engine/selection.test.ts` (keeps set/positions; early third easier than late third over many seeds; not always band-sorted; uniform difficulty still shuffles).
2. Implement ramp in `src/engine/selection.ts` with existing rng.
3. TDD `paceMultiplier` / `breathExtraMs` in `src/features/game/timing.test.ts`.
4. Implement in `timing.ts`; wire into `GamePage` (`onSubmit` after at-bat, `nextAfterReveal`).
5. typecheck, lint, test; PR to main. No merge/publish.
