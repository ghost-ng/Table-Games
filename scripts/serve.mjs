// Minimal static server for previewing the production PWA build in dist/.
// Unknown paths fall back to index.html, mirroring how the SPA is hosted.
// Usage: node scripts/serve.mjs [port] [--base /Table-Games/]
// The base defaults to EXPO_BASE_URL or /. Localhost supports service workers.
import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { join, extname, dirname, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

function decodePath(path) {
  if (!path.startsWith('/')) throw new Error('Expected an absolute URL path');
  return path.split('/').map((segment) => {
    const decoded = decodeURIComponent(segment);
    if (decoded === '.' || decoded === '..' || /[/\\\u0000-\u001f\u007f]/.test(decoded)) {
      throw new Error('Unsafe URL path');
    }
    return decoded;
  }).join('/');
}

const args = process.argv.slice(2);
const rawPort = args.length && args[0] !== '--base' ? args.shift() : process.env.PORT ?? '4173';
if (args.length && (args.length !== 2 || args[0] !== '--base')) {
  throw new Error('Usage: node scripts/serve.mjs [port] [--base /Table-Games/]');
}
const configuredBase = args[1] ?? process.env.EXPO_BASE_URL ?? '/';
if (/[?#]/.test(configuredBase)) throw new Error('Base must be a URL path without a query or fragment');
const base = `${decodePath(configuredBase || '/').replace(/\/+$/, '')}/`;
const port = Number(rawPort);
if (!/^\d+$/.test(String(rawPort)) || !Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error('Port must be a numeric value between 0 and 65535');
}
const dist = await realpath(resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist'));

function insideDist(file) {
  const path = relative(dist, file);
  return path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
};

createServer(async (req, res) => {
  let path;
  try {
    // Decode segments before lookup; URL() would silently normalize traversal.
    path = decodePath(req.url.split('?')[0]);
  } catch {
    res.writeHead(400).end('Invalid request path');
    return;
  }
  if (base !== '/' && path === base.slice(0, -1)) {
    res.writeHead(308, { Location: base }).end();
    return;
  }
  if (!path.startsWith(base)) {
    res.writeHead(404).end('Not found');
    return;
  }
  let file = resolve(dist, path.slice(base.length));
  if (!insideDist(file)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      await stat(file);
    } catch (error) {
      if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
      file = join(dist, 'index.html');
    }
    // A symlink inside dist must not expose a file outside the build directory.
    file = await realpath(file);
    if (!insideDist(file)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': file.endsWith('sw.js') || file.endsWith('.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    res.end(body);
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' ? 404 : 500).end('Unable to serve preview file');
  }
}).listen(port, () => console.log(`Serving dist/ at http://localhost:${port}${base}`));
