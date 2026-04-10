## Persistent Draws with Multi-Color Match Accumulation

## Status: **COMPLETED**

## Implementation Steps
1. **Define Colours:** Added Draw 2 (fiery orange) and Draw 3 (bright purple) tokens to `styles/tokens.css`.
2. **Update CSS:** Created rules in `styles/components.css` for `.is-matched-d1/2/3` and their gradient overlaps.
3. **Refactor `reveal.js` DOM:** Changed `#reveal-draw-area` to a vertical column flex layout. Stacked older rows dynamically with `.is-static` class preventing re-animation.
4. **Apply Historical Match Classes:** Player numbers receive `.is-matched-d*` and `.is-static` based on past draws in the current 3-game session.
5. **Animate Current Draw:** Matches append the respective `.is-matched-d*` dynamically while removing `.is-static` to trigger CSS animations for hits.
6. **Testing & Polish:** Removed redundant re-animations via `!important` overriding `ballDrop`. Stacking contexts are properly handled for border gradients.