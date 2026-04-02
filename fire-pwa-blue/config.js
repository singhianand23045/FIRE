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
  DRAW_POOL_SIZE: 59,    // numbers 1–59 (matches prize table)
  DRAW_PICK_COUNT: 6,    // 6 numbers per draw
  BOOSTED_DRAWS: 3,      // first N draws use boosted RNG

  // Boosted match probability targets (chance of 3+ matches)
  BOOST_ODDS: [0.90, 0.70, 0.50],  // draw 1, 2, 3

  // ── Economy ────────────────────────────────────────────────
  STARTING_ENTRIES: 100,          // granted whenever entries hit 0
  ENTRIES_PER_DRAW: 10,           // cost per draw
  ENTRIES_PER_GAME: 30,           // cost per game (3 draws)
  CHECKIN_STREAK_REWARD: 30,      // entries awarded at 7-day streak
  HATRICK_BONUS_ENTRIES: 20,      // entries awarded for 3 consecutive win draws
  JACKPOT_BASE: 100,              // fallback if Firebase unreachable
  JACKPOT_CAP: 9999999,
  JACKPOT_PER_USER: 5,            // added per live concurrent user

  // ── Streak ─────────────────────────────────────────────────
  STREAK_WIN_THRESHOLD: 3,        // matches needed to count as a win draw

  // ── Debug ──────────────────────────────────────────────────
  DEBUG: true,  // set false before production
};
