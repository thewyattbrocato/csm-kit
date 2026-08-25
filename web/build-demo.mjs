import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(WEB_DIR, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const STATIC_OUT = path.join(DOCS_DIR, 'demo-static', 'index.html');
const INTERACTIVE_OUT = path.join(DOCS_DIR, 'demo', 'index.html');
const INTERACTIVE_ALIAS_OUT = path.join(DOCS_DIR, 'demo.html');
const AS_OF = JSON.parse(fs.readFileSync(path.join(WEB_DIR, 'scenarios.json'), 'utf8')).asOf;
const PACKAGE = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const TOKENS = `
  :root {
    color-scheme: light;
    --color-indigo-ink: #533afd;
    --color-indigo-hover: #7389ff;
    --color-midnight-ink: #061b31;
    --color-slate: #64748d;
    --color-steel: #50617a;
    --color-smoke: #839bc8;
    --color-pure-white: #ffffff;
    --color-mist: #f8fafd;
    --color-frost: #e5edf5;
    --color-lavender-border: #b9b9f9;
    --color-lilac-border: #d6d9fc;
    --color-periwinkle-wash: #e8e9ff;
    --color-deep-violet: #182659;
    --color-amethyst-edge: #7f71e6;
    --color-citation: #167d46;
    --color-action-foreground: #ffffff;
    --color-action-hover-foreground: #061b31;
    --color-focus: var(--color-indigo-ink);
    --font-sohne-var: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    --font-mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace;
    --font-weight-light: 300;
    --font-weight-regular: 400;
    --surface-canvas: var(--color-pure-white);
    --surface-band: var(--color-mist);
    --surface-frosted-card: var(--color-frost);
    --surface-lavender-card: var(--color-periwinkle-wash);
    --surface-indigo-surface: var(--color-indigo-ink);
    --text-caption: 12px;
    --text-body-sm: 14px;
    --text-body: 16px;
    --text-body-lg: 20px;
    --text-subheading: 22px;
    --text-heading: 32px;
    --text-heading-lg: 48px;
    --text-display: 56px;
    --page-max-width: 1320px;
    --section-gap: 96px;
    --card-padding: 32px;
    --element-gap: 8px;
    --radius-md: 4px;
    --radius-tags: 9999px;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      color-scheme: dark;
      --color-indigo-ink: #9a91ff;
      --color-indigo-hover: #b1abff;
      --color-midnight-ink: #f4f7ff;
      --color-slate: #bdc8dc;
      --color-steel: #a9b8ce;
      --color-smoke: #91a4cf;
      --color-pure-white: #101622;
      --color-mist: #151d2b;
      --color-frost: #2b3850;
      --color-lavender-border: #8178e8;
      --color-lilac-border: #555e89;
      --color-periwinkle-wash: #242447;
      --color-deep-violet: #c4c8ff;
      --color-amethyst-edge: #9188f0;
      --color-citation: #71d99a;
      --color-action-foreground: #061b31;
      --color-action-hover-foreground: #061b31;
      --color-focus: var(--color-indigo-ink);
    }
  }

  * { box-sizing: border-box; }
  html { background: var(--surface-canvas); }
  body {
    margin: 0;
    background: var(--surface-canvas);
    color: var(--color-midnight-ink);
    font: var(--text-body)/1.4 var(--font-sohne-var);
    font-feature-settings: "ss01" 1, "tnum" 1;
    font-weight: var(--font-weight-light);
  }
  a { color: var(--color-indigo-ink); }
  a:hover { color: var(--color-indigo-ink); text-decoration-thickness: 2px; }
  button, textarea { font: inherit; }
  button { cursor: pointer; }
  :focus-visible { outline: 2px solid var(--color-focus); outline-offset: 3px; }
  .shell { width: min(var(--page-max-width), calc(100% - 48px)); margin: 0 auto; }
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 76px;
    padding: 16px 0;
    border-bottom: 1px solid var(--color-frost);
  }
  .wordmark {
    color: var(--color-midnight-ink);
    font: var(--font-weight-regular) 15px/1 var(--font-mono);
    letter-spacing: .02em;
    text-decoration: none;
  }
  .wordmark::before { content: ">_"; color: var(--color-citation); margin-right: 8px; }
  .top-meta { color: var(--color-slate); font: var(--font-weight-regular) var(--text-caption)/1.45 var(--font-mono); letter-spacing: .05em; }
  .hero { padding: 80px 0 64px; max-width: 880px; }
  .eyebrow {
    color: var(--color-slate);
    font: var(--font-weight-regular) var(--text-caption)/1.45 var(--font-mono);
    letter-spacing: .08em;
    text-transform: uppercase;
  }
  h1, h2, h3 { color: var(--color-midnight-ink); line-height: 1.1; font-weight: var(--font-weight-light); }
  h1 { max-width: 820px; margin: 16px 0 24px; font-size: clamp(40px, 6vw, var(--text-display)); line-height: 1.03; letter-spacing: -1.4px; }
  h2 { margin: 0 0 12px; font-size: var(--text-heading); line-height: 1.1; letter-spacing: -.64px; }
  h3 { margin: 0 0 10px; font-size: var(--text-subheading); line-height: 1.1; letter-spacing: -.22px; }
  .lede { max-width: 720px; margin: 0; color: var(--color-steel); font-size: var(--text-body-lg); line-height: 1.4; }
  .lede strong { color: var(--color-midnight-ink); font-weight: var(--font-weight-regular); }
  .chip-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 32px; }
  .chip {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 4px 10px;
    border: 1px solid var(--color-lilac-border);
    border-radius: var(--radius-tags);
    color: var(--color-slate);
    background: var(--surface-band);
    font: var(--font-weight-regular) var(--text-caption)/1.45 var(--font-mono);
  }
  .chip.success { border-color: var(--color-citation); color: var(--color-citation); }
  .panel {
    background: var(--surface-canvas);
    border: 1px solid var(--color-frost);
    border-radius: var(--radius-md);
  }
  .callouts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin: 0 0 var(--section-gap); }
  .callout { padding: 24px; background: var(--surface-band); border-top: 2px solid var(--color-indigo-ink); }
  .callout p { margin: 0; color: var(--color-steel); }
  .callout code, .mono { color: var(--color-citation); font-family: var(--font-mono); font-size: .9em; }
  .section-head { display: flex; justify-content: space-between; align-items: start; gap: 20px; margin-bottom: 24px; }
  .section-head p { margin: 0; color: var(--color-steel); font-size: var(--text-body-sm); }
  .brief-list { display: grid; gap: 16px; margin-bottom: var(--section-gap); }
  details { overflow: hidden; }
  details summary { padding: 20px 24px; color: var(--color-midnight-ink); cursor: pointer; font-size: var(--text-body); font-weight: var(--font-weight-regular); }
  details summary::marker { color: var(--color-indigo-ink); }
  details[open] summary { border-bottom: 1px solid var(--color-frost); color: var(--color-indigo-ink); }
  .brief-meta { padding: 16px 24px 0; color: var(--color-steel); font: var(--font-weight-regular) var(--text-caption)/1.45 var(--font-mono); }
  .brief-output {
    margin: 16px 24px 24px;
    padding: 24px;
    overflow: auto;
    color: var(--color-midnight-ink);
    background: var(--surface-band);
    font: var(--font-weight-regular) var(--text-caption)/1.7 var(--font-mono);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .footer { padding: 32px 0 64px; border-top: 1px solid var(--color-frost); color: var(--color-steel); }
  .footer p { margin: 0 0 8px; }
  .footer .mono { color: var(--color-slate); }

  /* Interactive controls */
  .demo-app { padding-bottom: var(--section-gap); }
  .demo-intro { padding: 64px 0 40px; }
  .demo-intro h1 { font-size: clamp(40px, 5.5vw, var(--text-heading-lg)); margin-bottom: 20px; }
  .demo-intro p { max-width: 720px; margin: 0; color: var(--color-steel); font-size: var(--text-body-lg); line-height: 1.4; }
  .control-panel { padding: var(--card-padding); }
  .control-panel + .control-panel { margin-top: 16px; }
  fieldset { min-width: 0; margin: 0; padding: 0; border: 0; }
  legend { margin-bottom: 16px; color: var(--color-midnight-ink); font-size: var(--text-body); font-weight: var(--font-weight-regular); }
  .choice-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--element-gap); }
  .choice, .type-choice {
    width: 100%;
    padding: 16px;
    text-align: left;
    color: var(--color-steel);
    background: var(--surface-canvas);
    border: 1px solid var(--color-frost);
    border-radius: var(--radius-md);
  }
  .choice:hover, .type-choice:hover { border-color: var(--color-indigo-ink); color: var(--color-midnight-ink); background: var(--surface-lavender-card); }
  .choice[aria-pressed="true"], .type-choice[aria-pressed="true"] {
    background: var(--surface-lavender-card);
    border-color: var(--color-indigo-ink);
    color: var(--color-midnight-ink);
  }
  .choice strong { display: block; margin-bottom: 6px; color: var(--color-indigo-ink); font-weight: var(--font-weight-regular); }
  .choice small { display: block; color: var(--color-steel); line-height: 1.4; }
  .type-row { display: flex; flex-wrap: wrap; gap: var(--element-gap); }
  .type-choice { width: auto; padding: 10px 14px; font: var(--font-weight-regular) var(--text-body-sm)/1.4 var(--font-mono); }
  .type-choice[aria-pressed="true"] { color: var(--color-indigo-ink); }
  .demo-grid { display: grid; grid-template-columns: minmax(260px, .8fr) minmax(0, 1.6fr); gap: 24px; margin-top: 16px; align-items: start; }
  .source-panel, .result-panel { min-width: 0; }
  .panel-heading { display: flex; justify-content: space-between; gap: 12px; padding: 20px 24px; background: var(--surface-band); border-bottom: 1px solid var(--color-frost); }
  .panel-heading h2 { margin: 0; font-size: var(--text-subheading); }
  .panel-heading p { margin: 4px 0 0; color: var(--color-steel); font-size: var(--text-caption); }
  .source-list { padding: 24px; }
  .source-card { margin-bottom: 24px; }
  .source-card:last-child { margin-bottom: 0; }
  .source-card label { display: block; margin: 0 0 8px; color: var(--color-citation); font: var(--font-weight-regular) var(--text-caption)/1.45 var(--font-mono); }
  .source-card textarea {
    display: block;
    width: 100%;
    min-height: 112px;
    resize: vertical;
    padding: 12px;
    color: var(--color-midnight-ink);
    background: var(--surface-band);
    border: 1px solid var(--color-frost);
    border-radius: var(--radius-md);
    font: var(--font-weight-regular) var(--text-caption)/1.55 var(--font-mono);
  }
  .source-card textarea:focus { border-color: var(--color-indigo-ink); outline: 2px solid var(--color-focus); outline-offset: 0; }
  .empty-source { margin: 0; padding: 16px; color: var(--color-steel); font-size: var(--text-body-sm); }
  .result-status { color: var(--color-steel); font: var(--font-weight-regular) var(--text-caption)/1.45 var(--font-mono); text-align: right; }
  .result-status.ok { color: var(--color-citation); }
  .result-status.error { color: var(--color-deep-violet); }
  .result-output { min-height: 520px; max-height: 820px; }
  .result-output.error { color: var(--color-deep-violet); }
  .result-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 24px; background: var(--surface-band); border-top: 1px solid var(--color-frost); }
  .button-row { display: flex; flex-wrap: wrap; gap: var(--element-gap); }
  .button {
    padding: 14px 18px;
    color: var(--color-action-foreground);
    background: var(--color-indigo-ink);
    border: 1px solid var(--color-indigo-ink);
    border-radius: var(--radius-md);
    font: var(--font-weight-regular) var(--text-body-sm)/1.1 var(--font-sohne-var);
  }
  .button:hover { background: var(--color-indigo-hover); border-color: var(--color-indigo-hover); color: var(--color-action-hover-foreground); }
  .button.secondary { color: var(--color-indigo-ink); background: transparent; border-color: var(--color-lavender-border); }
  .button.secondary:hover { border-color: var(--color-indigo-ink); color: var(--color-indigo-ink); background: var(--surface-lavender-card); }
  .warning-box { margin: 16px; padding: 12px 14px; color: var(--color-steel); background: var(--surface-lavender-card); border: 1px solid var(--color-lilac-border); border-radius: var(--radius-md); font: var(--font-weight-regular) var(--text-caption)/1.5 var(--font-mono); }
  .warning-box[hidden] { display: none; }
  .demo-note { margin-top: 24px; padding: 20px 24px; color: var(--color-steel); background: var(--surface-band); font-size: var(--text-body-sm); }
  .demo-note strong { color: var(--color-midnight-ink); font-weight: var(--font-weight-regular); }
  .noscript { max-width: 720px; margin: 64px auto; padding: var(--card-padding); }
  @media (max-width: 760px) {
    .shell { width: min(100% - 24px, var(--page-max-width)); }
    .topbar { padding: 16px 0; }
    .top-meta { font-size: 10px; text-align: right; }
    .hero { padding: 64px 0 48px; }
    .callouts, .choice-grid, .demo-grid { grid-template-columns: 1fr; }
    .section-head { display: block; }
    .section-head p { margin-top: 8px; }
    .demo-grid { margin-top: 16px; }
    .result-output { min-height: 380px; max-height: none; }
    .result-footer { align-items: flex-start; flex-direction: column; }
    .result-status { text-align: left; }
  }
`;

const STATIC_ANNOTATIONS = [
  {
    title: 'Citations are the proof',
    body: 'Every factual line carries a source span such as `account.yaml#L7`. The span is the exact row a reader can inspect, not a footnote invented after the fact.',
  },
  {
    title: 'Completeness is evidence presence',
    body: 'The score reports how much of the required input set was present. It is not a health score, and it appears before the brief so the reader knows how much trust to place in the rest.',
  },
  {
    title: 'Fail closed, then ask',
    body: 'When a fact has no source span, it does not render. csm-kit keeps the claim out and turns the gap into a specific checklist or handoff ask instead.',
  },
];

const STATIC_BRIEFS = [
  {
    title: 'Renewal Readiness Brief',
    file: 'examples/example-renewal-brief.md',
    description: 'A risk-oriented account view with countdown, signals, stakeholders, and a cited checklist.',
  },
  {
    title: 'Handoff Completeness Brief',
    file: 'examples/example-handoff-brief.md',
    description: 'A sales-to-CS transfer with promised-vs-sold status, stakeholder coverage, and AE-routed gaps.',
  },
  {
    title: 'QBR Packet',
    file: 'examples/example-qbr-packet.md',
    description: 'A deterministic, slide-oriented packet reusing the same evidence and risk rules.',
  },
];

function htmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function jsonForScript(value) {
  return JSON.stringify(value).replace(/<\//g, '<\\/');
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function loadScenarioManifest() {
  const manifest = JSON.parse(fs.readFileSync(path.join(WEB_DIR, 'scenarios.json'), 'utf8'));
  const scenarios = {};
  for (const [scenarioName, scenario] of Object.entries(manifest.scenarios)) {
    const types = {};
    for (const [typeName, inputs] of Object.entries(scenario.types)) {
      const files = {};
      const inputMeta = {};
      for (const [key, relativePath] of Object.entries(inputs)) {
        const virtualPath = `/${path.basename(relativePath)}`;
        files[virtualPath] = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
        inputMeta[key] = { path: virtualPath, label: path.basename(relativePath) };
      }
      types[typeName] = { inputs: inputMeta, files };
    }
    scenarios[scenarioName] = { label: scenario.label, description: scenario.description, types };
  }
  return scenarios;
}

function buildStaticPage() {
  const briefs = STATIC_BRIEFS.map((brief, index) => {
    const markdown = fs.readFileSync(path.join(ROOT, brief.file), 'utf8');
    if (!markdown.includes(`as-of ${AS_OF}`)) {
      throw new Error(`${brief.file} is not pinned to --as-of ${AS_OF}`);
    }
    return {
      ...brief,
      index,
      markdown,
    };
  });
  const callouts = STATIC_ANNOTATIONS.map(
    (callout) => `
      <article class="panel callout">
        <h3>${htmlEscape(callout.title)}</h3>
        <p>${htmlEscape(callout.body).replace(/`([^`]+)`/g, '<code>$1</code>')}</p>
      </article>`,
  ).join('');
  const briefSections = briefs.map(
    (brief) => `
      <details class="panel"${brief.index === 0 ? ' open' : ''}>
        <summary>${htmlEscape(brief.title)}</summary>
        <p class="brief-meta">${htmlEscape(brief.description)} · generated from <span class="mono">${htmlEscape(brief.file)}</span> · pinned --as-of ${AS_OF}</p>
        <pre class="brief-output"><code>${htmlEscape(brief.markdown)}</code></pre>
      </details>`,
  ).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Annotated, generated csm-kit sample briefs with citations and fail-closed completeness.">
  <title>csm-kit · See the evidence</title>
  <style>${TOKENS}</style>
</head>
<body>
  <div class="shell">
    <header class="topbar">
      <a class="wordmark" href="../">csm-kit</a>
      <span class="top-meta">STATIC WALKTHROUGH / --AS-OF ${AS_OF}</span>
    </header>
    <main>
      <section class="hero">
        <div class="eyebrow">See it before you install it</div>
        <h1>Briefs you can defend line by line.</h1>
        <p class="lede">Three real outputs from the zero-dependency engine. Each one is generated from committed fixtures, pinned to <strong>${AS_OF}</strong>, and annotated so you can follow the evidence contract before touching a terminal.</p>
        <div class="chip-row">
          <span class="chip success">no network calls</span>
          <span class="chip">markdown output</span>
          <span class="chip">byte-deterministic</span>
        </div>
      </section>
      <section class="callouts" aria-label="How to read a brief">${callouts}
      </section>
      <section aria-labelledby="samples-heading">
        <div class="section-head">
          <div>
            <div class="eyebrow">Generated samples</div>
            <h2 id="samples-heading">The artifact is the demo.</h2>
          </div>
          <p>Open each panel to inspect the exact markdown.</p>
        </div>
        <div class="brief-list">${briefSections}
        </div>
      </section>
    </main>
    <footer class="footer">
      <p><a href="../demo/">Try the interactive demo</a> to switch scenarios, edit inputs locally, and watch missing evidence fail closed.</p>
      <p class="mono">Generated by web/build-demo.mjs · csm-kit v${htmlEscape(PACKAGE.version)} · source examples are the contract.</p>
    </footer>
  </div>
</body>
</html>
`;
}

function buildRuntimeScript(scenarios, modules) {
  const moduleJson = jsonForScript(modules);
  const scenarioJson = jsonForScript(scenarios);
  const packageJson = jsonForScript({ name: PACKAGE.name, version: PACKAGE.version });
  return String.raw`(() => {
  'use strict';

  const MODULES = __MODULES__;
  const SCENARIOS = __SCENARIOS__;
  const PACKAGE = __PACKAGE__;
  const AS_OF = ${JSON.stringify(AS_OF)};

  function makeCsmkit(vfs) {
    const fsShim = {
      readFileSync(filePath) {
        if (!(filePath in vfs)) throw new Error('ENOENT: ' + filePath);
        return vfs[filePath];
      },
    };
    const pathShim = {
      basename(filePath) {
        return String(filePath).split('/').pop();
      },
    };
    const cache = {};

    function resolve(from, id) {
      if (id === 'fs') return 'fs';
      if (id === 'path') return 'path';
      if (id.startsWith('/')) return id.endsWith('.js') ? id : id + '.js';
      const dir = from.slice(0, from.lastIndexOf('/'));
      const out = [];
      for (const part of (dir + '/' + id).split('/')) {
        if (part === '' || part === '.') continue;
        if (part === '..') out.pop();
        else out.push(part);
      }
      const key = '/' + out.join('/');
      return key.endsWith('.js') ? key : key + '.js';
    }

    function requireFrom(from) {
      return function requireModule(id) {
        if (id === 'fs') return fsShim;
        if (id === 'path') return pathShim;
        if (id.endsWith('/package.json')) return PACKAGE;
        const key = resolve(from, id);
        if (!(key in MODULES)) throw new Error('Cannot find embedded module ' + key);
        if (!(key in cache)) {
          cache[key] = { exports: {} };
          new Function('module', 'exports', 'require', MODULES[key])(
            cache[key],
            cache[key].exports,
            requireFrom(key),
          );
        }
        return cache[key].exports;
      };
    }

    return requireFrom('/lib/brief.js');
  }

  function basename(pathName) {
    return String(pathName).split('/').pop();
  }

  function basenameLabels(inputDefs) {
    const labels = {};
    const entries = Object.entries(inputDefs).filter(([, input]) => input && input.path);
    const groups = new Map();
    for (const [key, input] of entries) {
      const base = basename(input.path);
      if (!groups.has(base)) groups.set(base, []);
      groups.get(base).push({ key, path: input.path });
    }
    for (const [base, group] of groups) {
      if (group.length === 1) {
        labels[group[0].key] = base;
        continue;
      }
      const maxParts = Math.max(...group.map((entry) => entry.path.split('/').filter(Boolean).length));
      let depth = 1;
      while (depth < maxParts) {
        const seen = new Set(group.map((entry) => entry.path.split('/').filter(Boolean).slice(-depth).join('/')));
        if (seen.size === group.length) break;
        depth++;
      }
      for (const entry of group) {
        labels[entry.key] = entry.path.split('/').filter(Boolean).slice(-depth).join('/');
      }
    }
    return labels;
  }

  function sourcePath(inputDefs, key) {
    return inputDefs[key] ? inputDefs[key].path : undefined;
  }

  function loadInputs(type, definition, requireModule) {
    const load = requireModule('/lib/load.js');
    const labels = basenameLabels(definition.inputs);
    const pathFor = (key) => sourcePath(definition.inputs, key);
    const warnings = [];
    const collect = (result) => {
      if (!result || !result.warnings) return;
      warnings.push(...result.warnings);
    };

    if (type === 'handoff') {
      const handoff = load.loadHandoff(pathFor('handoff'), labels.handoff);
      const crm = load.loadCrm(pathFor('crm'), labels.crm);
      const questions = load.loadQuestions(pathFor('questions'), labels.questions);
      collect(handoff);
      collect(crm);
      collect(questions);
      return { handoff, crm, questions, warnings };
    }

    const account = load.loadAccount(pathFor('account'), labels.account);
    const crm = load.loadCrm(pathFor('crm'), labels.crm);
    const tickets = load.loadTickets(pathFor('tickets'), labels.tickets);
    const usage = load.loadUsage(pathFor('usage'), labels.usage);
    collect(account);
    collect(crm);
    collect(tickets);
    collect(usage);
    return { account, crm, tickets, usage, warnings };
  }

  function generate(scenarioName = 'full', type = 'renewal', overrides = {}) {
    const scenario = SCENARIOS[scenarioName];
    if (!scenario) throw new Error('unknown demo scenario "' + scenarioName + '"');
    const definition = scenario.types[type];
    if (!definition) throw new Error('unknown demo brief type "' + type + '"');
    const files = { ...definition.files };
    for (const [key, text] of Object.entries(overrides || {})) {
      const input = definition.inputs[key];
      if (input) files[input.path] = String(text);
    }
    // Both loading and rendering use one module graph, just as one CLI run
    // does. The graph closes over this scenario's virtual file system.
    const requireModule = makeCsmkit(files);
    const loaded = loadInputs(type, { ...definition, files }, requireModule);
    const loadApi = requireModule('/lib/load.js');
    const briefApi = requireModule('/lib/brief.js');
    const parsedAsOf = loadApi.parseIsoDate(AS_OF);
    if (!parsedAsOf) throw new Error('invalid pinned as-of date ' + AS_OF);
    const brief = briefApi.buildBrief({ type, ...loaded, asOfDt: parsedAsOf });
    return {
      ...brief,
      warnings: loaded.warnings,
      asOf: AS_OF,
      scenario: scenarioName,
      type,
    };
  }

  // Public surface used by the page and by the equivalence harness. The
  // engine modules above are the unmodified lib/*.js sources embedded at build time.
  const api = { AS_OF, PACKAGE, SCENARIOS, makeCsmkit, generate };
  window.CSMKIT_DEMO = api;
  globalThis.CSMKIT_DEMO = api;
})();
`.replace('__MODULES__', moduleJson).replace('__SCENARIOS__', scenarioJson).replace('__PACKAGE__', packageJson);
}

const UI_SCRIPT = String.raw`(() => {
  'use strict';

  const api = window.CSMKIT_DEMO;
  const state = { scenario: 'full', type: 'renewal' };
  const edits = new Map();
  const app = document.getElementById('demo-app');
  const scenarioControls = document.getElementById('scenario-controls');
  const typeControls = document.getElementById('type-controls');
  const sourceList = document.getElementById('source-list');
  const output = document.getElementById('brief-output');
  const status = document.getElementById('result-status');
  const warnings = document.getElementById('warning-box');
  const sourceSummary = document.getElementById('source-summary');
  const scenarioSummary = document.getElementById('scenario-summary');
  const generateButton = document.getElementById('generate-button');
  const resetButton = document.getElementById('reset-button');

  function button(label, className, attributes = {}) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = className;
    element.textContent = label;
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    return element;
  }

  function currentDefinition() {
    return api.SCENARIOS[state.scenario].types[state.type];
  }

  function editKey(key) {
    return state.scenario + '/' + state.type + '/' + key;
  }

  function renderScenarioControls() {
    scenarioControls.replaceChildren();
    for (const [name, scenario] of Object.entries(api.SCENARIOS)) {
      const item = button('', 'choice', { 'aria-pressed': String(name === state.scenario) });
      const strong = document.createElement('strong');
      strong.textContent = scenario.label;
      const small = document.createElement('small');
      small.textContent = scenario.description;
      item.append(strong, small);
      item.addEventListener('click', () => {
        state.scenario = name;
        render();
      });
      scenarioControls.append(item);
    }
  }

  function renderTypeControls() {
    typeControls.replaceChildren();
    for (const type of ['renewal', 'handoff', 'qbr']) {
      const label = type === 'qbr' ? 'QBR packet' : type === 'handoff' ? 'Handoff brief' : 'Renewal brief';
      const item = button(label, 'type-choice', { 'aria-pressed': String(type === state.type) });
      item.addEventListener('click', () => {
        state.type = type;
        render();
      });
      typeControls.append(item);
    }
  }

  function renderSources() {
    sourceList.replaceChildren();
    const definition = currentDefinition();
    const entries = Object.entries(definition.inputs);
    sourceSummary.textContent = entries.length + ' source file' + (entries.length === 1 ? '' : 's') + ' · edits stay in this tab';
    if (entries.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-source';
      empty.textContent = 'No source files selected for this brief type.';
      sourceList.append(empty);
      return;
    }
    for (const [key, input] of entries) {
      const card = document.createElement('div');
      card.className = 'source-card';
      const label = document.createElement('label');
      label.textContent = input.label;
      label.htmlFor = 'source-' + key;
      const editor = document.createElement('textarea');
      editor.id = 'source-' + key;
      editor.className = 'source-editor';
      editor.dataset.key = key;
      editor.spellcheck = false;
      editor.value = edits.has(editKey(key)) ? edits.get(editKey(key)) : definition.files[input.path];
      editor.addEventListener('input', () => edits.set(editKey(key), editor.value));
      card.append(label, editor);
      sourceList.append(card);
    }
  }

  function collectOverrides() {
    const overrides = {};
    for (const editor of sourceList.querySelectorAll('.source-editor')) overrides[editor.dataset.key] = editor.value;
    return overrides;
  }

  function renderBrief() {
    const started = performance.now();
    output.classList.remove('error');
    try {
      const result = api.generate(state.scenario, state.type, collectOverrides());
      output.textContent = result.markdown;
      const elapsed = Math.max(0, performance.now() - started).toFixed(1);
      const score = result.completeness;
      status.className = 'result-status ok';
      status.textContent = 'generated in ' + elapsed + ' ms · completeness ' + score.present + '/' + score.total + ' (' + score.pct + '%)';
      warnings.hidden = result.warnings.length === 0;
      warnings.textContent = result.warnings.length === 0
        ? ''
        : result.warnings.length + ' input warning' + (result.warnings.length === 1 ? '' : 's') + ' · invalid rows stay out of the brief.';
    } catch (error) {
      output.classList.add('error');
      output.textContent = 'The engine stopped safely:\n\n' + error.message;
      status.className = 'result-status error';
      status.textContent = 'input error · no brief rendered';
      warnings.hidden = true;
    }
  }

  function render() {
    const scenario = api.SCENARIOS[state.scenario];
    state.type = api.SCENARIOS[state.scenario].types[state.type] ? state.type : 'renewal';
    scenarioSummary.textContent = scenario.label + ' · pinned --as-of ' + api.AS_OF;
    renderScenarioControls();
    renderTypeControls();
    renderSources();
    renderBrief();
  }

  generateButton.addEventListener('click', renderBrief);
  resetButton.addEventListener('click', () => {
    for (const key of [...edits.keys()]) if (key.startsWith(state.scenario + '/' + state.type + '/')) edits.delete(key);
    renderSources();
    renderBrief();
  });
  render();
  app.dataset.ready = 'true';
})();
`;

function buildInteractivePage({ directoryLayout = true } = {}) {
  const scenarios = loadScenarioManifest();
  const moduleNames = fs.readdirSync(path.join(ROOT, 'lib')).filter((name) => name.endsWith('.js')).sort();
  const modules = Object.fromEntries(
    moduleNames.map((name) => [`/lib/${name}`, fs.readFileSync(path.join(ROOT, 'lib', name), 'utf8')]),
  );
  const runtimeScript = buildRuntimeScript(scenarios, modules);
  // GitHub Pages serves the docs directory as the site root. The alias lives
  // beside the demo directory, so its root link is already current-directory.
  const rootHref = directoryLayout ? '../' : './';
  const staticHref = directoryLayout ? '../demo-static/' : 'demo-static/';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Run the csm-kit evidence-cited brief engine in this tab. Nothing leaves the browser.">
  <title>csm-kit · Interactive demo</title>
  <style>${TOKENS}</style>
</head>
<body>
  <div class="shell">
    <header class="topbar">
      <a class="wordmark" href="${rootHref}">csm-kit</a>
      <span class="top-meta">INTERACTIVE / NO NETWORK CALLS</span>
    </header>
    <noscript>
      <div class="panel noscript">
        <div class="eyebrow">JavaScript is off</div>
        <h1>Read the generated briefs instead.</h1>
        <p>This interactive demo runs the stdlib-only engine in your tab. With JavaScript disabled, use the <a href="${staticHref}">static annotated walkthrough</a>; no data is sent anywhere.</p>
      </div>
    </noscript>
    <main id="demo-app" class="demo-app">
      <section class="demo-intro">
        <div class="eyebrow">Use it before you install it</div>
        <h1>Evidence in. Defensible brief out.</h1>
        <p>Pick a fixture scenario, switch brief types, or edit the local source panes. The unmodified csm-kit engine runs here with a fixed <span class="mono">--as-of ${AS_OF}</span>. Nothing leaves this tab.</p>
        <div class="chip-row">
          <span class="chip success">offline runtime</span>
          <span class="chip">unmodified lib/*.js</span>
          <span class="chip">fixed --as-of ${AS_OF}</span>
        </div>
      </section>
      <section class="panel control-panel" aria-labelledby="scenario-heading">
        <fieldset>
          <legend id="scenario-heading">01 / Choose the evidence shape</legend>
          <div id="scenario-controls" class="choice-grid"></div>
        </fieldset>
      </section>
      <section class="panel control-panel" aria-labelledby="type-heading">
        <fieldset>
          <legend id="type-heading">02 / Choose the artifact</legend>
          <div id="type-controls" class="type-row"></div>
        </fieldset>
      </section>
      <section class="demo-grid" aria-label="Local inputs and generated brief">
        <article class="panel source-panel">
          <div class="panel-heading">
            <div>
              <h2>Source panes</h2>
              <p id="source-summary">Local-only input editors</p>
            </div>
            <span class="mono">in memory</span>
          </div>
          <div id="source-list" class="source-list"></div>
        </article>
        <article class="panel result-panel">
          <div class="panel-heading">
            <div>
              <h2>Generated brief</h2>
              <p id="scenario-summary">Pinned scenario</p>
            </div>
            <div id="result-status" class="result-status" aria-live="polite">waiting for runtime</div>
          </div>
          <div id="warning-box" class="warning-box" role="status" hidden></div>
          <pre id="brief-output" class="brief-output result-output" aria-live="polite"></pre>
          <div class="result-footer">
            <div class="button-row">
              <button id="generate-button" class="button" type="button">Generate brief</button>
              <button id="reset-button" class="button secondary" type="button">Reset inputs</button>
            </div>
            <span class="mono">same inputs + same as-of = same bytes</span>
          </div>
        </article>
      </section>
      <aside class="panel demo-note">
        <strong>Try the fail-closed path:</strong> choose Sparse evidence, then inspect the missing-evidence checklist. Delete a required line in a source pane and regenerate; the engine suppresses whatever it can no longer cite instead of guessing.
      </aside>
    </main>
    <footer class="footer">
      <p><a href="${staticHref}">Read the annotated static samples</a> · inputs stay in memory and are never submitted.</p>
      <p class="mono">Generated by web/build-demo.mjs · csm-kit v${htmlEscape(PACKAGE.version)}.</p>
    </footer>
  </div>
  <script id="demo-runtime">${runtimeScript}</script>
  <script id="demo-ui">${UI_SCRIPT}</script>
</body>
</html>
`;
}

writeFile(STATIC_OUT, buildStaticPage());
writeFile(INTERACTIVE_OUT, buildInteractivePage());
writeFile(INTERACTIVE_ALIAS_OUT, buildInteractivePage({ directoryLayout: false }));
process.stdout.write(`built ${path.relative(ROOT, STATIC_OUT)}\n`);
process.stdout.write(`built ${path.relative(ROOT, INTERACTIVE_OUT)}\n`);
process.stdout.write(`built ${path.relative(ROOT, INTERACTIVE_ALIAS_OUT)}\n`);
