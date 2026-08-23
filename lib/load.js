'use strict';

const fs = require('fs');
const path = require('path');
const { parseCsvTable } = require('./csv');
const { parseFlatYaml } = require('./yaml-lite');

// Loads and normalizes the v0.1 input set: account.yaml + up to three CSV
// exports. Every parsed row keeps its source line so downstream facts can
// cite file+row spans. Unusable rows are skipped with a warning (never
// silently coerced into facts).

class LoadError extends Error {}

function baseName(p) {
  return path.basename(String(p));
}

function readTextOrNull(filePath, label) {
  if (!filePath) return null;
  let text;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new LoadError(`cannot read ${label} file "${filePath}": ${err.message}`);
  }
  return text;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value.trim())) return null;
  const [y, m, d] = value.trim().split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

function isoOf(dt) {
  return dt.toISOString().slice(0, 10);
}

function daysBetween(fromDt, toDt) {
  return Math.round((toDt.getTime() - fromDt.getTime()) / 86400000);
}

function parseUsagePeriodKey(value) {
  const match = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(String(value).trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = match[3] === undefined ? 0 : Number(match[3]);
  if (month < 1 || month > 12) return null;
  if (day === 0) return year * 10000 + month * 100;
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return null;
  return year * 10000 + month * 100 + day;
}

// Map a CSV header row onto canonical columns using alias lists.
// Returns { map: {canonical -> index}, missing: [canonical...] }.
function resolveColumns(header, headerLine, fileName, spec, optional = []) {
  const norm = header.map((h) => h.trim().toLowerCase());
  const map = {};
  for (const [canonical, aliases] of Object.entries(spec)) {
    const idx = norm.indexOf(canonical);
    if (idx !== -1) {
      map[canonical] = idx;
      continue;
    }
    for (const alias of aliases) {
      const a = norm.indexOf(alias);
      if (a !== -1) {
        map[canonical] = a;
        break;
      }
    }
  }
  const missing = [];
  for (const canonical of Object.keys(spec)) {
    if (!(canonical in map) && !optional.includes(canonical)) missing.push(canonical);
  }
  if (missing.length > 0) {
    throw new LoadError(
      `${fileName}#L${headerLine}: missing required column(s) ${missing.join(', ')} — ` +
        `found header: ${header.join(', ') || '(empty)'}`
    );
  }
  return map;
}

function cell(row, map, key) {
  const idx = map[key];
  if (idx === undefined || idx >= row.values.length) return '';
  return String(row.values[idx] ?? '').trim();
}

const SEVERITY_MAP = [
  [/^(p0|sev0|sev-0|0|p1|sev1|sev-1|1|critical|blocker|urgent|highest|high)$/i, 'high'],
  [/^(p2|sev2|sev-2|2|major|medium|moderate)$/i, 'medium'],
  [/^(p3|sev3|sev-3|3|minor|low)$/i, 'low'],
];

function normalizeSeverity(raw) {
  const v = String(raw).trim();
  for (const [re, level] of SEVERITY_MAP) if (re.test(v)) return level;
  return null;
}

const OPEN_STATUS = /^(open|new|in_progress|in-progress|inprogress|pending|waiting|assigned|active|triaged)$/i;
const CLOSED_STATUS = /^(closed|close|resolved|resolve|solved|done|complete|completed|cancelled|canceled|fixed|won't fix|wontfix)$/i;

function isOpenStatus(raw) {
  const v = String(raw).trim();
  if (CLOSED_STATUS.test(v)) return false;
  if (OPEN_STATUS.test(v)) return true;
  // Unknown status strings default to open (safer to over-report open work).
  return v !== '';
}

function csvWarnings(name, table) {
  return (table.errors ?? []).map((e) => `${name}#L${e.line}${e.endLine && e.endLine !== e.line ? '-L' + e.endLine : ''}: ${e.message}`);
}

function loadAccount(filePath, sourceLabel = baseName(filePath)) {
  const name = sourceLabel;
  const text = readTextOrNull(filePath, 'account');
  if (text === null) throw new LoadError('an --account <account.yaml> file is required');
  const { entries, errors } = parseFlatYaml(text);
  const get = (k) => (entries[k] ? { raw: entries[k].value, line: entries[k].line } : null);
  const span = (k) => (entries[k] ? `${name}#L${entries[k].line}` : null);

  let renewalDate = null;
  const renewalEntry = get('renewal_date');
  if (renewalEntry) {
    const dt = parseIsoDate(renewalEntry.raw);
    if (!dt) {
      errors.push(
        `${name}#L${renewalEntry.line}: renewal_date "${renewalEntry.raw}" is not a valid YYYY-MM-DD date`
      );
    } else {
      renewalDate = { iso: isoOf(dt), dt };
    }
  }

  const arrEntry = get('arr_usd');
  let arrUsd = arrEntry;
  if (arrEntry && !/^\d+(\.\d+)?$/.test(arrEntry.raw.replace(/[, _]/g, ''))) {
    errors.push(`${name}#L${arrEntry.line}: arr_usd "${arrEntry.raw}" is not a number`);
    arrUsd = null;
  }

  return {
    file: name,
    fields: {
      name: get('name'),
      owner: get('owner'),
      tier: get('tier'),
      arrUsd,
    },
    renewalDate,
    spans: {
      name: span('name'),
      owner: span('owner'),
      tier: span('tier'),
      arrUsd: span('arr_usd'),
      renewalDate: span('renewal_date'),
    },
    warnings: errors,
  };
}

function notProvided() {
  return { present: false, empty: true, source: null, rows: [], rangeSpan: null, headerSpan: null, warnings: [] };
}

// Physical data extent of the valid rows, ascending (rows may be date-sorted
// later, so first/last array entries are not necessarily min/max lines).
function physicalRange(name, rows) {
  const lines = rows.map((r) => r.line);
  const endLines = rows.map((r) => r.endLine ?? r.line);
  const min = Math.min(...lines);
  const max = Math.max(...endLines);
  return `${name}#L${min}-L${max}`;
}

function rowSpan(name, row) {
  const endLine = row.endLine ?? row.line;
  return `${name}#L${row.line}${endLine === row.line ? '' : '-L' + endLine}`;
}

function loadCrm(filePath, sourceLabel = baseName(filePath)) {
  if (!filePath) return notProvided();
  const name = sourceLabel;
  const text = readTextOrNull(filePath, 'CRM activity');
  const table = parseCsvTable(text);
  const headerEndLine = table.headerEndLine || table.headerLine || 1;
  const headerSpan = `${name}#L${table.headerLine || 1}${headerEndLine === (table.headerLine || 1) ? '' : '-L' + headerEndLine}`;
  if (table.header.length === 0) {
    return { present: true, empty: true, source: name, rows: [], rangeSpan: null, headerSpan, warnings: csvWarnings(name, table) };
  }
  const map = resolveColumns(
    table.header,
    table.headerLine,
    name,
    {
      date: ['activity_date', 'day', 'timestamp'],
      type: ['activity_type', 'channel', 'kind'],
      contact: ['contact_name', 'who', 'person'],
      role: ['title', 'contact_role', 'contact_title'],
      summary: ['notes', 'description', 'subject'],
    },
    ['role']
  );
  const rows = [];
  const warnings = csvWarnings(name, table);
  for (const row of table.rows) {
    const dateRaw = cell(row, map, 'date');
    const dt = parseIsoDate(dateRaw);
    if (!dt) {
      warnings.push(`${rowSpan(name, row)}: skipped — date "${dateRaw}" is not YYYY-MM-DD`);
      continue;
    }
    rows.push({
      line: row.line,
      endLine: row.endLine,
      date: isoOf(dt),
      dt,
      type: cell(row, map, 'type'),
      contact: cell(row, map, 'contact'),
      role: cell(row, map, 'role'),
      summary: cell(row, map, 'summary'),
    });
  }
  rows.sort((a, b) => a.dt.getTime() - b.dt.getTime());
  return {
    present: true,
    empty: rows.length === 0,
    source: name,
    rows,
    rangeSpan: rows.length ? physicalRange(name, rows) : null,
    headerSpan,
    warnings,
  };
}

function loadTickets(filePath, sourceLabel = baseName(filePath)) {
  if (!filePath) return notProvided();
  const name = sourceLabel;
  const text = readTextOrNull(filePath, 'ticket');
  const table = parseCsvTable(text);
  const headerEndLine = table.headerEndLine || table.headerLine || 1;
  const headerSpan = `${name}#L${table.headerLine || 1}${headerEndLine === (table.headerLine || 1) ? '' : '-L' + headerEndLine}`;
  if (table.header.length === 0) {
    return { present: true, empty: true, source: name, rows: [], rangeSpan: null, headerSpan, warnings: csvWarnings(name, table) };
  }
  const map = resolveColumns(
    table.header,
    table.headerLine,
    name,
    {
      opened: ['created', 'created_at', 'open_date', 'date_opened', 'submitted'],
      closed: ['resolved', 'resolved_at', 'close_date', 'date_closed'],
      severity: ['priority'],
      subject: ['title', 'summary'],
      status: ['state'],
    },
    ['closed']
  );
  const rows = [];
  const warnings = csvWarnings(name, table);
  for (const row of table.rows) {
    const openedRaw = cell(row, map, 'opened');
    const openedDt = parseIsoDate(openedRaw);
    if (!openedDt) {
      warnings.push(`${rowSpan(name, row)}: skipped — opened "${openedRaw}" is not YYYY-MM-DD`);
      continue;
    }
    let closedIso = null;
    let closedDt = null;
    let closedWarning = null;
    const closedRaw = cell(row, map, 'closed');
    if (closedRaw !== '') {
      closedDt = parseIsoDate(closedRaw);
      if (!closedDt) {
        warnings.push(`${rowSpan(name, row)}: ignored closed "${closedRaw}" (not YYYY-MM-DD)`);
      } else {
        if (closedDt.getTime() < openedDt.getTime()) {
          closedWarning = `${rowSpan(name, row)}: ignored closed "${closedRaw}" before opened "${openedRaw}"`;
          closedDt = null;
        } else {
          closedIso = isoOf(closedDt);
        }
      }
    }
    const statusRaw = cell(row, map, 'status');
    const statusClosed = CLOSED_STATUS.test(statusRaw);
    if (closedWarning) {
      warnings.push(
        statusClosed ? `${closedWarning}; closed status is not treated as resolved as-of` : closedWarning
      );
    } else if (statusClosed && closedIso === null) {
      const reason = closedRaw === '' ? 'missing closed date' : 'no valid closed date';
      warnings.push(`${rowSpan(name, row)}: ${reason}; closed status is not treated as resolved as-of`);
    }
    const open = closedIso === null && (statusRaw === '' || statusClosed || isOpenStatus(statusRaw));
    const severityRaw = cell(row, map, 'severity');
    const severity = normalizeSeverity(severityRaw);
    if (severityRaw !== '' && severity === null) {
      warnings.push(`${rowSpan(name, row)}: severity "${severityRaw}" is unrecognized; counted as unknown`);
    }
    rows.push({
      line: row.line,
      endLine: row.endLine,
      opened: isoOf(openedDt),
      openedDt,
      closed: closedIso,
      closedDt,
      severityRaw,
      severity,
      subject: cell(row, map, 'subject'),
      status: statusRaw,
      open,
    });
  }
  rows.sort((a, b) => a.openedDt.getTime() - b.openedDt.getTime());
  return {
    present: true,
    empty: rows.length === 0,
    source: name,
    rows,
    rangeSpan: rows.length ? physicalRange(name, rows) : null,
    headerSpan,
    warnings,
  };
}

function loadUsage(filePath, sourceLabel = baseName(filePath)) {
  if (!filePath) return notProvided();
  const name = sourceLabel;
  const text = readTextOrNull(filePath, 'usage');
  const table = parseCsvTable(text);
  const headerEndLine = table.headerEndLine || table.headerLine || 1;
  const headerSpan = `${name}#L${table.headerLine || 1}${headerEndLine === (table.headerLine || 1) ? '' : '-L' + headerEndLine}`;
  if (table.header.length === 0) {
    return { present: true, empty: true, source: name, rows: [], rangeSpan: null, headerSpan, warnings: csvWarnings(name, table) };
  }
  const map = resolveColumns(
    table.header,
    table.headerLine,
    name,
    {
      period: ['week', 'month', 'date', 'week_of'],
      active_users: ['users', 'actives', 'active_user_count', 'daily_active_users'],
      events: ['event_count', 'actions', 'total_events'],
    },
    ['events']
  );
  const rows = [];
  const warnings = csvWarnings(name, table);
  for (const row of table.rows) {
    const period = cell(row, map, 'period');
    if (period === '') {
      warnings.push(`${rowSpan(name, row)}: skipped — empty period`);
      continue;
    }
    const periodKey = parseUsagePeriodKey(period);
    if (periodKey === null) {
      warnings.push(`${rowSpan(name, row)}: skipped — period "${period}" is not YYYY-M, YYYY-MM, or YYYY-MM-DD`);
      continue;
    }
    const num = (key, required = false) => {
      const v = cell(row, map, key).replace(/,/g, '');
      if (v === '') {
        if (required) warnings.push(`${rowSpan(name, row)}: skipped — ${key} is required`);
        return null;
      }
      const n = Number(v);
      if (!Number.isFinite(n)) {
        warnings.push(
          required
            ? `${rowSpan(name, row)}: skipped — ${key} "${cell(row, map, key)}" is not a non-negative integer`
            : `${rowSpan(name, row)}: ignored non-numeric ${key} "${cell(row, map, key)}"`
        );
        return null;
      }
      if (!Number.isInteger(n) || n < 0) {
        warnings.push(
          required
            ? `${rowSpan(name, row)}: skipped — ${key} "${cell(row, map, key)}" is not a non-negative integer`
            : `${rowSpan(name, row)}: ignored invalid ${key} "${cell(row, map, key)}" (must be a non-negative integer)`
        );
        return null;
      }
      return n;
    };
    const activeUsers = num('active_users', true);
    const events = num('events');
    if (activeUsers === null) continue;
    rows.push({ line: row.line, endLine: row.endLine, period, periodKey, activeUsers, events });
  }
  return {
    present: true,
    empty: rows.length === 0,
    source: name,
    rows,
    rangeSpan: rows.length ? physicalRange(name, rows) : null,
    headerSpan,
    warnings,
  };
}

module.exports = {
  LoadError,
  baseName,
  loadAccount,
  loadCrm,
  loadTickets,
  loadUsage,
  parseIsoDate,
  isoOf,
  daysBetween,
};
