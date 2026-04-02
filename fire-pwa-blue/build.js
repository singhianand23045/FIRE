// ── FIRE PWA (Blue) — Build script ───────────────────────────
// Bundles source → dist/ for production deployment.
// Usage: node build.js
// ─────────────────────────────────────────────────────────────

const { execSync }    = require('child_process');
const { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, copyFileSync } = require('fs');
const path            = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

// ── 1. Clean dist/ ────────────────────────────────────────────
console.log('Cleaning dist/...');
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

// ── 2. Bundle + minify JS via esbuild ────────────────────────
console.log('Bundling JS...');
execSync(
  `npx esbuild main.js --bundle --minify --platform=browser --target=es2020 --outfile=${path.join(DIST, 'bundle.js')}`,
  { stdio: 'inherit', cwd: ROOT }
);

// ── 3. Process index.html ─────────────────────────────────────
console.log('Processing index.html...');
let html = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
html = html.replace(
  /<script type="module">[\s\S]*?<\/script>/,
  '<script src="/bundle.js" defer></script>'
);
writeFileSync(path.join(DIST, 'index.html'), html);

// ── 4. Generate dist/sw.js with bundled PRECACHE_ASSETS ───────
console.log('Generating sw.js...');
let sw = readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const bundledPrecache = `const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/bundle.js',
  '/manifest.json',

  // Styles
  '/styles/tokens.css',
  '/styles/animations.css',
  '/styles/screens.css',
  '/styles/components.css',

  // Fonts
  '/assets/fonts/CormorantGaramond-Light.woff2',
  '/assets/fonts/CormorantGaramond-LightItalic.woff2',
  '/assets/fonts/CormorantGaramond-Regular.woff2',
  '/assets/fonts/Inter-Regular.woff2',
  '/assets/fonts/Inter-Medium.woff2',
  '/assets/fonts/Inter-SemiBold.woff2',

  // Icons
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
];`;
sw = sw.replace(/const PRECACHE_ASSETS = \[[\s\S]*?\];/, bundledPrecache);
writeFileSync(path.join(DIST, 'sw.js'), sw);

// ── 5. Copy static files ──────────────────────────────────────
console.log('Copying static files...');
copyFileSync(path.join(ROOT, 'manifest.json'), path.join(DIST, 'manifest.json'));
cpSync(path.join(ROOT, 'styles'),  path.join(DIST, 'styles'),  { recursive: true });
cpSync(path.join(ROOT, 'assets'),  path.join(DIST, 'assets'),  { recursive: true });

console.log('\n✓ Build complete → dist/');
console.log('  Run: firebase deploy --only hosting:grhf-th-2');
