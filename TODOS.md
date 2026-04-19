# TODOS

Deferred work items that are out of scope for the current PR but worth tracking.

## Deferred from game-boundary-texture (2026-04-19)

### E2 — First-Reveal Morphs
When a new game starts, briefly glow amber on the first-reveal screen for the positions that were warm balls in the previous game, before the new picks settle. A visual carry-over so the old game's identity doesn't vanish without a trace.

- **Why deferred**: The new bridge screen already carries forward past-game texture (R1 result recap + R2 Oracle declaration). First-reveal morphs are polish, not load-bearing for the core between-game loop.
- **When to revisit**: After game-boundary-texture ships and we have playtesting feedback on whether players want more continuity signals at new-game start.
- **Rough effort**: ~2 hr (CSS transition + read `warmBallIndices` from prior `gameResults` entry).

### E5 — Warm-Ball Memory
Player-picked numbers (amber "warm balls") currently lose their amber identity at game boundaries. Make amber persist across multiple games so the player's chosen numbers feel like a lasting signature, not a per-game reset.

- **Why deferred**: Own scope thread about player-identity persistence, separate from between-game texture. Shipping with game-boundary-texture would muddle the story.
- **When to revisit**: After game-boundary-texture ships and we see whether players want their chosen numbers to feel "theirs" across a full session.
- **Rough effort**: ~3 hr (extend `warmBallIndices` lifetime beyond single game, update first-reveal + reveal styling to honor cross-game amber state, handle conflict when Oracle's new picks overlap old warm balls).
