#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { parseArgs } = require('util');

const pkg = require('../package.json');
const { LoadError, baseName, loadAccount, loadCrm, loadTickets, loadUsage, parseIsoDate } = require('../lib/load');
const { buildBrief } = require('../lib/brief');
const {
  DEFAULT_STATS_FILE,
  DEFAULT_BASELINE_MINUTES,
  appendStats,
  readStats,
  summarizeStats,
} = require('../lib/stats');

const USAGE = `csm-kit v${pkg.version} — evidence-cited Customer Success briefs

Usage:
  csmkit brief --account <account.yaml> [--crm <csv>] [--tickets <csv>] [--usage <csv>]
               [--out <file>] [--as-of YYYY-MM-DD] [--stats] [--stats-file <file>]
               [--baseline-minutes <minutes>]
  csmkit stats [--stats-file <file>]

Commands:
  brief   Render a Renewal Readiness Brief from account.yaml + up to three CSV exports.
          Every fact cites its source span (file#L<row>); untraceable facts are omitted
          and reported in the missing-evidence checklist instead.
  stats   Summarize the minutes-saved impact log written by runs using --stats.

Options (brief):
  --account           Path to the account YAML file (required)
  --crm               CRM activity export CSV (optional but scored as required evidence)
  --tickets           Ticket export CSV (optional but scored as required evidence)
  --usage             Usage summary CSV (optional but scored as required evidence)
  --out               Write the brief to a file instead of stdout
  --as-of             Reference date for countdowns/windows, YYYY-MM-DD (default: today UTC)
  --stats             Append a minutes-saved record to the stats log
  --stats-file        Stats log path (default: ${DEFAULT_STATS_FILE})
  --baseline-minutes  Manual-prep baseline for the minutes-saved estimate
                      (default: ${DEFAULT_BASELINE_MINUTES}; env CSMKIT_BASELINE_MINUTES)

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

function cmdBrief(argv) {
  let args;
  try {
    args = parseArgs({
      args: argv,
      options: {
        account: { type: 'string' },
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

  if (!args.values.account) fail('--account <account.yaml> is required');

  const startedAtNs = process.hrtime.bigint();

  let asOfDt;
  if (args.values['as-of']) {
    asOfDt = parseIsoDate(args.values['as-of']);
    if (!asOfDt) fail(`--as-of must be a valid YYYY-MM-DD date, got "${args.values['as-of']}"`);
  } else {
    asOfDt = parseIsoDate(new Date().toISOString().slice(0, 10));
  }
  const baselineMinutes = args.values.stats ? resolveBaseline(args.values['baseline-minutes']) : null;

  let account;
  try {
    const labels = sourceLabels({
      account: args.values.account,
      crm: args.values.crm,
      tickets: args.values.tickets,
      usage: args.values.usage,
    });
    account = loadAccount(args.values.account, labels.account);
    const crm = loadCrm(args.values.crm, labels.crm);
    const tickets = loadTickets(args.values.tickets, labels.tickets);
    const usage = loadUsage(args.values.usage, labels.usage);

    const warnings = [
      ...account.warnings.map((w) => ({ src: account.file, msg: w })),
      ...(crm.warnings ?? []).map((w) => ({ src: crm.source, msg: w })),
      ...(tickets.warnings ?? []).map((w) => ({ src: tickets.source, msg: w })),
      ...(usage.warnings ?? []).map((w) => ({ src: usage.source, msg: w })),
    ];
    for (const w of warnings) process.stderr.write(`warning: ${w.msg}\n`);

    const { markdown, completeness, statsContext } = buildBrief({
      account,
      crm,
      tickets,
      usage,
      asOfDt,
    });

    if (args.values.out) {
      fs.mkdirSync(path.dirname(path.resolve(args.values.out)), { recursive: true });
      fs.writeFileSync(args.values.out, markdown.endsWith('\n') ? markdown : markdown + '\n', 'utf8');
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
      appendStats(args.values['stats-file'], {
        ts: new Date().toISOString(),
        tool: pkg.name,
        version: pkg.version,
        run: 'brief',
        account: statsContext.account,
        inputs: statsContext.inputs,
        completeness_pct: statsContext.completeness_pct,
        risk_flags: statsContext.risk_flags,
        stakeholders: statsContext.stakeholders,
        baseline_manual_minutes: baselineMinutes,
        automated_minutes: automatedMinutes,
        minutes_saved: minutesSaved,
      });
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
  const entries = readStats(file);
  if (entries === null) {
    process.stdout.write(`No stats recorded yet (nothing at ${file}).\nRun \`csmkit brief ... --stats\` to start the impact log.\n`);
    return;
  }
  const s = summarizeStats(entries);
  if (!s) {
    process.stdout.write(`${file} exists but contains no readable records.\n`);
    return;
  }
  process.stdout.write(
    [
      `csm-kit impact log (${file})`,
      `  runs: ${s.runs}`,
      `  accounts covered: ${s.accounts}`,
      `  total minutes saved (est.): ${s.totalMinutesSaved.toFixed(2)}`,
      `  avg minutes saved per run: ${s.avgMinutesSavedPerRun.toFixed(2)}`,
      `  first run: ${s.firstRunTs ?? '—'}`,
      `  last run: ${s.lastRunTs ?? '—'}`,
      '',
    ].join('\n')
  );
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
    default:
      fail(`unknown command "${command}"`);
  }
}

main();
