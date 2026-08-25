'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PAGES = [
  path.join(ROOT, 'docs', 'demo-static', 'index.html'),
  path.join(ROOT, 'docs', 'demo', 'index.html'),
  path.join(ROOT, 'docs', 'demo.html'),
];

test('demo pages contain no resource requests or network API calls', () => {
  for (const file of PAGES) {
    const html = fs.readFileSync(file, 'utf8');
    const label = path.relative(ROOT, file);
    assert.doesNotMatch(html, /<script\b[^>]*\bsrc\s*=/i, `${label} loads an external script`);
    assert.doesNotMatch(html, /<link\b[^>]*\bhref\s*=/i, `${label} loads an external stylesheet`);
    assert.doesNotMatch(html, /<(?:img|iframe|object|embed|audio|video)\b[^>]*\bsrc\s*=/i, `${label} loads an external asset`);
    assert.doesNotMatch(html, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/, `${label} contains a network API call`);
    assert.doesNotMatch(html, /navigator\.sendBeacon\s*\(/, `${label} contains telemetry`);

    for (const match of html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
      assert.ok(!/^https?:\/\//i.test(match[1]), `${label} has an external resource URL: ${match[1]}`);
      assert.ok(!/^\/\//.test(match[1]), `${label} has a protocol-relative resource URL: ${match[1]}`);
    }
  }
});
