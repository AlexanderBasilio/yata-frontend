// Local-only PWA smoke test. Does NOT edit build files or deploy anything.
// POST /__qa/release changes only appData in the served manifest to simulate a release.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist/codex-verification/browser');
const { hosting } = require('../firebase.json');
let revision = 1;
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  if (pathname === '/__qa/release' && req.method === 'POST') {
    revision++; res.end(`Local test revision ${revision}`); return;
  }
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
  for (const rule of hosting.headers) {
    if (new RegExp(rule.regex).test(pathname)) {
      for (const header of rule.headers) res.setHeader(header.key, header.value);
    }
  }
  if (pathname === '/ngsw.json') {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'ngsw.json'), 'utf8'));
    manifest.appData = { localVerificationRevision: revision };
    res.setHeader('Content-Type', 'application/json');
    res.end(req.method === 'HEAD' ? undefined : JSON.stringify(manifest)); return;
  }
  let file = path.resolve(root, '.' + decodeURIComponent(pathname));
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(root, 'index.html');
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).pipe(res);
});
server.listen(4301, '127.0.0.1', () => console.log('PWA verification: http://127.0.0.1:4301 (local only)'));
