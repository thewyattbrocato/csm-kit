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

  assert.match(out, /# Renewal Readiness Brief/);
  assert.match(out, /\*\*Northwind Logistics Inc\.\*\* — `account\.yaml#L2`/);
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
  assert.match(out, /\| Jordan Lee \| VP Operations \| 2026-08-14 \(meeting\) \| 4 \| `crm\.csv#L2,L4,L5,L8` \|/);
  assert.match(out, /\| Sam Ortiz \| Procurement Lead \| 2026-07-25 \(call\) \| 2 \| `crm\.csv#L6,L9` \|/);
  assert.match(out, /\| Priya Natarajan \| Head of Support \| 2026-04-02 \(meeting\) \| 1 \| `crm\.csv#L3` \|/);

  // All evidence present -> satisfied checklist cites what it checked.
  assert.match(
    out,
    /- \[x\] All required evidence present and all recommended fields filled — `account\.yaml#L2`, `account\.yaml#L6`, `account\.yaml#L3`, `account\.yaml#L4`, `crm\.csv#L2-L9`, `tickets\.csv#L2-L6`, `usage\.csv#L2-L7`\./
  );
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
    /🔴 Renewal within 60 days but no customer meeting\/call in the last 30 days \(last: 2026-05-22\) — renewal `account\.yaml#L3`, last meeting `crm\.csv#L3`, search covered `crm\.csv#L2-L3`/
  );

  // Ticket load reflects the open set including severity mix.
  assert.match(out, /\| Ticket load \| 2 open \(1 high · 0 medium · 1 low\) \| `tickets\.csv#L2,L3` \|/);
});

test('overdue renewal does not trigger near-renewal risk', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-overdue-renewal-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const crmFile = path.join(tmp, 'crm.csv');
  fs.writeFileSync(
    accountFile,
    ['name: Overdue Renewal', 'renewal_date: 2025-01-01', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(
    crmFile,
    ['date,type,contact,role,summary', '2026-08-10,email,Alice Rivera,CFO,Recent note', ''].join('\n')
  );

  const out = run(['brief', '--account', accountFile, '--crm', crmFile, ...AS_OF]);

  assert.doesNotMatch(out, /Renewal within 60 days/);
  assert.match(out, /🔴 Renewal date has already passed — confirm actual date — `account\.yaml#L2`/);
});

test('no-risk filler requires all required evidence', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-partial-norisk-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const ticketsFile = path.join(tmp, 'tickets.csv');
  fs.writeFileSync(
    accountFile,
    ['name: Partial Evidence', 'renewal_date: 2026-12-01', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(
    ticketsFile,
    ['opened,closed,severity,subject,status', '2026-08-01,2026-08-02,low,Resolved question,closed', ''].join('\n')
  );

  const out = run(['brief', '--account', accountFile, '--tickets', ticketsFile, ...AS_OF]);

  assert.doesNotMatch(out, /_None triggered by the current deterministic rules\._/);
  assert.match(out, /- \[ \] provide --crm <activity-export\.csv> — required evidence \(CRM activity export\)/);
  assert.match(out, /- \[ \] provide --usage <usage-summary\.csv> — required evidence \(Usage summary\)/);
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

test('default as-of uses today UTC without shifting the month', () => {
  const out = run(['brief', '--account', path.join(FIXTURES, 'sparse', 'account.yaml')]);
  const todayUtc = new Date().toISOString().slice(0, 10);

  assert.match(out, new RegExp(`as-of ${todayUtc}`));
});

test('CRM absence facts cite searched ranges and stakeholder role source rows', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-crm-absence-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const crmFile = path.join(tmp, 'crm.csv');
  fs.writeFileSync(
    accountFile,
    ['name: Citation Test', 'renewal_date: 2026-09-01', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(
    crmFile,
    [
      'date,type,contact,role,summary',
      '2026-01-01,email,Alice Rivera,CFO,Initial finance touch',
      '2026-01-10,email,Alice Rivera,,Follow-up without role',
      '',
    ].join('\n')
  );

  const out = run(['brief', '--account', accountFile, '--crm', crmFile, ...AS_OF]);

  assert.match(
    out,
    /\| Activity volume \(last 30d \/ prior 30d\) \| 0 \/ 0 \| `crm\.csv#L2-L3` \|/
  );
  assert.match(
    out,
    /no customer meeting\/call anywhere in the CRM export — renewal `account\.yaml#L2`, search covered `crm\.csv#L2-L3`/
  );
  assert.match(
    out,
    /\| Alice Rivera \| CFO \| 2026-01-10 \(email\) \| 2 \| `crm\.csv#L2,L3` \|/
  );
  assert.doesNotMatch(out, /crm\.csv#`/);
  assert.doesNotMatch(out, /search covered null/);
});

test('all-invalid CRM export does not render uncited near-renewal absence risk', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-invalid-crm-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const crmFile = path.join(tmp, 'crm.csv');
  fs.writeFileSync(
    accountFile,
    ['name: Invalid CRM', 'renewal_date: 2026-09-01', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(
    crmFile,
    ['date,type,contact,role,summary', 'not-a-date,email,Alice Rivera,CFO,Broken date', ''].join('\n')
  );

  const res = runSafe(['brief', '--account', accountFile, '--crm', crmFile, ...AS_OF]);

  assert.strictEqual(res.code, 0);
  assert.match(res.stderr, /warning: crm\.csv#L2: skipped — date "not-a-date" is not YYYY-MM-DD/);
  assert.match(res.stdout, /\| CRM activity export \| MISSING \| no valid data rows \(`crm\.csv#L1`\) \|/);
  assert.doesNotMatch(res.stdout, /no customer meeting\/call anywhere/);
  assert.doesNotMatch(res.stdout, /search covered null/);
});

test('usage latest and trend use chronological periods independent of file order', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-usage-order-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const usageFile = path.join(tmp, 'usage.csv');
  fs.writeFileSync(
    accountFile,
    ['name: Usage Order', 'renewal_date: 2026-12-01', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(
    usageFile,
    ['period,active_users,events', '2026-08,10,200', '2026-07,8,160', ''].join('\n')
  );

  const out = run(['brief', '--account', accountFile, '--usage', usageFile, ...AS_OF]);

  assert.match(out, /\| Latest usage period \(2026-08\) \| 10 active users · 200 events \| `usage\.csv#L2` \|/);
  assert.match(out, /\| Usage trend \(active users, 2026-07 → 2026-08\) \| \+25% \| `usage\.csv#L2,L3` \|/);
});

test('duplicate usage periods are skipped before trend and risk calculations', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-duplicate-usage-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const usageFile = path.join(tmp, 'usage.csv');
  fs.writeFileSync(
    accountFile,
    ['name: Duplicate Usage', 'renewal_date: 2026-12-01', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(
    usageFile,
    ['period,active_users,events', '2026-08,100,1000', '2026-08,50,500', ''].join('\n')
  );

  const res = runSafe(['brief', '--account', accountFile, '--usage', usageFile, ...AS_OF]);

  assert.strictEqual(res.code, 0);
  assert.match(
    res.stderr,
    /warning: usage\.csv#L3: skipped — duplicate usage period "2026-08" \(first seen at usage\.csv#L2\)/
  );
  assert.match(res.stdout, /\| Latest usage period \(2026-08\) \| 100 active users · 1,000 events \| `usage\.csv#L2` \|/);
  assert.doesNotMatch(res.stdout, /Usage trend \(active users, 2026-08 → 2026-08\)/);
  assert.doesNotMatch(res.stdout, /Usage declining/);
});

test('zero active-user baseline suppresses uncomputable usage trend', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-zero-users-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const usageFile = path.join(tmp, 'usage.csv');
  fs.writeFileSync(
    accountFile,
    ['name: Zero Users', 'renewal_date: 2026-12-01', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(
    usageFile,
    ['period,active_users,events', '2026-07,0,100', '2026-08,10,200', ''].join('\n')
  );

  const out = run(['brief', '--account', accountFile, '--usage', usageFile, ...AS_OF]);

  assert.match(out, /\| Latest usage period \(2026-08\) \| 10 active users · 200 events \| `usage\.csv#L3` \|/);
  assert.doesNotMatch(out, /Usage trend \(active users/);
  assert.doesNotMatch(out, /Infinity/);
});

test('quoted CSV fields with commas stay in one field', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-quoted-csv-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const crmFile = path.join(tmp, 'crm.csv');
  fs.writeFileSync(
    accountFile,
    ['name: Quoted CSV', 'renewal_date: 2026-12-01', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(
    crmFile,
    [
      'date,type,contact,role,summary',
      '2026-08-01,call,"Lee, Jordan",VP Ops,Renewal call',
      '',
    ].join('\n')
  );

  const out = run(['brief', '--account', accountFile, '--crm', crmFile, ...AS_OF]);

  assert.match(out, /\| Last logged activity \| 2026-08-01 — call with Lee, Jordan \| `crm\.csv#L2` \|/);
  assert.match(out, /\| Lee, Jordan \| VP Ops \| 2026-08-01 \(call\) \| 1 \| `crm\.csv#L2` \|/);
});

test('unterminated quoted CSV records are skipped with a source warning', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-unterminated-csv-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const crmFile = path.join(tmp, 'crm.csv');
  fs.writeFileSync(
    accountFile,
    ['name: Unterminated CSV', 'renewal_date: 2026-12-01', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(
    crmFile,
    ['date,type,contact,role,summary', '2026-08-01,"call,Alice Rivera,CFO,Malformed summary'].join('\n')
  );

  const res = runSafe(['brief', '--account', accountFile, '--crm', crmFile, ...AS_OF]);

  assert.strictEqual(res.code, 0);
  assert.match(res.stderr, /warning: crm\.csv#L2: skipped — unterminated quoted record/);
  assert.match(res.stdout, /\| CRM activity export \| MISSING \| no valid data rows \(`crm\.csv#L1`\) \|/);
  assert.doesNotMatch(res.stdout, /Last logged activity/);
  assert.doesNotMatch(res.stdout, /Alice Rivera/);
});

test('no-risk statement cites the evidence ranges it checked', () => {
  const out = run(fullArgs());

  assert.match(
    out,
    /_None triggered by the current deterministic rules\._ Evidence checked: `account\.yaml#L6`, `crm\.csv#L2-L9`, `tickets\.csv#L2-L6`, `usage\.csv#L2-L7`\./
  );
});

test('no-risk statement requires as-of usable evidence', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-no-risk-asof-evidence-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const crmFile = path.join(tmp, 'crm.csv');
  const ticketsFile = path.join(tmp, 'tickets.csv');
  const usageFile = path.join(tmp, 'usage.csv');
  fs.writeFileSync(
    accountFile,
    ['name: Future Usage Evidence', 'renewal_date: 2026-12-01', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(
    crmFile,
    ['date,type,contact,role,summary', '2026-08-10,meeting,Alice Rivera,CFO,Recent meeting', ''].join('\n')
  );
  fs.writeFileSync(
    ticketsFile,
    ['opened,closed,severity,subject,status', '2026-08-01,2026-08-02,low,Resolved question,closed', ''].join('\n')
  );
  fs.writeFileSync(
    usageFile,
    ['period,active_users,events', '2026-09,100,1000', '2026-10,100,1000', ''].join('\n')
  );

  const out = run(['brief', '--account', accountFile, '--crm', crmFile, '--tickets', ticketsFile, '--usage', usageFile, ...AS_OF]);

  assert.match(out, /## Evidence completeness: 5\/5 \(100%\)/);
  assert.doesNotMatch(out, /Latest usage period/);
  assert.doesNotMatch(out, /_None triggered by the current deterministic rules\._/);
});

test('no-risk statement is suppressed when renewal rules lack a valid date', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-no-renewal-norisk-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const crmFile = path.join(tmp, 'crm.csv');
  fs.writeFileSync(
    accountFile,
    ['name: Missing Renewal Risk', 'renewal_date: September 1', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(
    crmFile,
    [
      'date,type,contact,role,summary',
      '2026-08-10,meeting,Alice Rivera,CFO,Recent meeting',
      '',
    ].join('\n')
  );

  const res = runSafe(['brief', '--account', accountFile, '--crm', crmFile, ...AS_OF]);

  assert.strictEqual(res.code, 0);
  assert.match(
    res.stderr,
    /warning: account\.yaml#L2: renewal_date "September 1" is not a valid YYYY-MM-DD date/
  );
  assert.doesNotMatch(res.stdout, /_None triggered by the current deterministic rules\._/);
  assert.match(res.stdout, /\| Renewal date \(account\.yaml\) \| MISSING \| invalid value \(`account\.yaml#L2`\) \|/);
});

test('empty account fields render cited empty-value findings', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-empty-account-fields-'));
  const accountFile = path.join(tmp, 'account.yaml');
  fs.writeFileSync(
    accountFile,
    ['name:', 'renewal_date:', 'owner:', 'arr_usd:', ''].join('\n')
  );

  const res = runSafe(['brief', '--account', accountFile, ...AS_OF]);

  assert.strictEqual(res.code, 0);
  assert.match(res.stderr, /warning: account\.yaml#L1: empty value for "name"/);
  assert.match(res.stderr, /warning: account\.yaml#L2: empty value for "renewal_date"/);
  assert.match(res.stdout, /\| Account name \(account\.yaml\) \| MISSING \| empty value \(`account\.yaml#L1`\) \|/);
  assert.match(res.stdout, /\| Renewal date \(account\.yaml\) \| MISSING \| empty value \(`account\.yaml#L2`\) \|/);
  assert.match(res.stdout, /- \[ \] Fix `owner:` in account\.yaml \(empty value — `account\.yaml#L3`\)/);
  assert.match(res.stdout, /- \[ \] Fix `arr_usd:` in account\.yaml \(empty value — `account\.yaml#L4`\)/);
  assert.doesNotMatch(res.stdout, /## Renewal countdown/);
});

test('future CRM activity does not count as recent activity or meeting', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-future-crm-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const crmFile = path.join(tmp, 'crm.csv');
  fs.writeFileSync(
    accountFile,
    ['name: Future CRM', 'renewal_date: 2026-09-01', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(
    crmFile,
    [
      'date,type,contact,role,summary',
      '2026-08-25,meeting,Alice Rivera,CFO,Future renewal meeting',
      '',
    ].join('\n')
  );

  const out = run(['brief', '--account', accountFile, '--crm', crmFile, ...AS_OF]);

  assert.match(out, /\| Activity volume \(last 30d \/ prior 30d\) \| 0 \/ 0 \| `crm\.csv#L2-L2` \|/);
  assert.match(out, /no customer meeting\/call on or before as-of date in the CRM export/);
  assert.doesNotMatch(out, /_None triggered by the current deterministic rules\._/);
});

test('future CRM activity does not hide stale as-of relationship facts', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-future-stale-crm-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const crmFile = path.join(tmp, 'crm.csv');
  fs.writeFileSync(
    accountFile,
    ['name: Future Stale CRM', 'renewal_date: 2026-12-01', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(
    crmFile,
    [
      'date,type,contact,role,summary',
      '2026-06-01,call,Alice Rivera,CFO,Past check-in',
      '2026-08-25,email,Bob Stone,CTO,Future update',
      '',
    ].join('\n')
  );

  const out = run(['brief', '--account', accountFile, '--crm', crmFile, ...AS_OF]);

  assert.match(out, /\| Last logged activity \| 2026-06-01 — call with Alice Rivera \| `crm\.csv#L2` \|/);
  assert.match(out, /Relationship going quiet: last logged activity was 82 days ago \(2026-06-01\) — `crm\.csv#L2`/);
  assert.match(out, /\| Alice Rivera \| CFO \| 2026-06-01 \(call\) \| 1 \| `crm\.csv#L2` \|/);
  assert.doesNotMatch(out, /Bob Stone/);
});

test('rendered input values stay single-line and table-safe with citations', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-markdown-safe-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const crmFile = path.join(tmp, 'crm.csv');
  const ticketsFile = path.join(tmp, 'tickets.csv');
  fs.writeFileSync(
    accountFile,
    ['name: Markdown Safety', 'renewal_date: 2026-09-01', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(
    crmFile,
    [
      'date,type,contact,role,summary',
      '2026-08-01,"call|onsite","Alice',
      '| injected | row",VP|Ops,Renewal call',
      '',
    ].join('\n')
  );
  fs.writeFileSync(
    ticketsFile,
    [
      'opened,closed,severity,subject,status',
      '2026-08-01,,high,"Broken',
      '| uncited | row",open',
      '',
    ].join('\n')
  );

  const out = run(['brief', '--account', accountFile, '--crm', crmFile, '--tickets', ticketsFile, ...AS_OF]);
  const suspiciousLines = out.split('\n').filter((line) => /injected|uncited/.test(line));

  assert.match(out, /call\\\|onsite with Alice \\\| injected \\\| row/);
  assert.match(out, /\| Alice \\\| injected \\\| row \| VP\\\|Ops \| 2026-08-01 \(call\\\|onsite\) \| 1 \| `crm\.csv#L2-L3` \|/);
  assert.match(out, /High-severity ticket open 21 days: "Broken \\\| uncited \\\| row" — `tickets\.csv#L2-L3`/);
  assert.ok(suspiciousLines.every((line) => /`(crm|tickets)\.csv#L2-L3`/.test(line)), suspiciousLines.join('\n'));
});

test('ticket load and risk flags evaluate open state as of the brief date', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-ticket-asof-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const ticketsFile = path.join(tmp, 'tickets.csv');
  fs.writeFileSync(
    accountFile,
    ['name: Ticket As Of', 'renewal_date: 2026-12-01', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(
    ticketsFile,
    [
      'opened,closed,severity,subject,status',
      '2026-08-01,2026-08-30,high,Connector down,closed',
      '',
    ].join('\n')
  );

  const out = run(['brief', '--account', accountFile, '--tickets', ticketsFile, ...AS_OF]);

  assert.match(out, /\| Ticket load \| 1 open \(1 high · 0 medium · 0 low\) \| `tickets\.csv#L2` \|/);
  assert.match(out, /High-severity ticket open 21 days: "Connector down" — `tickets\.csv#L2`/);
});

test('closed tickets without close dates are unresolved as of the brief date', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-ticket-undated-close-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const ticketsFile = path.join(tmp, 'tickets.csv');
  fs.writeFileSync(
    accountFile,
    ['name: Undated Close', 'renewal_date: 2026-12-01', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(
    ticketsFile,
    [
      'opened,closed,severity,subject,status',
      '2026-08-01,,high,No dated closure,closed',
      '',
    ].join('\n')
  );

  const res = runSafe(['brief', '--account', accountFile, '--tickets', ticketsFile, ...AS_OF]);

  assert.strictEqual(res.code, 0);
  assert.match(
    res.stderr,
    /warning: tickets\.csv#L2: missing closed date; closed status is not treated as resolved as-of/
  );
  assert.match(res.stdout, /\| Ticket load \| 1 open \(1 high · 0 medium · 0 low\) \| `tickets\.csv#L2` \|/);
  assert.match(res.stdout, /High-severity ticket open 21 days: "No dated closure" — `tickets\.csv#L2`/);
});

test('impossible ticket close dates are ignored for as-of state', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-ticket-impossible-close-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const ticketsFile = path.join(tmp, 'tickets.csv');
  fs.writeFileSync(
    accountFile,
    ['name: Impossible Close', 'renewal_date: 2026-12-01', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(
    ticketsFile,
    [
      'opened,closed,severity,subject,status',
      '2026-08-01,2026-07-01,high,Impossible closure,closed',
      '',
    ].join('\n')
  );

  const res = runSafe(['brief', '--account', accountFile, '--tickets', ticketsFile, ...AS_OF]);

  assert.strictEqual(res.code, 0);
  assert.match(
    res.stderr,
    /warning: tickets\.csv#L2: ignored closed "2026-07-01" before opened "2026-08-01"; closed status is not treated as resolved as-of/
  );
  assert.match(res.stdout, /\| Ticket load \| 1 open \(1 high · 0 medium · 0 low\) \| `tickets\.csv#L2` \|/);
  assert.match(res.stdout, /High-severity ticket open 21 days: "Impossible closure" — `tickets\.csv#L2`/);
});

test('stale high-ticket overflow is cited and stats count every qualifier', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-stale-high-overflow-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const ticketsFile = path.join(tmp, 'tickets.csv');
  const statsFile = path.join(tmp, 'stats.jsonl');
  fs.writeFileSync(
    accountFile,
    ['name: Stale Overflow', 'renewal_date: 2026-12-01', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(
    ticketsFile,
    [
      'opened,closed,severity,subject,status',
      '2026-08-01,,high,Issue one,open',
      '2026-08-02,,high,Issue two,open',
      '2026-08-03,,high,Issue three,open',
      '2026-08-04,,high,Issue four,open',
      '2026-08-05,,high,Issue five,open',
      '',
    ].join('\n')
  );

  const res = runSafe([
    'brief',
    '--account', accountFile,
    '--tickets', ticketsFile,
    ...AS_OF,
    '--stats',
    '--stats-file', statsFile,
  ]);

  assert.strictEqual(res.code, 0);
  assert.match(res.stdout, /High-severity ticket open 21 days: "Issue one" — `tickets\.csv#L2`/);
  assert.match(res.stdout, /High-severity ticket open 20 days: "Issue two" — `tickets\.csv#L3`/);
  assert.match(res.stdout, /High-severity ticket open 19 days: "Issue three" — `tickets\.csv#L4`/);
  assert.match(res.stdout, /🔴 2 additional high-severity tickets open more than 14 days — `tickets\.csv#L5,L6`/);
  assert.doesNotMatch(res.stdout, /High-severity ticket open 18 days: "Issue four"/);
  assert.doesNotMatch(res.stdout, /High-severity ticket open 17 days: "Issue five"/);

  const stats = JSON.parse(fs.readFileSync(statsFile, 'utf8').trim());
  assert.strictEqual(stats.risk_flags, 5);
});

test('unknown ticket severities are warned and counted explicitly', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-ticket-severity-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const ticketsFile = path.join(tmp, 'tickets.csv');
  fs.writeFileSync(
    accountFile,
    ['name: Ticket Severity', 'renewal_date: 2026-12-01', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(
    ticketsFile,
    [
      'opened,closed,severity,subject,status',
      '2026-08-01,,p0,System down,open',
      '2026-08-02,,urgent,Data loss,open',
      '2026-08-03,,mystery,Ambiguous problem,open',
      '',
    ].join('\n')
  );

  const res = runSafe(['brief', '--account', accountFile, '--tickets', ticketsFile, ...AS_OF]);

  assert.strictEqual(res.code, 0);
  assert.match(res.stderr, /warning: tickets\.csv#L4: severity "mystery" is unrecognized; counted as unknown/);
  assert.match(
    res.stdout,
    /\| Ticket load \| 3 open \(2 high · 0 medium · 0 low · 1 unknown\) \| `tickets\.csv#L2,L3,L4` \|/
  );
  assert.match(res.stdout, /High-severity ticket open 21 days: "System down" — `tickets\.csv#L2`/);
  assert.match(res.stdout, /High-severity ticket open 20 days: "Data loss" — `tickets\.csv#L3`/);
});

test('documented optional CRM role and usage events columns are optional', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-optional-cols-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const crmFile = path.join(tmp, 'crm.csv');
  const usageFile = path.join(tmp, 'usage.csv');
  fs.writeFileSync(
    accountFile,
    ['name: Optional Columns', 'renewal_date: 2026-12-01', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(
    crmFile,
    ['date,type,contact,summary', '2026-08-01,call,Alice Rivera,Renewal call', ''].join('\n')
  );
  fs.writeFileSync(
    usageFile,
    ['period,active_users', '2026-08,10', ''].join('\n')
  );

  const res = runSafe(['brief', '--account', accountFile, '--crm', crmFile, '--usage', usageFile, ...AS_OF]);

  assert.strictEqual(res.code, 0);
  assert.match(res.stdout, /\| Alice Rivera \| — \| 2026-08-01 \(call\) \| 1 \| `crm\.csv#L2` \|/);
  assert.match(res.stdout, /\| Latest usage period \(2026-08\) \| 10 active users \| `usage\.csv#L2` \|/);
});

test('usage periods sort numerically and unorderable periods are skipped', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-period-sort-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const usageFile = path.join(tmp, 'usage.csv');
  fs.writeFileSync(
    accountFile,
    ['name: Period Sort', 'renewal_date: 2026-12-01', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(
    usageFile,
    [
      'period,active_users,events',
      '2026-10,12,240',
      '2026-9,10,200',
      'FY26-Q4,99,990',
      '',
    ].join('\n')
  );

  const res = runSafe(['brief', '--account', accountFile, '--usage', usageFile, '--as-of', '2026-10-31']);

  assert.strictEqual(res.code, 0);
  assert.match(res.stderr, /warning: usage\.csv#L4: skipped — period "FY26-Q4" is not YYYY-M, YYYY-MM, or YYYY-MM-DD/);
  assert.match(res.stdout, /\| Latest usage period \(2026-10\) \| 12 active users · 240 events \| `usage\.csv#L2` \|/);
  assert.match(res.stdout, /\| Usage trend \(active users, 2026-9 → 2026-10\) \| \+20% \| `usage\.csv#L2,L3` \|/);
});

test('future usage periods do not affect as-of latest trend or risk', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-usage-asof-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const usageFile = path.join(tmp, 'usage.csv');
  fs.writeFileSync(
    accountFile,
    ['name: Usage As Of', 'renewal_date: 2026-12-01', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(
    usageFile,
    [
      'period,active_users,events',
      '2026-06,100,1000',
      '2026-07,100,1000',
      '2026-09,50,500',
      '',
    ].join('\n')
  );

  const out = run(['brief', '--account', accountFile, '--usage', usageFile, ...AS_OF]);

  assert.match(out, /\| Latest usage period \(2026-07\) \| 100 active users · 1,000 events \| `usage\.csv#L3` \|/);
  assert.match(out, /\| Usage trend \(active users, 2026-06 → 2026-07\) \| \+0% \| `usage\.csv#L2,L3` \|/);
  assert.doesNotMatch(out, /2026-09/);
  assert.doesNotMatch(out, /Usage declining/);
});

test('invalid usage metrics are warned and treated as absent', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-invalid-usage-metrics-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const usageFile = path.join(tmp, 'usage.csv');
  fs.writeFileSync(
    accountFile,
    ['name: Invalid Usage Metrics', 'renewal_date: 2026-12-01', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(
    usageFile,
    [
      'period,active_users,events',
      '2026-07,1.6,-5',
      '2026-08,10,200',
      '',
    ].join('\n')
  );

  const res = runSafe(['brief', '--account', accountFile, '--usage', usageFile, ...AS_OF]);

  assert.strictEqual(res.code, 0);
  assert.match(res.stderr, /warning: usage\.csv#L2: skipped — active_users "1\.6" is not a non-negative integer/);
  assert.match(res.stderr, /warning: usage\.csv#L2: ignored invalid events "-5" \(must be a non-negative integer\)/);
  assert.match(res.stdout, /\| Latest usage period \(2026-08\) \| 10 active users · 200 events \| `usage\.csv#L3` \|/);
  assert.doesNotMatch(res.stdout, /2026-07/);
  assert.doesNotMatch(res.stdout, /2 active users/);
  assert.doesNotMatch(res.stdout, /-5 events/);
  assert.doesNotMatch(res.stdout, /Usage trend \(active users/);
});

test('usage export with no valid active-user rows is incomplete', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-no-valid-usage-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const usageFile = path.join(tmp, 'usage.csv');
  fs.writeFileSync(
    accountFile,
    ['name: No Valid Usage', 'renewal_date: 2026-12-01', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(
    usageFile,
    ['period,active_users,events', '2026-08,bad,', ''].join('\n')
  );

  const res = runSafe(['brief', '--account', accountFile, '--usage', usageFile, ...AS_OF]);

  assert.strictEqual(res.code, 0);
  assert.match(res.stderr, /warning: usage\.csv#L2: skipped — active_users "bad" is not a non-negative integer/);
  assert.match(res.stdout, /## Evidence completeness: 2\/5 \(40%\)/);
  assert.match(res.stdout, /\| Usage summary \| MISSING \| no valid data rows \(`usage\.csv#L1`\) \|/);
  assert.doesNotMatch(res.stdout, /Latest usage period/);
});

test('provided CSVs with no valid rows cite header spans', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-empty-valid-csvs-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const crmFile = path.join(tmp, 'crm.csv');
  const ticketsFile = path.join(tmp, 'tickets.csv');
  const usageFile = path.join(tmp, 'usage.csv');
  fs.writeFileSync(
    accountFile,
    ['name: Empty Valid Rows', 'renewal_date: 2026-12-01', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(crmFile, ['date,type,contact,role,summary', 'bad,email,Alice Rivera,CFO,Broken', ''].join('\n'));
  fs.writeFileSync(ticketsFile, ['opened,closed,severity,subject,status', 'bad,,low,Broken,open', ''].join('\n'));
  fs.writeFileSync(usageFile, ['period,active_users,events', '2026-08,bad,100', ''].join('\n'));

  const res = runSafe([
    'brief',
    '--account', accountFile,
    '--crm', crmFile,
    '--tickets', ticketsFile,
    '--usage', usageFile,
    ...AS_OF,
  ]);

  assert.strictEqual(res.code, 0);
  assert.match(res.stdout, /\| CRM activity export \| MISSING \| no valid data rows \(`crm\.csv#L1`\) \|/);
  assert.match(res.stdout, /\| Ticket export \| MISSING \| no valid data rows \(`tickets\.csv#L1`\) \|/);
  assert.match(res.stdout, /\| Usage summary \| MISSING \| no valid data rows \(`usage\.csv#L1`\) \|/);
});

test('invalid ARR is treated as a missing recommended field', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-invalid-arr-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const crmFile = path.join(tmp, 'crm.csv');
  const ticketsFile = path.join(tmp, 'tickets.csv');
  const usageFile = path.join(tmp, 'usage.csv');
  fs.writeFileSync(
    accountFile,
    ['name: Invalid ARR', 'owner: Rae', 'arr_usd: nope', 'renewal_date: 2026-12-01', ''].join('\n')
  );
  fs.writeFileSync(crmFile, ['date,type,contact,role,summary', '2026-08-01,call,Alice Rivera,CFO,Check-in', ''].join('\n'));
  fs.writeFileSync(ticketsFile, ['opened,closed,severity,subject,status', '2026-08-01,2026-08-02,low,Question,closed', ''].join('\n'));
  fs.writeFileSync(usageFile, ['period,active_users,events', '2026-08,10,200', ''].join('\n'));

  const res = runSafe([
    'brief',
    '--account', accountFile,
    '--crm', crmFile,
    '--tickets', ticketsFile,
    '--usage', usageFile,
    ...AS_OF,
  ]);

  assert.strictEqual(res.code, 0);
  assert.match(res.stderr, /warning: account\.yaml#L3: arr_usd "nope" is not a number/);
  assert.match(res.stdout, /## Evidence completeness: 5\/5 \(100%\)/);
  assert.doesNotMatch(res.stdout, /All required evidence present and all recommended fields filled/);
  assert.match(res.stdout, /- \[ \] Fix `arr_usd:` in account\.yaml \(invalid value — `account\.yaml#L3`\)/);
});

test('large aggregate citations use contributor line ranges', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-large-aggregate-'));
  const accountFile = path.join(tmp, 'account.yaml');
  const ticketsFile = path.join(tmp, 'tickets.csv');
  const ticketRows = ['opened,closed,severity,subject,status'];
  for (let i = 0; i < 9; i++) {
    ticketRows.push(`2026-08-${String(i + 1).padStart(2, '0')},,low,Issue ${i + 1},open`);
  }
  ticketRows.push('');
  fs.writeFileSync(
    accountFile,
    ['name: Large Aggregate', 'renewal_date: 2026-12-01', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(ticketsFile, ticketRows.join('\n'));

  const out = run(['brief', '--account', accountFile, '--tickets', ticketsFile, ...AS_OF]);

  assert.match(out, /\| Ticket load \| 9 open \(0 high · 0 medium · 9 low\) \| `tickets\.csv#L2-L10` \|/);
  assert.doesNotMatch(out, /\+1 more/);
});

test('duplicate input basenames get unique source labels', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-source-labels-'));
  const crmDir = path.join(tmp, 'crm');
  const ticketDir = path.join(tmp, 'support');
  fs.mkdirSync(crmDir);
  fs.mkdirSync(ticketDir);
  const accountFile = path.join(tmp, 'account.yaml');
  const crmFile = path.join(crmDir, 'export.csv');
  const ticketsFile = path.join(ticketDir, 'export.csv');
  fs.writeFileSync(
    accountFile,
    ['name: Source Labels', 'renewal_date: 2026-12-01', 'owner: Rae', 'arr_usd: 1000', ''].join('\n')
  );
  fs.writeFileSync(crmFile, ['date,type,contact,role,summary', '2026-08-01,call,Alice Rivera,CFO,Check-in', ''].join('\n'));
  fs.writeFileSync(ticketsFile, ['opened,closed,severity,subject,status', '2026-08-01,,low,Question,open', ''].join('\n'));

  const out = run(['brief', '--account', accountFile, '--crm', crmFile, '--tickets', ticketsFile, ...AS_OF]);

  assert.match(out, /\| Last logged activity \| 2026-08-01 — call with Alice Rivera \| `crm\/export\.csv#L2` \|/);
  assert.match(out, /\| Ticket load \| 1 open \(0 high · 0 medium · 1 low\) \| `support\/export\.csv#L2` \|/);
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
  assert.match(res.stdout, /\| Renewal date \(account\.yaml\) \| MISSING \| invalid value \(`account\.yaml#L3`\) \|/);
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
  assert.match(written, /# Renewal Readiness Brief/);
  assert.match(written, /\*\*Northwind Logistics Inc\.\*\* — `account\.yaml#L2`/);
  assert.match(written, /`account\.yaml#L6`/);
});
