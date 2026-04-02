// ─────────────────────────────────────────────────────────────
// FIRE PWA — Oracle Eye Component (Glowing Orb)
// 3D sphere with full light physics — catchlight, rim light, depth.
// ─────────────────────────────────────────────────────────────

let _orbId = 0;

export function createOracleEye(sizeClass = 'xl') {
  const id = ++_orbId; // unique per instance — avoids SVG gradient ID conflicts

  const wrap = document.createElement('div');
  wrap.className = `oracle-eye oracle-eye--${sizeClass}`;

  wrap.innerHTML = `
    <svg class="oracle-eye__orb" viewBox="0 0 110 110" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="orb-main-${id}" cx="38%" cy="32%" r="65%">
          <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.98"/>
          <stop offset="12%"  stop-color="#e8f5e0"/>
          <stop offset="35%"  stop-color="#a8d890"/>
          <stop offset="65%"  stop-color="#3a6a1c"/>
          <stop offset="85%"  stop-color="#1a3a08"/>
          <stop offset="100%" stop-color="#000"/>
        </radialGradient>
        <radialGradient id="orb-glow-${id}" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="rgba(255,255,255,0.20)"/>
          <stop offset="60%"  stop-color="rgba(255,255,255,0.06)"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
        </radialGradient>
        <filter id="orb-blur-${id}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <!-- Ambient glow -->
      <circle class="orb-ambient" cx="55" cy="55" r="50" fill="url(#orb-glow-${id})"/>
      <!-- Halo bloom -->
      <circle class="orb-halo" cx="55" cy="55" r="34"
        fill="rgba(255,255,255,0.10)" filter="url(#orb-blur-${id})"/>
      <!-- Main sphere -->
      <circle class="orb-sphere" cx="55" cy="55" r="32" fill="url(#orb-main-${id})"/>
      <!-- Rim light -->
      <circle cx="55" cy="55" r="32" fill="none"
        stroke="rgba(255,255,255,0.20)" stroke-width="1"/>
      <!-- Catchlight -->
      <ellipse cx="45" cy="44" rx="7" ry="5"
        fill="rgba(255,255,255,0.35)" transform="rotate(-25,45,44)"/>
      <circle class="orb-catchlight" cx="42" cy="41" r="2.5"
        fill="rgba(255,255,255,0.70)"/>
    </svg>
  `;

  return wrap;
}

export function setOracleEyeWin(eyeEl, isWin) {
  if (isWin) {
    eyeEl.classList.add('oracle-eye--win');
  } else {
    eyeEl.classList.remove('oracle-eye--win');
  }
}

// Orb manifests from nothing — spring scale-in
export function animateEyeOpen(eyeEl) {
  const orb = eyeEl.querySelector('.oracle-eye__orb');
  orb.style.transform = 'scale(0.04)';
  orb.style.opacity = '0';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      orb.style.transition = 'transform 1.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.5s ease';
      orb.style.transform = 'scale(1)';
      orb.style.opacity = '1';

      setTimeout(() => {
        orb.style.transition = '';
      }, 1600);
    });
  });
}
