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
