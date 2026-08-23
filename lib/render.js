'use strict';

// Shared citation and markdown-rendering helpers for every brief type.
// These encode the citation contract mechanics (D2/D10): spans like
// `file.csv#L4,L6`, min-max ranges once aggregates exceed eight rows, and
// loud single-line markdown safety for anything read from an input file.

const MEETING_TYPES = new Set(['meeting', 'call', 'demo', 'onsite', 'qbr', 'workshop', 'video']);

function isMeetingType(type) {
  return String(type ?? '')
    .split(/[^A-Za-z0-9]+/)
    .some((token) => MEETING_TYPES.has(token.toLowerCase()));
}

function fmtInt(n) {
  const neg = n < 0;
  let s = String(Math.abs(Math.round(n)));
  let out = '';
  while (s.length > 3) {
    out = ',' + s.slice(-3) + out;
    s = s.slice(0, -3);
  }
  return (neg ? '-' : '') + s + out;
}

function normalizeRef(ref) {
  if (typeof ref === 'number') return { line: ref, endLine: ref };
  return { line: ref.line, endLine: ref.endLine ?? ref.line };
}

function citeSpan(source, lines) {
  // One or more row references in one file -> `file.csv#L3,L7`.
  const sorted = [...new Map(lines.map(normalizeRef).map((r) => [`${r.line}:${r.endLine}`, r])).values()]
    .sort((a, b) => a.line - b.line || a.endLine - b.endLine);
  return '`' + source + '#' + sorted.map((r) => 'L' + r.line + (r.endLine === r.line ? '' : '-L' + r.endLine)).join(',') + '`';
}

function refList(source, lines, max = 8) {
  const sorted = [...new Map(lines.map(normalizeRef).map((r) => [`${r.line}:${r.endLine}`, r])).values()]
    .sort((a, b) => a.line - b.line || a.endLine - b.endLine);
  if (sorted.length <= max) return citeSpan(source, sorted);
  return '`' + source + '#L' + sorted[0].line + '-L' + Math.max(...sorted.map((r) => r.endLine)) + '`';
}

function mdText(value) {
  return String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[|]/g, '\\|')
    .replace(/`/g, "'");
}

function spanRef(span) {
  return span ? '`' + span + '`' : null;
}

function renderCompleteness(out, completeness) {
  // Completeness renders first: the reader should know how much trust to
  // place in what follows (DECISIONS.md D5).
  out.push(`## Evidence completeness: ${completeness.present}/${completeness.total} (${completeness.pct}%)`);
  out.push('');
  out.push('| Required evidence | Status | Detail |');
  out.push('|---|---|---|');
  for (const u of completeness.units) {
    out.push(`| ${u.label} | ${u.ok ? 'present' : 'MISSING'} | ${u.detail} |`);
  }
  out.push('');
}

module.exports = {
  MEETING_TYPES,
  isMeetingType,
  fmtInt,
  normalizeRef,
  citeSpan,
  refList,
  mdText,
  spanRef,
  renderCompleteness,
};
