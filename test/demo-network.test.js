'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const PAGES = [
  path.join(ROOT, 'docs', 'demo-static', 'index.html'),
  path.join(ROOT, 'docs', 'demo', 'index.html'),
  path.join(ROOT, 'docs', 'demo.html'),
];

function parseAttrs(tag) {
  const attrs = {};
  for (const match of tag.matchAll(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

function srcsetUrls(value) {
  return String(value)
    .split(',')
    .map((item) => item.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function declaredResourceLoads(html) {
  const loads = [];
  const resourceAttrs = {
    script: ['src'],
    link: ['href'],
    img: ['src', 'srcset'],
    iframe: ['src'],
    object: ['data'],
    embed: ['src'],
    audio: ['src'],
    video: ['src', 'poster'],
    source: ['src', 'srcset'],
    track: ['src'],
  };

  for (const match of html.matchAll(/<([A-Za-z][A-Za-z0-9:-]*)\b[^>]*>/g)) {
    const tagName = match[1].toLowerCase();
    const attrs = parseAttrs(match[0]);
    for (const attr of resourceAttrs[tagName] || []) {
      if (!(attr in attrs)) continue;
      const values = attr === 'srcset' ? srcsetUrls(attrs[attr]) : [attrs[attr]];
      for (const value of values) loads.push(`${tagName}[${attr}]=${value}`);
    }
  }

  for (const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    const css = match[1];
    for (const url of css.matchAll(/\burl\(\s*["']?([^"')]+)["']?\s*\)/gi)) loads.push(`css[url]=${url[1]}`);
    for (const imported of css.matchAll(/@import\s+(?:url\()?["']?([^"')\s;]+)["']?/gi)) {
      loads.push(`css[@import]=${imported[1]}`);
    }
  }

  return loads;
}

class Element {
  constructor(tagName, id = null) {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.ownerDocument = null;
    this.children = [];
    this.listeners = new Map();
    this.attributes = {};
    this.dataset = {};
    this.className = '';
    this.textContent = '';
    this.value = '';
    this.hidden = false;
    this.open = false;
    this.clicked = false;
    this.scrollIntoViewCalled = false;
    this.focusCalled = false;
    this.classList = {
      add: (...names) => {
        const current = new Set(this.className.split(/\s+/).filter(Boolean));
        for (const name of names) current.add(name);
        this.className = [...current].join(' ');
      },
      remove: (...names) => {
        const removed = new Set(names);
        this.className = this.className
          .split(/\s+/)
          .filter((name) => name && !removed.has(name))
          .join(' ');
      },
      contains: (name) => this.className.split(/\s+/).includes(name),
    };
  }

  append(...nodes) {
    this.children.push(...nodes);
  }

  replaceChildren(...nodes) {
    this.children = [...nodes];
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  addEventListener(name, listener) {
    if (!this.listeners.has(name)) this.listeners.set(name, []);
    this.listeners.get(name).push(listener);
  }

  dispatchEvent(event) {
    const name = typeof event === 'string' ? event : event.type;
    const dispatched = typeof event === 'string' ? { type: event, target: this } : event;
    for (const listener of this.listeners.get(name) || []) listener.call(this, dispatched);
  }

  focus() {
    this.focusCalled = true;
    if (this.ownerDocument) this.ownerDocument.activeElement = this;
  }

  scrollIntoView() {
    this.scrollIntoViewCalled = true;
  }

  click() {
    this.clicked = true;
    this.dispatchEvent({ type: 'click', target: this });
  }

  closest(selector) {
    if (selector === '[data-source][data-lines]' && this.dataset.source && this.dataset.lines) return this;
    if (selector === '.brief-raw-jump' && this.classList.contains('brief-raw-jump')) return this;
    return null;
  }

  querySelectorAll(selector) {
    const results = [];
    const wantedClass = selector.startsWith('.') ? selector.slice(1) : null;
    const visit = (node) => {
      if (!(node instanceof Element)) return;
      if (wantedClass && node.className.split(/\s+/).includes(wantedClass)) results.push(node);
      for (const child of node.children) visit(child);
    };
    visit(this);
    return results;
  }
}

function createDocument() {
  const ids = [
    'demo-app',
    'demo-skip-link',
    'scenario-controls',
    'type-controls',
    'source-list',
    'source-evidence',
    'brief-visual-output',
    'brief-output',
    'result-status',
    'warning-box',
    'evidence-summary',
    'source-summary',
    'source-privacy',
    'editor-state',
    'scenario-summary',
    'next-move-copy',
    'generate-button',
    'reset-button',
    'copy-markdown-button',
    'download-markdown-button',
    'export-feedback',
    'visual-view-button',
    'raw-view-button',
  ];
  const created = [];
  const document = {
    activeElement: null,
    created,
    getElementById(id) {
      return elements.get(id) || created.find((element) => element.id === id) || null;
    },
    createElement(tagName) {
      const element = new Element(tagName);
      element.ownerDocument = document;
      created.push(element);
      return element;
    },
  };
  const elements = new Map(ids.map((id) => {
    const element = new Element(id.includes('button') ? 'button' : 'div', id);
    element.ownerDocument = document;
    return [id, element];
  }));
  return document;
}

function networkContext() {
  const calls = [];
  const called = (api, args) => {
    calls.push({ api, args: args.map((arg) => String(arg)) });
    throw new Error(`${api} attempted a network request`);
  };
  const construct = (api) => class {
    constructor(...args) {
      called(api, args);
    }
  };
  const globals = {
    fetch: (...args) => called('fetch', args),
    XMLHttpRequest: construct('XMLHttpRequest'),
    WebSocket: construct('WebSocket'),
    EventSource: construct('EventSource'),
    navigator: {
      sendBeacon: (...args) => called('navigator.sendBeacon', args),
    },
  };
  return { calls, globals };
}

function runScriptsInBrowserHarness(html) {
  const network = networkContext();
  const window = { ...network.globals };
  const context = {
    ...network.globals,
    window,
    document: createDocument(),
    performance: { now: () => 1 },
  };
  vm.createContext(context);
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    vm.runInContext(match[1], context, { filename: 'demo-page-inline-script.js' });
  }
  const generateButton = context.document.getElementById('generate-button');
  const resetButton = context.document.getElementById('reset-button');
  const scenarioControls = context.document.getElementById('scenario-controls');
  const typeControls = context.document.getElementById('type-controls');
  generateButton?.dispatchEvent('click');
  resetButton?.dispatchEvent('click');
  scenarioControls?.children[1]?.dispatchEvent('click');
  typeControls?.children[2]?.dispatchEvent('click');
  return network.calls;
}

function runInteractiveUiHarness() {
  const html = fs.readFileSync(path.join(ROOT, 'docs', 'demo', 'index.html'), 'utf8');
  const document = createDocument();
  const clipboardWrites = [];
  const objectUrls = [];
  const revokedUrls = [];
  const anchors = [];
  let blobText = '';
  let nextObjectUrl = 0;
  class TestBlob {
    constructor(parts, options) {
      blobText = parts.map((part) => String(part)).join('');
      this.type = options?.type;
    }
  }
  const URLApi = {
    createObjectURL(blob) {
      objectUrls.push(blob);
      const url = 'blob:test-' + nextObjectUrl++;
      return url;
    },
    revokeObjectURL(url) {
      revokedUrls.push(url);
    },
  };
  const navigator = {
    clipboard: {
      writeText(value) {
        clipboardWrites.push(String(value));
        return Promise.resolve();
      },
    },
  };
  const originalCreateElement = document.createElement;
  document.createElement = (tagName) => {
    const element = originalCreateElement.call(document, tagName);
    if (String(tagName).toLowerCase() === 'a') anchors.push(element);
    return element;
  };
  const window = { navigator };
  const context = {
    window,
    document,
    navigator,
    Blob: TestBlob,
    URL: URLApi,
    performance: { now: () => 1 },
  };
  vm.createContext(context);
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    vm.runInContext(match[1], context, { filename: 'interactive-demo-inline-script.js' });
  }
  return { context, document, clipboardWrites, objectUrls, revokedUrls, anchors, get blobText() { return blobText; } };
}

test('demo pages declare no browser-loaded resources', () => {
  for (const file of PAGES) {
    const html = fs.readFileSync(file, 'utf8');
    const label = path.relative(ROOT, file);
    assert.deepStrictEqual(declaredResourceLoads(html), [], `${label} declares browser resource loads`);
  }
});

test('interactive demo scripts run without using network APIs', () => {
  for (const file of PAGES.filter((page) => page.includes(`${path.sep}demo${path.sep}`) || page.endsWith('demo.html'))) {
    const html = fs.readFileSync(file, 'utf8');
    const label = path.relative(ROOT, file);
    assert.deepStrictEqual(runScriptsInBrowserHarness(html), [], `${label} used a network API`);
  }
});

test('interactive demo keeps edits local and exports the exact generated Markdown', async () => {
  const harness = runInteractiveUiHarness();
  const { document } = harness;
  const api = harness.context.window.CSMKIT_DEMO;
  const output = document.getElementById('brief-output');
  const evidenceSummary = document.getElementById('evidence-summary');
  const editorState = document.getElementById('editor-state');
  const sourceEditor = document.getElementById('source-list').querySelectorAll('.source-editor')[0];
  const copyButton = document.getElementById('copy-markdown-button');
  const downloadButton = document.getElementById('download-markdown-button');

  assert.strictEqual(output.textContent, api.generate('full', 'renewal').markdown);
  assert.match(evidenceSummary.innerHTML, /5 of 5 required evidence units present/);
  assert.doesNotMatch(evidenceSummary.innerHTML, /5 of 5 5 required/);

  sourceEditor.value = sourceEditor.value.replace('Acme Manufacturing Co.', 'Edited Manufacturing Co.');
  sourceEditor.dispatchEvent({ type: 'input', target: sourceEditor });
  assert.match(editorState.textContent, /^Editor state: changed/);

  document.getElementById('generate-button').dispatchEvent('click');
  assert.match(output.textContent, /Edited Manufacturing Co\./);
  assert.match(editorState.textContent, /^Editor state: updated/);

  copyButton.dispatchEvent('click');
  await new Promise((resolve) => setImmediate(resolve));
  assert.strictEqual(harness.clipboardWrites.at(-1), output.textContent);
  assert.strictEqual(document.getElementById('export-feedback').textContent, 'Markdown copied.');
  assert.strictEqual(document.activeElement, copyButton);

  downloadButton.dispatchEvent('click');
  const download = harness.anchors.at(-1);
  assert.ok(download, 'download should create an anchor');
  assert.strictEqual(download.download, 'csm-kit-renewal-full.md');
  assert.strictEqual(harness.blobText, output.textContent);
  assert.strictEqual(harness.objectUrls.length, 1);
  assert.deepStrictEqual(harness.revokedUrls, ['blob:test-0']);

  document.getElementById('raw-view-button').dispatchEvent('click');
  assert.strictEqual(output.hidden, false);
  assert.strictEqual(document.getElementById('brief-visual-output').hidden, true);
  document.getElementById('visual-view-button').dispatchEvent('click');
  assert.strictEqual(output.hidden, true);

  document.getElementById('reset-button').dispatchEvent('click');
  assert.match(document.getElementById('source-list').querySelectorAll('.source-editor')[0].value, /Acme Manufacturing Co\./);
  assert.match(editorState.textContent, /^Editor state: reset/);
});

test('interactive visual brief keeps escaped Markdown pipes in one table cell', () => {
  const harness = runInteractiveUiHarness();
  const { document } = harness;
  const crmEditor = [...document.getElementById('source-list').querySelectorAll('.source-editor')]
    .find((editor) => editor.dataset.key === 'crm');
  const visualOutput = document.getElementById('brief-visual-output');

  assert.ok(crmEditor, 'CRM source editor should be available');
  crmEditor.value = [
    'date,type,contact,role,summary',
    '2026-08-10,call,"Alice | Ops",CFO,Recent contact',
    '',
  ].join('\n');
  crmEditor.dispatchEvent({ type: 'input', target: crmEditor });
  document.getElementById('generate-button').dispatchEvent('click');

  assert.ok(visualOutput.innerHTML.includes('Alice | Ops'));
  assert.doesNotMatch(visualOutput.innerHTML, /Alice \\|<\/td><td>Ops/);
});

test('interactive visual citations focus the matching local editor', () => {
  const harness = runInteractiveUiHarness();
  const { document } = harness;
  const visualOutput = document.getElementById('brief-visual-output');
  const sourcePanel = document.getElementById('source-evidence');
  const citation = document.createElement('a');
  citation.dataset.source = 'account.yaml';
  citation.dataset.lines = 'L3';
  visualOutput.append(citation);

  visualOutput.dispatchEvent({ type: 'click', target: citation, preventDefault() {} });

  const editor = document.getElementById('source-account');
  assert.strictEqual(sourcePanel.open, true);
  assert.strictEqual(document.activeElement, editor);
  assert.strictEqual(editor.dataset.citedLines, 'L3');
  assert.match(editor.getAttribute('aria-label'), /account\.yaml#L3/);
});
