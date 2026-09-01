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
    this.children = [];
    this.listeners = new Map();
    this.attributes = {};
    this.dataset = {};
    this.className = '';
    this.textContent = '';
    this.value = '';
    this.hidden = false;
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

  addEventListener(name, listener) {
    if (!this.listeners.has(name)) this.listeners.set(name, []);
    this.listeners.get(name).push(listener);
  }

  dispatchEvent(event) {
    const name = typeof event === 'string' ? event : event.type;
    for (const listener of this.listeners.get(name) || []) listener.call(this, event);
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
    'scenario-controls',
    'type-controls',
    'source-list',
    'brief-visual-output',
    'brief-output',
    'result-status',
    'warning-box',
    'source-summary',
    'scenario-summary',
    'generate-button',
    'reset-button',
    'visual-view-button',
    'raw-view-button',
  ];
  const elements = new Map(ids.map((id) => [id, new Element(id.includes('button') ? 'button' : 'div', id)]));
  return {
    getElementById(id) {
      return elements.get(id) || null;
    },
    createElement(tagName) {
      return new Element(tagName);
    },
  };
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
