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
    --csm-canvas: #f6f8fc;
    --csm-surface: #ffffff;
    --csm-band: #edf1f7;
    --csm-line: #d7e0ec;
    --csm-ink: #101a33;
    --csm-ink-soft: #34445f;
    --csm-muted: #5c6c86;
    --csm-indigo: #4c45d6;
    --csm-indigo-hover: #3934b4;
    --csm-indigo-soft: #e9eaff;
    --csm-indigo-line: #b9b9ed;
    --csm-citation: #176f4d;
    --csm-warning: #855b12;
    --csm-warning-surface: #fff6df;
    --csm-danger: #a33d47;
    --csm-danger-surface: #fff0f1;
    --csm-action-text: #ffffff;
    --csm-focus: #4c45d6;
    --csm-ui: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    --csm-code: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
    --csm-weight-body: 400;
    --csm-weight-heading: 500;
    --csm-text-xs: 11px;
    --csm-text-sm: 13px;
    --csm-text-body: 15px;
    --csm-text-lead: 19px;
    --csm-text-section: 28px;
    --csm-text-display: 58px;
    --csm-page-max: 1200px;
    --csm-section-gap: 72px;
    --csm-panel-pad: 24px;
    --csm-control-radius: 4px;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      color-scheme: dark;
      --csm-canvas: #101625;
      --csm-surface: #151d2d;
      --csm-band: #1b2639;
      --csm-line: #34425b;
      --csm-ink: #f2f5ff;
      --csm-ink-soft: #d0d9ea;
      --csm-muted: #aebbd0;
      --csm-indigo: #aaa7ff;
      --csm-indigo-hover: #c3c0ff;
      --csm-indigo-soft: #2a2c58;
      --csm-indigo-line: #7776c9;
      --csm-citation: #78d8a2;
      --csm-warning: #f1c26d;
      --csm-warning-surface: #332c1e;
      --csm-danger: #ff9a9f;
      --csm-danger-surface: #38242b;
      --csm-action-text: #101625;
      --csm-focus: #c3c0ff;
    }
  }

  * { box-sizing: border-box; }
  html { background: var(--csm-canvas); }
  body {
    margin: 0;
    background: var(--csm-canvas);
    color: var(--csm-ink);
    font: var(--csm-weight-body) var(--csm-text-body)/1.5 var(--csm-ui);
    font-variant-numeric: tabular-nums;
  }
  a { color: var(--csm-indigo); text-underline-offset: 3px; }
  a:hover { color: var(--csm-indigo-hover); }
  button, textarea { font: inherit; }
  button { cursor: pointer; }
  :focus-visible { outline: 2px solid var(--csm-focus); outline-offset: 3px; }
  .skip-link {
    position: absolute;
    z-index: 2;
    top: 8px;
    left: 8px;
    padding: 8px 12px;
    color: var(--csm-action-text);
    background: var(--csm-indigo);
    border-radius: var(--csm-control-radius);
    transform: translateY(-150%);
  }
  .skip-link:focus { transform: translateY(0); }
  .shell { width: min(var(--csm-page-max), calc(100% - 48px)); margin: 0 auto; }
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 68px;
    padding: 14px 0;
    border-bottom: 1px solid var(--csm-line);
  }
  .wordmark {
    color: var(--csm-ink);
    font: var(--csm-weight-heading) 15px/1 var(--csm-code);
    letter-spacing: .02em;
    text-decoration: none;
  }
  .wordmark::before { content: ">_"; color: var(--csm-citation); margin-right: 8px; }
  .top-meta { color: var(--csm-muted); font: var(--csm-weight-body) var(--csm-text-xs)/1.45 var(--csm-code); letter-spacing: .04em; text-align: right; }
  .hero { max-width: 900px; padding: 68px 0 48px; }
  .eyebrow {
    color: var(--csm-muted);
    font: var(--csm-weight-body) var(--csm-text-xs)/1.45 var(--csm-code);
    letter-spacing: .08em;
    text-transform: uppercase;
  }
  h1, h2, h3 { color: var(--csm-ink); font-weight: var(--csm-weight-heading); }
  h1 { max-width: 800px; margin: 14px 0 20px; font-size: clamp(40px, 6vw, var(--csm-text-display)); line-height: 1.04; letter-spacing: -1.7px; }
  h2 { margin: 0 0 10px; font-size: var(--csm-text-section); line-height: 1.12; letter-spacing: -.7px; }
  h3 { margin: 0 0 9px; font-size: 19px; line-height: 1.2; letter-spacing: -.2px; }
  .lede { max-width: 740px; margin: 0; color: var(--csm-ink-soft); font-size: var(--csm-text-lead); line-height: 1.45; }
  .lede strong { color: var(--csm-ink); font-weight: var(--csm-weight-heading); }
  .chip-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 28px; }
  .chip {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 4px 10px;
    color: var(--csm-muted);
    background: var(--csm-surface);
    border: 1px solid var(--csm-line);
    border-radius: var(--csm-control-radius);
    font: var(--csm-weight-body) var(--csm-text-xs)/1.45 var(--csm-code);
  }
  .chip.success { color: var(--csm-citation); border-color: var(--csm-citation); }
  .hero-proof {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    max-width: 1120px;
    margin: 0 0 var(--csm-section-gap);
  }
  .hero-proof-item { padding: 14px 0 0; border-top: 2px solid var(--csm-indigo); }
  .hero-proof-item:nth-child(2) { border-top-color: var(--csm-citation); }
  .hero-proof-item:nth-child(3) { border-top-color: var(--csm-line); }
  .hero-proof-item:nth-child(4) { border-top-color: var(--csm-ink); }
  .hero-proof-index { display: block; margin-bottom: 8px; color: var(--csm-muted); font: var(--csm-weight-body) var(--csm-text-xs)/1.4 var(--csm-code); }
  .hero-proof-item strong { display: block; margin-bottom: 4px; color: var(--csm-ink); font-size: var(--csm-text-sm); font-weight: var(--csm-weight-heading); }
  .hero-proof-item p { margin: 0; color: var(--csm-muted); font-size: var(--csm-text-sm); line-height: 1.4; }
  .panel {
    background: var(--csm-surface);
    border: 1px solid var(--csm-line);
    border-radius: var(--csm-control-radius);
  }
  .callouts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 0 0 var(--csm-section-gap); }
  .callout { padding: 22px; background: var(--csm-band); border-top: 2px solid var(--csm-indigo); }
  .callout:nth-child(2) { border-top-color: var(--csm-citation); }
  .callout:nth-child(3) { border-top-color: var(--csm-ink); }
  .callout p { margin: 0; color: var(--csm-ink-soft); }
  .callout code, .hero-proof-item code, .mono { color: var(--csm-citation); font-family: var(--csm-code); font-size: .9em; }
  .section-head { display: flex; justify-content: space-between; align-items: start; gap: 20px; margin-bottom: 22px; }
  .section-head p { max-width: 280px; margin: 0; color: var(--csm-muted); font-size: var(--csm-text-sm); }
  .brief-list { display: grid; gap: 14px; margin-bottom: var(--csm-section-gap); }
  details { overflow: hidden; }
  details summary { padding: 19px 22px; color: var(--csm-ink); cursor: pointer; font-size: var(--csm-text-body); font-weight: var(--csm-weight-heading); }
  details summary::marker { color: var(--csm-indigo); }
  details[open] summary { color: var(--csm-indigo); border-bottom: 1px solid var(--csm-line); }
  .brief-meta { padding: 15px 22px 0; color: var(--csm-muted); font: var(--csm-weight-body) var(--csm-text-xs)/1.5 var(--csm-code); }
  .brief-output {
    margin: 15px 22px 22px;
    padding: 22px;
    overflow: auto;
    color: var(--csm-ink);
    background: var(--csm-band);
    font: var(--csm-weight-body) var(--csm-text-xs)/1.7 var(--csm-code);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .footer { padding: 30px 0 58px; border-top: 1px solid var(--csm-line); color: var(--csm-muted); }
  .footer p { margin: 0 0 8px; }
  .footer .mono { color: var(--csm-muted); }

  /* Interactive controls */
  .demo-app { padding-bottom: var(--csm-section-gap); }
  .demo-intro { padding: 54px 0 34px; }
  .demo-intro h1 { max-width: 760px; margin-bottom: 18px; font-size: clamp(40px, 5.4vw, 50px); }
  .demo-intro p { max-width: 740px; margin: 0; color: var(--csm-ink-soft); font-size: var(--csm-text-lead); line-height: 1.45; }
  .setup { margin-bottom: 16px; }
  .setup-heading { display: flex; align-items: end; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
  .setup-heading h2 { margin: 4px 0 0; font-size: 23px; letter-spacing: -.3px; }
  .setup-heading p { max-width: 380px; margin: 0; color: var(--csm-muted); font-size: var(--csm-text-sm); text-align: right; }
  .setup-grid { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(260px, .65fr); gap: 16px; }
  .control-panel { min-width: 0; padding: var(--csm-panel-pad); }
  fieldset { min-width: 0; margin: 0; padding: 0; border: 0; }
  legend { margin-bottom: 14px; color: var(--csm-ink); font-size: var(--csm-text-body); font-weight: var(--csm-weight-heading); }
  .choice-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .choice, .type-choice {
    width: 100%;
    min-height: 44px;
    padding: 14px;
    color: var(--csm-ink-soft);
    text-align: left;
    background: var(--csm-surface);
    border: 1px solid var(--csm-line);
    border-radius: var(--csm-control-radius);
  }
  .choice:hover, .type-choice:hover { color: var(--csm-ink); background: var(--csm-indigo-soft); border-color: var(--csm-indigo); }
  .choice[aria-pressed="true"], .type-choice[aria-pressed="true"] { color: var(--csm-ink); background: var(--csm-indigo-soft); border-color: var(--csm-indigo); }
  .choice strong { display: block; margin-bottom: 5px; color: var(--csm-indigo); font-weight: var(--csm-weight-heading); }
  .choice small { display: block; color: var(--csm-muted); line-height: 1.4; }
  .type-row { display: grid; gap: 8px; }
  .type-choice { padding: 12px 14px; font: var(--csm-weight-heading) var(--csm-text-sm)/1.35 var(--csm-code); }
  .type-choice[aria-pressed="true"] { color: var(--csm-indigo); }
  .demo-grid { display: grid; grid-template-columns: minmax(280px, .82fr) minmax(0, 1.6fr); gap: 16px; margin-top: 16px; align-items: start; }
  .source-panel, .result-panel { min-width: 0; }
  .panel-heading { display: flex; justify-content: space-between; gap: 12px; padding: 18px 22px; background: var(--csm-band); border-bottom: 1px solid var(--csm-line); }
  .panel-heading h2 { margin: 0; font-size: 21px; letter-spacing: -.3px; }
  .panel-heading p { margin: 4px 0 0; color: var(--csm-muted); font-size: var(--csm-text-xs); }
  .source-list { padding: 22px; }
  .source-card { margin-bottom: 22px; }
  .source-card:last-child { margin-bottom: 0; }
  .source-card label { display: block; margin: 0 0 7px; color: var(--csm-citation); font: var(--csm-weight-body) var(--csm-text-xs)/1.45 var(--csm-code); }
  .source-card textarea {
    display: block;
    width: 100%;
    min-height: 116px;
    resize: vertical;
    padding: 11px;
    color: var(--csm-ink);
    background: var(--csm-canvas);
    border: 1px solid var(--csm-line);
    border-radius: var(--csm-control-radius);
    font: var(--csm-weight-body) var(--csm-text-xs)/1.55 var(--csm-code);
  }
  .source-card textarea:focus { border-color: var(--csm-indigo); outline: 2px solid var(--csm-focus); outline-offset: 0; }
  .empty-source { margin: 0; padding: 16px; color: var(--csm-muted); font-size: var(--csm-text-sm); }
  .result-status { color: var(--csm-muted); font: var(--csm-weight-body) var(--csm-text-xs)/1.45 var(--csm-code); text-align: right; }
  .result-status.ok { color: var(--csm-citation); }
  .result-status.error { color: var(--csm-danger); }
  .result-output { min-height: 520px; max-height: 820px; margin-top: 18px; }
  .result-output.error { color: var(--csm-danger); background: var(--csm-danger-surface); }
  .result-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 22px; background: var(--csm-band); border-top: 1px solid var(--csm-line); }
  .button-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .button {
    min-height: 44px;
    padding: 11px 16px;
    color: var(--csm-action-text);
    background: var(--csm-indigo);
    border: 1px solid var(--csm-indigo);
    border-radius: var(--csm-control-radius);
    font: var(--csm-weight-heading) var(--csm-text-sm)/1.1 var(--csm-ui);
  }
  .button:hover { background: var(--csm-indigo-hover); border-color: var(--csm-indigo-hover); }
  .button.secondary { color: var(--csm-indigo); background: transparent; border-color: var(--csm-indigo-line); }
  .button.secondary:hover { color: var(--csm-indigo-hover); background: var(--csm-indigo-soft); border-color: var(--csm-indigo); }
  .warning-box { margin: 14px 16px 0; padding: 11px 13px; color: var(--csm-warning); background: var(--csm-warning-surface); border: 1px solid var(--csm-warning); border-radius: var(--csm-control-radius); font: var(--csm-weight-body) var(--csm-text-xs)/1.5 var(--csm-code); }
  .warning-box[hidden] { display: none; }
  .demo-note { margin-top: 16px; padding: 17px 21px; color: var(--csm-ink-soft); background: var(--csm-band); border-left: 3px solid var(--csm-citation); font-size: var(--csm-text-sm); }
  .demo-note strong { color: var(--csm-ink); font-weight: var(--csm-weight-heading); }
  .noscript { max-width: 720px; margin: 64px auto; padding: var(--csm-panel-pad); }
  .noscript h1 { font-size: 38px; letter-spacing: -1px; }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
  }

  @media print {
    html, body { background: #ffffff; color: #101a33; }
    body { font-size: 11pt; }
    .skip-link, .top-meta, .setup, .source-panel, .demo-note, .result-footer, .footer, .noscript { display: none !important; }
    .shell { width: 100%; }
    .topbar { min-height: 42px; padding: 8px 0; }
    .hero, .demo-intro { padding: 24px 0 20px; }
    .hero-proof { margin-bottom: 24px; }
    .hero-proof-item { break-inside: avoid; }
    .callouts { margin-bottom: 24px; }
    .demo-grid { display: block; margin-top: 0; }
    .result-panel { border: 0; }
    .panel-heading { padding: 0 0 10px; background: transparent; }
    .result-output { min-height: 0; max-height: none; margin: 12px 0 0; background: transparent; border: 1px solid #d7e0ec; }
    details { display: block; break-inside: avoid; }
    details > *:not(summary) { display: block; }
    a { color: inherit; text-decoration: none; }
  }

  @media (max-width: 880px) {
    .hero-proof { grid-template-columns: repeat(2, 1fr); }
    .setup-grid { grid-template-columns: 1fr; }
    .type-row { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 760px) {
    .shell { width: min(100% - 24px, var(--csm-page-max)); }
    .topbar { align-items: start; padding: 14px 0; }
    .top-meta { max-width: 170px; font-size: 10px; }
    .hero { padding: 52px 0 36px; }
    .demo-intro { padding: 42px 0 28px; }
    h1, .demo-intro h1 { letter-spacing: -1px; }
    .hero-proof { grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 48px; }
    .callouts, .choice-grid, .demo-grid { grid-template-columns: 1fr; }
    .section-head, .setup-heading { display: block; }
    .section-head p, .setup-heading p { max-width: none; margin-top: 8px; text-align: left; }
    .control-panel { padding: 18px; }
    .type-row { grid-template-columns: 1fr; }
    .demo-grid { margin-top: 12px; }
    .result-output { min-height: 380px; max-height: none; margin-left: 16px; margin-right: 16px; }
    .result-footer { align-items: flex-start; flex-direction: column; }
    .result-status { text-align: left; }
    .button-row { width: 100%; }
    .button { flex: 1 1 auto; }
  }
  @media (max-width: 420px) {
    .hero-proof { grid-template-columns: 1fr; }
    .hero-proof-item:nth-child(3) { border-top-color: var(--csm-indigo); }
    .hero-proof-item:nth-child(4) { border-top-color: var(--csm-citation); }
    .panel-heading { align-items: start; flex-direction: column; }
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

const TRUST_POINTS = [
  {
    index: '01 / Inputs',
    title: 'CSV + YAML exports',
    body: 'Use the files your CRM, ticketing, and usage systems already produce.',
  },
  {
    index: '02 / Proof',
    title: 'Every fact gets a span',
    body: 'A citation like `crm.csv#L8` points back to the row behind the claim.',
  },
  {
    index: '03 / Guardrail',
    title: 'Fail closed, never guess',
    body: 'Missing proof becomes a visible checklist item or handoff ask.',
  },
  {
    index: '04 / Output',
    title: 'Three deterministic briefs',
    body: 'Switch renewal, handoff, or QBR with the same shared engine.',
  },
];

function buildTrustRail() {
  return `<section class="hero-proof" aria-label="csm-kit trust properties">${TRUST_POINTS.map(
    (point) => `
      <article class="hero-proof-item">
        <span class="hero-proof-index">${htmlEscape(point.index)}</span>
        <strong>${htmlEscape(point.title)}</strong>
        <p>${htmlEscape(point.body).replace(/`([^`]+)`/g, '<code>$1</code>')}</p>
      </article>`,
  ).join('')}</section>`;
}

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
    <a class="skip-link" href="#static-main">Skip to generated samples</a>
    <header class="topbar">
      <a class="wordmark" href="../">csm-kit</a>
      <span class="top-meta">STATIC WALKTHROUGH / --AS-OF ${AS_OF}</span>
    </header>
    <main id="static-main">
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
      ${buildTrustRail()}
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
  // The Pages build serves the docs directory as the site root. The alias lives
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
    <a class="skip-link" href="#demo-app">Skip to demo controls</a>
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
      ${buildTrustRail()}
      <section class="setup" aria-labelledby="setup-heading">
        <div class="setup-heading">
          <div>
            <div class="eyebrow">Run a brief</div>
            <h2 id="setup-heading">Choose evidence, then artifact.</h2>
          </div>
          <p>All edits stay in memory. The result below is the same markdown the CLI would write.</p>
        </div>
        <div class="setup-grid">
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
        </div>
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
          <pre id="brief-output" class="brief-output result-output" aria-label="Generated markdown brief" aria-live="polite"></pre>
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
