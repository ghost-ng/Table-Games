// Post-processes `expo export -p web` output in dist/ into an installable, offline-capable PWA:
//   - injects manifest / icon / iOS meta tags and the service-worker bootstrap into index.html
//   - generates dist/sw.js with a precache list of every exported file
//   - copies index.html to 404.html so static hosts (GitHub Pages) serve the SPA for deep links
//
// Honors EXPO_BASE_URL (e.g. "/Table-Games") the same way app.config.js does.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertFontLicenses, FONT_LICENSE_FILES } from './font-licenses.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const base = (process.env.EXPO_BASE_URL ?? '').replace(/\/+$/, '') + '/';

// Expo copies public/ into dist/. Refuse an artifact that drops/changes font terms.
const fonts = readdirSync(join(root, 'assets/fonts')).filter(file => file.endsWith('.ttf')).map(file => `assets/fonts/${file}`);
assertFontLicenses(path => readFileSync(join(root, path)), fonts);
for (const path of FONT_LICENSE_FILES) {
  try {
    if (!readFileSync(join(dist, path.slice('public/'.length))).equals(readFileSync(join(root, path)))) {
      throw new Error('Different bytes');
    }
  } catch {
    throw new Error(`Built font license file is missing or differs from source: ${path}`);
  }
}

const SKIP = new Set(['sw.js', '404.html', 'metadata.json']);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

// --- index.html -----------------------------------------------------------
const indexPath = join(dist, 'index.html');
let html = readFileSync(indexPath, 'utf8');

if (html.includes('rel="manifest"')) {
  console.error('[build-pwa] dist/index.html is already processed — run `expo export` first.');
  process.exit(1);
}

html = html.replace(
  /<meta name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />'
);

const head = `
    <meta name="description" content="Classic table games you can play solo or pass-and-play, fully offline." />
    <meta name="theme-color" content="#243A49" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Table Games" />
    <link rel="manifest" href="${base}manifest.webmanifest" />
    <link rel="apple-touch-icon" href="${base}icons/apple-touch-icon.png" />
    <link rel="icon" type="image/png" sizes="32x32" href="${base}icons/favicon-32.png" />
    <style id="pwa-reset">
      html, body { overscroll-behavior: none; }
      body { -webkit-tap-highlight-color: transparent; touch-action: manipulation; -webkit-user-select: none; user-select: none; }
      input, textarea { -webkit-user-select: text; user-select: text; }
    </style>
    <script>
      // Capture the install prompt before React mounts; src/pwa/usePwa.ts picks it up.
      window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        window.__pwaInstallEvent = e;
        window.dispatchEvent(new Event('pwa:change'));
      });
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('${base}sw.js', { scope: '${base}' }).then(function (reg) {
            window.__pwaRegistration = reg;
            window.dispatchEvent(new Event('pwa:change'));
          }).catch(function (err) { console.warn('[pwa] service worker registration failed', err); });
        });
      }
    </script>
`;
html = html.replace('</head>', head + '  </head>');
writeFileSync(indexPath, html);
copyFileSync(indexPath, join(dist, '404.html'));

// --- sw.js ----------------------------------------------------------------
const files = walk(dist)
  .map((f) => relative(dist, f).split(sep).join('/'))
  .filter((f) => !SKIP.has(f))
  .sort();

const hash = createHash('sha256');
for (const f of files) hash.update(f).update(readFileSync(join(dist, f)));
const version = hash.digest('hex').slice(0, 12);

const sw = readFileSync(join(root, 'scripts', 'sw.template.js'), 'utf8')
  .replace('__VERSION__', version)
  .replace('__PRECACHE__', JSON.stringify(files, null, 2));
writeFileSync(join(dist, 'sw.js'), sw);

const bytes = files.reduce((sum, f) => sum + statSync(join(dist, f)).size, 0);
console.log(
  `[build-pwa] base=${base} version=${version} precache=${files.length} files (${(bytes / 1024 / 1024).toFixed(1)} MB)`
);
