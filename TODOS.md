# TODOS

Durable backlog. On-disk so it persists across sessions.

---

## Deferred features

### E2 — First-Reveal Morphs
When a new game starts, briefly glow amber on the first-reveal screen for positions that were warm balls in the prior game, before new picks settle. A visual carry-over so the old game's identity doesn't vanish.
- **Why deferred:** Bridge screen already carries forward past-game texture (R1 recap + R2 Oracle declaration). This is polish, not load-bearing.
- **Rough effort:** ~2 hr (CSS transition + read `warmBallIndices` from prior `gameResults` entry).

### E5 — Warm-Ball Memory
Player-picked "warm ball" numbers currently lose their amber identity at game boundaries. Make amber persist across multiple games so the player's chosen numbers feel like a lasting signature, not a per-game reset.
- **Why deferred:** Own scope thread about player-identity persistence, separate from between-game texture.
- **Rough effort:** ~3 hr (extend `warmBallIndices` lifetime beyond single game, update first-reveal + reveal styling, handle conflict when Oracle's new picks overlap old warm balls).

---

## Commented-out / hidden features (recall & revive anytime)

> **Not todos.** These are existing code features that already exist in the repo but are currently disabled (block-commented or `display:none`). Listed here so they're easy to remember and revive with a single edit — no new implementation work needed.


### Draw progress dots on reveal screen
Small dots that lit up one-by-one as each draw ball was revealed — a visual "3/5" style progress indicator during the draw animation.
- **Status:** Block-commented out in `fire-pwa-blue/screens/reveal.js:187-196`.
- **Why hidden:** Shipped commented out by dyad (commits `08be908`, `1b2dfb0`, 2026-04-11/12) — felt redundant with the ball-by-ball animation itself.
- **Revival path:** Delete the `/* */` wrapping the `progressEl.innerHTML` block.

### "Pick different numbers" link on result screen
A text link on the result/draw-3 screen that let the player re-roll their numbers via `oraclePick()` before the next game.
- **Status:** Hidden via `display:none` in `fire-pwa-blue/screens/result.js:70, 391-392`. Click handler still wired at `result.js:561-568`.
- **Why hidden:** Commit `865076c` (2026-04-13) — redundant with the swipe-to-change hint on first-reveal, so the explicit link became clutter.
- **Revival path:** Remove `style="display:none"` from the span at `result.js:70` and delete the `pickLink.style.display = 'none'` line at `result.js:392`.
