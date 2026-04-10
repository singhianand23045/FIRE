---
title: "Slow Down Pacing & Increase Readability"
summary: "Slow down the reveal sequence to ~25 seconds and extend the result screen auto-advance from 3s to 8s."
chatId: "46"
createdAt: "2026-04-10T20:49:32.902Z"
updatedAt: "2026-04-10T20:49:32.902Z"
---

## Overview

The user feedback indicates two main issues with the pacing:
1. The result/summary screen after a draw disappears too quickly (auto-advances to the next draw in 3 seconds), barely leaving enough time to read it.
2. The "whisper" messages on the gameplay screen appear and disappear too rapidly (they are "blink and you miss it").

We need to slow down the auto-advance timing on the result screen and ensure the whisper text during the ball drops is readable. Since we are already slowing down the sequence of the `reveal.js` screen, the whisper messages will naturally have more screen time before being replaced. We will also address the timing of the result screen's auto-advance.

## UI/UX Design

1. **Extended Reveal Duration**: The wait time between dropping balls in `reveal.js` will be progressively increased as planned before, ensuring tension builds and giving players time to read the whispers.
2. **Longer Whisper Reading Time**: Due to the extended delays between ball drops, the whisper messages will naturally stay on screen longer because the interval between updates (e.g., from `WHISPERS_BALL_DROP` to `WHISPERS_MATCH_1` or the `WHISPERS_FINAL_PAUSE`) will be longer.
3. **Slower Result Screen Auto-Advance**: For intermediate draws (Draws 1 & 2), the result screen currently auto-advances to the next draw after 3 seconds. This will be increased to give players enough time to read their matches, see their near misses, and understand the current state of their game.

## Considerations

- The whispers in `reveal.js` just update the `textContent` of the `#reveal-whisper` element. Their display duration is simply the time until the *next* update. By stretching the `dropTimes` and final pause as previously planned, we natively increase the reading time for these whispers.
- The result screen auto-advance (`_tryAdvance`) is triggered by a `setTimeout`. We need to increase this timeout to roughly 6-8 seconds to allow for proper reading time.
- If the hat-trick badge or delayed oracle whispers trigger on the result screen, they should still fit within the auto-advance window or not be abruptly cut off if the user is engaged. We might want to delay the auto-advance to 8 seconds.

## Technical Approach

1.  **Modify `reveal.js` timings (as previously planned):**
    -   Update `dropTimes` to `[1500, 4000, 7200, 11200, 16200, 22200]`.
    -   Update `WHISPERS_FINAL_PAUSE` trigger to `24200`ms.
    -   Update `goto('result')` trigger to `25700`ms.
    *(These changes naturally solve the whisper visibility issue by providing wider gaps between text updates.)*

2.  **Modify `result.js` auto-advance timing:**
    -   Locate the intermediate draw logic (`if (gameDrawIndex === 3) { ... } else { ... }`).
    -   Change `_autoTimer = setTimeout(_tryAdvance, 3000);` to `_autoTimer = setTimeout(_tryAdvance, 8000);`.

## Implementation Steps

- [x] **In `fire-pwa-blue/screens/reveal.js`**:
    -   Change `const dropTimes = [800, 1800, 2900, 3700, 5000, 6200];` to `const dropTimes = [1500, 4000, 7200, 11200, 16200, 22200];`.
    -   Change the `setTimeout` for the final dramatic pause from `7200` to `24200`.
    -   Change the `setTimeout` for the draw transition to `result` from `8200` to `25700`.
- [x] **In `fire-pwa-blue/screens/result.js`**:
    -   Change `_autoTimer = setTimeout(_tryAdvance, 3000);` to `_autoTimer = setTimeout(_tryAdvance, 8000);`.

## Code Changes

-   **`fire-pwa-blue/screens/reveal.js`**: Update the core timings of the reveal sequence.
-   **`fire-pwa-blue/screens/result.js`**: Update the intermediate result screen auto-advance timeout.

## Testing Strategy

-   Play a full game cycle (3 draws).
-   Verify that during the reveal sequence, the delay between balls is significantly longer, naturally giving enough time to read the whisper messages.
-   Verify that when reaching the intermediate result screen (after draw 1 and draw 2), the screen stays visible for a full 8 seconds before auto-advancing to the next draw, allowing the player to easily process the results.