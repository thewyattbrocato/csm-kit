'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const STATIC_PAGE = path.join(ROOT, 'docs', 'demo-static', 'index.html');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function htmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

test('static demo contains every committed example verbatim after HTML escaping', () => {
  const page = fs.readFileSync(STATIC_PAGE, 'utf8');
  const examples = [
    'examples/example-renewal-brief.md',
    'examples/example-handoff-brief.md',
    'examples/example-qbr-packet.md',
  ];

  for (const example of examples) {
    const markdown = read(example);
    assert.ok(page.includes(htmlEscape(markdown)), `${example} is not embedded in the static demo`);
    assert.ok(page.includes(`generated from <span class="mono">${example}</span>`));
  }
});

test('static demo has the annotated trust walkthrough and interactive fallback link', () => {
  const page = fs.readFileSync(STATIC_PAGE, 'utf8');
  assert.match(page, /Citations are the proof/);
  assert.match(page, /Completeness is evidence presence/);
  assert.match(page, /Fail closed, then ask/);
  assert.match(page, /pinned --as-of 2026-08-22/);
  assert.match(page, /href="\.\.\/demo\/"/);
});

test('static demo presents cited brief anatomy while preserving raw markdown', () => {
  const page = fs.readFileSync(STATIC_PAGE, 'utf8');
  assert.match(page, /Evidence flow from local input to cited brief/);
  assert.match(page, /data-presentation="visual"/);
  assert.match(page, /Brief anatomy/);
  assert.match(page, /Source spans:/);
  assert.match(page, /Visual brief/);
  assert.match(page, /Raw Markdown/);

  const qbrVisual = page.match(/<div id="static-brief-2-visual-panel"[\s\S]*?<div class="brief-raw-panel">/);
  assert.ok(qbrVisual, 'QBR visual panel is missing');
  assert.doesNotMatch(qbrVisual[0], /Assign an owner and due date/);
  assert.match(page, /- Assign an owner and due date to each item above\./);
});

test('interactive demo carries a no-JS link to the generated static page', () => {
  const page = read('docs/demo/index.html');
  assert.match(page, /<noscript>/);
  assert.match(page, /href="\.\.\/demo-static\/"/);
});
