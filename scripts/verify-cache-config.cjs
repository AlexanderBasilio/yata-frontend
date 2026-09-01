// Read-only check of the disjoint RE2-compatible Hosting header rules.
const assert = require('node:assert/strict');
const { hosting } = require('../firebase.json');

function cacheHeader(pathname) {
  const matches = hosting.headers.filter(rule => new RegExp(rule.regex).test(pathname));
  assert(matches.length <= 1, `Overlapping cache rules for ${pathname}`);
  return matches[0]?.headers.find(header => header.key === 'Cache-Control')?.value;
}

for (const path of ['/', '/zisify', '/home', '/food/catalog', '/food/restaurant/example-id',
  '/food/cart', '/food/checkout', '/auth/login', '/orders', '/profile', '/privacy', '/index.html',
  '/ngsw.json', '/ngsw-worker.js', '/safety-worker.js', '/worker-basic.min.js', '/manifest.webmanifest']) {
  assert(cacheHeader(path)?.includes('no-store'), `${path} must not keep old app metadata/HTML`);
}
for (const path of ['/main-ABCDEFGH.js', '/chunk-1234ABCD.js', '/styles-ABC12345.css']) {
  assert(cacheHeader(path)?.includes('immutable'), `${path} should have immutable versioned content`);
}
for (const path of ['/custom.js', '/images/logo.svg', '/styles.css']) {
  assert(!cacheHeader(path)?.includes('immutable'), `${path} has no content hash`);
}
console.log('Cache policy verified: SPA routes/control files no-store, hashed bundles immutable, no overlaps.');
