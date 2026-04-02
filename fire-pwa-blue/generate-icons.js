// ─────────────────────────────────────────────────────────────
// FIRE PWA — Icon Generator (Forest Oracle theme)
// Run once: node generate-icons.js
// Requires: npm install canvas
// ─────────────────────────────────────────────────────────────

const { createCanvas } = require('canvas');
const fs   = require('fs');
const path = require('path');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUT   = path.join(__dirname, 'assets', 'icons');

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx    = canvas.getContext('2d');
  const cx     = size / 2;
  const cy     = size / 2;
  const r      = size / 2;

  // ── Background — forest green ─────────────────────────────
  const bg = ctx.createRadialGradient(cx, cy * 0.6, 0, cx, cy, r * 1.2);
  bg.addColorStop(0, '#3A6022');
  bg.addColorStop(1, '#1C3610');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // ── Glowing Orb (green-white light physics) ───────────────
  const orbR = size * 0.28;
  const orbX = cx;
  const orbY = cy * 0.82;

  // Ambient glow
  const ambGlow = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, orbR * 1.8);
  ambGlow.addColorStop(0,   'rgba(255,255,255,0.18)');
  ambGlow.addColorStop(0.6, 'rgba(255,255,255,0.05)');
  ambGlow.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = ambGlow;
  ctx.beginPath();
  ctx.arc(orbX, orbY, orbR * 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Main sphere — light from top-left
  const sphere = ctx.createRadialGradient(
    orbX - orbR * 0.22, orbY - orbR * 0.25, 0,
    orbX, orbY, orbR
  );
  sphere.addColorStop(0,    'rgba(255,255,255,0.98)');
  sphere.addColorStop(0.12, '#e8f5e0');
  sphere.addColorStop(0.35, '#a8d890');
  sphere.addColorStop(0.65, '#3a6a1c');
  sphere.addColorStop(0.85, '#1a3a08');
  sphere.addColorStop(1,    '#000000');

  ctx.save();
  ctx.shadowColor = 'rgba(255,255,255,0.35)';
  ctx.shadowBlur  = size * 0.07;
  ctx.fillStyle   = sphere;
  ctx.beginPath();
  ctx.arc(orbX, orbY, orbR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Rim light
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth   = size * 0.005;
  ctx.beginPath();
  ctx.arc(orbX, orbY, orbR, 0, Math.PI * 2);
  ctx.stroke();

  // Catchlight ellipse
  ctx.save();
  ctx.translate(orbX - orbR * 0.22, orbY - orbR * 0.25);
  ctx.rotate(-0.44);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 0, orbR * 0.22, orbR * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Catchlight dot
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.beginPath();
  ctx.arc(orbX - orbR * 0.28, orbY - orbR * 0.30, size * 0.022, 0, Math.PI * 2);
  ctx.fill();

  // ── FIRE text ─────────────────────────────────────────────
  const fontSize = size * 0.18;
  ctx.font         = `300 ${fontSize}px serif`;
  ctx.fillStyle    = '#ffffff';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor  = 'rgba(255,255,255,0.4)';
  ctx.shadowBlur   = size * 0.04;
  ctx.fillText('FIRE', cx, cy + size * 0.34);

  return canvas;
}

SIZES.forEach(size => {
  const canvas = drawIcon(size);
  const buf    = canvas.toBuffer('image/png');
  const file   = path.join(OUT, `icon-${size}.png`);
  fs.writeFileSync(file, buf);
  console.log(`✓ icon-${size}.png`);
});

console.log('\n✅ All icons generated in assets/icons/');
