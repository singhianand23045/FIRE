# FIRE PWA — Code- Documentation

A mystical lottery PWA where an "Oracle" picks numbers, users match them, and win entries/money. Built as a vanilla JS single-page app bundled with esbuild, deployed to Firebase Hosting.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Boot Sequence](#boot-sequence)
3. [Screen Flow](#screen-flow)
4. [Architecture Overview](#architecture-overview)
5. [Core Layer](#core-layer)
6. [Engine Layer](#engine-layer)
7. [Components](#components)
8. [Screens](#screens)
9. [Data Layer](#data-layer)
10. [Firebase & Database](#firebase--database)
11. [Economy System](#economy-system)
12. [Draw Engine & RNG](#draw-engine--rng)
13. [Oracle Numerology](#oracle-numerology)
14. [Streak System](#streak-system)
15. [Audio System](#audio-system)
16. [Service Worker & PWA](#service-worker--pwa)
17. [Build & Deploy](#build--deploy)
18. [CSS Architecture](#css-architecture)
19. [Dev Mode](#dev-mode)
20. [Config Reference](#config-reference)

---

## Project Structure

```
fire-pwa-blue/
├── main.js                  # App entry point (boot sequence)
├── config.js                # All tunable constants
├── index.html               # Single HTML shell (all screens are <section> elements)
├── build.js                 # esbuild bundler → dist/
├── sw.js                    # Service worker (cache-first, offline-capable)
├── manifest.json            # PWA manifest
├── firebase.json            # Firebase Hosting config
├── .firebaserc              # Firebase project/target binding
│
├── core/                    # Framework-level modules
│   ├── device.js            # Device ID, localStorage wrapper, audio unlock, haptics
│   ├── state.js             # Single source of truth (in-memory + localStorage)
│   ├── router.js            # Hash-free screen router with enter/exit lifecycle
│   ├── firebase.js          # Firebase Auth, RTDB, presence, jackpot sync
│   └── analytics.js         # GA4 + Microsoft Clarity wrapper
│
├── engine/                  # Game logic (pure functions, no DOM)
│   ├── draw.js              # RNG, boosted draws, scoring, near-miss calculation
│   ├── oracle.js            # Numerology: zodiac, elements, weighted number generation
│   ├── economy.js           # Entries, money, prize table, game lifecycle
│   ├── streak.js            # Daily check-in streaks, hat-trick detection
│   └── audio.js             # Web Audio API synthesized tones (no .mp3 files)
│
├── screens/                 # One file per screen (each registers with router)
│   ├── splash.js            # Opening screen: Oracle eye animation, auto-advance 4s
│   ├── first-reveal.js      # "Your numbers" + REVEAL MY FATE button
│   ├── reveal.js            # Theatrical 10s draw animation (balls drop one by one)
│   ├── result.js            # Match result, prizes, 3-draw game summary
│   ├── ritual.js            # 7-question personality quiz (builds Soul Profile)
│   ├── soul-profile.js      # Zodiac/element/soul number reveal after ritual
│   └── devmode.js           # Hidden dev simulator (tap Oracle eye 5× fast)
│
├── components/              # Reusable UI pieces
│   ├── oracle-eye.js        # SVG glowing orb with light physics
│   ├── jackpot-banner.js    # Fixed top banner (live jackpot amount from Firebase)
│   ├── user-avatar.js       # Top-right avatar button + wallet bottom-sheet
│   └── toast.js             # Queued "Oracle whisper" toasts at screen bottom
│
├── data/
│   └── quotes.js            # All Oracle text: opening quotes, whispers, result messages
│
├── styles/
│   ├── tokens.css           # Design tokens (colors, fonts, spacing, borders)
│   ├── animations.css       # CSS keyframe animations
│   ├── screens.css          # Screen-specific styles
│   └── components.css       # Component styles (buttons, balls, panels, toasts)
│
├── assets/
│   ├── fonts/               # Self-hosted Cormorant Garamond + Inter (woff2)
│   └── icons/               # PWA icons (72–512px)
│
└── dist/                    # Build output (generated, don't edit)
    ├── bundle.js            # Single minified JS bundle
    ├── index.html            # Processed HTML (script tag replaced)
    ├── sw.js                # SW with updated precache list
    ├── manifest.json
    ├── styles/
    └── assets/
```

---

## Boot Sequence

**File:** `main.js`

```
boot()
  ├── getDeviceId()              → generates/loads UUID from localStorage
  ├── loadState()                → loads game state from localStorage (or creates default)
  ├── initAnalytics()            → injects GA4 + Clarity scripts
  ├── initFirebase()             → Firebase Auth (anonymous) + starts heartbeat loop
  │   └── races against 3s timeout (app works offline)
  ├── First launch?
  │   ├── YES → markFirstLaunch() + fire evt_firstOpen
  │   └── NO  → fire evt_appOpen
  ├── processCheckIn()           → daily streak logic
  ├── Register service worker
  ├── initJackpotBanner()        → inject top banner + start 30s update cycle
  ├── initUserAvatar()           → inject avatar button + wallet panel
  ├── Init all screens           → each screen registers with router
  ├── initRouter('splash')       → show splash screen
  └── Hide loading overlay
```

---

## Screen Flow

```
┌──────────┐   4s auto    ┌───────────────┐   tap REVEAL   ┌────────┐
│  SPLASH  │ ──────────→  │ FIRST-REVEAL  │ ────────────→  │ REVEAL │
│ (eye anim)│              │ (6 numbers +  │                │(10s draw│
└──────────┘              │  quote + CTA) │                │animation)│
                          └───────────────┘                └────┬────┘
                                  ↑                              │
                                  │                              ▼
                           ┌──────┴───────┐               ┌──────────┐
                           │  NEW GAME    │←── draw 3 ──  │  RESULT  │
                           │  (loop back) │               │(per-draw │
                           └──────────────┘               │ prize +  │
                                  ↑                       │ progress)│
                                  │                       └────┬────┘
                          draw 1 or 2                          │
                          (auto-advance 3s)                    │
                                  │                            │
                                  └────────────────────────────┘
                                           │
                              after draw 3 with ritualTriggered
                                           │
                                           ▼
                                    ┌────────────┐     ┌──────────────┐
                                    │   RITUAL   │────→│ SOUL PROFILE │
                                    │ (7 questions│     │ (zodiac,     │
                                    │  cards)    │     │  element)    │
                                    └────────────┘     └──────────────┘
```

**Key points:**
- A "game" = 3 draws. Costs 30 entries.
- Draws 1 & 2 auto-advance to next draw after 3s on result screen.
- Draw 3 shows game summary + NEW GAME button.
- After draw 3 (if `drawCount >= 3` and ritual not done), ritual invitation appears.

---

## Architecture Overview

The app uses a simple layered architecture with no framework:

| Layer | Purpose | Dependencies |
|-------|---------|-------------|
| **config.js** | All constants | None |
| **core/** | Platform services (storage, routing, auth, analytics) | config |
| **engine/** | Pure game logic (draw, economy, streaks, numerology) | config, core/state |
| **components/** | Reusable DOM builders | core, engine |
| **screens/** | Full-screen views with lifecycle hooks | core, engine, components |
| **main.js** | Boot orchestration | Everything |

**Data flow:** All state mutations go through `core/state.js`. State is persisted to `localStorage` on every change. Firebase syncs are fire-and-forget (app works fully offline).

---

## Core Layer

### `core/device.js` — Device Identity & Platform Utilities

- **`getDeviceId()`** — Generates a UUID v4 on first launch, persists to localStorage under `fire_deviceId`. Used as the user identity everywhere (Firebase, analytics).
- **`store`** — Namespaced localStorage wrapper. All keys prefixed with `fire_`. Methods: `get(key)`, `set(key, value)`, `remove(key)`, `clear()`.
- **`unlockAudio()`** — iOS requires a user gesture before `AudioContext` works. Called on first tap (splash screen).
- **`haptic`** — Vibration patterns: `light()`, `medium()`, `heavy()`, `success()`, `error()`, `streak()`, `win()`.
- **`isFirstLaunch()` / `markFirstLaunch()`** — Checks/sets `fire_firstLaunchAt` in localStorage.

### `core/state.js` — Game State (Single Source of Truth)

**All state lives in a single JS object.** Every mutation goes through `updateState(partial)` which merges and persists to localStorage.

Key state fields:
```js
{
  drawCount,           // total draws ever
  drawHistory,         // last 200 draws (ring buffer)
  currentNumbers,      // 6 numbers currently loaded
  entries,             // play currency balance
  money,               // real money won (USD)
  entriesLedger,       // last 100 earn/spend transactions
  moneyLedger,         // last 100 money transactions
  gameActive,          // true during a 3-draw game
  gameDrawIndex,       // 0–3 (which draw in current game)
  gameResults,         // results for current game's draws
  jackpot,             // cached from Firebase
  checkInStreak,       // 0–7 daily streak
  lastCheckInDate,     // 'YYYY-MM-DD'
  consecutiveWinDraws, // for hat-trick detection
  ritualComplete,      // has user done the 7-question ritual?
  soulProfile,         // numerology profile (zodiac, weights, etc.)
  firstDrawDone,
  ritualTriggered,     // set true after draw 3
}
```

- **`loadState()`** — Loads from localStorage. If version mismatch, migrates critical fields.
- **`getState()`** — Returns current in-memory state.
- **`updateState(partial)`** — Merges, persists, trims drawHistory to 200.
- **`recordDraw(result)`** — Records a completed draw, advances game state, triggers ritual after draw 3.
- **`resetState()`** — Full reset (for testing).

### `core/router.js` — Screen Router

Simple screen manager. No hash routing. Screens register with `registerScreen({ id, el, onEnter, onExit })`.

- **`goto(screenId, params)`** — Exit current screen (remove `screen--active`, add `screen--exit`, call `onExit`), enter next (add `screen--active`, call `onEnter(params)` on next frame).
- **`currentScreen()`** — Returns current screen ID.
- Prevents double-navigation with `_transitioning` flag.

### `core/firebase.js` — Firebase Integration

Uses Firebase Auth (anonymous) + Realtime Database.

**Init flow:**
1. `initializeApp()` with config from `config.js`
2. `signInAnonymously()` — every device gets a unique anonymous UID
3. On auth ready: start heartbeat (30s interval), attach jackpot listener

**Key functions:**

| Function | What it does | RTDB path |
|----------|-------------|-----------|
| `heartbeat()` | Writes presence timestamp every 30s | `/presence/{deviceId}` |
| `getLiveUserCount()` | Counts devices with `lastSeen` within last 60s | `/presence` |
| `getJackpotBase()` | Reads admin-set base amount | `/config/jackpot_base` |
| `getJackpotPerUser()` | Reads admin-set per-user amount | `/config/jackpot_per_user` |
| `updateJackpot(liveCount)` | Calculates and writes current jackpot | `/jackpot/current` |
| `onJackpotChange(cb)` | Real-time listener on jackpot | `/jackpot/current` |
| `resetJackpot(deviceId, amount)` | Resets jackpot to base after 6/6 win | `/jackpot/*` |
| `syncUserToFirebase(deviceId, data)` | Syncs economy/profile data | `/users/{deviceId}/*` |

### `core/analytics.js` — GA4 + Microsoft Clarity

- Dynamically injects GA4 and Clarity scripts
- All events go through `fireEvent(name, params)` which enriches with `device_id`, `app_version`, `build_phase`, `timestamp_ms`
- Events queue until scripts load, then flush
- Screen views tracked via `fireScreen(screenName)` which fires to both GA4 and Clarity
- Named event helpers: `evt_firstOpen`, `evt_appOpen`, `evt_splashTapped`, `evt_drawResult`, `evt_gameStarted`, `evt_jackpotWon`, `evt_checkInStreak`, etc.

---

## Engine Layer

### `engine/draw.js` — Draw Engine & RNG

All randomness uses `crypto.getRandomValues()` (not `Math.random()`).

**Core functions:**

- **`normalDraw()`** — Fisher-Yates shuffle of [1..59], take first 6, sort.
- **`boostedDraw(playerNumbers, drawIndex)`** — First 3 draws use boosted RNG:
  - Draw 1: 90% chance of 3+ matches
  - Draw 2: 70% chance of 3+ matches
  - Draw 3: 50% chance of 3+ matches
  - When boosted: weighted choice of match count (50% get 3, 30% get 4, 14% get 5, 6% get 6)
  - Constructs a draw that contains exactly N of the player's numbers + random fillers
- **`oraclePick(soulProfile)`** — Generates player's 6 numbers. If Soul Profile exists, uses weighted random (numbers with higher weights are more likely). Otherwise, pure random.
- **`scoreDraw(playerNums, drawnNums, streakCount, multiplier)`** — Returns `{ matchCount, entries, isWin, tier }`. Win = 3+ matches. Tiers: gathering (0-2), building (2), triple (3), blazes (4+).
- **`computeNearMisses(playerNums, drawnNums)`** — For each unmatched player number, finds the closest drawn number. Used for "almost!" animations. Proximity: very_close (1-3), close (4-8), miss (9+).

### `engine/economy.js` — Economy System

Two currencies: **entries** (play currency) and **money** (USD).

**Prize table (per draw):**

| Matches | Entries | Money |
|---------|---------|-------|
| 0/6 | 0 | $0 |
| 1/6 | 0 | $0 |
| 2/6 | +10 | $0 |
| 3/6 | +60 | $0 |
| 4/6 | 0 | +$1.00 |
| 5/6 | 0 | +$100.00 |
| 6/6 | 0 | +jackpot |

**Game lifecycle:**
1. `canPlay()` — checks `entries >= 30` (ENTRIES_PER_GAME)
2. `startGame()` — deducts 30 entries, sets `gameActive: true`
3. After each draw: `applyDrawPrize(matchCount, jackpot)` — calculates prize, calls `earnEntries` or `earnMoney`
4. `completeGame()` — sets `gameActive: false`, returns totals

**Entry top-up:** When entries < 30, player gets +100 entries automatically (on entering first-reveal screen). This means the player can always play.

**All transactions:**
- Logged to `entriesLedger` / `moneyLedger` (last 100 each)
- Synced to Firebase fire-and-forget

### `engine/oracle.js` — Oracle Numerology Engine

Transforms ritual answers into a **Soul Profile** with weighted numbers.

**`buildSoulProfile(answers)`** takes:
- `dob` → zodiac sign → 6 lucky numbers per sign
- `name` → Pythagorean numerology (A=1, B=2... reduce to single digit)
- `element` (fire/water/earth/air) → set of associated numbers
- `colour` (8 options) → set of associated numbers
- `soulNumber` (1-59, user-chosen) → strongest weight + proximity decay
- `location` (americas/europe/asia/other) → set of associated numbers
- `tribe` (text, optional) → djb2 hash → 3 numbers

**Weight system:**
```
Base weight per number: 1.0
+ Zodiac lucky numbers: +2.0
+ Name harmonics (every 9th number from nameKey): +1.5
+ Element numbers: +1.0
+ Location numbers: +1.0
+ Colour numbers: +0.8
+ Tribe hash numbers: +0.5
+ Soul number: +3.0 (with proximity decay ±5 positions)
```

The weighted numbers array is stored in `soulProfile.weightedNumbers` and used by `oraclePick()` in `draw.js`.

### `engine/streak.js` — Streak System

**Daily check-in streak:**
- Called once per `boot()` via `processCheckIn()`
- Tracks consecutive days opened (compares `lastCheckInDate` to today)
- At 7 days: awards +30 entries (CHECKIN_STREAK_REWARD), resets to 0
- Missed a day? Resets to 1

**Draw win streak (hat-trick):**
- `processDrawStreak(isWin)` called after every draw
- Tracks consecutive win draws (3+ matches)
- Every 3 consecutive wins = hat-trick → +20 entries (HATRICK_BONUS_ENTRIES)
- Lose? Resets to 0

### `engine/audio.js` — Synthesized Audio

All sounds generated in real-time using **Web Audio API** oscillators. No .mp3 files.

**Named tones:**
- `drop` — soft low thud (ball enters grid)
- `match` — bright chime, pitch escalates with match count (C5→E6)
- `pause` — deep resonant drone (before final result)
- `win` — C major arpeggio burst
- `bigwin` — fuller orchestral hit (4+ matches)
- `streak` — fire crackle feel
- `nearmiss` — tense descending tone
- `tap` — clean click
- `reveal` — mystical shimmer

**Ambient drone:** Low-frequency sine/triangle layers with slight detuning. Starts during reveal, fades on result.

---

## Components

### `components/oracle-eye.js` — Oracle Eye (Glowing Orb)

SVG-based 3D sphere with radial gradients, catchlight, rim light, and glow halo. Created via `createOracleEye(sizeClass)` where size is `'xl'`, `'md'`, or `'sm'`.

- Each instance gets a unique SVG gradient ID (avoids conflicts)
- `animateEyeOpen(el)` — scales the orb from 0 to 1 with easing
- `setOracleEyeWin(el, isWin)` — toggles win-state CSS class

### `components/jackpot-banner.js` — Jackpot Banner

Fixed banner at top of `#app`. Shows live jackpot amount.

**Update cycle (every 30s):**
1. `getLiveUserCount()` — count active devices from `/presence`
2. `updateJackpot(liveCount)` — calculate: `min(JACKPOT_CAP, base + liveCount × perUser)`
3. Write result to `/jackpot/current`
4. `onJackpotChange` listener updates display with digit-roll animation

**Jackpot formula:**
```
current_jackpot = min(9,999,999, jackpot_base + (live_users × jackpot_per_user))
```
Where `jackpot_base` and `jackpot_per_user` come from Firebase `/config/` (fallback to config.js hardcoded values).

### `components/user-avatar.js` — Avatar & Wallet Panel

Top-right avatar button opens a bottom-sheet wallet panel showing:
- Entries balance + money won
- Soul Profile link (if ritual complete)
- Check-in streak dots (7-day visual)
- Hat-trick count
- Entries ledger (last 20 transactions)
- Money ledger (last 20 transactions)
- ENCASH button (disabled, future phase)

Dismissable by: overlay tap, swipe down (>80px).

### `components/toast.js` — Oracle Whispers

Queued, non-overlapping toasts at screen bottom. Used for Oracle commentary during gameplay.

---

## Screens

### `screens/splash.js` — Splash Screen
- Oracle eye scales in with animation
- Auto-advances to `first-reveal` after 4 seconds (no tap required)
- Fires `evt_splashTapped` analytics event

### `screens/first-reveal.js` — First Reveal
- Shows rotating Oracle quote (non-repeating from pool of 30+)
- Generates 6 numbers via `oraclePick(soulProfile)` — weighted if ritual done, random if not
- Stores numbers in state as `currentNumbers`
- **Top-up grant:** If entries < 30, automatically grants +100 entries
- REVEAL MY FATE button → unlocks audio (iOS), starts game (deducts 30 entries), navigates to `reveal`
- Shows profile link if ritual complete (tap → soul-profile view-only)

### `screens/reveal.js` — Draw Animation
- 10-second theatrical sequence
- Player's 6 numbers shown at top
- Drawn numbers appear one by one at staggered intervals (800ms, 1800ms, 2900ms, 3700ms, 5000ms, 6200ms)
- Matches: gold flash, haptic success, chime (pitch rises per match)
- Near-misses: wobble animation
- Whisper toasts update based on match progression
- Ambient drone plays throughout
- At 7.2s: dramatic pause tone
- At 8.2s: records draw, stops ambient, navigates to `result`

### `screens/result.js` — Result Screen
- Shows tier label, match count, prize
- Applies economy prize (`applyDrawPrize`)
- Processes draw streak (hat-trick detection)
- **Draws 1 & 2:** Shows progress dots (DRAW 1 OF 3), auto-advances to next `reveal` after 3s
- **Draw 3:** Shows game summary table (all 3 draws), celebration line, NEW GAME button
- Confetti particles on wins (25-60 particles based on tier)
- Ritual invitation appears after draw 3 if `ritualTriggered && !ritualComplete`
- Near-miss text shown between draws

### `screens/ritual.js` — Soul Ritual (7 Questions)
- Card-based UI (slides in from right, exits to left)
- Progress dots at top
- Close button → back to first-reveal

**Questions:**
1. **DOB** — day/month/year selects → zodiac calculation
2. **Name** — text input (required) → Pythagorean numerology
3. **Location** — tile grid (Americas/Europe/Asia/Everywhere)
4. **Element** — tile grid (Fire/Water/Earth/Air)
5. **Colour** — color swatches (8 options)
6. **Soul Number** — stepper (1-59, hold for fast increment)
7. **Tribe** — text input (optional, skippable)

On complete: `buildSoulProfile(answers)` → save to state → navigate to `soul-profile`.

### `screens/soul-profile.js` — Soul Profile Reveal
- Shows zodiac sign, element, soul number
- Oracle personality description
- Top 12 weighted numbers from Soul Profile
- BEGIN YOUR JOURNEY button → back to first-reveal
- Can be revisited (view-only mode) from wallet panel

---

## Firebase & Database

**Project:** `grhf-d2b67`
**Database URL:** `https://grhf-d2b67-default-rtdb.firebaseio.com`
**Auth:** Anonymous sign-in (auto, no user interaction)

### RTDB Structure

```
/
├── config/
│   ├── jackpot_base: 100           # Admin-controlled base jackpot amount
│   └── jackpot_per_user: 5         # Amount added per live user
│
├── jackpot/
│   ├── current: <number>           # Live jackpot (recalculated every 30s)
│   ├── lastWonAt: <timestamp>      # When someone last hit 6/6
│   └── lastWonBy: <deviceId>       # Who won it
│
├── presence/
│   └── {deviceId}/
│       ├── lastSeen: <timestamp>   # Updated every 30s heartbeat
│       └── deviceId: <string>
│
└── users/
    └── {deviceId}/
        └── economy/
            ├── entries: <number>
            └── money: <number>
```

### How Jackpot Updates

1. `jackpot-banner.js` runs `_runUpdateCycle()` every 30 seconds
2. It calls `getLiveUserCount()` → counts `/presence` entries with `lastSeen` within 60s
3. It calls `updateJackpot(liveCount)`:
   - Fetches `jackpot_base` from `/config/jackpot_base` (fallback: 100)
   - Fetches `jackpot_per_user` from `/config/jackpot_per_user` (fallback: 5)
   - Calculates: `min(9,999,999, base + liveCount × perUser)`
   - Writes result to `/jackpot/current`
4. `onJackpotChange` Firebase listener updates the banner in real-time on all clients
5. On 6/6 win: `resetJackpot()` resets `/jackpot/current` back to base

### Changing Jackpot Values

To change jackpot from Firebase Console:
1. Go to Realtime Database
2. Navigate to `/config`
3. Edit `jackpot_base` and/or `jackpot_per_user`
4. Changes take effect within 30 seconds (next update cycle)

---

## Build & Deploy

### Development

```bash
npm run dev          # serves source files on port 3001 (bare imports won't work in browser)
```

**For local testing, always serve the built output:**
```bash
node build.js
npx serve dist -l 3001
```

### Build Process (`build.js`)

1. **Clean** `dist/` directory
2. **Bundle** `main.js` via esbuild → `dist/bundle.js` (minified, ES2020, ~330KB)
   - esbuild resolves all bare imports (`firebase/app`, etc.) from `node_modules/`
   - All modules bundled into single IIFE
3. **Process** `index.html` → replaces inline `<script type="module">` with `<script src="/bundle.js" defer>`
4. **Generate** `dist/sw.js` → replaces PRECACHE_ASSETS with production list (bundle.js instead of individual source files)
5. **Copy** static files: `manifest.json`, `styles/`, `assets/`

### Deploy

```bash
npm run deploy       # builds + deploys to Firebase Hosting
# equivalent to: node build.js && firebase deploy --only hosting:grhf-th-2
```

**Firebase Hosting target:** `grhf-th-2` (configured in `.firebaserc`)

### Important: Source vs Dist

- **Source files** (root) use ES module imports like `import { x } from 'firebase/app'` — browsers can't resolve bare specifiers, so source files **cannot be served directly**
- **dist/** has everything bundled into `bundle.js` — this is what gets served and deployed
- Always `node build.js` before testing locally

---

## CSS Architecture

### `styles/tokens.css` — Design Tokens

All visual constants as CSS custom properties:

```css
--bg: #1C3610;              /* Page background (forest green) */
--bg2, --bg3, --bg4         /* Progressively lighter backgrounds */
--glass                     /* Glass-morphism overlay */
--gold: #ffffff;            /* Accent color (white in blue/forest theme) */
--gold-bright, --gold-dim   /* Accent variants */
--fire: #ffffff;            /* Secondary accent */
--text, --text2, --text3    /* Text hierarchy */
--font-serif                /* Cormorant Garamond */
--font-sans                 /* Inter */
```

**Note:** In the original `fire-pwa`, `--gold` is actual gold (#D4A843) and `--bg` is black (#060504). The "blue" variant replaces gold with white and black with forest green. All other code is identical.

### `styles/animations.css` — Keyframes
- `eyePulse`, `anim-float`, `fadeIn`, `slideUp`, `confettiFall`, etc.

### `styles/screens.css` — Screen Layouts
- `.screen` base (fixed, full-viewport, hidden by default)
- `.screen--active` / `.screen--exit` transitions
- Per-screen styles: `.splash__*`, `.first-reveal__*`, `.reveal__*`, `.result__*`, `.ritual__*`, `.soul-profile__*`

### `styles/components.css` — Components
- `.num-ball` (number circles with size/state variants)
- `.reveal-btn` (glowing CTA button)
- `.jackpot-banner__*`
- `.wallet-panel__*`, `.wallet-stat__*`, `.wallet-ledger__*`
- `.toast`, `.toast--exit`
- `.game-summary__*`, `.game-end__*`
- `.confetti-particle`

---

## Dev Mode

**File:** `screens/devmode.js`

**Trigger:** Tap the Oracle eye on the result screen 5 times fast (within 1.5s).

**Features:**
- Force any match count (0–6) for next draw
- View current state (draws, game progress, streak, entries, money, ritual status)
- Actions: Reset Streak, Set Streak 5, Reset Draw Count, Give Shield
- Works in production (no DEBUG flag required)

**How forced draws work:**
1. Sets `_devForceMatches` in state
2. `reveal.js` checks `getDevForceMatches()` before each draw
3. If set, `_constructForcedDraw()` builds a draw with exactly N matches
4. Value is consumed (one-time use)

---

## Config Reference

**File:** `config.js`

| Key | Value | Description |
|-----|-------|-------------|
| `GA_MEASUREMENT_ID` | `G-6X7LSQCBKW` | Google Analytics 4 ID |
| `CLARITY_PROJECT_ID` | `vyaup7qul1` | Microsoft Clarity ID |
| `FIREBASE` | `{...}` | Firebase project config |
| `APP_VERSION` | `2.0.0` | Used for state migration |
| `BUILD_PHASE` | `3` | Current feature phase |
| `DRAW_POOL_SIZE` | `59` | Numbers 1–59 |
| `DRAW_PICK_COUNT` | `6` | 6 numbers per draw |
| `BOOSTED_DRAWS` | `3` | First 3 draws use boosted RNG |
| `BOOST_ODDS` | `[0.90, 0.70, 0.50]` | Boost probability per draw |
| `STARTING_ENTRIES` | `100` | Top-up grant when entries < game cost |
| `ENTRIES_PER_DRAW` | `10` | Cost per individual draw |
| `ENTRIES_PER_GAME` | `30` | Cost per 3-draw game |
| `CHECKIN_STREAK_REWARD` | `30` | Entries for 7-day streak |
| `HATRICK_BONUS_ENTRIES` | `20` | Entries for 3 consecutive wins |
| `JACKPOT_BASE` | `100` | Fallback base jackpot (Firebase overrides) |
| `JACKPOT_CAP` | `9,999,999` | Maximum jackpot |
| `JACKPOT_PER_USER` | `5` | Jackpot increase per live user (Firebase overrides) |
| `STREAK_WIN_THRESHOLD` | `3` | Matches needed to count as a "win" |
| `DEBUG` | `true` | Console logging (set false for prod) |

---

## Two App Variants

There are two identical codebases with only cosmetic differences:

| | `fire-pwa` (original) | `fire-pwa-blue` |
|---|---|---|
| **Theme** | Dark luxury (black + gold) | Forest (green + white) |
| **Background** | `#060504` (near-black) | `#1C3610` (dark green) |
| **Accent** | `#D4A843` (gold) | `#ffffff` (white) |
| **SW cache** | `fire-v3.3.2` | `forest-v3.2.6` |
| **Firebase target** | default | `grhf-th-2` |
| **Icons** | Gold-themed | Green-themed |

All game logic, screens, engines, and Firebase config are identical.
