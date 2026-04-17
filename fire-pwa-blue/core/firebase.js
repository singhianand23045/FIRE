import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, serverTimestamp } from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { CONFIG } from '../config.js';
import { getDeviceId } from './device.js';

let _app = null;
let _db = null;
let _auth = null;
let _heartbeatTimer = null;
let _initialized = false;

export function initFirebase() {
  return new Promise((resolve) => {
    try {
      _app = initializeApp(CONFIG.FIREBASE);
      _db = getDatabase(_app);
      _auth = getAuth(_app);

      onAuthStateChanged(_auth, (user) => {
        if (user) {
          if (CONFIG.DEBUG) console.log(`[FIRE][Firebase] Initialized. User: ${user.uid}`);
          if (!_initialized) {
            _initialized = true;
            _heartbeatTimer = setInterval(() => heartbeat(), 30000);
            heartbeat();
            onJackpotChange((amount) => {
              if (CONFIG.DEBUG) console.log(`[FIRE][Firebase] Jackpot changed: ${amount}`);
            });
            resolve(user);
          }
        }
      });

      signInAnonymously(_auth).catch((err) => {
        if (CONFIG.DEBUG) console.warn('[FIRE][Firebase] Anonymous sign-in failed:', err);
        resolve(null);
      });
    } catch (err) {
      if (CONFIG.DEBUG) console.warn('[FIRE][Firebase] Init error:', err);
      resolve(null);
    }
  });
}

export async function heartbeat() {
  try {
    const deviceId = getDeviceId();
    await set(ref(_db, `/presence/${deviceId}`), {
      lastSeen: Date.now(),
      deviceId,
    });
    if (CONFIG.DEBUG) console.log('[FIRE][Firebase] Presence heartbeat written');
  } catch (err) {
    if (CONFIG.DEBUG) console.warn('[FIRE][Firebase] Heartbeat error:', err);
  }
}

export async function getLiveUserCount() {
  try {
    const snapshot = await get(ref(_db, '/presence'));
    if (!snapshot.exists()) return 1;
    const now = Date.now();
    const cutoff = now - 60000;
    let count = 0;
    snapshot.forEach((child) => {
      const entry = child.val();
      if (entry && entry.lastSeen > cutoff) count++;
    });
    const result = Math.max(1, count);
    if (CONFIG.DEBUG) console.log(`[FIRE][Firebase] Live user count: ${result}`);
    return result;
  } catch (err) {
    if (CONFIG.DEBUG) console.warn('[FIRE][Firebase] getLiveUserCount error:', err);
    return 1;
  }
}

export async function getJackpotBase() {
  try {
    const snapshot = await get(ref(_db, '/config/jackpot_base'));
    const amount = snapshot.exists() ? snapshot.val() : CONFIG.JACKPOT_BASE;
    if (CONFIG.DEBUG) console.log(`[FIRE][Firebase] Jackpot base from admin: ${amount}`);
    return amount;
  } catch (err) {
    if (CONFIG.DEBUG) console.warn('[FIRE][Firebase] getJackpotBase error:', err);
    return CONFIG.JACKPOT_BASE;
  }
}

export async function getJackpotPerUser() {
  try {
    const snapshot = await get(ref(_db, '/config/jackpot_per_user'));
    const amount = snapshot.exists() ? snapshot.val() : CONFIG.JACKPOT_PER_USER;
    if (CONFIG.DEBUG) console.log(`[FIRE][Firebase] Jackpot per user from admin: ${amount}`);
    return amount;
  } catch (err) {
    if (CONFIG.DEBUG) console.warn('[FIRE][Firebase] getJackpotPerUser error:', err);
    return CONFIG.JACKPOT_PER_USER;
  }
}

export async function updateJackpot(liveCount) {
  try {
    const base = await getJackpotBase();
    const perUser = await getJackpotPerUser();
    const amount = Math.min(CONFIG.JACKPOT_CAP, base + (liveCount * perUser));
    await set(ref(_db, '/jackpot/current'), amount);
    if (CONFIG.DEBUG) console.log(`[FIRE][Firebase] Jackpot updated: ${amount} (${liveCount} live users)`);
    return amount;
  } catch (err) {
    if (CONFIG.DEBUG) console.warn('[FIRE][Firebase] updateJackpot error:', err);
    return CONFIG.JACKPOT_BASE;
  }
}

export function onJackpotChange(callback) {
  try {
    onValue(ref(_db, '/jackpot/current'), (snapshot) => {
      try {
        const amount = snapshot.val();
        if (amount !== null) callback(amount);
      } catch (err) {
        if (CONFIG.DEBUG) console.warn('[FIRE][Firebase] onJackpotChange callback error:', err);
      }
    });
    if (CONFIG.DEBUG) console.log('[FIRE][Firebase] Jackpot listener attached');
  } catch (err) {
    if (CONFIG.DEBUG) console.warn('[FIRE][Firebase] onJackpotChange error:', err);
  }
}

export async function resetJackpot(deviceId, wonAmount) {
  try {
    const base = await getJackpotBase();
    await set(ref(_db, '/jackpot/current'), base);
    await set(ref(_db, '/jackpot/lastWonAt'), Date.now());
    await set(ref(_db, '/jackpot/lastWonBy'), deviceId);
    if (CONFIG.DEBUG) console.log(`[FIRE][Firebase] Jackpot RESET after 6/6 win by ${deviceId}. Was $${wonAmount}`);
  } catch (err) {
    if (CONFIG.DEBUG) console.warn('[FIRE][Firebase] resetJackpot error:', err);
  }
}

export function isFirebaseReady() {
  return _initialized;
}

// ── Mood debug sync (for remote dashboard) ──────────────────
let _lastMoodSync = 0;
const MOOD_SYNC_THROTTLE = 1000; // max once per second

export function syncMoodDebug(deviceId, data) {
  if (!_initialized) return;
  const now = Date.now();
  if (now - _lastMoodSync < MOOD_SYNC_THROTTLE) return;
  _lastMoodSync = now;
  set(ref(_db, `/debug/${deviceId}`), { ...data, updatedAt: now })
    .catch(err => {
      if (CONFIG.DEBUG) console.warn('[FIRE][Firebase] syncMoodDebug error:', err);
    });
}

export async function syncUserToFirebase(deviceId, data) {
  if (!_initialized) return; // skip silently until auth is ready
  try {
    const writes = Object.entries(data).map(([key, value]) =>
      set(ref(_db, `/users/${deviceId}/${key}`), value)
    );
    await Promise.all(writes);
    if (CONFIG.DEBUG) console.log(`[FIRE][Firebase] User synced: ${Object.keys(data).join(', ')}`);
  } catch (err) {
    if (CONFIG.DEBUG) console.warn('[FIRE][Firebase] syncUserToFirebase error:', err);
  }
}
