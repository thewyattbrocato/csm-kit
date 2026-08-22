'use strict';

// Behavior tests: execute the real CLI on fixture files and assert rendered
// content, citation spans, and completeness math. No mocks, no network.
// Run with: node --test test/

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CLI = path.join(ROOT, 'bin', 'csmkit.js');
const FIXTURES = path.join(__dirname, 'fixtures');
const AS_OF = ['--as-of', '2026-08-22'];

function run(args) {
  return execFileSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
}

function runSafe(args) {
  const res = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
  return {
    code: res.status ?? 1,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
  };
}

function fullArgs(dir = 'full') {
  const d = path.join(FIXTURES, dir);
  return [
    'brief',
    '--account', path.join(d, 'account.yaml'),
    '--crm', path.join(d, 'crm.csv'),
    '--tickets', path.join(d, 'tickets.csv'),
    '--usage', path.join(d, 'usage.csv'),
    ...AS_OF,
  ];
}

test('full fixture renders complete brief with correct citations', () => {
  const out = run(fullArgs());

  assert.match(out, /# Renewal Readiness Brief — Northwind Logistics Inc\./);
  assert.match(out, /## Evidence completeness: 5\/5 \(100%\)/);

  // Renewal countdown cites the exact YAML line (L6 in fixture).
  assert.match(
    out,
    /- Renewal date: \*\*2026-10-15\*\* — \*\*54 days away\*\* at as-of 2026-08-22 — `account\.yaml#L6`/
  );

  // Signal table rows cite file+row spans.
  assert.match(out, /\| Last logged activity \| 2026-08-14 — meeting with Jordan Lee \| `crm\.csv#L5` \|/);
  assert.match(out, /\| Activity volume \(last 30d \/ prior 30d\) \| 3 \/ 2 \| `crm\.csv#L4,L5,L6,L8,L9` \|/);
  assert.match(out, /\| Ticket load \| 2 open \(0 high · 1 medium · 1 low\) \| `tickets\.csv#L4,L6` \|/);
  assert.match(out, /\| Latest usage period \(2026-08\) \| 141 active users · 13,020 events \| `usage\.csv#L7` \|/);
  assert.match(out, /\| Usage trend \(active users, 2026-03 → 2026-08\) \| \+28% \| `usage\.csv#L2,L7` \|/);

  // No risk rules trigger on this healthy dataset.
  assert.match(out, /_None triggered by the current deterministic rules\._/);

  // Stakeholder map derived from CRM contacts, most recent touch first.
  assert.match(out, /\| Jordan Lee \| VP Operations \| 2026-08-14 \(meeting\) \| 4 \| `crm\.csv#L5` \|/);
  assert.match(out, /\| Sam Ortiz \| Procurement Lead \| 2026-07-25 \(call\) \| 2 \| `crm\.csv#L6` \|/);
  assert.match(out, /\| Priya Natarajan \| Head of Support \| 2026-04-02 \(meeting\) \| 1 \| `crm\.csv#L3` \|/);

  // All evidence present -> satisfied checklist.
  assert.match(out, /- \[x\] All required evidence present and all recommended fields filled\./);
});

test('every factual table row carries a source span', () => {
  const out = run(fullArgs());
  const headerRows = [
    '| Required evidence | Status | Detail |',
    '| Signal | Value | Source |',
    '| Stakeholder | Role | Last touch | Activities | Source |',
  ];
  for (const line of out.split('\n')) {
    if (!line.startsWith('|') || line.startsWith('|---') || headerRows.includes(line)) continue;
    assert.match(line, /`[a-z-]+\.(csv|yaml)#L\d+/, `table row lacks a source span: ${line}`);
  }
});

test('risky fixture triggers all four deterministic risk flags with citations', () => {
  const out = run(fullArgs('risky'));

  assert.match(out, /## Evidence completeness: 5\/5 \(100%\)/);
  // 1. Stale relationship (>30d since last activity).
  assert.match(
    out,
    /🔴 Relationship going quiet: last logged activity was 92 days ago \(2026-05-22\) — `crm\.csv#L3`/
  );
  // 2. High-severity ticket open >14 days.
  assert.match(
    out,
    /🔴 High-severity ticket open 82 days: "Billing connector sync broken" — `tickets\.csv#L2`/
  );
  // 3. Usage decline >=20%.
  assert.match(
    out,
    /🟠 Usage declining: active users down 33% \(2026-02 → 2026-07\) — `usage\.csv#L2,L7`/
  );
  // 4. Renewal <=60d without recent meeting; absence claim cites searched range too.
  assert.match(
    out,
    /🔴 Renewal within 60 days but no customer meeting\/call in the last 30 days \(last: 2026-05-22\) — renewal `account\.yaml#L3`, last meeting `crm\.csv#L3`/
  );

  // Ticket load reflects the open set including severity mix.
  assert.match(out, /\| Ticket load \| 2 open \(1 high · 0 medium · 1 low\) \| `tickets\.csv#L2,L3` \|/);
});

test('missing CSVs suppress their sections and appear in checklist', () => {
  const out = run(['brief', '--account', path.join(FIXTURES, 'sparse', 'account.yaml'), ...AS_OF]);

  // Completeness math: name + renewal_date only = 2 of 5 units.
  assert.match(out, /## Evidence completeness: 2\/5 \(40%\)/);
  assert.match(out, /\| Account name \(account\.yaml\) \| present \| `account\.yaml#L2` \|/);

  // Countdown renders because renewal_date exists (cited to yaml line).
  assert.match(
    out,
    /- Renewal date: \*\*2026-09-30\*\* — \*\*39 days away\*\* at as-of 2026-08-22 — `account\.yaml#L3`/
  );

  // Facts that cannot resolve to a source span MUST NOT render.
  assert.doesNotMatch(out, /## Signal table/);
  assert.doesNotMatch(out, /## Stakeholder map/);
  assert.doesNotMatch(out, /## Risk flags/);
  assert.ok(!out.includes('crm.csv#')); // no citations to files never provided

  // Checklist names every gap as an action.
  assert.match(out, /- \[ \] provide --crm <activity-export\.csv> — required evidence \(CRM activity export\)/);
  assert.match(out, /- \[ \] provide --tickets <ticket-export\.csv> — required evidence \(Ticket export\)/);
  assert.match(out, /- \[ \] provide --usage <usage-summary\.csv> — required evidence \(Usage summary\)/);
  assert.match(out, /- \[ \] Add `owner:` in account\.yaml/);
  assert.match(out, /- \[ \] Add `arr_usd:` in account\.yaml/);
});

test('unusable CSV row is skipped with a warning and never becomes a fact', () => {
  const res = runSafe([
    'brief',
    '--account', path.join(FIXTURES, 'bad', 'account.yaml'),
    '--crm', path.join(FIXTURES, 'bad', 'crm-dates.csv'),
    ...AS_OF,
  ]);

  assert.strictEqual(res.code, 0);
  // Warning names the offending span...
  assert.match(res.stderr, /warning: crm-dates\.csv#L2: skipped — date "not-a-date" is not YYYY-MM-DD/);
  // ...and the broken row's content does not render anywhere in the brief.
  assert.ok(!res.stdout.includes('Broken date'));
  // The valid row still renders with its span.
  assert.match(res.stdout, /2026-08-01 — call with Y Ray/);
  assert.match(res.stdout, /`crm-dates\.csv#L3`/);

  // Invalid renewal_date degrades gracefully: warning + suppressed countdown + MISSING unit.
  assert.match(res.stderr, /warning: account\.yaml#L3: renewal_date "October 15th" is not a valid YYYY-MM-DD date/);
  assert.doesNotMatch(res.stdout, /## Renewal countdown/);
  // name + 1-row CRM export are present; renewal_date invalid; tickets/usage absent.
  assert.match(res.stdout, /## Evidence completeness: 2\/5 \(40%\)/);
  assert.match(res.stdout, /\| Renewal date \(account\.yaml\) \| MISSING \| missing or invalid \|/);
});

test('wrong CSV header fails loudly citing the header line', () => {
  const res = runSafe([
    'brief',
    '--account', path.join(FIXTURES, 'sparse', 'account.yaml'),
    '--tickets', path.join(FIXTURES, 'bad', 'tickets-wrong-header.csv'),
    ...AS_OF,
  ]);
  assert.strictEqual(res.code, 2);
  assert.match(res.stderr, /tickets-wrong-header\.csv#L1: missing required column\(s\) opened/);
});

test('usage errors exit non-zero with guidance', () => {
  const noAccount = runSafe(['brief']);
  assert.strictEqual(noAccount.code, 2);
  assert.match(noAccount.stderr, /--account <account\.yaml> is required/);

  const badDate = runSafe([
    'brief', '--account', path.join(FIXTURES, 'sparse', 'account.yaml'), '--as-of', '08/22/2026',
  ]);
  assert.strictEqual(badDate.code, 2);
  assert.match(badDate.stderr, /--as-of must be a valid YYYY-MM-DD date/);

  const unknownCmd = runSafe(['frobnicate']);
  assert.strictEqual(unknownCmd.code, 2);
  assert.match(unknownCmd.stderr, /unknown command "frobnicate"/);
});

test('--out writes the brief to a file', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-out-'));
  const outFile = path.join(tmp, 'nested', 'brief.md');
  const out = run([...fullArgs(), '--out', outFile]);
  assert.match(out, /wrote .*brief\.md \(5\/5 evidence, 100%\)/);
  const written = fs.readFileSync(outFile, 'utf8');
  assert.match(written, /# Renewal Readiness Brief — Northwind Logistics Inc\./);
  assert.match(written, /`account\.yaml#L6`/);
});
