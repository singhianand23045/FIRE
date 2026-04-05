# AI Rules & Guidelines

This document outlines the core architecture, tech stack, and development rules for the FIRE PWA application. All AI assistants working on this codebase must adhere strictly to these constraints.

## Tech Stack

- **Vanilla JavaScript (ES Modules):** The entire application is built without any frontend frameworks (no React, Vue, or Svelte). Logic, DOM manipulation, and state are handled natively.
- **esbuild:** A custom build script (`build.js`) uses esbuild to bundle and minify JavaScript for production.
- **Firebase:** Powers the backend with Anonymous Authentication and Realtime Database (used for live presence, jackpot synchronization, and user economy data).
- **Progressive Web App (PWA):** Features a custom Service Worker (`sw.js`) for cache-first offline capabilities, along with a `manifest.json` for home screen installation.
- **Vanilla CSS:** Styling is written purely in standard CSS, structured into tokens, animations, components, and screens.
- **Web Audio API:** All game sound effects are procedurally generated in real-time using audio oscillators (`engine/audio.js`), avoiding large `.mp3` or `.wav` dependencies.

## Architecture & Library Rules

To maintain the project's lightweight, zero-dependency philosophy, adhere to the following library constraints and architectural rules:

### 1. UI & DOM Manipulation
- **Rule:** **DO NOT use React, Vue, or UI component libraries (e.g., Shadcn, Radix).**
- **How to implement:** Create and mutate the DOM using native `document.createElement()`, `innerHTML`, or `classList` methods. Structure reusable visual pieces in the `components/` directory and page-level views in `screens/`.

### 2. Styling
- **Rule:** **DO NOT use Tailwind CSS, Sass, Less, or CSS-in-JS.**
- **How to implement:** Use standard CSS. Reference established design tokens (colors, fonts, etc.) using CSS custom properties defined in `styles/tokens.css`. Keep styles scoped to their respective files (e.g., `components.css`, `screens.css`).

### 3. State Management
- **Rule:** **DO NOT use Redux, Zustand, MobX, or similar state libraries.**
- **How to implement:** All app state must flow through the single source of truth in `core/state.js`. Use the provided `updateState(partial)` function, which automatically persists state to `localStorage`.

### 4. Routing
- **Rule:** **DO NOT use react-router or other third-party routing solutions.**
- **How to implement:** Screen transitions and lifecycles must be handled by the custom router in `core/router.js`. Ensure new screens register using `registerScreen()` and navigate using the `goto(screenId)` function.

### 5. Backend & Data Sync
- **Rule:** **DO NOT introduce new backend services, databases (e.g., Supabase, MongoDB), or API clients.**
- **How to implement:** Rely entirely on Firebase Realtime Database for network data and `core/firebase.js` for interacting with it. Most of the app operates offline-first, syncing data to Firebase as a secondary operation. Game configuration and logic are extracted from Firebase every 30 seconds. This deliberate design choice allows product managers to iterate on the game rapidly by changing Firebase configs rather than source code.

### 6. Asset & Icon Management
- **Rule:** **DO NOT install npm packages for icons (e.g., lucide-react, FontAwesome).**
- **How to implement:** Use inline SVGs constructed directly in JavaScript components (like `oracle-eye.js`) or serve static assets out of the `assets/` folder.

### 7. Dependencies
- **Rule:** Keep `package.json` dependencies to an absolute minimum. `esbuild` is the only dev dependency required for building.
- **How to implement:** Do not run `npm install <package>` for utility libraries (e.g., Lodash, Moment.js). Write vanilla JS utilities instead.

### 8. Analytics & Tracking
- **Rule:** Capture device ID to uniquely identify users. Record all actions, events, and live user counts in Firebase and Microsoft Clarity.
- **Future Plans:** Future features will include capturing mobile/browser cookies on the initial 'tap to open' to establish baseline user moods, utilizing an LLM to evaluate shifting moods over time to increase engagement.

### 9. Design Philosophy & Game Mechanics
- **Rule:** The core lottery game must be mathematically correct. However, implement a structured 'cheat' mechanism to provide a shockingly good experience for first-time players without being obvious.
- **How to implement:** First-time players are split into four equal cohorts for winning the *second-highest prize*:
    - 25% win on their 1st game.
    - 25% win on their 2nd game.
    - 25% win on their 3rd game.
    - 25% receive normal odds immediately.
- **Crucial Constraint:** If a player in the 2nd or 3rd game cohort waits 5 minutes or more to play their next game after seeing the results of the previous one, the 'cheat' is voided, and they revert to normal odds.

### 10. Oracle & Content Strategy
- **Rule:** Oracle quotes are currently stored in a static list, but will eventually be replaced with a live connection to an LLM.
- **How to implement:** After a user plays 3 games, the Oracle should prompt the user for personal details (e.g., date of birth, favorite color) to build user personas tied to their unique device ID.

## Development Workflow

- All source files reside in `fire-pwa-blue/`.
- Local development requires running a static server on the root or `dist` folder. If checking bundled changes, always run `node build.js` first.
- Ensure that modifications do not break the boot sequence orchestrated in `main.js`.