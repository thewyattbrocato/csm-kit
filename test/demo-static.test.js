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
  assert.match(page, /Start with what changed/);
  assert.match(page, /Evidence coverage sets context/);
  assert.match(page, /No proof, no claim/);
  assert.match(page, /pinned --as-of 2026-08-22/);
  assert.match(page, /href="\.\.\/demo\/"/);
});

test('static demo presents cited brief anatomy while preserving raw markdown', () => {
  const page = fs.readFileSync(STATIC_PAGE, 'utf8');
  assert.match(page, /Static CSM walkthrough/);
  assert.match(page, /Know what to do before you walk in/);
  assert.match(page, /Frontline CSM account health snapshot for Acme Manufacturing Co/);
  assert.match(page, /NEXT ACTIONS/);
  assert.match(page, /Review the account story and proof/);
  assert.match(page, /data-presentation="visual"/);
  assert.match(page, /Account readout/);
  assert.match(page, /Source spans:/);
  assert.match(page, /Visual brief/);
  assert.match(page, /Raw Markdown/);

  const qbrVisual = page.match(/<div id="static-brief-2-visual-panel"[\s\S]*?<div class="brief-raw-panel">/);
  assert.ok(qbrVisual, 'QBR visual panel is missing');
  assert.doesNotMatch(qbrVisual[0], /Assign an owner and due date/);
  assert.match(page, /- Assign an owner and due date to each item above\./);
});

test('static brief view radios use the shared default, checked, focus, and print states', () => {
  const page = fs.readFileSync(STATIC_PAGE, 'utf8');
  assert.match(page, /\.brief-view > input \{ position: absolute; width: 1px; height: 1px; opacity: 0; \}/);
  assert.match(page, /\.brief-view > input \+ label, \.view-button \{/);
  assert.match(page, /display: inline-block;\s+vertical-align: top;\s+min-height: 36px;/);
  assert.match(page, /\.brief-view > input:checked \+ label, \.view-button\[aria-pressed="true"\]/);
  assert.match(page, /\.brief-view > input:focus-visible \+ label, \.view-button:focus-visible/);
  assert.match(page, /\.brief-view-switch, \.brief-view > input \+ label \{ display: none !important; \}/);
});

test('visual brief content wraps inside narrow frames', () => {
  const page = fs.readFileSync(STATIC_PAGE, 'utf8');
  assert.match(page, /\.brief-visual \{ min-width: 0; color: var\(--csm-ink-soft\); overflow-wrap: anywhere; \}/);
  assert.match(page, /\.brief-visual code \{[^}]*overflow-wrap: anywhere;/);
  assert.match(page, /\.brief-table \{ width: 100%; min-width: 0; table-layout: fixed;/);
  assert.match(page, /\.brief-table th, \.brief-table td \{[^}]*overflow-wrap: anywhere;/);
});

test('interactive demo carries a no-JS link to the generated static page', () => {
  const page = read('docs/demo/index.html');
  assert.match(page, /<noscript>/);
  assert.match(page, /href="\.\.\/demo-static\/"/);
  assert.match(page, /Know what to do before your next customer conversation/);
  assert.match(page, /Account readout/);
  assert.match(page, /Fill the gaps/);
  assert.match(page, /<details class="panel source-panel">/);
  assert.ok(page.indexOf('<article class="panel result-panel">') < page.indexOf('<details class="panel source-panel">'));
});
