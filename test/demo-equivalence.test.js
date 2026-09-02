'use strict';

// Execute the exact runtime script embedded in docs/demo/index.html. This is
// deliberately not a second implementation of the engine: the VM runs the
// browser bundle, then compares its markdown to the real CLI output.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const CLI = path.join(ROOT, 'bin', 'csmkit.js');
const DEMO = path.join(ROOT, 'docs', 'demo', 'index.html');
const AS_OF = ['--as-of', '2026-08-22'];

function browserApi() {
  const html = fs.readFileSync(DEMO, 'utf8');
  const match = html.match(/<script id="demo-runtime">([\s\S]*?)<\/script>/);
  assert.ok(match, 'interactive demo is missing its embedded runtime');
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(match[1], context, { filename: 'docs/demo/index.html#demo-runtime' });
  assert.ok(context.window.CSMKIT_DEMO, 'embedded runtime did not expose its API');
  return context.window.CSMKIT_DEMO;
}

function cliArgs(scenario, type) {
  const args = ['brief', '--type', type];
  if (type === 'handoff') {
    const dir = scenario === 'full'
      ? path.join(ROOT, 'examples', 'acme')
      : path.join(ROOT, 'test', 'fixtures', 'handoff', scenario);
    args.push('--handoff', path.join(dir, 'handoff.yaml'));
    for (const optional of ['crm.csv', 'questions.csv']) {
      const file = path.join(dir, optional);
      if (fs.existsSync(file)) args.push(optional.startsWith('crm') ? '--crm' : '--questions', file);
    }
  } else {
    const dir = scenario === 'full'
      ? path.join(ROOT, 'examples', 'acme')
      : path.join(ROOT, 'test', 'fixtures', scenario);
    args.push('--account', path.join(dir, 'account.yaml'));
    for (const [flag, fileName] of [['--crm', 'crm.csv'], ['--tickets', 'tickets.csv'], ['--usage', 'usage.csv']]) {
      const file = path.join(dir, fileName);
      // The sparse scenario intentionally omits the malformed CSV fixture;
      // it demonstrates absent evidence, not invalid input.
      if (scenario !== 'sparse' && fs.existsSync(file)) args.push(flag, file);
    }
  }
  return [...args, ...AS_OF];
}

function cliOutput(scenario, type) {
  const result = spawnSync(process.execPath, [CLI, ...cliArgs(scenario, type)], { encoding: 'utf8' });
  assert.strictEqual(result.status, 0, `${scenario}/${type} CLI failed: ${result.stderr}`);
  return result.stdout;
}

test('browser bundle is byte-equivalent to the CLI for every fixture scenario and brief type', () => {
  const api = browserApi();
  for (const scenario of ['full', 'risky', 'sparse']) {
    for (const type of ['renewal', 'handoff', 'qbr']) {
      const browser = api.generate(scenario, type);
      const cli = cliOutput(scenario, type);
      assert.strictEqual(browser.markdown, cli, `${scenario}/${type} differs from CLI`);
    }
  }
});

test('browser bundle fixes the as-of date and remains deterministic', () => {
  const api = browserApi();
  assert.strictEqual(api.AS_OF, '2026-08-22');
  const first = api.generate('full', 'renewal');
  const second = api.generate('full', 'renewal');
  assert.strictEqual(first.markdown, second.markdown);
  assert.deepStrictEqual(first.completeness, second.completeness);
});

test('browser bundle exposes explicit evidence states and exact missing units', () => {
  const api = browserApi();
  assert.strictEqual(api.evidenceState({ present: 5, total: 5 }), 'complete');
  assert.strictEqual(api.evidenceState({ present: 3, total: 5 }), 'partial');
  assert.strictEqual(api.evidenceState({ present: 2, total: 5 }), 'insufficient');

  const sparseRenewal = api.generate('sparse', 'renewal');
  assert.strictEqual(sparseRenewal.evidenceState, 'insufficient');
  assert.deepStrictEqual(
    [...sparseRenewal.completeness.units.filter((unit) => !unit.ok).map((unit) => unit.label)],
    ['CRM activity export', 'Ticket export', 'Usage summary'],
  );

  const sparseHandoff = api.generate('sparse', 'handoff');
  assert.deepStrictEqual(
    [...sparseHandoff.completeness.units.filter((unit) => !unit.ok).map((unit) => unit.label)],
    [
      'Goals / success criteria',
      'Stakeholder map',
      'Promises register (promised-vs-sold)',
      'Risks / dependencies',
      'Links (recordings / proposal)',
    ],
  );
});

test('browser bundle preserves fail-closed behavior for edited input', () => {
  const api = browserApi();
  const result = api.generate('full', 'renewal', {
    usage: 'period,active_users,events\n2026-08,bad,100\n',
  });
  assert.strictEqual(result.completeness.present, 4);
  assert.match(result.markdown, /Usage summary \| MISSING/);
  assert.doesNotMatch(result.markdown, /Latest usage period/);
  assert.ok(result.warnings.some((warning) => warning.includes('active_users "bad"')));
});
