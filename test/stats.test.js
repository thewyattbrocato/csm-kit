'use strict';

// Stats behavior: --stats must append one JSON line per brief run to the
// impact log, and `csmkit stats` must summarize it. Real CLI executions only.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CLI = path.join(ROOT, 'bin', 'csmkit.js');
const FIXTURES = path.join(__dirname, 'fixtures');

function run(args, env = {}) {
  const res = spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  assert.strictEqual(res.status, 0, `expected exit 0, got ${res.status}: ${res.stderr}`);
  return { stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
}

function runSafe(args, env = {}) {
  const res = spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return { code: res.status ?? 1, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
}

function briefArgs(tmp, name, extra = []) {
  const d = path.join(FIXTURES, 'full');
  return [
    'brief',
    '--account', path.join(d, 'account.yaml'),
    '--crm', path.join(d, 'crm.csv'),
    '--tickets', path.join(d, 'tickets.csv'),
    '--usage', path.join(d, 'usage.csv'),
    '--as-of', '2026-08-22',
    '--out', path.join(tmp, name),
    ...extra,
  ];
}

test('--stats appends one JSON line per run with minutes-saved math', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-stats-'));
  const statsFile = path.join(tmp, 'impact.jsonl');

  run(briefArgs(tmp, 'b1.md', ['--stats', '--stats-file', statsFile, '--baseline-minutes', '90']));
  run(briefArgs(tmp, 'b2.md', ['--stats', '--stats-file', statsFile]), {
    CSMKIT_BASELINE_MINUTES: '60',
  });

  const lines = fs.readFileSync(statsFile, 'utf8').trim().split('\n');
  assert.strictEqual(lines.length, 2);

  const first = JSON.parse(lines[0]);
  assert.strictEqual(first.run, 'brief');
  assert.strictEqual(first.tool, 'csm-kit');
  assert.strictEqual(first.account, 'Northwind Logistics Inc.');
  assert.deepStrictEqual(first.inputs, { crm_rows: 8, ticket_rows: 5, usage_periods: 6 });
  assert.strictEqual(first.completeness_pct, 100);
  assert.strictEqual(first.baseline_manual_minutes, 90);
  assert.strictEqual(typeof first.automated_minutes, 'number');
  // Conservative estimate: saved ~= baseline minus tiny automated wall time.
  assert.ok(first.minutes_saved > 89 && first.minutes_saved <= 90, `unexpected minutes_saved ${first.minutes_saved}`);
  assert.match(first.ts, /^\d{4}-\d{2}-\d{2}T/);
  assert.ok(first.risk_flags === 0);
  assert.strictEqual(first.stakeholders, 4);

  // Env var baseline honored when flag absent.
  const second = JSON.parse(lines[1]);
  assert.strictEqual(second.baseline_manual_minutes, 60);
});

test('invalid --baseline-minutes exits before writing brief or stats artifacts', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-bad-baseline-'));
  const outFile = path.join(tmp, 'brief.md');
  const statsFile = path.join(tmp, 'impact.jsonl');

  const res = runSafe(briefArgs(tmp, 'brief.md', [
    '--stats',
    '--stats-file', statsFile,
    '--baseline-minutes', 'nope',
  ]));

  assert.strictEqual(res.code, 2);
  assert.match(res.stderr, /--baseline-minutes must be a positive number, got "nope"/);
  assert.strictEqual(fs.existsSync(outFile), false);
  assert.strictEqual(fs.existsSync(statsFile), false);
});

test('--stats keeps the brief on stdout and confirmation on stderr', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-stats-'));
  const statsFile = path.join(tmp, 'impact.jsonl');

  // No --out here: the brief itself should land on stdout.
  const { stdout, stderr } = run([
    'brief',
    '--account', path.join(FIXTURES, 'sparse', 'account.yaml'),
    '--as-of', '2026-08-22',
    '--stats', '--stats-file', statsFile,
  ]);

  assert.match(stdout, /# Renewal Readiness Brief/); // brief on stdout...
  assert.match(stderr, /stats: appended minutes-saved record to .*impact\.jsonl/); // ...log note on stderr

  const entry = JSON.parse(fs.readFileSync(statsFile, 'utf8').trim());
  assert.deepStrictEqual(entry.inputs, { crm_rows: 0, ticket_rows: 0, usage_periods: 0 }); // honest zeros
  assert.strictEqual(entry.completeness_pct, 40);
});

test('csmkit stats summarizes the log; friendly message when empty', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-stats-'));
  const statsFile = path.join(tmp, 'impact.jsonl');

  const none = run(['stats', '--stats-file', statsFile]);
  assert.match(none.stdout, /No stats recorded yet/);

  run(briefArgs(tmp, 'b1.md', ['--stats', '--stats-file', statsFile]));
  run(briefArgs(tmp, 'b2.md', ['--stats', '--stats-file', statsFile]));

  const summary = run(['stats', '--stats-file', statsFile]).stdout;
  assert.match(summary, /runs: 2/);
  assert.match(summary, /accounts covered: 1/);
  const total = Number(summary.match(/total minutes saved \(est\.\): ([0-9.]+)/)?.[1]);
  const avg = Number(summary.match(/avg minutes saved per run: ([0-9.]+)/)?.[1]);
  assert.ok(total > 149 && total <= 150, `unexpected total minutes saved ${total}`);
  assert.ok(avg > 74.5 && avg <= 75, `unexpected avg minutes saved ${avg}`);
});

test('stats summary breaks minutes saved down by brief type', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-stats-types-'));
  const statsFile = path.join(tmp, 'impact.jsonl');
  const handoffDir = path.join(FIXTURES, 'handoff', 'full');

  run(briefArgs(tmp, 'renewal.md', ['--stats', '--stats-file', statsFile]));
  run([
    'brief', '--type', 'qbr',
    '--account', path.join(FIXTURES, 'full', 'account.yaml'),
    '--crm', path.join(FIXTURES, 'full', 'crm.csv'),
    '--tickets', path.join(FIXTURES, 'full', 'tickets.csv'),
    '--usage', path.join(FIXTURES, 'full', 'usage.csv'),
    '--as-of', '2026-08-22',
    '--out', path.join(tmp, 'qbr.md'),
    '--stats', '--stats-file', statsFile,
  ]);
  run([
    'brief', '--type', 'handoff',
    '--handoff', path.join(handoffDir, 'handoff.yaml'),
    '--crm', path.join(handoffDir, 'crm.csv'),
    '--questions', path.join(handoffDir, 'questions.csv'),
    '--as-of', '2026-08-22',
    '--out', path.join(tmp, 'handoff.md'),
    '--stats', '--stats-file', statsFile,
  ]);

  const summary = run(['stats', '--stats-file', statsFile]).stdout;
  assert.match(summary, /runs: 3/);
  assert.match(summary, /minutes saved by brief type:/);
  assert.match(summary, /renewal: 1 run, [0-9.]+ min saved \(est\.\)/);
  assert.match(summary, /qbr: 1 run, [0-9.]+ min saved \(est\.\)/);
  assert.match(summary, /handoff: 1 run, [0-9.]+ min saved \(est\.\)/);

  // Records written before --type existed group honestly as unspecified.
  fs.appendFileSync(
    statsFile,
    JSON.stringify({ ts: '2026-01-01T00:00:00.000Z', minutes_saved: 10 }) + '\n'
  );
  const legacy = run(['stats', '--stats-file', statsFile]).stdout;
  assert.match(legacy, /unspecified: 1 run, 10\.00 min saved \(est\.\)/);
});
