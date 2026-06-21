// ─────────────────────────────────────────────────────────────
// FIRE PWA — Configuration
// ─────────────────────────────────────────────────────────────

export const CONFIG = {
  // ── Analytics ──────────────────────────────────────────────
  GA_MEASUREMENT_ID: 'G-M9ZDYR0WFS',
  CLARITY_PROJECT_ID: 'vyaup7qul1',

  // ── Firebase ───────────────────────────────────────────────
  FIREBASE: {
    apiKey: 'AIzaSyALhVaQXUE-QU_ubt9gS9A5zSa1sO20P5U',
    authDomain: 'fire-1353f.firebaseapp.com',
    databaseURL: 'https://fire-1353f-default-rtdb.firebaseio.com',
    projectId: 'fire-1353f',
    storageBucket: 'fire-1353f.firebasestorage.app',
    messagingSenderId: '623187298217',
    appId: '1:623187298217:web:843fe56307d76f4185e6b8',
    vapidKey: '__FIREBASE_VAPID_KEY__',  // Phase 5 — push notifications
  },

  // ── App ────────────────────────────────────────────────────
  APP_NAME: 'FIRE',
  APP_VERSION: '2.0.0',
  BUILD_PHASE: 3,

  // ── Draw Engine ────────────────────────────────────────────
  DRAW_POOL_SIZE: 27,    // numbers 1–27 (matches prize table)
  DRAW_PICK_COUNT: 6,    // 6 numbers per draw
  BOOSTED_DRAWS: 3,      // first N draws use boosted RNG

  // Boosted match probability targets (chance of 3+ matches)
  BOOST_ODDS: [0.90, 0.70, 0.50],  // draw 1, 2, 3

  // ── Active Play (spin-the-ball draw interaction) ──────────
  // Cosmetic illusion-of-control over the draw. The number is ALWAYS
  // predetermined (boostedDraw/adaptiveDraw); gestures never change it.
  // REVERSIBILITY: ACTIVE_PLAY.ENABLED=false restores the classic drop
  // loop (fully preserved as the `else` branch in screens/reveal.js).
  // To remove entirely: set ENABLED=false (kill), or delete
  // screens/reveal-spin.js + styles/active-play.css and the branch.
  ACTIVE_PLAY_LANDING_VARIANT: 'A',  // 'A' foreshadow win | 'B' identical-until-legible
  ACTIVE_PLAY: {
    ENABLED: true,
    IDLE_SETTLE_MS: 2000,   // auto-settle after this much NO interaction (× pace); resets on every touch
    SETTLE_MS: 850,         // do-nothing decel duration (× pace) — gradual roulette wind-down
    HARD_LOCK_MS: 400,      // press-to-lock decel — quadratic, long enough to read as a roll-to-stop
    DECEL_CELLS: 4,         // reel rolls this many cells during decel (fixed → slow enough to never alias)
    LOCK_HOLD_MS: 200,      // beat between a ball locking and the next ball spinning
    SWIPE_DX_MIN: 18,       // horizontal px before a swipe registers
    SWIPE_GAIN: 0.010,      // px/ms velocity added per px swiped
    MAX_KINETIC: 3.0,       // px/ms momentum cap above cruise
    KINETIC_DECAY: 0.94,    // per-16ms-frame momentum decay toward cruise
    CRUISE_VELOCITY: 0.55,  // px/ms baseline spin (legible blur)
    MAX_BLUR: 3.5,          // px, legible-blur cap
    BLUR_K: 2.2,            // blur px per (px/ms) of velocity
    CYCLE_LEN: 27,          // numerals per reel cycle (= pool size → every number shows, max diversity)
    PAUSE_TO_RESULT_MS: 1500,
    REVERSE_SPIN: false,    // optional flourish: left-swipe slows then reverses (default off)
  },

  // ── Economy ────────────────────────────────────────────────
  STARTING_ENTRIES: 100,          // granted whenever entries hit 0
  ENTRIES_PER_DRAW: 10,           // cost per draw
  ENTRIES_PER_GAME: 30,           // cost per game (3 draws)
  CHECKIN_STREAK_REWARD: 30,      // entries awarded at 7-day streak
  HATRICK_BONUS_ENTRIES: 20,      // entries awarded for 3 consecutive win draws
  JACKPOT_BASE: 1000,             // fallback if Firebase unreachable
  JACKPOT_CAP: 9999999,
  JACKPOT_PER_USER: 1,            // added per live concurrent user

  // ── Streak ─────────────────────────────────────────────────
  STREAK_WIN_THRESHOLD: 3,        // matches needed to count as a win draw

  // ── Oracle LLM ─────────────────────────────────────────────
  ORACLE_API_URL: '/api/oracle',

  // ── Debug ──────────────────────────────────────────────────
  DEBUG: true,  // set false before production
};
