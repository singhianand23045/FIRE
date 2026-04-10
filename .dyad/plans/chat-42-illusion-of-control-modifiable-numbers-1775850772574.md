---
title: "Illusion of Control: Modifiable Numbers"
summary: "Allow users to change oracle numbers by swiping up/down on the first-reveal screen, with a constraint for unique numbers."
chatId: "42"
createdAt: "2026-04-10T19:52:52.574Z"
updatedAt: "2026-04-10T19:52:52.574Z"
---

## Overview

Allow players to manually modify their generated lottery numbers after the oracle drops them. By letting users adjust the numbers up or down via swipe interactions, we enhance the "illusion of control" before they proceed. To maintain game integrity, the app will enforce a rule that all numbers must be unique—disabling the main CTA if duplicates are present.

## UI/UX Design

- **Swipe Interaction**: The number balls on the `first-reveal` screen will respond to vertical swipe/drag gestures. Swiping up increments the number, while swiping down decrements it.
- **Continuous Wrapping**: The numbers will wrap around their boundaries (e.g., 59 wraps to 1, and 1 wraps to 59).
- **Duplicate Prevention**: If the user inputs duplicate numbers, the "REVEAL MY FATE" button will change its text to "NUMBERS MUST BE UNIQUE" and will become disabled.
- **Haptic Feedback**: Each time the number spins up or down by a threshold, a light haptic tap will occur.

## Considerations

- **Scroll Prevention**: We need to use `touch-action: none` on the number balls to ensure that dragging on them doesn't scroll the screen.
- **Gestural Sensitivity**: The pointer movement needs a reasonable threshold (e.g., 30px) so a number increments exactly once per deliberate motion and doesn't spin wildly out of control.
- **State Synchronization**: As the numbers are changed locally on the screen, they need to be written back to the global `state.currentNumbers` so the final game plays out with the user's customized choices.

## Technical Approach

- Modify `first-reveal.js` to attach Pointer Event listeners (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`) directly onto the `.num-ball--player` elements when they are constructed.
- Track `startY` coordinates to calculate the `deltaY` and detect a swipe.
- Use `CONFIG.DRAW_POOL_SIZE` (which defaults to 59) to strictly bound the maximum values for the wrapper arithmetic.
- Create a `validateNumbers()` function inside `onEnter` that checks array uniqueness using a `Set`. Based on the check, it updates the visual state of `btn`.

## Implementation Steps

1. **Update Number Rendering Logic**
   In `fire-pwa-blue/screens/first-reveal.js`, alter the number rendering loop to add pointer event tracking variables.
2. **Add Swipe Logic**
   Attach `pointerdown`, `pointermove`, and `pointerup`/`cancel` handlers to each ball. Calculate the dragging offset. If the offset passes a 30px threshold, increment/decrement the local variable, wrap bounds using modulo arithmetic against 59, update the DOM text, emit a light haptic, and reset the touch coordinate.
3. **Add Validation Flow**
   Implement `validateNumbers()` that evaluates if `new Set(numbers).size !== numbers.length`.
   - If true: Disable the button, change its innerHTML to "NUMBERS MUST BE UNIQUE".
   - If false: Re-run the economy checks (`canPlay()`), enable/disable accordingly, restore the `<div class="reveal-btn__glow"></div>REVEAL MY FATE` HTML, and commit the modified `numbers` array to `updateState({ currentNumbers: numbers })`.
4. **Style Touches**
   Apply `ball.style.touchAction = 'none'` and `ball.style.cursor = 'ns-resize'` via JS or CSS so interaction feels deliberate and doesn't zoom/scroll.

## Code Changes

- **`fire-pwa-blue/screens/first-reveal.js`**
  - Add pointer handlers to the ball generation loop.
  - Add `validateNumbers` function and call it anytime a number is changed.

## Testing Strategy

- **Increment / Wrap**: Click and drag up/down on a number to verify it increments and decrements, and cleanly wraps from 1 -> 59 and 59 -> 1.
- **Duplication Check**: Force two numbers to match. Verify the CTA text changes to "NUMBERS MUST BE UNIQUE" and the button becomes inactive.
- **Resolution**: Fix the duplicate, ensure the text restores to "REVEAL MY FATE".
- **Game Engine**: Proceed with a modified set of numbers and confirm the result screen displays those specific custom numbers.