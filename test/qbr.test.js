'use strict';

// Behavior tests for brief type #3 (QBR Packet): execute the real CLI on the
// renewal fixture matrix and assert slide-oriented rendering, citation spans,
// completeness math, and deterministic output. No mocks, no network.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CLI = path.join(ROOT, 'bin', 'csmkit.js');
const FIXTURES = path.join(__dirname, 'fixtures');
const AS_OF = ['--as-of', '2026-08-22'];

function runSafe(args) {
  const res = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
  return { code: res.status ?? 1, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
}

function run(args) {
  const res = runSafe(args);
  assert.strictEqual(res.code, 0, `expected exit 0, got ${res.code}: ${res.stderr}`);
  return res.stdout;
}

function qbrArgs(dir, extra = []) {
  const d = path.join(FIXTURES, dir);
  return [
    'brief', '--type', 'qbr',
    '--account', path.join(d, 'account.yaml'),
    '--crm', path.join(d, 'crm.csv'),
    '--tickets', path.join(d, 'tickets.csv'),
    '--usage', path.join(d, 'usage.csv'),
    ...AS_OF,
    ...extra,
  ];
}

test('full fixture renders a complete QBR packet with cited slides', () => {
  const out = run(qbrArgs('full'));

  assert.match(out, /# QBR Packet — Northwind Logistics Inc\./);
  assert.match(out, /## Evidence completeness: 5\/5 \(100%\)/);

  // Executive summary: every bullet cites its source span.
  assert.match(out, /## Slide: Executive summary/);
  assert.match(out, /- Latest usage \(2026-08\): 141 active users · 13,020 events — `usage\.csv#L7`/);
  assert.match(out, /- Open tickets: 2 \(0 high\) — `tickets\.csv#L4,L6`/);
  assert.match(out, /- Last customer activity: 2026-08-14 \(meeting\), 8 days ago — `crm\.csv#L5`/);
  assert.match(out, /- Renewal: 2026-10-15 \(54 days away\) — `account\.yaml#L6`/);

  // Value delivered: trend math and aggregates with contributor spans.
  assert.match(out, /## Slide: Value delivered/);
  assert.match(out, /- Active-user growth: \+28% \(2026-03 → 2026-08\) — `usage\.csv#L2,L7`/);
  assert.match(out, /- Total events tracked: 65,210 across 6 periods — `usage\.csv#L2,L3,L4,L5,L6,L7`/);
  assert.match(out, /- Tickets resolved on record: 3 — `tickets\.csv#L2,L3,L5`/);
  assert.match(out, /- Customer meetings\/calls held: 4 — `crm\.csv#L3,L5,L6,L8`/);

  // Healthy dataset -> none-statement still cites what it checked.
  assert.match(
    out,
    /## Slide: Open risks\n\n- _None triggered by the current deterministic rules\._ Evidence checked: `account\.yaml#L6`, `crm\.csv#L2-L9`, `tickets\.csv#L2-L6`, `usage\.csv#L2-L7`\./
  );

  // Plan skeleton derives deterministically from evidence.
  assert.match(out, /## Slide: Next-quarter plan/);
  assert.match(
    out,
    /- Confirm renewal timeline and paper process \(renewal 2026-10-15, 54 days away\) — `account\.yaml#L6`/
  );
  assert.match(out, /- Assign an owner and due date to each item above\./);

  // Reuses the shared account checklist verbatim.
  assert.match(
    out,
    /- \[x\] All required evidence present and all recommended fields filled — `account\.yaml#L2`, `account\.yaml#L6`, `account\.yaml#L3`, `account\.yaml#L4`, `crm\.csv#L2-L9`, `tickets\.csv#L2-L6`, `usage\.csv#L2-L7`\./
  );
});

test('risky fixture renders open risks with spans and a derived plan', () => {
  const out = run(qbrArgs('risky'));

  assert.match(out, /## Slide: Open risks/);
  assert.match(out, /🔴 Relationship going quiet: last logged activity was 92 days ago \(2026-05-22\) — `crm\.csv#L3`/);
  assert.match(out, /🔴 High-severity ticket open 82 days: "Billing connector sync broken" — `tickets\.csv#L2`/);
  assert.match(out, /🟠 Usage declining: active users down 33% \(2026-02 → 2026-07\) — `usage\.csv#L2,L7`/);

  assert.match(out, /## Slide: Next-quarter plan/);
  assert.match(out, /- Reverse the active-user decline \(-33%, 2026-02 → 2026-07\) — `usage\.csv#L2,L7`/);
  assert.match(out, /- Close high-severity ticket "Billing connector sync broken" \(open 82 days\) — `tickets\.csv#L2`/);
  assert.match(out, /- Re-establish cadence with Riley Fox — last touch 2026-05-22 \(92 days ago\) — `crm\.csv#L3`/);
});

test('sparse account renders only evidence-backed slides and honest fallbacks', () => {
  const out = run(['brief', '--type', 'qbr', '--account', path.join(FIXTURES, 'sparse', 'account.yaml'), ...AS_OF]);

  assert.match(out, /## Evidence completeness: 2\/5 \(40%\)/);
  // The renewal bullet is the only backed exec-summary fact.
  assert.match(out, /## Slide: Executive summary/);
  assert.match(out, /- Renewal: 2026-09-30 \(39 days away\) — `account\.yaml#L3`/);
  assert.doesNotMatch(out, /Latest usage/);
  // Value delivered has no usable evidence -> suppressed entirely.
  assert.doesNotMatch(out, /## Slide: Value delivered/);
  assert.ok(!out.includes('crm.csv#'));
  // Plan falls back to the only derived item (renewal within 120d).
  assert.match(
    out,
    /- Confirm renewal timeline and paper process \(renewal 2026-09-30, 39 days away\) — `account\.yaml#L3`/
  );
  assert.match(out, /- \[ \] provide --crm <activity-export\.csv> — required evidence \(CRM activity export\)/);
  assert.match(out, /- \[ \] Add `owner:` in account\.yaml \(recommended — names the accountable CSM\)/);
});

test('no-evidence account suppresses uncited plan absence claims', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-qbr-bare-'));
  const accountFile = path.join(tmp, 'account.yaml');
  fs.writeFileSync(accountFile, ['name: Bare Bones Co.', ''].join('\n'));

  const out = run(['brief', '--type', 'qbr', '--account', accountFile, ...AS_OF]);

  assert.match(out, /## Evidence completeness: 1\/5 \(20%\)/);
  assert.doesNotMatch(out, /## Slide: Executive summary/);
  assert.doesNotMatch(out, /## Slide: Value delivered/);
  assert.doesNotMatch(out, /no deterministic priorities triggered/);
  assert.match(out, /## Slide: Next-quarter plan\n\n- Assign an owner and due date to each item above\./);
});

test('complete QBR with no plan priorities cites checked evidence', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-qbr-no-plan-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const crmFile = path.join(tmp, 'crm.csv');
  const ticketsFile = path.join(tmp, 'tickets.csv');
  const usageFile = path.join(tmp, 'usage.csv');
  fs.writeFileSync(accountFile, ['name: Quiet Complete Co.', 'renewal_date: 2027-02-01', ''].join('\n'));
  fs.writeFileSync(
    crmFile,
    ['date,type,contact,role,summary', '2026-08-20,meeting,Avery Stone,VP Operations,Recent cadence', ''].join('\n')
  );
  fs.writeFileSync(
    ticketsFile,
    ['opened,closed,severity,status,subject', '2026-08-01,2026-08-02,medium,closed,Resolved request', ''].join('\n')
  );
  fs.writeFileSync(
    usageFile,
    ['period,active_users,events', '2026-07,100,1000', '2026-08,110,1200', ''].join('\n')
  );

  const out = run([
    'brief', '--type', 'qbr',
    '--account', accountFile,
    '--crm', crmFile,
    '--tickets', ticketsFile,
    '--usage', usageFile,
    ...AS_OF,
  ]);

  assert.match(
    out,
    /## Slide: Next-quarter plan\n\n- _None triggered by the current deterministic rules\._ Evidence checked: `account\.yaml#L2`, `crm\.csv#L2-L2`, `tickets\.csv#L2-L2`, `usage\.csv#L2-L3`\./
  );
});

test('every factual QBR table row carries a source span', () => {
  const out = run(qbrArgs('full'));
  for (const line of out.split('\n')) {
    if (!line.startsWith('|') || line.startsWith('|---') || line === '| Required evidence | Status | Detail |') continue;
    assert.match(line, /`[a-z-]+\.(csv|yaml)#L\d+/, `table row lacks a source span: ${line}`);
  }
});

test('same QBR inputs and as-of produce byte-identical output', () => {
  const a = run(qbrArgs('full'));
  const b = run(qbrArgs('full'));
  assert.strictEqual(a, b);
});

test('--stats records brief_type qbr with the shared input shape', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-qbr-stats-'));
  const statsFile = path.join(tmp, 'impact.jsonl');
  const outFile = path.join(tmp, 'qbr.md');

  run([...qbrArgs('risky'), '--out', outFile, '--stats', '--stats-file', statsFile]);

  const entry = JSON.parse(fs.readFileSync(statsFile, 'utf8').trim());
  assert.strictEqual(entry.brief_type, 'qbr');
  assert.deepStrictEqual(entry.inputs, { crm_rows: 2, ticket_rows: 2, usage_periods: 6 });
  assert.strictEqual(entry.completeness_pct, 100);
  assert.strictEqual(entry.risk_flags, 4); // quiet + stale high + decline + near-renewal-no-meeting
});
