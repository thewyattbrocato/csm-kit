'use strict';

const fs = require('fs');

// The adoption/impact metric: every brief run appends one JSON line recording
// an estimated minutes-saved figure (configurable manual baseline minus the
// measured automated run time). `csmkit stats` reads the log back.

const DEFAULT_STATS_FILE = '.csmkit-stats.jsonl';
const DEFAULT_BASELINE_MINUTES = 75;

function appendStats(statsFile, entry) {
  fs.appendFileSync(statsFile, JSON.stringify(entry) + '\n', 'utf8');
}

function readStats(statsFile) {
  let text;
  try {
    text = fs.readFileSync(statsFile, 'utf8');
  } catch {
    return null; // no log yet — caller renders a friendly message
  }
  const entries = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      if (obj && typeof obj === 'object') entries.push(obj);
    } catch {
      // Skip corrupt lines rather than failing the whole report.
    }
  }
  return entries;
}

function summarizeStats(entries) {
  if (!entries || entries.length === 0) return null;
  const saved = entries
    .map((e) => Number(e.minutes_saved))
    .filter((n) => Number.isFinite(n));
  const totalSaved = saved.reduce((a, b) => a + b, 0);
  return {
    runs: entries.length,
    totalMinutesSaved: totalSaved,
    avgMinutesSavedPerRun: saved.length ? totalSaved / saved.length : 0,
    firstRunTs: entries[0].ts ?? null,
    lastRunTs: entries[entries.length - 1].ts ?? null,
    accounts: new Set(entries.map((e) => e.account).filter(Boolean)).size,
  };
}

module.exports = {
  DEFAULT_STATS_FILE,
  DEFAULT_BASELINE_MINUTES,
  appendStats,
  readStats,
  summarizeStats,
};
