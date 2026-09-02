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
    --csm-canvas: #ffffff;
    --csm-surface: #ffffff;
    --csm-band: #f6f8fb;
    --csm-line: #d6dfeb;
    --csm-line-strong: #aebed2;
    --csm-ink: #061b31;
    --csm-ink-soft: #50617a;
    --csm-muted: #50617a;
    --csm-blue: #0b6e99;
    --csm-indigo: #533afd;
    --csm-indigo-hover: #3f2cc8;
    --csm-indigo-soft: #f0eeff;
    --csm-indigo-line: #bdb4ff;
    --csm-citation: #0b6f52;
    --csm-warning: #825500;
    --csm-warning-surface: #fff8e7;
    --csm-danger: #b42318;
    --csm-danger-surface: #fff1f0;
    --csm-action-text: #ffffff;
    --csm-focus: #533afd;
    --csm-shadow: rgba(6, 27, 49, .08);
    --csm-ui: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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

  /* Keep the reference-led light surface readable even when the OS prefers dark mode. */
  @media (prefers-color-scheme: dark) {
    :root {
      color-scheme: light;
      --csm-canvas: #f7f9fc;
      --csm-surface: #ffffff;
      --csm-band: #eef3f9;
      --csm-line: #c7d3e1;
      --csm-line-strong: #9db0c6;
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
  .focus-target:focus { outline: 2px solid var(--csm-focus); outline-offset: 6px; }
  .shell { width: min(var(--csm-page-max), calc(100% - 48px)); min-width: 0; margin: 0 auto; }
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
  .top-meta { min-width: 0; color: var(--csm-muted); font: var(--csm-weight-body) var(--csm-text-xs)/1.45 var(--csm-code); letter-spacing: .04em; text-align: right; overflow-wrap: anywhere; }
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
  .hero-route {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    min-height: 44px;
    margin-top: 24px;
    padding: 11px 16px;
    color: var(--csm-action-text);
    background: var(--csm-indigo);
    border: 1px solid var(--csm-indigo);
    border-radius: var(--csm-control-radius);
    font-size: var(--csm-text-sm);
    font-weight: var(--csm-weight-heading);
    text-decoration: none;
  }
  .hero-route:hover { color: var(--csm-action-text); background: var(--csm-indigo-hover); border-color: var(--csm-indigo-hover); }
  .hero-route small { color: rgba(255, 255, 255, .82); font: var(--csm-weight-body) var(--csm-text-xs)/1.3 var(--csm-code); }
  .hero-proof {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    max-width: 1120px;
    margin: 0 0 var(--csm-section-gap);
  }
  .hero-proof-item { padding: 14px 0 0; border-top: 2px solid var(--csm-indigo); }
  .hero-proof-item:nth-child(2) { border-top-color: var(--csm-citation); }
  .hero-proof-item:nth-child(3) { border-top-color: var(--csm-blue); }
  .hero-proof-item:nth-child(4) { border-top-color: var(--csm-indigo); }
  .hero-proof-index { display: block; margin-bottom: 8px; color: var(--csm-muted); font: var(--csm-weight-body) var(--csm-text-xs)/1.4 var(--csm-code); }
  .hero-proof-item strong { display: block; margin-bottom: 4px; color: var(--csm-ink); font-size: var(--csm-text-sm); font-weight: var(--csm-weight-heading); }
  .hero-proof-item p { margin: 0; color: var(--csm-muted); font-size: var(--csm-text-sm); line-height: 1.4; }
  .product-visual {
    display: grid;
    grid-template-columns: minmax(0, .72fr) minmax(0, 1.28fr);
    gap: 32px;
    align-items: start;
    margin: 0 0 var(--csm-section-gap);
    padding: 28px 0;
    border-top: 1px solid var(--csm-line);
    border-bottom: 1px solid var(--csm-line);
  }
  .product-visual-copy { min-width: 0; max-width: 430px; }
  .product-visual-copy h2 { margin: 8px 0 10px; font-size: 25px; }
  .product-visual-copy p { margin: 0; color: var(--csm-ink-soft); overflow-wrap: anywhere; }
  .product-visual-proof { display: flex; flex-wrap: wrap; gap: 18px; margin: 20px 0 0; }
  .product-visual-proof > div { min-width: 0; flex: 1 1 110px; }
  .product-visual-proof strong { display: block; color: var(--csm-ink); font: var(--csm-weight-heading) 21px/1.1 var(--csm-code); }
  .product-visual-proof span { display: block; margin-top: 4px; color: var(--csm-muted); font-size: var(--csm-text-xs); overflow-wrap: anywhere; }
  .product-visual-proof code { display: block; max-width: 100%; margin-top: 3px; color: var(--csm-citation); font: var(--csm-weight-body) 10px/1.3 var(--csm-code); overflow-wrap: anywhere; }
  .pulse-figure { min-width: 0; margin: 0; padding: 14px; background: var(--csm-surface); border: 1px solid var(--csm-line); border-radius: var(--csm-control-radius); box-shadow: 0 2px 10px var(--csm-shadow); }
  .account-pulse { display: block; width: 100%; height: auto; }
  .account-pulse .pulse-shell { fill: var(--csm-surface); stroke: var(--csm-line); }
  .account-pulse .pulse-band { fill: var(--csm-band); }
  .account-pulse .pulse-card { fill: var(--csm-surface); stroke: var(--csm-line); }
  .account-pulse .pulse-rule { fill: none; stroke: var(--csm-line); }
  .account-pulse .pulse-indigo-stroke { fill: none; stroke: var(--csm-indigo); }
  .account-pulse .pulse-citation-stroke { fill: none; stroke: var(--csm-citation); }
  .account-pulse .pulse-area { fill: var(--csm-indigo-soft); opacity: .8; }
  .account-pulse .pulse-dot { fill: var(--csm-citation); }
  .account-pulse .pulse-ink { fill: var(--csm-ink); }
  .account-pulse .pulse-soft { fill: var(--csm-ink-soft); }
  .account-pulse .pulse-muted { fill: var(--csm-muted); }
  .account-pulse .pulse-indigo { fill: var(--csm-indigo); }
  .account-pulse .pulse-citation { fill: var(--csm-citation); }
  .account-pulse .pulse-warning { fill: var(--csm-warning); }
  .account-pulse .pulse-tag { fill: var(--csm-warning-surface); stroke: var(--csm-warning); }
  .account-pulse text { font-family: var(--csm-code); font-size: 11px; }
  .account-pulse .pulse-label { font-size: 10px; letter-spacing: .05em; }
  .account-pulse .pulse-number { font-size: 27px; font-weight: var(--csm-weight-heading); }
  .pulse-figure figcaption { margin: 10px 2px 0; padding-top: 10px; border-top: 1px solid var(--csm-line); color: var(--csm-muted); font-size: var(--csm-text-xs); }
  .pulse-figure figcaption strong { color: var(--csm-ink); font-weight: var(--csm-weight-heading); }
  .walkthrough { margin: 0 0 var(--csm-section-gap); padding-top: 28px; border-top: 1px solid var(--csm-line); }
  .walkthrough-heading { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
  .walkthrough-heading > * { min-width: 0; }
  .walkthrough-heading p { max-width: 370px; margin: 0; color: var(--csm-muted); font-size: var(--csm-text-sm); overflow-wrap: anywhere; }
  .walkthrough-steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0; margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--csm-line); border-bottom: 1px solid var(--csm-line); }
  .walkthrough-step { min-width: 0; padding: 20px 18px 22px; border-top: 3px solid var(--csm-indigo); }
  .walkthrough-step:nth-child(2) { border-top-color: var(--csm-blue); }
  .walkthrough-step:nth-child(3) { border-top-color: var(--csm-citation); }
  .walkthrough-step + .walkthrough-step { border-left: 1px solid var(--csm-line); }
  .walkthrough-step-number { display: block; margin-bottom: 18px; color: var(--csm-indigo); font: var(--csm-weight-body) var(--csm-text-xs)/1.2 var(--csm-code); }
  .walkthrough-step:nth-child(2) .walkthrough-step-number { color: var(--csm-blue); }
  .walkthrough-step:nth-child(3) .walkthrough-step-number { color: var(--csm-citation); }
  .walkthrough-step h3 { margin-bottom: 8px; font-size: 18px; }
  .walkthrough-step p { min-height: 66px; margin: 0; color: var(--csm-ink-soft); font-size: var(--csm-text-sm); overflow-wrap: anywhere; }
  .walkthrough-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px; }
  .walkthrough-tags span { padding: 4px 7px; color: var(--csm-muted); background: var(--csm-band); border: 1px solid var(--csm-line); border-radius: var(--csm-control-radius); font: var(--csm-weight-body) 10px/1.3 var(--csm-code); overflow-wrap: anywhere; }
  .input-output { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr); gap: 10px; align-items: stretch; margin-top: 16px; padding: 12px; background: var(--csm-band); border: 1px solid var(--csm-line); border-radius: var(--csm-control-radius); }
  .input-output-item { min-width: 0; padding: 13px; background: var(--csm-surface); border: 1px solid var(--csm-line); }
  .input-output-item span { display: block; margin-bottom: 5px; color: var(--csm-muted); font: var(--csm-weight-body) var(--csm-text-xs)/1.3 var(--csm-code); letter-spacing: .04em; text-transform: uppercase; }
  .input-output-item strong { display: block; color: var(--csm-ink); font-size: var(--csm-text-sm); font-weight: var(--csm-weight-heading); overflow-wrap: anywhere; }
  .input-output-arrow { align-self: center; color: var(--csm-indigo); font: var(--csm-weight-heading) 20px/1 var(--csm-code); }
  .scope-panel { display: grid; grid-template-columns: minmax(0, .82fr) minmax(0, 1.18fr); gap: 24px; margin: 0 0 var(--csm-section-gap); padding: 24px; background: var(--csm-indigo-soft); border: 1px solid var(--csm-indigo-line); border-radius: var(--csm-control-radius); }
  .scope-panel > * { min-width: 0; }
  .scope-panel h2 { margin: 7px 0 10px; font-size: 24px; }
  .scope-panel p { margin: 0; color: var(--csm-ink-soft); font-size: var(--csm-text-sm); overflow-wrap: anywhere; }
  .scope-columns { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
  .scope-column { min-width: 0; padding-left: 16px; border-left: 2px solid var(--csm-citation); }
  .scope-column.limit { border-left-color: var(--csm-indigo); }
  .scope-column ul { margin: 9px 0 0; padding: 0; list-style: none; }
  .scope-column li { position: relative; margin: 0 0 8px; padding-left: 14px; color: var(--csm-ink-soft); font-size: var(--csm-text-sm); overflow-wrap: anywhere; }
  .scope-column li::before { content: '+'; position: absolute; left: 0; color: var(--csm-citation); font-family: var(--csm-code); }
  .scope-column.limit li::before { content: '-'; color: var(--csm-indigo); }
  .panel {
    min-width: 0;
    background: var(--csm-surface);
    border: 1px solid var(--csm-line);
    border-radius: var(--csm-control-radius);
    box-shadow: 0 2px 10px var(--csm-shadow);
  }
  .callouts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0; margin: 0 0 var(--csm-section-gap); border-top: 1px solid var(--csm-line); border-bottom: 1px solid var(--csm-line); }
  .callout { min-width: 0; padding: 22px 18px; background: transparent; border-top: 2px solid var(--csm-indigo); }
  .callout:nth-child(2) { border-top-color: var(--csm-citation); }
  .callout:nth-child(3) { border-top-color: var(--csm-ink); }
  .callout p { margin: 0; color: var(--csm-ink-soft); }
  .callout code, .hero-proof-item code, .mono { color: var(--csm-citation); font-family: var(--csm-code); font-size: .9em; }
  .callouts .callout { border-right: 1px solid var(--csm-line); border-radius: 0; }
  .callouts .callout:last-child { border-right: 0; }
  .section-head { display: flex; justify-content: space-between; align-items: start; gap: 20px; margin-bottom: 22px; }
  .section-head > * { min-width: 0; }
  .section-head p { max-width: 280px; margin: 0; color: var(--csm-muted); font-size: var(--csm-text-sm); overflow-wrap: anywhere; }
  .brief-list { display: grid; gap: 14px; margin-bottom: var(--csm-section-gap); }
  details { overflow: hidden; }
  details summary { padding: 19px 22px; color: var(--csm-ink); cursor: pointer; font-size: var(--csm-text-body); font-weight: var(--csm-weight-heading); overflow-wrap: anywhere; }
  details summary::marker { color: var(--csm-indigo); }
  details[open] summary { color: var(--csm-indigo); border-bottom: 1px solid var(--csm-line); }
  .brief-meta { padding: 15px 22px 0; color: var(--csm-muted); font: var(--csm-weight-body) var(--csm-text-xs)/1.5 var(--csm-code); }
  .brief-view {
    min-width: 0;
    margin: 15px 22px 22px;
  }
  .brief-view > legend { padding: 0; color: var(--csm-muted); font: var(--csm-weight-body) var(--csm-text-xs)/1.45 var(--csm-code); text-transform: uppercase; letter-spacing: .06em; }
  .brief-view-switch { display: flex; flex-wrap: wrap; gap: 0; margin: 0 0 14px; }
  .brief-view > input { position: absolute; width: 1px; height: 1px; opacity: 0; }
  .brief-view > input + label, .view-button {
    display: inline-block;
    vertical-align: top;
    min-height: 36px;
    padding: 9px 12px;
    color: var(--csm-muted);
    background: var(--csm-surface);
    border: 1px solid var(--csm-line);
    font: var(--csm-weight-heading) var(--csm-text-xs)/1.1 var(--csm-code);
  }
  .brief-view > input + label + input + label { margin-left: -1px; }
  .brief-view > input:checked + label, .view-button[aria-pressed="true"] { color: var(--csm-indigo); background: var(--csm-indigo-soft); border-color: var(--csm-indigo); }
  .brief-view > input:focus-visible + label, .view-button:focus-visible { position: relative; z-index: 1; outline: 2px solid var(--csm-focus); outline-offset: 2px; }
  .brief-view > input[value="visual"]:checked ~ .brief-raw-panel { display: none; }
  .brief-view > input[value="raw"]:checked ~ .brief-visual-panel { display: none; }
  .brief-visual-panel, .brief-raw-panel { min-width: 0; max-width: 100%; }
  .brief-output {
    max-width: 100%;
    margin: 0;
    padding: 22px;
    overflow: auto;
    color: var(--csm-ink);
    background: var(--csm-band);
    font: var(--csm-weight-body) var(--csm-text-xs)/1.7 var(--csm-code);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .brief-visual { min-width: 0; color: var(--csm-ink-soft); overflow-wrap: anywhere; }
  .brief-presentation-head { display: flex; align-items: end; justify-content: space-between; gap: 18px; padding-bottom: 18px; border-bottom: 1px solid var(--csm-line); }
  .brief-presentation-head > * { min-width: 0; }
  .brief-presentation-head h3 { margin: 6px 0 0; color: var(--csm-ink); font-size: 23px; overflow-wrap: anywhere; }
  .brief-presentation-head p { max-width: 330px; margin: 0; color: var(--csm-muted); font-size: var(--csm-text-xs); overflow-wrap: anywhere; }
  .brief-identity { min-width: 0; margin: 12px 0 0; color: var(--csm-ink-soft); font-size: var(--csm-text-sm); overflow-wrap: anywhere; }
  .brief-identity p { max-width: none; margin: 4px 0 0; }
  .brief-anatomy { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 24px; padding-top: 20px; }
  .brief-map { min-width: 0; padding-right: 16px; border-right: 1px solid var(--csm-line); }
  .brief-map ol { margin: 0; padding: 0; list-style: none; }
  .brief-map li { border-top: 1px solid var(--csm-line); }
  .brief-map li:last-child { border-bottom: 1px solid var(--csm-line); }
  .brief-map a { display: block; padding: 10px 0; color: var(--csm-ink-soft); font-size: var(--csm-text-xs); text-decoration: none; overflow-wrap: anywhere; }
  .brief-map a:hover { color: var(--csm-indigo); }
  .brief-map-index { display: block; margin-bottom: 3px; color: var(--csm-indigo); font: var(--csm-weight-body) var(--csm-text-xs)/1.2 var(--csm-code); }
  .brief-groups { min-width: 0; }
  .brief-group + .brief-group { margin-top: 26px; padding-top: 24px; border-top: 1px solid var(--csm-line); }
  .brief-group-label { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; min-width: 0; margin-bottom: 16px; color: var(--csm-muted); font: var(--csm-weight-body) var(--csm-text-xs)/1.3 var(--csm-code); letter-spacing: .05em; text-transform: uppercase; overflow-wrap: anywhere; }
  .brief-group-label span { color: var(--csm-indigo); }
  .brief-section { min-width: 0; }
  .brief-section + .brief-section { margin-top: 22px; padding-top: 22px; border-top: 1px solid var(--csm-line); }
  .brief-section-heading h4 { margin: 5px 0 12px; color: var(--csm-ink); font-size: 18px; font-weight: var(--csm-weight-heading); }
  .brief-content { min-width: 0; }
  .brief-content p { margin: 0 0 11px; color: var(--csm-ink-soft); font-size: var(--csm-text-sm); }
  .brief-content .brief-context { color: var(--csm-muted); font-style: italic; }
  .brief-content ul { margin: 0; padding: 0 0 0 18px; color: var(--csm-ink-soft); }
  .brief-content li { padding: 3px 0; font-size: var(--csm-text-sm); overflow-wrap: anywhere; }
  .brief-visual code { color: var(--csm-citation); font-family: var(--csm-code); font-size: .9em; overflow-wrap: anywhere; }
  .brief-citation { color: var(--csm-citation); }
  .brief-table-wrap { max-width: 100%; margin: 0 0 12px; overflow-x: auto; }
  .brief-table { width: 100%; min-width: 0; table-layout: fixed; border-collapse: collapse; color: var(--csm-ink-soft); font-size: var(--csm-text-xs); }
  .brief-table th, .brief-table td { padding: 8px 9px; border-bottom: 1px solid var(--csm-line); text-align: left; vertical-align: top; overflow-wrap: anywhere; }
  .brief-table th { color: var(--csm-ink); font-weight: var(--csm-weight-heading); }
  .brief-stat { display: flex; align-items: baseline; flex-wrap: wrap; gap: 12px; margin: 0 0 16px; padding: 10px 0 12px; border-top: 1px solid var(--csm-indigo); border-bottom: 1px solid var(--csm-line); }
  .brief-stat strong { min-width: 0; color: var(--csm-ink); font: var(--csm-weight-heading) 30px/1 var(--csm-code); letter-spacing: -.04em; overflow-wrap: anywhere; }
  .brief-stat span { min-width: 0; color: var(--csm-muted); font-size: var(--csm-text-sm); overflow-wrap: anywhere; }
  .brief-stat-citations { flex-basis: 100%; min-width: 0; color: var(--csm-muted); font-size: var(--csm-text-xs); overflow-wrap: anywhere; }
  .brief-stat-state { color: var(--csm-indigo) !important; font: var(--csm-weight-heading) var(--csm-text-xs)/1.3 var(--csm-code); text-transform: uppercase; letter-spacing: .05em; }
  .brief-stat-note { flex-basis: 100%; min-width: 0; color: var(--csm-muted); font-size: var(--csm-text-xs); overflow-wrap: anywhere; }
  .brief-missing-units { margin: -4px 0 16px; padding: 10px 12px; color: var(--csm-warning); background: var(--csm-warning-surface); border-left: 2px solid var(--csm-warning); font-size: var(--csm-text-xs); }
  .brief-missing-units strong { color: var(--csm-ink); font-weight: var(--csm-weight-heading); }
  .brief-missing-units ul { margin: 5px 0 0; padding-left: 18px; }
  .brief-missing-units li { padding: 2px 0; overflow-wrap: anywhere; }
  .brief-safe-note { margin: 12px 0 0; padding: 9px 11px; color: var(--csm-muted); background: var(--csm-band); border-left: 2px solid var(--csm-line); font-size: var(--csm-text-xs); overflow-wrap: anywhere; }
  .brief-safe-note a, .brief-raw-jump { color: var(--csm-indigo); font-weight: var(--csm-weight-heading); }
  .brief-presentation-fallback { margin: 0; padding: 14px; color: var(--csm-muted); background: var(--csm-band); font-size: var(--csm-text-sm); overflow-wrap: anywhere; }
  .brief-citation-link { color: var(--csm-citation); font-family: var(--csm-code); font-size: .9em; text-decoration: underline; text-decoration-style: dotted; text-underline-offset: 3px; }
  .brief-citation-link:hover { color: var(--csm-indigo-hover); text-decoration-style: solid; }
  .footer { padding: 30px 0 58px; border-top: 1px solid var(--csm-line); color: var(--csm-muted); }
  .footer p { margin: 0 0 8px; }
  .footer .mono { color: var(--csm-muted); }

  /* Interactive controls */
  .demo-app { padding-bottom: var(--csm-section-gap); }
  .demo-intro { max-width: 850px; padding: 60px 0 34px; }
  .demo-intro h1 { max-width: 820px; margin-bottom: 18px; font-size: clamp(40px, 5.4vw, 52px); }
  .demo-intro p { max-width: 760px; margin: 0; color: var(--csm-ink-soft); font-size: var(--csm-text-lead); line-height: 1.5; }
  .setup { margin-bottom: 16px; }
  .setup-heading { display: flex; align-items: end; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
  .setup-heading > * { min-width: 0; }
  .setup-heading h2 { margin: 4px 0 0; font-size: 23px; letter-spacing: -.3px; }
  .setup-heading p { max-width: 380px; margin: 0; color: var(--csm-muted); font-size: var(--csm-text-sm); text-align: right; overflow-wrap: anywhere; }
  .setup-grid { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(260px, .65fr); gap: 16px; }
  .control-panel { min-width: 0; padding: var(--csm-panel-pad); }
  fieldset { min-width: 0; margin: 0; padding: 0; border: 0; }
  legend { margin-bottom: 14px; color: var(--csm-ink); font-size: var(--csm-text-body); font-weight: var(--csm-weight-heading); }
  .choice-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .choice, .type-choice {
    width: 100%;
    min-width: 0;
    min-height: 44px;
    padding: 14px;
    color: var(--csm-ink-soft);
    text-align: left;
    background: var(--csm-surface);
    border: 1px solid var(--csm-line);
    border-radius: var(--csm-control-radius);
    overflow-wrap: anywhere;
    white-space: normal;
  }
  .choice:hover, .type-choice:hover { color: var(--csm-ink); background: var(--csm-indigo-soft); border-color: var(--csm-indigo); }
  .choice[aria-pressed="true"], .type-choice[aria-pressed="true"] { color: var(--csm-ink); background: var(--csm-indigo-soft); border-color: var(--csm-indigo); }
  .choice strong { display: block; margin-bottom: 5px; color: var(--csm-indigo); font-weight: var(--csm-weight-heading); }
  .choice small { display: block; color: var(--csm-muted); line-height: 1.4; }
  .type-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .type-choice { padding: 12px 14px; font: var(--csm-weight-heading) var(--csm-text-sm)/1.35 var(--csm-ui); }
  .type-choice strong { display: block; margin-bottom: 4px; color: var(--csm-indigo); font-weight: var(--csm-weight-heading); }
  .type-choice small { display: block; color: var(--csm-muted); font: var(--csm-weight-body) var(--csm-text-xs)/1.4 var(--csm-ui); }
  .type-choice[aria-pressed="true"] { color: var(--csm-indigo); }
  .demo-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; margin-top: 16px; align-items: start; }
  .source-panel, .result-panel { min-width: 0; }
  .panel-heading { display: flex; align-items: start; justify-content: space-between; gap: 12px; min-width: 0; padding: 18px 22px; background: var(--csm-band); border-bottom: 1px solid var(--csm-line); }
  .panel-heading > * { min-width: 0; }
  .panel-heading h2 { margin: 0; font-size: 21px; letter-spacing: -.3px; overflow-wrap: anywhere; }
  .panel-heading p { margin: 4px 0 0; color: var(--csm-muted); font-size: var(--csm-text-xs); overflow-wrap: anywhere; }
  .source-panel > summary.panel-heading { list-style: none; cursor: pointer; }
  .source-panel > summary.panel-heading::-webkit-details-marker { display: none; }
  .source-panel > summary.panel-heading::after { content: '+'; flex: 0 0 auto; color: var(--csm-indigo); font: var(--csm-weight-heading) 21px/1 var(--csm-code); }
  .source-panel[open] > summary.panel-heading::after { content: '\\2212'; }
  .source-panel[open] > summary.panel-heading { color: var(--csm-indigo); }
  .source-list { padding: 22px; }
  .source-card { margin-bottom: 22px; }
  .source-card:last-child { margin-bottom: 0; }
  .source-card label { display: block; margin: 0 0 7px; color: var(--csm-citation); font: var(--csm-weight-body) var(--csm-text-xs)/1.45 var(--csm-code); overflow-wrap: anywhere; }
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
    overflow-wrap: anywhere;
  }
  .source-card textarea:focus { border-color: var(--csm-indigo); outline: 2px solid var(--csm-focus); outline-offset: 0; }
  .source-card.cited { padding-left: 10px; border-left: 3px solid var(--csm-citation); }
  .source-card.cited textarea { border-color: var(--csm-citation); }
  .source-citation-note { margin: 6px 0 0; color: var(--csm-muted); font-size: var(--csm-text-xs); overflow-wrap: anywhere; }
  .source-citation-note.cited { color: var(--csm-citation); }
  .source-focus-note { margin: 0 0 15px; color: var(--csm-muted); font-size: var(--csm-text-xs); overflow-wrap: anywhere; }
  .source-privacy { margin: 0 0 15px; padding: 10px 12px; color: var(--csm-ink-soft); background: var(--csm-indigo-soft); border-left: 2px solid var(--csm-indigo); font-size: var(--csm-text-xs); overflow-wrap: anywhere; }
  .editor-state { margin: 0 0 14px; padding: 9px 11px; color: var(--csm-muted); background: var(--csm-band); border: 1px solid var(--csm-line); font: var(--csm-weight-body) var(--csm-text-xs)/1.4 var(--csm-code); overflow-wrap: anywhere; }
  .editor-state[data-state="changed"], .editor-state[data-state="updated"], .editor-state[data-state="reset"] { color: var(--csm-citation); border-color: var(--csm-citation); }
  .editor-state[data-state="invalid"] { color: var(--csm-danger); background: var(--csm-danger-surface); border-color: var(--csm-danger); }
  .empty-source { margin: 0; padding: 16px; color: var(--csm-muted); font-size: var(--csm-text-sm); }
  .result-status { min-width: 0; max-width: 340px; color: var(--csm-muted); font: var(--csm-weight-body) var(--csm-text-xs)/1.45 var(--csm-code); text-align: right; overflow-wrap: anywhere; }
  .result-status.ok { color: var(--csm-citation); }
  .result-status.error { color: var(--csm-danger); }
  .state-rail { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0; margin: 18px 22px 0; border-top: 1px solid var(--csm-line); border-bottom: 1px solid var(--csm-line); }
  .state-card { min-width: 0; padding: 15px 14px 16px; border-top: 3px solid var(--csm-indigo); }
  .state-card + .state-card { border-left: 1px solid var(--csm-line); }
  .state-card[data-state="complete"] { border-top-color: var(--csm-citation); }
  .state-card[data-state="partial"], .state-card[data-state="insufficient"] { border-top-color: var(--csm-warning); }
  .state-card[data-state="risk"] { border-top-color: var(--csm-blue); }
  .state-card-label { display: block; margin-bottom: 7px; color: var(--csm-muted); font: var(--csm-weight-body) var(--csm-text-xs)/1.3 var(--csm-code); letter-spacing: .05em; text-transform: uppercase; }
  .state-card strong { display: block; margin-bottom: 5px; color: var(--csm-ink); font-size: var(--csm-text-sm); font-weight: var(--csm-weight-heading); overflow-wrap: anywhere; }
  .state-card small { display: block; color: var(--csm-muted); font-size: var(--csm-text-xs); line-height: 1.45; overflow-wrap: anywhere; }
  .state-card ul { margin: 8px 0 0; padding-left: 17px; color: var(--csm-warning); font-size: var(--csm-text-xs); }
  .state-card li { padding: 2px 0; overflow-wrap: anywhere; }
  .export-feedback { min-width: 0; color: var(--csm-citation); font: var(--csm-weight-body) var(--csm-text-xs)/1.4 var(--csm-code); overflow-wrap: anywhere; }
  .export-feedback.error { color: var(--csm-danger); }
  .raw-section-target { margin: 0 0 9px; padding: 8px 10px; color: var(--csm-muted); background: var(--csm-indigo-soft); border-left: 2px solid var(--csm-indigo); font: var(--csm-weight-body) var(--csm-text-xs)/1.4 var(--csm-code); overflow-wrap: anywhere; }
  .raw-section-target:focus { outline: 2px solid var(--csm-focus); outline-offset: 2px; }
  .result-output { min-height: 520px; max-height: 820px; margin-top: 18px; }
  .result-panel .brief-visual-panel { margin: 18px 22px 22px; }
  .result-panel .brief-raw-panel { margin: 18px 22px 22px; }
  .result-panel .brief-output { min-height: 520px; max-height: 820px; }
  .result-output.error { color: var(--csm-danger); background: var(--csm-danger-surface); }
  .result-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-width: 0; padding: 14px 22px; background: var(--csm-band); border-top: 1px solid var(--csm-line); }
  .result-footer > * { min-width: 0; overflow-wrap: anywhere; }
  .button-row { display: flex; flex-wrap: wrap; gap: 8px; min-width: 0; }
  .button {
    min-width: 0;
    min-height: 44px;
    padding: 11px 16px;
    color: var(--csm-action-text);
    background: var(--csm-indigo);
    border: 1px solid var(--csm-indigo);
    border-radius: var(--csm-control-radius);
    font: var(--csm-weight-heading) var(--csm-text-sm)/1.1 var(--csm-ui);
    overflow-wrap: anywhere;
    white-space: normal;
  }
  .button:hover { background: var(--csm-indigo-hover); border-color: var(--csm-indigo-hover); }
  .button.secondary { color: var(--csm-indigo); background: transparent; border-color: var(--csm-indigo-line); }
  .button.secondary:hover { color: var(--csm-indigo-hover); background: var(--csm-indigo-soft); border-color: var(--csm-indigo); }
  .warning-box { margin: 14px 16px 0; padding: 11px 13px; color: var(--csm-warning); background: var(--csm-warning-surface); border: 1px solid var(--csm-warning); border-radius: var(--csm-control-radius); font: var(--csm-weight-body) var(--csm-text-xs)/1.5 var(--csm-code); overflow-wrap: anywhere; }
  .warning-box.error { color: var(--csm-danger); background: var(--csm-danger-surface); border-color: var(--csm-danger); }
  .warning-box[hidden] { display: none; }
  .demo-note { margin-top: 16px; padding: 17px 21px; color: var(--csm-ink-soft); background: var(--csm-band); border-left: 3px solid var(--csm-citation); font-size: var(--csm-text-sm); overflow-wrap: anywhere; }
  .demo-note strong { color: var(--csm-ink); font-weight: var(--csm-weight-heading); }
  .demo-note h2 { margin: 6px 0 7px; font-size: 21px; }
  .demo-note p { margin: 0; }
  .next-move-label { display: block; margin-bottom: 7px; color: var(--csm-muted); font: var(--csm-weight-body) var(--csm-text-xs)/1.3 var(--csm-code); letter-spacing: .05em; text-transform: uppercase; }
  .next-move-candidate { display: block; color: var(--csm-ink-soft); font-size: var(--csm-text-sm); line-height: 1.5; overflow-wrap: anywhere; }
  .next-move-link { display: inline-block; margin-top: 10px; color: var(--csm-indigo); font: var(--csm-weight-heading) var(--csm-text-xs)/1.4 var(--csm-code); }
  .next-move-list { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 14px; }
  .next-move-list span { padding: 5px 8px; color: var(--csm-ink-soft); background: var(--csm-surface); border: 1px solid var(--csm-line); border-radius: var(--csm-control-radius); font: var(--csm-weight-body) var(--csm-text-xs)/1.3 var(--csm-code); }
  .noscript { max-width: 720px; margin: 64px auto; padding: var(--csm-panel-pad); }
  .noscript h1 { font-size: 38px; letter-spacing: -1px; }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
  }

  @media print {
    html, body { background: #ffffff; color: #102a43; }
    body { font-size: 11pt; }
    .skip-link, .top-meta, .setup, .source-panel, .demo-note, .result-footer, .footer, .noscript, .brief-view-switch, .brief-view > input + label { display: none !important; }
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
    .brief-visual-panel { display: none !important; }
    .brief-raw-panel { display: block !important; margin: 12px 0 0 !important; }
    .product-visual { break-inside: avoid; }
    details { display: block; break-inside: avoid; }
    details > *:not(summary) { display: block; }
    a { color: inherit; text-decoration: none; }
  }

  @media (max-width: 1080px) {
    .setup-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 880px) {
    .hero-proof { grid-template-columns: repeat(2, 1fr); }
    .type-row { grid-template-columns: repeat(3, 1fr); }
    .scope-panel { grid-template-columns: 1fr; }
  }
  @media (max-width: 760px) {
    .shell { width: min(100% - 24px, var(--csm-page-max)); }
    .topbar { align-items: start; padding: 14px 0; }
    .top-meta { max-width: 170px; font-size: 10px; }
    .hero { padding: 40px 0 28px; }
    .demo-intro { padding: 34px 0 22px; }
    .demo-intro .chip-row { margin-top: 20px; }
    h1, .demo-intro h1 { letter-spacing: -1px; }
    .hero-proof { grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 48px; }
    .product-visual { grid-template-columns: 1fr; gap: 18px; }
    .callouts, .choice-grid, .demo-grid, .walkthrough-steps { grid-template-columns: 1fr; }
    .callouts .callout { border-right: 0; border-bottom: 1px solid var(--csm-line); }
    .callouts .callout:last-child { border-bottom: 0; }
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
    .state-rail { grid-template-columns: 1fr; }
    .state-card + .state-card { border-top: 1px solid var(--csm-line); border-left: 0; }
    .hero-route { width: 100%; justify-content: space-between; margin-top: 20px; }
    .brief-presentation-head { display: block; }
    .brief-presentation-head p { max-width: none; margin-top: 10px; }
    .brief-anatomy { grid-template-columns: 1fr; gap: 18px; }
    .brief-map { padding: 0 0 12px; border-right: 0; border-bottom: 1px solid var(--csm-line); }
    .brief-map ol { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0 14px; }
    .walkthrough-heading { display: block; }
    .walkthrough-heading p { max-width: none; margin-top: 8px; }
    .walkthrough-step + .walkthrough-step { border-top: 1px solid var(--csm-line); border-left: 0; }
    .walkthrough-step p { min-height: 0; }
    .input-output { grid-template-columns: 1fr; }
    .input-output-arrow { transform: rotate(90deg); justify-self: center; }
    .scope-columns { grid-template-columns: 1fr; }
  }
  @media (max-width: 420px) {
    .hero-proof { grid-template-columns: 1fr; }
    .hero-proof-item:nth-child(3) { border-top-color: var(--csm-indigo); }
    .hero-proof-item:nth-child(4) { border-top-color: var(--csm-citation); }
    .panel-heading { align-items: start; flex-direction: column; }
    .brief-map ol { grid-template-columns: 1fr; }
  }
`;

const STATIC_ANNOTATIONS = [
  {
    title: 'Start with what changed',
    body: 'Read renewal timing, usage, support, and stakeholder signals together before deciding what to ask the customer next.',
  },
  {
    title: 'Evidence coverage sets context',
    body: 'The score reports how much of the required input set was present. It is not a health score; it tells you how much context the readout has.',
  },
  {
    title: 'No proof, no claim',
    body: 'When a fact has no source span, it stays out of the readout. The gap becomes a specific follow-up ask instead.',
  },
];

const STATIC_BRIEFS = [
  {
    title: 'Renewal Readiness Brief',
    file: 'examples/example-renewal-brief.md',
    description: 'A pre-meeting account readout with renewal timing, signals, stakeholders, risks, and next actions.',
  },
  {
    title: 'Handoff Completeness Brief',
    file: 'examples/example-handoff-brief.md',
    description: 'A sales-to-CS transfer with promised scope, stakeholder coverage, and gaps to close.',
  },
  {
    title: 'QBR Packet',
    file: 'examples/example-qbr-packet.md',
    description: 'A meeting-ready packet with value delivered, open risks, and next-quarter prompts.',
  },
];

const TRUST_POINTS = [
  {
    index: '01 / See what changed',
    title: 'Account health at a glance',
    body: 'Renewal, usage, support, and relationship signals in one readout.',
  },
  {
    index: '02 / Know who matters',
    title: 'Stakeholders in context',
    body: 'See the people to involve and when the account last heard from you.',
  },
  {
    index: '03 / Find the risk',
    title: 'Risks you can explain',
    body: 'Every signal keeps its source row so the conversation stays grounded.',
  },
  {
    index: '04 / Leave with a move',
    title: 'A clear next action',
    body: 'Turn an account readout into the next question, owner, or follow-up.',
  },
];

const WALKTHROUGH_STEPS = [
  {
    index: '01',
    label: 'Bring the context',
    title: 'Start with what you already know',
    body: 'Use the account context, CRM notes, product usage, support history, and stakeholder signals you already have.',
    tags: ['account context', 'CRM notes', 'product usage', 'support history'],
  },
  {
    index: '02',
    label: 'Read what matters',
    title: 'See the story in one place',
    body: 'csm-kit organizes renewal timing, account health, stakeholder coverage, support load, and risks without inventing missing facts.',
    tags: ['renewal timing', 'account health', 'people + risk', 'evidence gaps'],
  },
  {
    index: '03',
    label: 'Take the next move',
    title: 'Leave with a conversation plan',
    body: 'Use the cited account readout to choose who to call, what to ask, and which follow-up to own next.',
    tags: ['next question', 'owner', 'follow-up'],
  },
];

function buildTrustRail() {
  return `<section class="hero-proof" aria-label="frontline CSM readout benefits">${TRUST_POINTS.map(
    (point) => `
      <article class="hero-proof-item">
        <span class="hero-proof-index">${htmlEscape(point.index)}</span>
        <strong>${htmlEscape(point.title)}</strong>
        <p>${htmlEscape(point.body).replace(/`([^`]+)`/g, '<code>$1</code>')}</p>
      </article>`,
  ).join('')}</section>`;
}

function buildWalkthrough() {
  const steps = WALKTHROUGH_STEPS.map((step) => `
      <li class="walkthrough-step">
        <span class="walkthrough-step-number">${htmlEscape(step.index)} / ${htmlEscape(step.label)}</span>
        <h3>${htmlEscape(step.title)}</h3>
        <p>${htmlEscape(step.body)}</p>
        <div class="walkthrough-tags">${step.tags.map((tag) => `<span>${htmlEscape(tag)}</span>`).join('')}</div>
      </li>`).join('');
  return `<section class="walkthrough" aria-labelledby="walkthrough-heading">
    <div class="walkthrough-heading">
      <div>
        <div class="eyebrow">How the readout works</div>
        <h2 id="walkthrough-heading">From customer context to your next move.</h2>
      </div>
      <p>Bring the context you already have. The output shows what is supported, what needs attention, and what to ask next.</p>
    </div>
    <ol class="walkthrough-steps">${steps}
    </ol>
    <div class="input-output" aria-label="What goes into and comes out of csm-kit">
      <div class="input-output-item"><span>What you bring</span><strong>Existing account context and exports</strong></div>
      <span class="input-output-arrow" aria-hidden="true">+</span>
      <div class="input-output-item"><span>What csm-kit does</span><strong>Organizes the signals and checks their proof</strong></div>
      <span class="input-output-arrow" aria-hidden="true">=</span>
      <div class="input-output-item"><span>What you take</span><strong>A cited readout and specific follow-up asks</strong></div>
    </div>
  </section>`;
}

function buildScopePanel() {
  return `<section class="scope-panel" aria-labelledby="scope-heading">
    <div>
      <div class="eyebrow">v1 scope</div>
      <h2 id="scope-heading">Useful now, intentionally narrow.</h2>
      <p>csm-kit prepares the evidence for a CSM. It does not make the customer decision or act on your behalf.</p>
    </div>
    <div class="scope-columns">
      <div class="scope-column">
        <div class="eyebrow">In v1</div>
        <ul>
          <li>Read local account context, CRM notes, product usage, support history, and handoff or QBR inputs.</li>
          <li>Create renewal, sales handoff, or QBR readouts with source-backed facts.</li>
          <li>Turn missing evidence into a clear question to resolve.</li>
        </ul>
      </div>
      <div class="scope-column limit">
        <div class="eyebrow">Not in v1</div>
        <ul>
          <li>Connect to your systems or send data to a service.</li>
          <li>Contact customers, update records, or take actions for you.</li>
          <li>No opaque health score replaces your judgment.</li>
        </ul>
      </div>
    </div>
  </section>`;
}

function htmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderBriefPresentation(markdown, prefix = 'brief') {
  try {
    const source = String(markdown);
    const idPrefix = String(prefix).replace(/[^a-z0-9_-]/gi, '-');
    const escape = (value) => String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    const citationToken = /^(.+?)#(L\d+(?:[-,]L?\d+)*)$/;
    const citationMatches = (value) => [...String(value).matchAll(/`([^`\r\n]+)`/g)]
      .map((match) => match[1].trim())
      .filter((token) => citationToken.test(token));
    const interactive = String(prefix).startsWith('interactive');
    const citationMarkup = (token) => {
      const match = citationToken.exec(token);
      if (!match) return `<code class="brief-citation">${escape(token)}</code>`;
      if (!interactive) return `<code class="brief-citation">${escape(token)}</code>`;
      return `<a class="brief-citation-link" href="#source-evidence" data-source="${escape(match[1])}" data-lines="${escape(match[2])}" aria-label="Open ${escape(token)} in the evidence editor">${escape(token)}</a>`;
    };
    const uniqueCitations = (lines) => [...new Set(lines.flatMap((line) => citationMatches(line)))];
    const inline = (value) => escape(value)
      .replace(/`([^`]+)`/g, (match, inner) => citationMarkup(inner.trim()))
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/_([^_]+)_/g, '<em>$1</em>');
    const citationHtml = (values) => values.map((value) => citationMarkup(value)).join(', ');
    const friendlyEvidenceLabel = (value) => {
      const label = String(value);
      if (/^Account name|^Renewal date/.test(label)) return `Account context: ${label.replace(/ \([^)]*\)$/, '').replace(/^Account name/, 'account name').replace(/^Renewal date/, 'renewal date')}`;
      if (/CRM activity/i.test(label)) return 'CRM notes';
      if (/Ticket export/i.test(label)) return 'Support history';
      if (/Usage summary/i.test(label)) return 'Product usage';
      if (/^Sending AE|^Goals \/ success criteria|^Stakeholder map|^Promises register|^Risks \/ dependencies|^Links /i.test(label)) {
        return `Handoff record: ${label.replace(/^Sending AE/, 'sending AE').replace(/^Goals \/ success criteria/, 'success criteria').replace(/^Stakeholder map/, 'stakeholders').replace(/^Promises register(?: \(promised-vs-sold\))?/, 'promised-vs-sold').replace(/^Risks \/ dependencies/, 'risks and dependencies').replace(/^Links(?: \(recordings \/ proposal\))?/, 'recordings and proposal').replace(/ \([^)]*\)$/, '')}`;
      }
      if (/question/i.test(label)) return 'Open questions';
      return label;
    };
    const tableCells = (line) => {
      const trimmed = line.trim();
      const inner = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed;
      const withoutTrailing = inner.endsWith('|') ? inner.slice(0, -1) : inner;
      const cells = [];
      let cell = '';
      for (let index = 0; index < withoutTrailing.length; index++) {
        const character = withoutTrailing[index];
        if (character === '\\' && withoutTrailing[index + 1] === '|') {
          cell += '|';
          index++;
        } else if (character === '|') {
          cells.push(cell.trim());
          cell = '';
        } else {
          cell += character;
        }
      }
      cells.push(cell.trim());
      return cells;
    };
    const renderTable = (lines) => {
      const rows = lines.map(tableCells);
      const headers = rows[0] || [];
      const bodyRows = rows.slice(2);
      const citedRows = bodyRows.filter((row) => row.some((cell) => citationMatches(cell).length > 0));
      const omitted = bodyRows.length - citedRows.length;
      const headerHtml = headers.map((cell) => `<th scope="col">${inline(cell)}</th>`).join('');
      const bodyHtml = citedRows.map((row) => `<tr>${headers.map((_, index) => `<td>${inline(headers[0] === 'Required evidence' && index === 0 ? friendlyEvidenceLabel(row[index] || '') : (row[index] || ''))}</td>`).join('')}</tr>`).join('');
      return {
        html: `<div class="brief-table-wrap"><table class="brief-table"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`,
        omitted,
      };
    };
    const renderList = (lines) => {
      const citedLines = lines.filter((line) => citationMatches(line).length > 0);
      return {
        html: citedLines.length ? `<ul class="brief-items">${citedLines.map((line) => `<li>${inline(line.replace(/^\s*-\s+/, ''))}</li>`).join('')}</ul>` : '',
        omitted: lines.length - citedLines.length,
      };
    };
    const renderContent = (lines) => {
      const blocks = [];
      let omitted = 0;
      let index = 0;
      while (index < lines.length) {
        const line = lines[index];
        if (!line.trim()) {
          index++;
          continue;
        }
        if (/^\s*\|/.test(line)) {
          const tableLines = [];
          while (index < lines.length && /^\s*\|/.test(lines[index])) tableLines.push(lines[index++]);
          if (tableLines.length > 1) {
            const table = renderTable(tableLines);
            blocks.push(table.html);
            omitted += table.omitted;
          } else {
            omitted++;
          }
          continue;
        }
        if (/^\s*-\s+/.test(line)) {
          const listLines = [];
          while (index < lines.length && /^\s*-\s+/.test(lines[index])) listLines.push(lines[index++]);
          const list = renderList(listLines);
          if (list.html) blocks.push(list.html);
          omitted += list.omitted;
          continue;
        }
        if (/^\s*_.*_\s*$/.test(line)) {
          blocks.push(`<p class="brief-context">${inline(line)}</p>`);
        } else if (citationMatches(line).length > 0) {
          blocks.push(`<p>${inline(line)}</p>`);
        } else {
          omitted++;
        }
        index++;
      }
      return { html: blocks.join(''), omitted };
    };
    const friendlySection = (heading) => {
      const value = String(heading);
      if (/^Evidence completeness:/i.test(value)) return 'Evidence check';
       if (value === 'Renewal countdown') return 'Renewal timing';
       if (value === 'Signal table') return 'Account signals';
       if (value === 'Risk flags' || value === 'Slide: Open risks' || value === 'Handoff risk flags') return 'Risks to discuss';
       if (value === 'Stakeholder map') return 'People to know';
       if (value === 'Missing-evidence checklist') return 'Next actions';
      if (value.startsWith('Promises register')) return 'What was promised';
      if (value === 'Goals / success criteria') return 'Success goals';
      if (value === 'Risks / dependencies') return 'Risks and dependencies';
      if (value.startsWith('Links')) return 'Reference links';
      if (value.startsWith('Gap report')) return 'Open asks';
      if (value === 'Slide: Executive summary') return 'Executive snapshot';
      if (value === 'Slide: Value delivered') return 'Value delivered';
      if (value === 'Slide: Next-quarter plan') return 'Next-quarter plan';
      if (value === 'Week-one questions') return 'Week-one questions';
      return value;
    };
    const groupFor = (heading) => {
      const value = heading.toLowerCase();
      if (value.startsWith('evidence completeness')) return 'Evidence gate';
      if (/risk|stakeholder/.test(value)) return 'Coverage and risk';
      if (/missing|gap report|next-quarter|week-one|links/.test(value)) return 'Follow-through';
      return 'Account readout';
    };
    const friendlyGroup = (name) => ({
      'Evidence gate': 'Evidence check',
      'Account readout': 'Account health',
      'Coverage and risk': 'People and risk',
      'Follow-through': 'Next actions',
     }[name] || name);
    const navigationLabel = (group) => {
      const headings = group.sections.map((section) => section.heading.toLowerCase());
      if (headings.some((heading) => heading.startsWith('evidence completeness'))) return 'Evidence check';
      if (headings.some((heading) => heading.startsWith('promises register'))) return 'Commitments';
      const hasStakeholders = headings.some((heading) => heading.includes('stakeholder'));
      const hasRisks = headings.some((heading) => heading.includes('risk'));
      if (hasStakeholders && hasRisks) return 'People and risk';
      if (hasStakeholders) return 'Stakeholders';
      if (hasRisks) return 'Risks and dependencies';
      if (headings.some((heading) => heading.includes('gap report') || heading.includes('missing-evidence'))) return 'Open asks';
      if (headings.some((heading) => heading.includes('next-quarter'))) return 'Next actions';
      if (headings.some((heading) => heading.includes('links') || heading.includes('week-one'))) return 'Follow-through';
      if (group.name === 'Account readout') return 'Account health';
      return friendlyGroup(group.name);
    };
    const lines = source.replace(/\r\n/g, '\n').split('\n');
    const titleLine = lines.find((line) => /^#\s+/.test(line));
    const title = titleLine ? titleLine.replace(/^#\s+/, '') : 'Generated brief';
    const firstSection = lines.findIndex((line) => /^##\s+/.test(line));
    const introLines = lines
      .slice(titleLine ? lines.indexOf(titleLine) + 1 : 0, firstSection < 0 ? lines.length : firstSection)
      .filter((line) => line.trim());
    const sections = [];
    let current;
    for (const line of lines) {
      if (/^##\s+/.test(line)) {
        current = { heading: line.replace(/^##\s+/, ''), lines: [] };
        sections.push(current);
      } else if (current) {
        current.lines.push(line);
      }
    }
    if (!sections.length) throw new Error('no brief sections');

    const grouped = [];
    for (const section of sections) {
      const name = groupFor(section.heading);
      const group = grouped[grouped.length - 1];
      if (!group || group.name !== name) grouped.push({ name, sections: [] });
      grouped[grouped.length - 1].sections.push(section);
    }
    const sectionHtml = (section, sectionIndex) => {
      const content = renderContent(section.lines);
      const score = section.heading.match(/^Evidence completeness:\s*(.+)$/i);
      const spans = uniqueCitations(section.lines);
      const sectionTitle = score ? 'Evidence check' : friendlySection(section.heading);
      const scoreParts = score && /^(\d+)\/(\d+) \((\d+)%\)$/.exec(score[1]);
      const present = scoreParts ? Number(scoreParts[1]) : 0;
      const total = scoreParts ? Number(scoreParts[2]) : 0;
      const evidenceState = scoreParts
        ? present === total ? 'complete' : present / total < 0.5 ? 'insufficient' : 'partial'
        : null;
      const evidenceStateLabel = evidenceState ? evidenceState[0].toUpperCase() + evidenceState.slice(1) : '';
      const missingUnits = score
        ? section.lines
          .filter((line) => /^\s*\|/.test(line))
          .map(tableCells)
          .slice(2)
          .filter((row) => String(row[1]).toLowerCase() === 'missing')
          .map((row) => friendlyEvidenceLabel(row[0]))
        : [];
      const missingHtml = missingUnits.length
        ? `<div class="brief-missing-units"><strong>Missing now</strong><ul>${missingUnits.map((unit) => `<li>${escape(unit)}</li>`).join('')}</ul></div>`
        : '';
      const stat = score
        ? `<div class="brief-stat" data-evidence-state="${evidenceState}"><strong>${inline(score[1])}</strong><span class="brief-stat-state">${evidenceStateLabel}</span><span>required input units present</span>${spans.length ? `<div class="brief-stat-citations">Source spans: ${citationHtml(spans)}</div>` : ''}<div class="brief-stat-note">Evidence completeness is not account health.</div></div>${missingHtml}`
        : '';
      const rawJump = interactive ? ' <a class="brief-raw-jump" href="#raw-markdown-next-actions">Open the exact next-actions or missing-evidence section in Raw Markdown.</a>' : '';
      const safeNote = content.omitted
        ? `<p class="brief-safe-note">${content.omitted} line${content.omitted === 1 ? ' stays' : 's stay'} in Raw Markdown so this readout does not guess without source evidence.${rawJump}</p>`
        : '';
      return `<article class="brief-section" id="${idPrefix}-section-${sectionIndex}"><div class="brief-section-heading"><div class="eyebrow">What this tells you</div><h4>${inline(sectionTitle)}</h4></div>${stat}<div class="brief-content">${content.html}${safeNote}</div></article>`;
    };
    const rawNavigationLabels = grouped.map(navigationLabel);
    const navigationCounts = new Map();
    for (const label of rawNavigationLabels) navigationCounts.set(label, (navigationCounts.get(label) || 0) + 1);
    const navigationLabels = rawNavigationLabels.map((label, index) => {
      if (navigationCounts.get(label) === 1) return label;
      const detail = friendlySection(grouped[index].sections[0].heading);
      return `${label} - ${detail}`;
    });
    const groupsHtml = grouped.map((group, groupIndex) => `<section class="brief-group" id="${idPrefix}-group-${groupIndex}"><div class="brief-group-label"><span>${String(groupIndex + 1).padStart(2, '0')}</span><strong>${escape(navigationLabels[groupIndex])}</strong></div>${group.sections.map((section, sectionIndex) => sectionHtml(section, sections.indexOf(section))).join('')}</section>`).join('');
    const mapHtml = grouped.map((group, groupIndex) => `<li><a href="#${idPrefix}-group-${groupIndex}"><span class="brief-map-index">${String(groupIndex + 1).padStart(2, '0')}</span>${escape(navigationLabels[groupIndex])}</a></li>`).join('');
    const identityHtml = introLines.map((line) => `<p>${inline(line)}</p>`).join('');
    return `<div class="brief-presentation" data-presentation="visual"><div class="brief-presentation-head"><div><div class="eyebrow">Account readout</div><h3>${inline(title)}</h3><div class="brief-identity">${identityHtml}</div></div><p>Evidence status is separate from account health. Each cited signal can open its local source editor.</p></div><div class="brief-anatomy"><nav class="brief-map" aria-label="Readout sections"><ol>${mapHtml}</ol></nav><div class="brief-groups">${groupsHtml}</div></div></div>`;
  } catch {
    return '<p class="brief-presentation-fallback">Visual presentation unavailable. Raw Markdown remains available unchanged.</p>';
  }
}

function buildAccountPulseVisual() {
  return `<section class="product-visual account-pulse-visual" aria-labelledby="account-pulse-heading">
    <div class="product-visual-copy">
      <div class="eyebrow">A frontline CSM readout</div>
      <h2 id="account-pulse-heading">Know what to do before you walk in.</h2>
      <p>See renewal timing, usage, support, stakeholders, and risk together, then leave with a grounded next action for the customer conversation.</p>
      <div class="product-visual-proof" aria-label="Example account signals">
        <div><strong>54d</strong><span>renewal window</span></div>
        <div><strong>-22%</strong><span>usage change</span></div>
        <div><strong>2</strong><span>open support tickets</span></div>
      </div>
    </div>
    <figure class="pulse-figure">
      <svg class="account-pulse" viewBox="0 0 760 408" role="img" aria-labelledby="account-pulse-title account-pulse-description">
        <title id="account-pulse-title">Frontline CSM account health snapshot for Acme Manufacturing Co.</title>
        <desc id="account-pulse-description">An example account readout shows a renewal in 54 days, active users down 22 percent, two open support tickets, and three cited next actions.</desc>
        <rect class="pulse-shell" x="1" y="1" width="758" height="406" rx="7" stroke-width="1.5" />
        <rect class="pulse-band" x="2" y="2" width="756" height="52" />
        <text class="pulse-muted pulse-label" x="24" y="24">ACCOUNT HEALTH SNAPSHOT</text>
        <text class="pulse-ink" x="24" y="43" font-size="13">ACME MANUFACTURING CO.</text>
        <text class="pulse-muted pulse-label" x="736" y="32" text-anchor="end">EXAMPLE ACCOUNT</text>
        <line class="pulse-rule" x1="2" y1="54" x2="758" y2="54" />

        <rect class="pulse-card" x="24" y="72" width="220" height="120" rx="4" />
        <rect class="pulse-indigo" x="24" y="72" width="4" height="120" />
        <text class="pulse-muted pulse-label" x="40" y="94">RENEWAL WINDOW</text>
        <text class="pulse-ink pulse-number" x="40" y="130">54 days</text>
        <text class="pulse-soft pulse-label" x="40" y="153">ACCOUNT CONTEXT</text>
        <rect class="pulse-tag" x="159" y="83" width="67" height="24" rx="12" />
        <text class="pulse-warning pulse-label" x="192" y="99" text-anchor="middle">WATCH</text>

        <rect class="pulse-card" x="268" y="72" width="220" height="120" rx="4" />
        <rect class="pulse-citation" x="268" y="72" width="4" height="120" />
        <text class="pulse-muted pulse-label" x="284" y="94">USAGE</text>
        <text class="pulse-warning pulse-number" x="284" y="130">-22%</text>
        <text class="pulse-soft" x="284" y="153">active users, trending down</text>
        <text class="pulse-soft pulse-label" x="284" y="174">PRODUCT USAGE</text>
        <path class="pulse-citation-stroke" stroke-width="1.5" d="M424 113l8 8 16-18 12 7" />
        <circle class="pulse-dot" cx="424" cy="113" r="3" />
        <circle class="pulse-dot" cx="448" cy="103" r="3" />
        <circle class="pulse-dot" cx="460" cy="110" r="3" />

        <rect class="pulse-card" x="512" y="72" width="224" height="120" rx="4" />
        <rect class="pulse-indigo" x="512" y="72" width="4" height="120" />
        <text class="pulse-muted pulse-label" x="528" y="94">SUPPORT</text>
        <text class="pulse-ink pulse-number" x="528" y="130">2 open</text>
        <text class="pulse-soft" x="528" y="153">1 medium &#183; 1 low</text>
        <text class="pulse-soft pulse-label" x="528" y="174">SUPPORT HISTORY</text>

        <rect class="pulse-card" x="24" y="212" width="464" height="172" rx="4" />
        <text class="pulse-muted pulse-label" x="40" y="235">ADOPTION / ACTIVE USERS</text>
        <text class="pulse-citation pulse-label" x="472" y="235" text-anchor="end">SOURCE-BACKED TREND</text>
        <line class="pulse-rule" stroke-width=".75" x1="40" y1="274" x2="472" y2="274" />
        <line class="pulse-rule" stroke-width=".75" x1="40" y1="297" x2="472" y2="297" />
        <line class="pulse-rule" stroke-width=".75" x1="40" y1="320" x2="472" y2="320" />
        <line class="pulse-rule" stroke-width=".75" x1="40" y1="343" x2="472" y2="343" />
        <path class="pulse-area" d="M40 274L124 282L208 290L292 304L376 318L460 330L460 343L40 343Z" />
        <path class="pulse-indigo-stroke" stroke-width="2" d="M40 274L124 282L208 290L292 304L376 318L460 330" />
        <circle class="pulse-dot" cx="40" cy="274" r="3" />
        <circle class="pulse-dot" cx="124" cy="282" r="3" />
        <circle class="pulse-dot" cx="208" cy="290" r="3" />
        <circle class="pulse-dot" cx="292" cy="304" r="3" />
        <circle class="pulse-dot" cx="376" cy="318" r="3" />
        <circle class="pulse-dot" cx="460" cy="330" r="3" />
        <text class="pulse-soft" x="40" y="264">120</text>
        <text class="pulse-soft" x="460" y="342" text-anchor="end">94</text>
        <text class="pulse-muted pulse-label" x="40" y="367">FEB</text>
        <text class="pulse-muted pulse-label" x="124" y="367" text-anchor="middle">MAR</text>
        <text class="pulse-muted pulse-label" x="208" y="367" text-anchor="middle">APR</text>
        <text class="pulse-muted pulse-label" x="292" y="367" text-anchor="middle">MAY</text>
        <text class="pulse-muted pulse-label" x="376" y="367" text-anchor="middle">JUN</text>
        <text class="pulse-muted pulse-label" x="460" y="367" text-anchor="end">JUL</text>

        <rect class="pulse-card" x="512" y="212" width="224" height="172" rx="4" />
        <rect class="pulse-citation" x="512" y="212" width="4" height="172" />
        <text class="pulse-muted pulse-label" x="528" y="235">NEXT ACTIONS</text>
        <circle class="pulse-indigo" cx="531" cy="261" r="3" />
        <text class="pulse-soft" x="542" y="265">Reconnect before renewal</text>
        <text class="pulse-soft pulse-label" x="542" y="282">RENEWAL + CRM CONTEXT</text>
        <circle class="pulse-indigo" cx="531" cy="307" r="3" />
        <text class="pulse-soft" x="542" y="311">Address declining usage</text>
        <text class="pulse-soft pulse-label" x="542" y="328">PRODUCT USAGE</text>
        <circle class="pulse-indigo" cx="531" cy="353" r="3" />
        <text class="pulse-soft" x="542" y="357">Confirm ticket owners</text>
        <text class="pulse-soft pulse-label" x="542" y="374">SUPPORT HISTORY</text>
      </svg>
      <figcaption><strong>Start with the account story.</strong> The readout leads with what changed and what to do next; source rows stay visible for a defensible conversation.</figcaption>
    </figure>
  </section>`;
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
        const virtualPath = '/' + String(relativePath).split(/[\\/]+/).filter(Boolean).join('/');
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
        <fieldset class="brief-view">
          <legend>Brief view</legend>
          <input id="static-brief-${brief.index}-visual-toggle" type="radio" name="static-brief-${brief.index}-view" value="visual" checked>
          <label for="static-brief-${brief.index}-visual-toggle">Visual brief</label>
          <input id="static-brief-${brief.index}-raw-toggle" type="radio" name="static-brief-${brief.index}-view" value="raw">
          <label for="static-brief-${brief.index}-raw-toggle">Raw Markdown</label>
          <div id="static-brief-${brief.index}-visual-panel" class="brief-visual-panel brief-visual">${renderBriefPresentation(brief.markdown, `static-brief-${brief.index}`)}</div>
          <div class="brief-raw-panel"><pre class="brief-output"><code>${htmlEscape(brief.markdown)}</code></pre></div>
        </fieldset>
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
    <a id="static-skip-link" class="skip-link" href="#static-main">Skip to generated samples</a>
    <header class="topbar">
      <a class="wordmark" href="../">csm-kit</a>
      <span class="top-meta">STATIC WALKTHROUGH / EXAMPLE ACCOUNT</span>
    </header>
    <main id="static-main" class="focus-target" tabindex="-1">
      <section class="hero">
        <div class="eyebrow">Static CSM walkthrough</div>
        <h1>Walk into the next customer conversation ready.</h1>
        <p class="lede">Bring account context, CRM notes, product usage, and support history. See a cited account readout for renewal timing, stakeholders, risks, and the next question to take into the meeting.</p>
        <div class="chip-row">
          <span class="chip">renewal + QBR + handoff</span>
          <span class="chip">source-backed signals</span>
          <span class="chip success">works offline</span>
        </div>
        <a class="hero-route" href="../demo/">Try the interactive proof <small>choose a situation</small></a>
      </section>
      ${buildTrustRail()}
      ${buildAccountPulseVisual()}
      ${buildWalkthrough()}
      ${buildScopePanel()}
      <section class="callouts" aria-label="How to read a brief">${callouts}
      </section>
      <section aria-labelledby="samples-heading">
        <div class="section-head">
          <div>
            <div class="eyebrow">Generated samples</div>
           <h2 id="samples-heading">Review the account story and proof.</h2>
          </div>
          <p>Read the visual brief first, then open Raw Markdown to inspect every cited line.</p>
        </div>
        <div class="brief-list">${briefSections}
        </div>
      </section>
    </main>
    <script id="static-focus-support">(() => { const link = document.getElementById('static-skip-link'); const target = document.getElementById('static-main'); link?.addEventListener('click', () => target?.focus?.()); })();</script>
    <footer class="footer">
       <p><a href="../demo/">Open the interactive demo</a> to choose a situation, test a local change, and see the next follow-up appear.</p>
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

  function evidenceState(completeness) {
    if (!completeness || completeness.total <= 0) return 'insufficient';
    if (completeness.present === completeness.total) return 'complete';
    return completeness.present / completeness.total < 0.5 ? 'insufficient' : 'partial';
  }

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
      evidenceState: evidenceState(brief.completeness),
      warnings: loaded.warnings,
      asOf: AS_OF,
      scenario: scenarioName,
      type,
    };
  }

  // Public surface used by the page and by the equivalence harness. The
  // engine modules above are the unmodified lib/*.js sources embedded at build time.
  const api = { AS_OF, PACKAGE, SCENARIOS, makeCsmkit, generate, evidenceState, basenameLabels };
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
  const editorStates = new Map();
  const app = document.getElementById('demo-app');
  const skipLink = document.getElementById('demo-skip-link');
  const scenarioControls = document.getElementById('scenario-controls');
  const typeControls = document.getElementById('type-controls');
  const sourceList = document.getElementById('source-list');
  const sourcePanel = document.getElementById('source-evidence');
  const visualOutput = document.getElementById('brief-visual-output');
  const output = document.getElementById('brief-output');
  const rawSectionTarget = document.getElementById('raw-markdown-next-actions');
  const status = document.getElementById('result-status');
  const warnings = document.getElementById('warning-box');
  const evidenceSummary = document.getElementById('evidence-summary');
  const sourceSummary = document.getElementById('source-summary');
  const sourcePrivacy = document.getElementById('source-privacy');
  const editorStateOutput = document.getElementById('editor-state');
  const scenarioSummary = document.getElementById('scenario-summary');
  const nextMoveCopy = document.getElementById('next-move-copy');
  const generateButton = document.getElementById('generate-button');
  const resetButton = document.getElementById('reset-button');
  const copyButton = document.getElementById('copy-markdown-button');
  const downloadButton = document.getElementById('download-markdown-button');
  const exportFeedback = document.getElementById('export-feedback');
  const visualViewButton = document.getElementById('visual-view-button');
  const rawViewButton = document.getElementById('raw-view-button');
  let currentMarkdown = '';
  let briefView = 'visual';
  const typeDetails = {
    renewal: { label: 'Renewal prep', description: 'Timing, account health, risks, and who to call.', evidence: '5 required evidence units' },
    handoff: { label: 'Sales handoff', description: 'Promises, stakeholders, and gaps to close.', evidence: '7 required evidence units' },
    qbr: { label: 'QBR prep', description: 'Value delivered, risks, and the next-quarter plan.', evidence: '5 required evidence units' },
  };

  const renderBriefPresentation = ${renderBriefPresentation.toString()};

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

  function scopeKey() {
    return state.scenario + '/' + state.type;
  }

  function editKey(key) {
    return scopeKey() + '/' + key;
  }

  function setEditorState(value) {
    editorStates.set(scopeKey(), value);
    renderEditorState();
  }

  function currentEditorState() {
    return editorStates.get(scopeKey()) || 'unchanged';
  }

  function renderEditorState() {
    if (!editorStateOutput) return;
    const value = currentEditorState();
    const copy = {
      unchanged: 'unchanged - no local edits',
      changed: 'changed - update the readout to apply local edits',
      updated: 'updated - local edits are applied to this readout',
      reset: 'reset - local edits were cleared',
      invalid: 'invalid - edits are kept; fix the source and update again',
    }[value] || value;
    editorStateOutput.dataset.state = value;
    editorStateOutput.textContent = 'Editor state: ' + copy;
  }

  function frontlineEvidenceLabel(value) {
    const label = String(value);
    if (/^Account name|^Renewal date/.test(label)) return 'Account context: ' + label.replace(/ \([^)]*\)$/, '').replace(/^Account name/, 'account name').replace(/^Renewal date/, 'renewal date');
    if (/CRM activity/i.test(label)) return 'CRM notes';
    if (/Ticket export/i.test(label)) return 'Support history';
    if (/Usage summary/i.test(label)) return 'Product usage';
    if (/^Sending AE|^Goals \/ success criteria|^Stakeholder map|^Promises register|^Risks \/ dependencies|^Links /i.test(label)) {
      return 'Handoff record: ' + label.replace(/^Sending AE/, 'sending AE').replace(/^Goals \/ success criteria/, 'success criteria').replace(/^Stakeholder map/, 'stakeholders').replace(/^Promises register(?: \(promised-vs-sold\))?/, 'promised-vs-sold').replace(/^Risks \/ dependencies/, 'risks and dependencies').replace(/^Links(?: \(recordings \/ proposal\))?/, 'recordings and proposal').replace(/ \([^)]*\)$/, '');
    }
    if (/question/i.test(label)) return 'Open questions';
    return label;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderScenarioControls() {
    scenarioControls.replaceChildren();
    for (const [index, [name, scenario]] of Object.entries(api.SCENARIOS).entries()) {
      const item = button('', 'choice', { 'aria-pressed': String(name === state.scenario) });
      const strong = document.createElement('strong');
      strong.textContent = scenario.label;
      const small = document.createElement('small');
      small.textContent = scenario.description;
      item.append(strong, small);
      item.addEventListener('click', () => {
        state.scenario = name;
        render();
        scenarioControls.children[index]?.focus?.();
      });
      scenarioControls.append(item);
    }
  }

  function renderTypeControls() {
    typeControls.replaceChildren();
    for (const [index, type] of ['renewal', 'handoff', 'qbr'].entries()) {
      const detail = typeDetails[type];
      const item = button('', 'type-choice', { 'aria-pressed': String(type === state.type) });
      const strong = document.createElement('strong');
      strong.textContent = detail.label;
      const small = document.createElement('small');
      small.textContent = detail.description + ' ' + detail.evidence + '.';
      item.append(strong, small);
      item.addEventListener('click', () => {
        state.type = type;
        render();
        typeControls.children[index]?.focus?.();
      });
      typeControls.append(item);
    }
  }

  function renderSources() {
    sourceList.replaceChildren();
    const definition = currentDefinition();
    const entries = Object.entries(definition.inputs);
    const labels = api.basenameLabels(definition.inputs);
    sourceSummary.textContent = entries.length + ' evidence file' + (entries.length === 1 ? '' : 's') + ' · advanced evidence editor';
    if (sourcePrivacy) sourcePrivacy.textContent = 'Edits stay in this tab. Nothing is uploaded. Reset clears local edits. Production CLI reads local files.';
    renderEditorState();
    const focusNote = document.createElement('p');
    focusNote.id = 'source-focus-note';
    focusNote.className = 'source-focus-note';
    focusNote.textContent = 'Citations focus the matching file editor; line-level navigation remains in the text area.';
    sourceList.append(focusNote);
    if (entries.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-source';
      empty.textContent = 'No evidence files are selected for this readout.';
      sourceList.append(empty);
      return;
    }
    for (const [key, input] of entries) {
      const card = document.createElement('div');
      card.className = 'source-card';
      const label = document.createElement('label');
      label.textContent = labels[key] || input.label;
      label.htmlFor = 'source-' + key;
      const editor = document.createElement('textarea');
      editor.id = 'source-' + key;
      editor.className = 'source-editor';
      editor.dataset.key = key;
      editor.spellcheck = false;
      editor.value = edits.has(editKey(key)) ? edits.get(editKey(key)) : definition.files[input.path];
      const citationNote = document.createElement('p');
      citationNote.id = 'source-note-' + key;
      citationNote.className = 'source-citation-note';
      citationNote.textContent = 'Cited spans identify lines in this file; line-level navigation stays in the text area.';
      editor.setAttribute('aria-describedby', citationNote.id);
      editor.addEventListener('input', () => {
        edits.set(editKey(key), editor.value);
        setEditorState('changed');
      });
      card.append(label, editor, citationNote);
      sourceList.append(card);
    }
  }

  function collectOverrides() {
    const overrides = {};
    for (const editor of sourceList.querySelectorAll('.source-editor')) overrides[editor.dataset.key] = editor.value;
    return overrides;
  }

  function setBriefView(view) {
    briefView = view === 'raw' ? 'raw' : 'visual';
    const visual = briefView === 'visual';
    visualOutput.hidden = !visual;
    output.hidden = visual;
    if (rawSectionTarget) rawSectionTarget.hidden = visual;
    visualOutput.setAttribute('aria-hidden', String(!visual));
    output.setAttribute('aria-hidden', String(visual));
    visualViewButton.setAttribute('aria-pressed', String(visual));
    rawViewButton.setAttribute('aria-pressed', String(!visual));
  }

  function riskSummary(markdown) {
    const match = String(markdown).match(/^## (Risk flags|Handoff risk flags|Slide: Open risks)\n([\s\S]*?)(?=\n## |$)/m);
    if (!match) return { title: 'Not evaluated', detail: 'No cited risk section was rendered from the supplied evidence.' };
    if (/_None triggered by the current deterministic rules\._/.test(match[2])) {
      return { title: 'No cited flags', detail: 'The deterministic rules found no flags in the supplied evidence. This is not a health score.' };
    }
    return { title: 'Cited signals below', detail: 'Review the separate cited risk section. Evidence coverage does not assess account health.' };
  }

  function renderEvidenceSummary(result) {
    if (!evidenceSummary) return;
    const score = result.completeness;
    const evidenceState = result.evidenceState || api.evidenceState(score);
    const stateLabel = evidenceState[0].toUpperCase() + evidenceState.slice(1);
    const missing = score.units.filter((unit) => !unit.ok).map((unit) => frontlineEvidenceLabel(unit.label));
    const missingHtml = missing.length
      ? '<strong>Missing now</strong><ul>' + missing.map((unit) => '<li>' + escapeHtml(unit) + '</li>').join('') + '</ul>'
      : '<small>All required units are present. Complete evidence still does not indicate a healthy account.</small>';
    const risk = riskSummary(result.markdown);
    evidenceSummary.innerHTML = '<div class="state-rail" role="group" aria-label="Readout state"><div class="state-card"><span class="state-card-label">Generation</span><strong>Readout generated</strong><small>The exact Markdown artifact is available in both views.</small></div><div class="state-card" data-state="' + evidenceState + '"><span class="state-card-label">Input evidence</span><strong>Evidence ' + stateLabel + '</strong><small>' + score.present + ' of ' + score.total + ' ' + typeDetails[state.type].evidence.replace(/^\d+ /, '') + ' present. Evidence completeness is not account health.</small>' + (missing.length ? '<div class="evidence-missing-list">' + missingHtml + '</div>' : missingHtml) + '</div><div class="state-card" data-state="risk"><span class="state-card-label">Account / business risk</span><strong>' + risk.title + '</strong><small>' + risk.detail + '</small></div></div>';
  }

  function rawSectionText(markdown) {
    const heading = String(markdown).split('\n').find((line) => /^## (Slide: Next-quarter plan|Missing-evidence checklist|Gap report)/.test(line));
    return heading
      ? 'Raw Markdown target: ' + heading.replace(/^## /, '') + '. The exact generated bytes remain unchanged.'
      : 'Raw Markdown output. The exact generated bytes remain unchanged.';
  }

  function markdownSections(markdown) {
    const sections = [];
    let current = null;
    for (const line of String(markdown).split('\n')) {
      const heading = /^##\s+(.+)$/.exec(line);
      if (heading) {
        current = { heading: heading[1], lines: [] };
        sections.push(current);
      } else if (current) {
        current.lines.push(line);
      }
    }
    return sections;
  }

  function citedNextMove(markdown) {
    const citationTokens = (value) => [...String(value).matchAll(/\`([^\`\r\n]+)\`/g)]
      .map((match) => match[1].trim())
      .filter((token) => /^.+?#L\d+(?:[-,]L?\d+)*$/.test(token));
    const sections = markdownSections(markdown);
    const preferred = [
      /next-quarter plan/i,
      /missing-evidence checklist/i,
      /^gap report/i,
      /risk flags|open risks/i,
      /week-one questions/i,
    ];
    for (const headingPattern of preferred) {
      const section = sections.find((candidate) => headingPattern.test(candidate.heading));
      if (!section) continue;
      for (const line of section.lines) {
        const citations = citationTokens(line);
        if (
          /^\s*-\s+/.test(line) &&
          citations.length > 0 &&
          !/All required evidence present|None triggered by the current deterministic rules|Assign an owner and due date/.test(line)
        ) {
          return { heading: section.heading, line, citations };
        }
      }
    }
    return null;
  }

  function rawJumpLink() {
    const link = document.createElement('a');
    link.className = 'brief-raw-jump';
    link.href = '#raw-markdown-next-actions';
    link.textContent = 'Open the exact next-actions or missing-evidence section in Raw Markdown.';
    return link;
  }

  function renderNextMove(result) {
    if (!nextMoveCopy) return;
    nextMoveCopy.replaceChildren();
    const candidate = citedNextMove(result.markdown);
    if (!candidate) {
      const label = document.createElement('span');
      label.className = 'next-move-label';
      label.textContent = 'No cited next move to lift';
      const copy = document.createElement('span');
      copy.className = 'next-move-candidate';
      copy.textContent = 'No cited next move is safe to lift into Visual brief.';
      nextMoveCopy.append(label, copy, rawJumpLink());
      return;
    }
    const label = document.createElement('span');
    label.className = 'next-move-label';
    label.textContent = 'Source-safe item from ' + candidate.heading;
    const copy = document.createElement('span');
    copy.className = 'next-move-candidate';
    copy.textContent = candidate.line;
    const citation = candidate.citations[0].match(/^(.+?)#(L\d+(?:[-,]L?\d+)*)$/);
    const sourceLink = document.createElement('a');
    sourceLink.className = 'next-move-link';
    sourceLink.href = '#source-evidence';
    sourceLink.textContent = 'Open cited source ' + candidate.citations[0];
    if (citation) {
      sourceLink.dataset.source = citation[1];
      sourceLink.dataset.lines = citation[2];
    }
    nextMoveCopy.append(label, copy, sourceLink);
  }

  function focusSource(source, lines) {
    const inputs = currentDefinition().inputs;
    const labels = api.basenameLabels(inputs);
    const entry = Object.entries(inputs).find(([key, input]) => labels[key] === source || input.label === source || input.path === '/' + source);
    if (!entry) return false;
    const [key, input] = entry;
    const editor = document.getElementById('source-' + key);
    if (!editor) return false;
    if (sourcePanel) sourcePanel.open = true;
    for (const card of sourceList.querySelectorAll('.source-card')) card.classList.remove('cited');
    const card = [...sourceList.querySelectorAll('.source-card')].find((candidate) => [...candidate.children].includes(editor));
    card?.classList.add('cited');
    const note = document.getElementById('source-note-' + key);
    const span = source + '#' + lines;
    if (note) {
      note.classList.add('cited');
      note.textContent = 'Cited span: ' + span + '. File-level focus only; line-level navigation stays in the text area.';
    }
    const focusNote = document.getElementById('source-focus-note');
    if (focusNote) focusNote.textContent = 'Focused ' + span + '. File-level focus only; inspect the text area for the cited line or range.';
    editor.dataset.citedLines = lines;
    editor.setAttribute('aria-label', (labels[key] || input.label) + ' source editor; cited ' + span + '. File-level focus only.');
    editor.focus?.({ preventScroll: true });
    editor.scrollIntoView?.({ block: 'center' });
    return true;
  }

  function focusRawSection(event) {
    event?.preventDefault?.();
    setBriefView('raw');
    const sectionStart = currentMarkdown.search(/^## (Slide: Next-quarter plan|Missing-evidence checklist|Gap report)/m);
    if (output && sectionStart >= 0 && output.scrollHeight > output.clientHeight) {
      output.scrollTop = Math.round(output.scrollHeight * (sectionStart / Math.max(currentMarkdown.length, 1)));
    }
    rawSectionTarget?.focus?.();
  }

  function handleLocalJump(event) {
    const target = event?.target;
    const sourceLink = target?.closest?.('[data-source][data-lines]');
    if (sourceLink) {
      event.preventDefault();
      focusSource(sourceLink.dataset.source, sourceLink.dataset.lines);
      return;
    }
    const rawLink = target?.closest?.('.brief-raw-jump');
    if (rawLink) focusRawSection(event);
  }

  function markEditorsInvalid(invalid) {
    for (const editor of sourceList.querySelectorAll('.source-editor')) editor.setAttribute('aria-invalid', String(invalid));
  }

  function renderBrief(action = 'select', focusTarget = null) {
    output.classList.remove('error');
    warnings.className = 'warning-box';
    try {
      const result = api.generate(state.scenario, state.type, collectOverrides());
      currentMarkdown = result.markdown;
      output.textContent = currentMarkdown;
      visualOutput.innerHTML = renderBriefPresentation(currentMarkdown, 'interactive-brief');
      if (rawSectionTarget) rawSectionTarget.textContent = rawSectionText(currentMarkdown);
      renderEvidenceSummary(result);
      renderNextMove(result);
      const score = result.completeness;
      status.className = 'result-status ok';
      status.textContent = 'readout generated';
      warnings.hidden = result.warnings.length === 0;
      warnings.textContent = result.warnings.length === 0
        ? ''
        : result.warnings.length + ' input warning' + (result.warnings.length === 1 ? '' : 's') + ' · invalid rows stay out of the brief.';
      markEditorsInvalid(result.warnings.length > 0);
      if (action === 'update') setEditorState(result.warnings.length > 0 ? 'invalid' : 'updated');
      else if (result.warnings.length > 0) setEditorState('invalid');
      setBriefView(briefView);
      focusTarget?.focus?.();
    } catch (error) {
      currentMarkdown = '';
      visualOutput.innerHTML = '';
      output.classList.add('error');
      output.textContent = 'The engine stopped safely:\n\n' + error.message;
      status.className = 'result-status error';
      status.textContent = 'input error · no brief rendered';
      warnings.hidden = false;
      warnings.className = 'warning-box error';
      warnings.textContent = 'Input error: ' + error.message + ' Edits were kept. Fix the source and update again.';
      markEditorsInvalid(true);
      setEditorState('invalid');
      if (evidenceSummary) evidenceSummary.innerHTML = '<div class="state-rail" role="group" aria-label="Readout state"><div class="state-card"><span class="state-card-label">Generation</span><strong>No readout generated</strong><small>The engine stopped safely before producing an artifact.</small></div><div class="state-card" data-state="insufficient"><span class="state-card-label">Input evidence</span><strong>Unavailable</strong><small>Fix the invalid source before evidence completeness can be evaluated.</small></div><div class="state-card" data-state="risk"><span class="state-card-label">Account / business risk</span><strong>Not evaluated</strong><small>No account-health conclusion is drawn from invalid input.</small></div></div>';
      if (rawSectionTarget) rawSectionTarget.textContent = 'Raw Markdown is unavailable until the input is valid.';
      setBriefView('raw');
      focusTarget?.focus?.();
    }
  }

  function exportFeedbackMessage(message, error = false, focusTarget = null) {
    if (!exportFeedback) return;
    exportFeedback.className = 'export-feedback' + (error ? ' error' : '');
    exportFeedback.textContent = message;
    focusTarget?.focus?.();
  }

  function copyMarkdown() {
    if (!currentMarkdown) {
      exportFeedbackMessage('Copy failed: no valid generated Markdown is available.', true, copyButton);
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
      exportFeedbackMessage('Copy failed: Clipboard API is unavailable in this browser.', true, copyButton);
      return;
    }
    try {
      Promise.resolve(navigator.clipboard.writeText(currentMarkdown))
        .then(() => exportFeedbackMessage('Markdown copied.', false, copyButton))
        .catch(() => exportFeedbackMessage('Copy failed: the browser did not grant clipboard access.', true, copyButton));
    } catch {
      exportFeedbackMessage('Copy failed: the browser did not grant clipboard access.', true, copyButton);
    }
  }

  function downloadMarkdown() {
    if (!currentMarkdown) {
      exportFeedbackMessage('Download failed: no valid generated Markdown is available.', true, downloadButton);
      return;
    }
    const URLApi = typeof URL === 'undefined' ? null : URL;
    if (typeof Blob === 'undefined' || !URLApi || typeof URLApi.createObjectURL !== 'function') {
      exportFeedbackMessage('Download failed: Blob downloads are unavailable in this browser.', true, downloadButton);
      return;
    }
    const blob = new Blob([currentMarkdown], { type: 'text/markdown;charset=utf-8' });
    const objectUrl = URLApi.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = 'csm-kit-' + state.type + '-' + state.scenario + '.md';
    link.click?.();
    const revoke = () => URLApi.revokeObjectURL?.(objectUrl);
    if (typeof setTimeout === 'function') setTimeout(revoke, 0);
    else revoke();
    exportFeedbackMessage('Markdown download started.', false, downloadButton);
  }

  function render() {
    const scenario = api.SCENARIOS[state.scenario];
    state.type = api.SCENARIOS[state.scenario].types[state.type] ? state.type : 'renewal';
    scenarioSummary.textContent = scenario.label + ' · example account/source set · snapshot ' + api.AS_OF;
    renderScenarioControls();
    renderTypeControls();
    renderSources();
    renderBrief('select');
  }

  skipLink?.addEventListener('click', () => document.getElementById('demo-setup')?.focus?.());
  visualOutput.addEventListener('click', handleLocalJump);
  nextMoveCopy?.addEventListener('click', handleLocalJump);
  generateButton.addEventListener('click', () => renderBrief('update', generateButton));
  resetButton.addEventListener('click', () => {
    for (const key of [...edits.keys()]) if (key.startsWith(state.scenario + '/' + state.type + '/')) edits.delete(key);
    setEditorState('reset');
    renderSources();
    renderBrief('reset', resetButton);
  });
  visualViewButton.addEventListener('click', () => setBriefView('visual'));
  rawViewButton.addEventListener('click', () => setBriefView('raw'));
  copyButton.addEventListener('click', copyMarkdown);
  downloadButton.addEventListener('click', downloadMarkdown);
  setBriefView(briefView);
  render();
  app.dataset.rendered = 'true';
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
  <meta name="description" content="Explore a CSM-first account readout for renewal, usage, stakeholders, support, risks, and next actions. Nothing leaves the browser.">
  <title>csm-kit · Interactive demo</title>
  <style>${TOKENS}</style>
</head>
<body>
  <div class="shell">
    <a id="demo-skip-link" class="skip-link" href="#demo-setup">Skip to demo controls</a>
    <header class="topbar">
      <a class="wordmark" href="${rootHref}">csm-kit</a>
      <span class="top-meta">INTERACTIVE / LOCAL ONLY</span>
    </header>
    <noscript>
      <div class="panel noscript">
        <div class="eyebrow">JavaScript is off</div>
        <h1>Read the generated account briefs instead.</h1>
        <p>This interactive readout runs locally in your tab. With JavaScript disabled, use the <a href="${staticHref}">static annotated walkthrough</a>; no data is sent anywhere.</p>
      </div>
    </noscript>
    <main id="demo-app" class="demo-app">
      <section class="demo-intro">
         <div class="eyebrow">Frontline CSM workspace</div>
         <h1>Turn customer context into your next move.</h1>
         <p>Bring the account context and exports you already have. csm-kit organizes renewal timing, usage, support, stakeholders, and risks into a cited readout you can use to decide what to ask next. That means less manual reconstruction before the meeting and fewer unsupported claims in the room.</p>
          <div class="chip-row">
            <span class="chip success">works offline</span>
            <span class="chip">renewal + QBR + handoff</span>
            <span class="chip">cited readout</span>
          </div>
          <a class="hero-route" href="#demo-setup">Try the live readout <small>choose a situation</small></a>
        </section>
       ${buildTrustRail()}
       ${buildAccountPulseVisual()}
       ${buildWalkthrough()}
       ${buildScopePanel()}
        <section id="demo-setup" class="setup focus-target" aria-labelledby="setup-heading" tabindex="-1">
        <div class="setup-heading">
          <div>
            <div class="eyebrow">Start with a situation</div>
             <h2 id="setup-heading">See how the readout changes.</h2>
           </div>
            <p>Pick the situation coming in, then choose the customer conversation you need to prepare for. Each situation loads a different example account and source set. The readout updates locally.</p>
        </div>
        <div class="setup-grid">
          <section class="panel control-panel" aria-labelledby="scenario-heading">
            <fieldset>
              <legend id="scenario-heading">01 / Choose a situation</legend>
              <div id="scenario-controls" class="choice-grid"></div>
            </fieldset>
          </section>
          <section class="panel control-panel" aria-labelledby="type-heading">
            <fieldset>
              <legend id="type-heading">02 / Choose your conversation</legend>
              <div id="type-controls" class="type-row"></div>
            </fieldset>
          </section>
        </div>
      </section>
      <section class="demo-grid" aria-label="Account readout and optional source evidence">
        <article class="panel result-panel">
          <div class="panel-heading">
            <div>
              <h2>Account readout</h2>
              <p id="scenario-summary">Preparing your snapshot</p>
            </div>
             <div id="result-status" class="result-status" aria-live="polite">preparing your readout</div>
           </div>
           <div id="warning-box" class="warning-box" role="alert" hidden></div>
           <div id="evidence-summary" aria-live="polite"></div>
           <div class="brief-view-switch" role="group" aria-label="Generated brief view">
            <button id="visual-view-button" class="view-button" type="button" aria-pressed="true" aria-controls="brief-visual-output">Visual brief</button>
            <button id="raw-view-button" class="view-button" type="button" aria-pressed="false" aria-controls="brief-output">Raw Markdown</button>
          </div>
          <div id="brief-visual-output" class="brief-visual-panel brief-visual" aria-live="polite" hidden></div>
           <div class="brief-raw-panel"><p id="raw-markdown-next-actions" class="raw-section-target" tabindex="-1" hidden>Raw Markdown target</p><pre id="brief-output" class="brief-output result-output" aria-label="Raw generated markdown brief" aria-live="polite"></pre></div>
           <div class="result-footer">
             <div class="button-row">
               <button id="generate-button" class="button" type="button">Update readout</button>
               <button id="reset-button" class="button secondary" type="button">Reset edits</button>
             </div>
             <div class="button-row" aria-label="Markdown portability">
               <button id="copy-markdown-button" class="button secondary" type="button">Copy Markdown</button>
               <button id="download-markdown-button" class="button secondary" type="button">Download .md</button>
             </div>
             <span id="export-feedback" class="export-feedback" aria-live="polite"></span>
             <span class="mono">same inputs + same snapshot = same readout</span>
           </div>
         </article>
         <aside class="panel demo-note" aria-labelledby="next-move-heading">
           <div class="eyebrow">03 / Take it into the conversation</div>
           <h2 id="next-move-heading">What to do next</h2>
           <p id="next-move-copy">Use the readout to choose the next question, owner, or follow-up.</p>
           <div class="next-move-list" aria-label="Conversation outcomes">
             <span>next question</span>
             <span>conversation owner</span>
             <span>follow-up</span>
           </div>
         </aside>
          <details id="source-evidence" class="panel source-panel">
          <summary class="panel-heading">
            <div>
              <h2>Inspect the evidence</h2>
               <p id="source-summary">Advanced evidence editor</p>
             </div>
             <span class="mono">optional</span>
           </summary>
           <p id="source-privacy" class="source-privacy">Edits stay in this tab. Nothing is uploaded. Reset clears local edits. Production CLI reads local files.</p>
           <p id="editor-state" class="editor-state" role="status" aria-live="polite">Editor state: unchanged - no local edits</p>
           <div id="source-list" class="source-list"></div>
         </details>
       </section>
    </main>
    <footer class="footer">
      <p><a href="${staticHref}">Read the annotated static samples</a> · source edits stay in memory and are never submitted.</p>
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
