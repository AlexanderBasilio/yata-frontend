// Local integration test with the actual Angular worker, an isolated browser profile and two
// content-hashed releases. No build files, production APIs or Firebase releases are modified.
// Requires Playwright on Node's module path and Chrome installed.
// Usage: node scripts/verify-pwa-lifecycle.cjs [dist/codex-pwa-verification/browser]
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(process.argv[2] || 'dist/codex-pwa-verification/browser');
const original = JSON.parse(fs.readFileSync(path.join(root, 'ngsw.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const main = Object.keys(original.hashTable).find(name => /^\/main-[A-Z0-9]+\.js$/.test(name));
assert(main, 'A production, content-hashed main bundle is required');
const sha1 = data => crypto.createHash('sha1').update(data).digest('hex');
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

function release(revision, strategy) {
  const script = fs.readFileSync(path.join(root, main.slice(1)), 'utf8') + `\n;globalThis.__qaRelease = ${revision};\n`;
  const scriptName = `/main-${sha1(script).slice(0, 8).toUpperCase()}.js`;
  const index = html.replace(main.slice(1), scriptName.slice(1));
  const manifest = structuredClone(original);
  manifest.navigationRequestStrategy = strategy;
  manifest.timestamp += revision;
  for (const group of manifest.assetGroups) group.urls = group.urls.map(url => url === main ? scriptName : url);
  delete manifest.hashTable[main];
  manifest.hashTable[scriptName] = sha1(script);
  manifest.hashTable['/index.html'] = sha1(index);
  const manifestJson = JSON.stringify(manifest);
  return { revision, scriptName, script, index, manifestJson, hash: sha1(manifestJson) };
}

let current;
let holdManifest = false;
let waiting = [];
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  res.setHeader('Cache-Control', 'no-store');
  const sendManifest = () => {
    if (res.destroyed) return;
    res.setHeader('Content-Type', 'application/json'); res.end(current.manifestJson);
  };
  if (pathname === '/ngsw.json') {
    if (holdManifest) waiting.push(sendManifest); else sendManifest();
    return;
  }
  if (pathname === current.scriptName) {
    res.setHeader('Content-Type', 'text/javascript'); res.end(current.script); return;
  }
  const file = path.resolve(root, '.' + decodeURIComponent(pathname));
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (pathname === '/index.html' || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.setHeader('Content-Type', 'text/html'); res.end(current.index); return;
  }
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
function releaseManifest() {
  holdManifest = false;
  for (const respond of waiting.splice(0)) respond();
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true,
      args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
    async function open(strategy) {
      current = release(1, strategy);
      const context = await browser.newContext({ serviceWorkers: 'allow' });
      // DNS is restricted to loopback at browser launch. Do not use Playwright route interception:
      // it changes browser caching behavior, which would invalidate this Service Worker test.
      const page = await context.newPage();
      page.on('pageerror', error => console.error('Browser error:', error.message));
      page.on('dialog', dialog => dialog.accept());
      await page.goto(origin + '/privacy');
      await page.waitForFunction(() => globalThis.__qaRelease === 1);
      await page.getByRole('button', { name: 'Solo necesarias', exact: true }).click();
      await page.waitForFunction(() => !!navigator.serviceWorker.controller, undefined, { timeout: 45_000 });
      await waitInstalled(page, current.hash);
      await page.evaluate(() => {
        localStorage.setItem('zisify_access_token', 'qa-local-only');
        localStorage.setItem('yata_cart_id', 'qa-cart-local-only');
      });
      return { context, page };
    }
    async function waitInstalled(page, hash) {
      const urls = JSON.parse(current.manifestJson).assetGroups.find(group => group.name === 'app').urls;
      const deadline = Date.now() + 45_000;
      while (Date.now() < deadline) {
        const installed = await page.evaluate(async expected => {
          const state = await (await fetch('/ngsw/state')).text();
          const names = await caches.keys();
          const name = names.find(value => value.endsWith(`${expected.hash}:assets:app:cache`));
          if (!name) return false;
          const cache = await caches.open(name);
          const resources = await Promise.all(expected.urls.map(url => cache.match(url)));
          return resources.every(Boolean) && state.includes(`Latest manifest hash: ${expected.hash}`) && state.includes('Driver state: NORMAL');
        }, { hash, urls });
        if (installed) return;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error('Timed out waiting for every prefetched file in the actual asset cache');
    }
    async function assertStorage(page) {
      assert.deepEqual(await page.evaluate(() => [localStorage.getItem('zisify_access_token'),
        localStorage.getItem('yata_cart_id'), localStorage.getItem('zisify_analytics_consent_v1')]),
      ['qa-local-only', 'qa-cart-local-only', 'denied']);
    }

    // Reproduce the old behavior while holding manifest requests, so the new release cannot
    // finish installing before the user's first refresh.
    {
      const { context, page } = await open('performance');
      holdManifest = true; current = release(2, 'freshness');
      const response = await page.reload();
      assert(response.fromServiceWorker(), 'Baseline refresh must be served by the worker');
      await page.waitForFunction(() => globalThis.__qaRelease !== undefined);
      if (await page.evaluate(() => globalThis.__qaRelease) !== 1) {
        console.log(await page.evaluate(async () => (await fetch('/ngsw/state')).text()));
      }
      assert.equal(await page.evaluate(() => globalThis.__qaRelease), 1);
      console.log('PASS: reproduced old performance policy: first refresh still executes release 1.');
      releaseManifest();
      await context.close();
    }
    {
      const { context, page } = await open('freshness');
      holdManifest = true; current = release(2, 'freshness');
      await page.reload();
      await page.waitForFunction(() => globalThis.__qaRelease === 2);
      await assertStorage(page);
      console.log('PASS: freshness executes release 2 after exactly one refresh, before manifest download.');
      releaseManifest();
      await waitInstalled(page, current.hash);
      await context.setOffline(true);
      await page.reload();
      await page.waitForFunction(() => globalThis.__qaRelease === 2);
      await assertStorage(page);
      console.log('PASS: offline refresh falls back to the cached release; session/cart storage preserved.');
      await context.close();
    }
    {
      const { context, page } = await open('freshness');
      current = release(2, 'freshness');
      // Simulate returning after the cooldown; no polling and no manual reload.
      await page.clock.setSystemTime(new Date(Date.now() + 6 * 60_000));
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
      await page.getByRole('button', { name: 'Actualizar ahora', exact: true }).waitFor({ timeout: 45_000 });
      assert.equal(await page.evaluate(() => globalThis.__qaRelease), 1);
      await page.getByRole('button', { name: 'Actualizar ahora', exact: true }).click();
      await page.waitForFunction(() => globalThis.__qaRelease === 2);
      await assertStorage(page);
      console.log('PASS: activity discovers release 2 without refresh; confirmation adopts it and preserves storage.');
      await context.close();
    }
  } finally {
    releaseManifest();
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
