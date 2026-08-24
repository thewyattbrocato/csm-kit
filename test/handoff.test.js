'use strict';

// Behavior tests for brief type #2 (Handoff Completeness Brief): execute the
// real CLI on fixture files and assert rendered content, citation spans,
// completeness math, unproven-promise handling, and the AE-addressed gap
// report. No mocks, no network.

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

function handoffArgs(dir, extra = []) {
  const d = path.join(FIXTURES, 'handoff', dir);
  const args = ['brief', '--type', 'handoff', '--handoff', path.join(d, 'handoff.yaml'), ...AS_OF];
  const crm = path.join(d, 'crm.csv');
  if (fs.existsSync(crm)) args.push('--crm', crm);
  const questions = path.join(d, 'questions.csv');
  if (fs.existsSync(questions)) args.push('--questions', questions);
  return [...args, ...extra];
}

test('full handoff fixture renders complete brief with correct citations', () => {
  const out = run(handoffArgs('full'));

  assert.match(out, /# Sales-to-CS Handoff Completeness Brief/);
  assert.match(out, /\*\*Northwind Logistics Inc\.\*\* — `handoff\.yaml#L2`/);
  assert.match(out, /_Handoff sent by AE \*\*Morgan Diaz\*\* — `handoff\.yaml#L3`\._/);
  assert.match(out, /## Evidence completeness: 7\/7 \(100%\)/);

  // Promises register carries promised-vs-sold status with per-row spans.
  assert.match(out, /\| Multi-year discount \| Sold \| 12% discount applied to years 2-3 \| `handoff\.yaml#L17` \|/);
  assert.match(out, /\| EU data residency review \| Sold \| Legal sign-off before go-live \| `handoff\.yaml#L18` \|/);
  assert.match(out, /\| Dedicated CSM included \| Not sold \| Discussed on closing call; excluded from contract \| `handoff\.yaml#L19` \|/);

  // Goals, risks, and links all cite their exact YAML lines.
  assert.match(out, /\| 1 \| Onboard 40 weekly active users by 2026-09-30 \| `handoff\.yaml#L7` \|/);
  assert.match(out, /- Procurement has not countersigned the SOW — `handoff\.yaml#L22`/);
  assert.match(out, /- https:\/\/example\.com\/recordings\/closing-call — `handoff\.yaml#L26`/);

  // Stakeholder map enriched with CRM touches where names match.
  assert.match(
    out,
    /\| Jordan Lee \| VP Operations \| executive_sponsor \| 2026-07-19 \(meeting\) \| 2 \| `handoff\.yaml#L12` · `crm\.csv#L2,L3` \|/
  );
  assert.match(
    out,
    /\| Sam Ortiz \| Procurement Lead \| economic_buyer \| 2026-08-10 \(call\) \| 1 \| `handoff\.yaml#L13` · `crm\.csv#L4` \|/
  );

  // Week-one questions log renders with row spans.
  assert.match(out, /\| 2026-08-03 \| Who owns the SOW countersignature\? \| Dana Reyes \| `questions\.csv#L2` \|/);

  // No risk rules trigger: no unproven promises, sponsor + buyer mapped, every
  // stakeholder has CRM activity.
  assert.doesNotMatch(out, /## Handoff risk flags/);
  assert.doesNotMatch(out, /UNPROVEN/);

  // Clean handoff -> satisfied gap report citing everything it checked.
  assert.match(
    out,
    /## Gap report — for Morgan Diaz, AE \(`handoff\.yaml#L3`\)/
  );
  assert.match(
    out,
    /- \[x\] All required evidence present — `handoff\.yaml#L2`, `handoff\.yaml#L3`, `handoff\.yaml#L7-L9`, `handoff\.yaml#L12-L14`, `handoff\.yaml#L17-L19`, `handoff\.yaml#L22-L23`, `handoff\.yaml#L26-L27`, `crm\.csv#L2-L5`\./
  );
});

test('every factual handoff table row carries a source span', () => {
  const out = run(handoffArgs('full'));
  const headerRows = new Set([
    '| Required evidence | Status | Detail |',
    '| Promise | Status | Detail | Source |',
    '| # | Goal / success criterion | Source |',
    '| Stakeholder | Role | Handoff role | Last CRM touch | Activities | Source |',
    '| Date | Question | Asked by | Source |',
  ]);
  for (const line of out.split('\n')) {
    if (!line.startsWith('|') || line.startsWith('|---') || headerRows.has(line)) continue;
    assert.match(line, /`[a-z-]+\.(csv|yaml)#L\d+/, `table row lacks a source span: ${line}`);
  }
});

test('risky handoff flags unproven promises, thin map, and silent stakeholders', () => {
  const res = runSafe(handoffArgs('risky'));
  assert.strictEqual(res.code, 0);
  const out = res.stdout;

  assert.match(res.stderr, /warning: handoff\.yaml#L14: promise status "maybe_sold" is unrecognized; treated as unproven \(use "sold" or "not_sold"\)/);

  assert.match(out, /## Evidence completeness: 6\/7 \(86%\)/);
  assert.match(out, /\| Risks \/ dependencies \| MISSING \| no entries \|/);

  // Unproven-state beats silent claims: unrecognizable statuses render as
  // UNPROVEN, never as sold, never dropped.
  assert.match(out, /\| Premium support tier \| \*\*UNPROVEN\*\* \| Mentioned once on a call \| `handoff\.yaml#L14` \|/);
  assert.match(out, /\| Data migration assist \| \*\*UNPROVEN\*\* \| status never recorded \| `handoff\.yaml#L15` \|/);
  assert.match(
    out,
    /- 🟠 Promise status unproven: "Premium support tier" is not recorded as sold or not_sold — confirm with the AE — `handoff\.yaml#L14`/
  );
  assert.match(
    out,
    /- 🟠 Promise status unproven: "Data migration assist" is not recorded as sold or not_sold — confirm with the AE — `handoff\.yaml#L15`/
  );

  // Absence claims cite what was searched: the stakeholder map rows...
  assert.match(
    out,
    /- 🟠 Stakeholder map names no executive sponsor or economic buyer — map covered `handoff\.yaml#L9-L10`/
  );
  // ...and the CRM export range for the stakeholder with no recorded activity.
  assert.match(
    out,
    /- 🟠 No CRM-recorded activity for mapped stakeholder "Noor Haddad" \(IT Director\) as-of 2026-08-22 — `handoff\.yaml#L10`, search covered `crm\.csv#L2-L2`/
  );
  assert.match(out, /none as-of 2026-08-22 \(searched `crm\.csv#L2-L2`\)/);

  // Gap report asks the AE for exactly the missing/unproven evidence.
  assert.match(out, /## Gap report — for Sasha Kim, AE \(`handoff\.yaml#L3`\)/);
  assert.match(out, /- \[ \] add at least one `risks:` list entry to handoff\.yaml — required evidence \(Risks \/ dependencies\)/);
  assert.match(out, /- \[ \] Confirm sold status of "Premium support tier" — currently unproven \(`handoff\.yaml#L14`\)/);
  assert.match(out, /- \[ \] Confirm sold status of "Data migration assist" — currently unproven \(`handoff\.yaml#L15`\)/);
  assert.match(out, /- \[ \] Add `close_date:` in handoff\.yaml \(recommended — anchors the onboarding timeline\)/);
  assert.match(out, /- \[ \] Log week-one questions during onboarding \(recommended — leading indicator for kickoff re-discovery\)/);
});

test('sparse handoff suppresses sections and routes every gap back to the AE', () => {
  const out = run(['brief', '--type', 'handoff', '--handoff', path.join(FIXTURES, 'handoff', 'sparse', 'handoff.yaml'), ...AS_OF]);

  assert.match(out, /## Evidence completeness: 2\/7 \(29%\)/);
  // Facts that cannot resolve to a span MUST NOT render.
  assert.doesNotMatch(out, /## Promises register/);
  assert.doesNotMatch(out, /## Goals \/ success criteria/);
  assert.doesNotMatch(out, /## Stakeholder map/);
  assert.doesNotMatch(out, /## Handoff risk flags/);
  assert.ok(!out.includes('crm.csv#')); // never cite files never provided

  // The gap report is addressed to the named AE with specific asks.
  assert.match(out, /## Gap report — for Rowan Pike, AE \(`handoff\.yaml#L3`\)/);
  assert.match(out, /_Address each item below back to the AE who sent this handoff; every ask is missing or unproven evidence\._/);
  assert.match(out, /- \[ \] add at least one `success_criteria:` list entry to handoff\.yaml — required evidence \(Goals \/ success criteria\)/);
  assert.match(out, /- \[ \] add at least one `stakeholders:` list entry \("Name \| Role \| Handoff role"\) to handoff\.yaml — required evidence \(Stakeholder map\)/);
  assert.match(out, /- \[ \] add a `promises:` register \("What was promised \| sold or not_sold \| detail"\) to handoff\.yaml — required evidence \(Promises register \(promised-vs-sold\)\)/);
  assert.match(out, /- \[ \] add at least one `links:` list entry \(call recordings, proposal docs\) to handoff\.yaml — required evidence \(Links \(recordings \/ proposal\)\)/);
});

test('malformed register rows are skipped loudly and never become facts', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-handoff-malformed-'));
  const handoffFile = path.join(tmp, 'handoff.yaml');
  fs.writeFileSync(
    handoffFile,
    [
      'account: Malformed Registers Inc.',
      'ae: Casey Vaughn',
      '',
      'stakeholders:',
      '- | Missing Name | sponsor',
      '- Ada Lovelace | Analyst | champion',
      '',
      'promises:',
      '- | sold | no description here',
      '- Engine tuning | sold | included in SOW',
      '',
    ].join('\n')
  );

  const res = runSafe(['brief', '--type', 'handoff', '--handoff', handoffFile, ...AS_OF]);

  assert.strictEqual(res.code, 0);
  assert.match(res.stderr, /warning: handoff\.yaml#L5: skipped — stakeholder row has no name before the first "\|"/);
  assert.match(res.stderr, /warning: handoff\.yaml#L9: skipped — promise row has no description before the first "\|"/);
  assert.ok(!res.stdout.includes('Missing Name'));
  assert.ok(!res.stdout.includes('no description here'));
  // Valid rows still render with their spans.
  assert.match(res.stdout, /\| Ada Lovelace \| Analyst \| champion \| `handoff\.yaml#L6` \|/);
  assert.match(res.stdout, /\| Engine tuning \| Sold \| included in SOW \| `handoff\.yaml#L10` \|/);
});

test('week-one questions log skips invalid dates and empty questions', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-handoff-questions-'));
  const questionsFile = path.join(tmp, 'questions.csv');
  fs.writeFileSync(
    questionsFile,
    [
      'date,question,asked_by',
      'not-a-date,Broken date row,Dana Reyes',
      '2026-08-06,,Dana Reyes',
      '2026-08-04,Who approves the invoice?,Dana Reyes',
      '',
    ].join('\n')
  );
  const handoffFile = path.join(tmp, 'handoff.yaml');
  fs.writeFileSync(
    handoffFile,
    [
      'account: Questions Fixture Co.',
      'ae: Casey Vaughn',
      '',
      'success_criteria:',
      '- Kickoff within two weeks',
      '',
    ].join('\n')
  );

  const res = runSafe([
    'brief', '--type', 'handoff',
    '--handoff', handoffFile,
    '--questions', questionsFile,
    ...AS_OF,
  ]);

  assert.strictEqual(res.code, 0);
  assert.match(res.stderr, /warning: questions\.csv#L2: skipped — date "not-a-date" is not YYYY-MM-DD/);
  assert.match(res.stderr, /warning: questions\.csv#L3: skipped — empty question/);
  assert.match(res.stdout, /\| 2026-08-04 \| Who approves the invoice\? \| Dana Reyes \| `questions\.csv#L4` \|/);
  assert.ok(!res.stdout.includes('Broken date row'));
  assert.ok(!res.stdout.includes('Empty question row'));
});

test('handoff without a CRM export renders the plain stakeholder map', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-handoff-nocrm-'));
  const handoffFile = path.join(tmp, 'handoff.yaml');
  fs.writeFileSync(
    handoffFile,
    [
      'account: Plain Map Co.',
      'ae: Casey Vaughn',
      '',
      'stakeholders:',
      '- Jordan Lee | VP Operations | executive_sponsor',
      '',
    ].join('\n')
  );

  const out = run(['brief', '--type', 'handoff', '--handoff', handoffFile, ...AS_OF]);

  assert.match(out, /\| Jordan Lee \| VP Operations \| executive_sponsor \| `handoff\.yaml#L5` \|/);
  assert.ok(!out.includes('crm.csv#'));
  // No enrichment columns and no activity-absence claims without an export.
  assert.doesNotMatch(out, /Last CRM touch/);
  assert.doesNotMatch(out, /No CRM-recorded activity/);
});

test('handoff block-list items strip trailing comments outside quotes', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-handoff-comments-'));
  const handoffFile = path.join(tmp, 'handoff.yaml');
  fs.writeFileSync(
    handoffFile,
    [
      'account: Commented Co.',
      'ae: Avery Stone',
      'success_criteria:',
      '  - Deploy SSO # internal note',
      'stakeholders:',
      '  - Jordan Lee | VP Operations | executive_sponsor # sales-only note',
      'promises:',
      '  - Premium onboarding | sold | included # revops note',
      'risks:',
      '  - Procurement dependency # private note',
      'links:',
      '  - "https://example.com/proposal #section" # link note',
      '',
    ].join('\n')
  );

  const out = run(['brief', '--type', 'handoff', '--handoff', handoffFile, ...AS_OF]);

  assert.match(out, /\| 1 \| Deploy SSO \| `handoff\.yaml#L4` \|/);
  assert.match(out, /\| Jordan Lee \| VP Operations \| executive_sponsor \| `handoff\.yaml#L6` \|/);
  assert.match(out, /\| Premium onboarding \| Sold \| included \| `handoff\.yaml#L8` \|/);
  assert.match(out, /- Procurement dependency — `handoff\.yaml#L10`/);
  assert.match(out, /- https:\/\/example\.com\/proposal #section — `handoff\.yaml#L12`/);
  assert.doesNotMatch(out, /internal note|sales-only note|revops note|private note|link note/);
});

test('unmatched stakeholder overflow risk cites overflowed map rows and CRM range', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-handoff-overflow-'));
  const handoffFile = path.join(tmp, 'handoff.yaml');
  const crmFile = path.join(tmp, 'crm.csv');
  fs.writeFileSync(
    handoffFile,
    [
      'account: Overflow Co.',
      'ae: Avery Stone',
      'success_criteria:',
      '- Launch pilot',
      'stakeholders:',
      '- Alpha One | VP Operations | executive_sponsor',
      '- Beta Two | Procurement | economic_buyer',
      '- Gamma Three | IT Director | technical_buyer',
      '- Delta Four | Legal | legal',
      '- Epsilon Five | Finance | finance',
      'promises:',
      '- Pilot support | sold | included',
      'risks:',
      '- Legal review pending',
      'links:',
      '- https://example.com/proposal',
      '',
    ].join('\n')
  );
  fs.writeFileSync(
    crmFile,
    ['date,type,contact,role,summary', '2026-08-01,email,Known Contact,Operations,No mapped stakeholder touched', ''].join('\n')
  );

  const out = run(['brief', '--type', 'handoff', '--handoff', handoffFile, '--crm', crmFile, ...AS_OF]);

  assert.match(
    out,
    /- 🟠 No CRM-recorded activity for mapped stakeholder "Alpha One" \(VP Operations\) as-of 2026-08-22 — `handoff\.yaml#L6`, search covered `crm\.csv#L2-L2`/
  );
  assert.match(
    out,
    /- 🟠 2 additional mapped stakeholders with no CRM-recorded activity — `handoff\.yaml#L9,L10`, search covered `crm\.csv#L2-L2`/
  );
});

test('same handoff inputs and as-of produce byte-identical output', () => {
  const a = run(handoffArgs('full'));
  const b = run(handoffArgs('full'));
  assert.strictEqual(a, b);
});

test('invalid flag and type combinations fail loudly before rendering', () => {
  const cases = [
    [['brief', '--type', 'handoff', ...AS_OF], /--handoff <handoff\.yaml> is required for --type handoff/],
    [
      ['brief', '--type', 'bogus', '--account', path.join(FIXTURES, 'sparse', 'account.yaml'), ...AS_OF],
      /--type must be one of: renewal, handoff, qbr/,
    ],
    [
      ['brief', '--type', 'handoff', '--handoff', path.join(FIXTURES, 'handoff', 'sparse', 'handoff.yaml'), '--tickets', 'x.csv', ...AS_OF],
      /--tickets is not a valid input for --type handoff/,
    ],
    [
      ['brief', '--type', 'handoff', '--handoff', path.join(FIXTURES, 'handoff', 'sparse', 'handoff.yaml'), '--usage', 'x.csv', ...AS_OF],
      /--usage is not a valid input for --type handoff/,
    ],
    [
      ['brief', '--type', 'handoff', '--handoff', path.join(FIXTURES, 'handoff', 'sparse', 'handoff.yaml'), '--account', 'y.yaml', ...AS_OF],
      /--account is not a valid input for --type handoff/,
    ],
    [
      ['brief', '--account', path.join(FIXTURES, 'sparse', 'account.yaml'), '--questions', 'q.csv', ...AS_OF],
      /--questions is not a valid input for --type renewal/,
    ],
    [
      ['brief', '--type', 'qbr', '--account', path.join(FIXTURES, 'sparse', 'account.yaml'), '--handoff', 'h.yaml', ...AS_OF],
      /--handoff is not a valid input for --type qbr/,
    ],
  ];
  for (const [args, pattern] of cases) {
    const res = runSafe(args);
    assert.strictEqual(res.code, 2, `expected exit 2 for: ${args.join(' ')}`);
    assert.match(res.stderr, pattern);
  }
});

test('--stats records brief_type and handoff-specific inputs', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csmkit-handoff-stats-'));
  const statsFile = path.join(tmp, 'impact.jsonl');
  const outFile = path.join(tmp, 'handoff.md');

  run([...handoffArgs('risky'), '--out', outFile, '--stats', '--stats-file', statsFile]);

  const entry = JSON.parse(fs.readFileSync(statsFile, 'utf8').trim());
  assert.strictEqual(entry.brief_type, 'handoff');
  assert.deepStrictEqual(entry.inputs, {
    success_criteria: 1,
    stakeholders: 2,
    promises: 3,
    risks: 0,
    links: 1,
    questions: 0,
  });
  assert.strictEqual(entry.completeness_pct, 86);
  assert.strictEqual(entry.unproven_promises, 2);
  assert.strictEqual(entry.risk_flags, 4); // 2 unproven + no-sponsor + silent stakeholder
});
