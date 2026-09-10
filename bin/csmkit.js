#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { parseArgs } = require('util');

const pkg = require('../package.json');
const {
  LoadError,
  baseName,
  loadAccount,
  loadCrm,
  loadTickets,
  loadUsage,
  loadHandoff,
  loadQuestions,
  parseIsoDate,
} = require('../lib/load');
const { buildBrief, BRIEF_TYPES } = require('../lib/brief');
const {
  DEFAULT_STATS_FILE,
  DEFAULT_BASELINE_MINUTES,
  appendStats,
  readStats,
  summarizeStats,
} = require('../lib/stats');

const USAGE = `csm-kit v${pkg.version} — evidence-cited Customer Success briefs

Usage:
  csmkit brief --type renewal --account <account.yaml> [--crm <csv>] [--tickets <csv>] [--usage <csv>]
               [--out <file>] [--as-of YYYY-MM-DD] [--stats] [--stats-file <file>]
               [--baseline-minutes <minutes>]
  csmkit brief --type handoff --handoff <handoff.yaml> [--crm <csv>] [--questions <csv>] [...]
  csmkit brief --type qbr --account <account.yaml> [--crm <csv>] [--tickets <csv>] [--usage <csv>] [...]
  csmkit stats [--stats-file <file>]
  csmkit --help | --version

Commands:
  brief   Render one of three evidence-cited briefs (default --type renewal):
            renewal  Renewal Readiness Brief from account.yaml + up to three CSV exports
            handoff  Sales-to-CS Handoff Completeness Brief from handoff.yaml (+ optional
                     CRM activity CSV and week-one questions log); the gap report is
                     addressed back to the sending AE
            qbr      QBR Packet rendered as slide-oriented markdown from account.yaml +
                     up to three CSV exports (deterministic; no LLM layer)
          Every fact cites its source span (file#L<row>); untraceable facts are omitted
          and reported in the missing-evidence checklist / gap report instead.
  stats   Summarize the minutes-saved impact log written by runs using --stats.

Options (brief):
  --type              Brief type: ${BRIEF_TYPES.join(', ')} (default: renewal)
  --account           Path to account.yaml (required for renewal and qbr)
  --handoff           Path to handoff.yaml (required for handoff)
  --questions         Week-one questions log CSV (optional; handoff only)
  --crm               CRM activity export CSV (all types)
  --tickets           Ticket export CSV (renewal and qbr)
  --usage             Usage summary CSV (renewal and qbr)
  --out               Write the brief to a file instead of stdout
  --as-of             Reference date for countdowns/windows, YYYY-MM-DD (default: today UTC)
  --stats             Append a minutes-saved record to the stats log
  --stats-file        Stats log path (default: ${DEFAULT_STATS_FILE})
  --baseline-minutes  Manual-prep baseline for the minutes-saved estimate
                      (default: ${DEFAULT_BASELINE_MINUTES}; env CSMKIT_BASELINE_MINUTES)

Options (all commands):
  -h, --help          Show this help and exit
  -v, --version       Print the package version and exit

Environment:
  CSMKIT_BASELINE_MINUTES   Same as --baseline-minutes (flag wins)
`;

function fail(msg) {
  process.stderr.write(`error: ${msg}\n\n${USAGE}`);
  process.exit(2);
}

function numArg(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) fail(`--${label} must be a positive number, got "${value}"`);
  return n;
}

function resolveBaseline(flagValue) {
  const raw =
    flagValue !== undefined ? flagValue : process.env.CSMKIT_BASELINE_MINUTES;
  if (raw === undefined || raw === '') return DEFAULT_BASELINE_MINUTES;
  return numArg(raw, 'baseline-minutes');
}

function sourceLabels(pathsByKey) {
  const labels = {};
  const entries = Object.entries(pathsByKey).filter(([, filePath]) => filePath);
  const groups = new Map();
  for (const [key, filePath] of entries) {
    const base = baseName(filePath);
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push({ key, filePath: path.resolve(filePath) });
  }
  for (const [base, group] of groups) {
    if (group.length === 1) {
      labels[group[0].key] = base;
      continue;
    }
    const partsByKey = group.map((entry) => ({
      key: entry.key,
      parts: entry.filePath.split(path.sep).filter(Boolean),
    }));
    let depth = 1;
    while (depth < Math.max(...partsByKey.map((entry) => entry.parts.length))) {
      const seen = new Set(partsByKey.map((entry) => entry.parts.slice(-depth).join('/')));
      if (seen.size === partsByKey.length) break;
      depth++;
    }
    for (const entry of partsByKey) {
      labels[entry.key] = entry.parts.slice(-depth).join('/');
    }
  }
  return labels;
}

function rejectFlag(value, flagName, typeName) {
  if (value !== undefined) fail(`--${flagName} is not a valid input for --type ${typeName}`);
}

function fileIdentity(filePath) {
  try {
    const stat = fs.statSync(filePath, { bigint: true });
    return { dev: stat.dev, ino: stat.ino };
  } catch (err) {
    if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) return null;
    fail(`cannot inspect path "${filePath}": ${err.message}`);
  }
}

function sameExistingFile(a, b) {
  const aIdentity = fileIdentity(a);
  if (!aIdentity) return false;
  const bIdentity = fileIdentity(b);
  return Boolean(bIdentity && aIdentity.dev === bIdentity.dev && aIdentity.ino === bIdentity.ino);
}

function rejectOutputInputCollision(outputPath, inputPaths) {
  if (!outputPath) return;
  const resolvedOutput = path.resolve(outputPath);
  for (const inputPath of inputPaths) {
    if (
      inputPath &&
      (path.resolve(inputPath) === resolvedOutput || sameExistingFile(outputPath, inputPath))
    ) {
      fail(`--out must not overwrite input file "${outputPath}"`);
    }
  }
}

function wantsHelp(argv) {
  return argv.includes('--help') || argv.includes('-h');
}

function wantsVersion(argv) {
  return argv.includes('--version') || argv.includes('-v');
}

function cmdBrief(argv) {
  if (wantsHelp(argv)) {
    process.stdout.write(USAGE);
    return;
  }
  if (wantsVersion(argv)) {
    process.stdout.write(`${pkg.version}\n`);
    return;
  }
  let args;
  try {
    args = parseArgs({
      args: argv,
      options: {
        type: { type: 'string' },
        account: { type: 'string' },
        handoff: { type: 'string' },
        questions: { type: 'string' },
        crm: { type: 'string' },
        tickets: { type: 'string' },
        usage: { type: 'string' },
        out: { type: 'string' },
        'as-of': { type: 'string' },
        stats: { type: 'boolean', default: false },
        'stats-file': { type: 'string', default: DEFAULT_STATS_FILE },
        'baseline-minutes': { type: 'string' },
      },
      strict: true,
    });
  } catch (err) {
    fail(err.message);
  }

  const type = args.values.type ?? 'renewal';
  if (!BRIEF_TYPES.includes(type)) {
    fail(`--type must be one of: ${BRIEF_TYPES.join(', ')} (got "${type}")`);
  }
  const isAccountType = type === 'renewal' || type === 'qbr';

  if (isAccountType && !args.values.account) fail(`--account <account.yaml> is required for --type ${type}`);
  if (type === 'handoff') {
    if (!args.values.handoff) fail('--handoff <handoff.yaml> is required for --type handoff');
    if (args.values.account) fail('--account is not a valid input for --type handoff (identity comes from `account:` in handoff.yaml)');
    rejectFlag(args.values.tickets, 'tickets', type);
    rejectFlag(args.values.usage, 'usage', type);
  } else {
    rejectFlag(args.values.handoff, 'handoff', type);
    rejectFlag(args.values.questions, 'questions', type);
  }
  rejectOutputInputCollision(args.values.out, [
    args.values.account,
    args.values.handoff,
    args.values.crm,
    args.values.tickets,
    args.values.usage,
    args.values.questions,
  ]);

  const startedAtNs = process.hrtime.bigint();

  let asOfDt;
  if (args.values['as-of']) {
    asOfDt = parseIsoDate(args.values['as-of']);
    if (!asOfDt) fail(`--as-of must be a valid YYYY-MM-DD date, got "${args.values['as-of']}"`);
  } else {
    asOfDt = parseIsoDate(new Date().toISOString().slice(0, 10));
  }
  const baselineMinutes = args.values.stats ? resolveBaseline(args.values['baseline-minutes']) : null;

  try {
    const labels = sourceLabels({
      account: args.values.account,
      handoff: args.values.handoff,
      crm: args.values.crm,
      tickets: args.values.tickets,
      usage: args.values.usage,
      questions: args.values.questions,
    });

    const warnings = [];
    let briefInputs;
    if (type === 'handoff') {
      const handoff = loadHandoff(args.values.handoff, labels.handoff);
      const crm = loadCrm(args.values.crm, labels.crm);
      const questions = loadQuestions(args.values.questions, labels.questions);
      warnings.push(
        ...handoff.warnings,
        ...(crm.warnings ?? []),
        ...(questions.warnings ?? [])
      );
      briefInputs = { handoff, crm, questions };
    } else {
      const account = loadAccount(args.values.account, labels.account);
      const crm = loadCrm(args.values.crm, labels.crm);
      const tickets = loadTickets(args.values.tickets, labels.tickets);
      const usage = loadUsage(args.values.usage, labels.usage);
      warnings.push(
        ...account.warnings,
        ...(crm.warnings ?? []),
        ...(tickets.warnings ?? []),
        ...(usage.warnings ?? [])
      );
      briefInputs = { account, crm, tickets, usage };
    }
    for (const warning of warnings) process.stderr.write(`warning: ${warning}\n`);

    const { markdown, completeness, statsContext } = buildBrief({ type, ...briefInputs, asOfDt });

    if (args.values.out) {
      try {
        fs.mkdirSync(path.dirname(path.resolve(args.values.out)), { recursive: true });
        fs.writeFileSync(args.values.out, markdown.endsWith('\n') ? markdown : markdown + '\n', 'utf8');
      } catch (err) {
        fail(`cannot write output file "${args.values.out}": ${err.message}`);
      }
      process.stdout.write(
        `wrote ${args.values.out} (${completeness.present}/${completeness.total} evidence, ${completeness.pct}%)\n`
      );
    } else {
      process.stdout.write(markdown);
    }

    if (args.values.stats) {
      const automatedMinutes =
        Math.round((Number(process.hrtime.bigint() - startedAtNs) / 1e9 / 60) * 100) / 100;
      const minutesSaved = Math.round((baselineMinutes - automatedMinutes) * 100) / 100;
      try {
        appendStats(args.values['stats-file'], {
          ts: new Date().toISOString(),
          tool: pkg.name,
          version: pkg.version,
          run: 'brief',
          brief_type: type,
          ...statsContext,
          baseline_manual_minutes: baselineMinutes,
          automated_minutes: automatedMinutes,
          minutes_saved: minutesSaved,
        });
      } catch (err) {
        fail(`cannot write stats file "${args.values['stats-file']}": ${err.message}`);
      }
      process.stderr.write(
        `stats: appended minutes-saved record to ${args.values['stats-file']} (est. ${minutesSaved} min saved this run)\n`
      );
    }
  } catch (err) {
    if (err instanceof LoadError) fail(err.message);
    throw err;
  }
}

function cmdStats(argv) {
  if (wantsHelp(argv)) {
    process.stdout.write(USAGE);
    return;
  }
  if (wantsVersion(argv)) {
    process.stdout.write(`${pkg.version}\n`);
    return;
  }
  let args;
  try {
    args = parseArgs({
      args: argv,
      options: { 'stats-file': { type: 'string', default: DEFAULT_STATS_FILE } },
      strict: true,
    });
  } catch (err) {
    fail(err.message);
  }
  const file = args.values['stats-file'];
  let entries;
  try {
    entries = readStats(file);
  } catch (err) {
    fail(`cannot read stats file "${file}": ${err.message}`);
  }
  if (entries === null) {
    process.stdout.write(`No stats recorded yet (nothing at ${file}).\nRun \`csmkit brief ... --stats\` to start the impact log.\n`);
    return;
  }
  const s = summarizeStats(entries);
  if (!s) {
    process.stdout.write(`${file} exists but contains no readable records.\n`);
    return;
  }
  const lines = [
    `csm-kit impact log (${file})`,
    `  runs: ${s.runs}`,
    `  accounts covered: ${s.accounts}`,
    `  total minutes saved (est.): ${s.totalMinutesSaved.toFixed(2)}`,
    `  avg minutes saved per run: ${s.avgMinutesSavedPerRun.toFixed(2)}`,
    `  first run: ${s.firstRunTs ?? '—'}`,
    `  last run: ${s.lastRunTs ?? '—'}`,
  ];
  if (s.byType && s.byType.size > 0) {
    lines.push('  minutes saved by brief type:');
    for (const [type, agg] of s.byType) {
      lines.push(`    ${type}: ${agg.runs} run${agg.runs === 1 ? '' : 's'}, ${agg.totalMinutesSaved.toFixed(2)} min saved (est.)`);
    }
  }
  process.stdout.write(lines.join('\n') + '\n');
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  switch (command) {
    case 'brief':
      cmdBrief(rest);
      break;
    case 'stats':
      cmdStats(rest);
      break;
    case '--help':
    case '-h':
    case 'help':
    case undefined:
      process.stdout.write(USAGE);
      break;
    case '--version':
    case '-v':
      process.stdout.write(`${pkg.version}\n`);
      break;
    default:
      fail(`unknown command "${command}"`);
  }
}

main();
