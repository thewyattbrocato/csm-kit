'use strict';

// RFC-4180-style CSV parser that records the source line number of each
// record so every downstream fact can cite its span (file#L<n>).
// Stdlib only. Handles quoted fields, embedded commas/newlines/quotes,
// CRLF line endings, and a trailing newline.

function parseCsv(text) {
  const records = [];
  let field = '';
  let record = [];
  let line = 1;
  let recordStartLine = 1;
  let inQuotes = false;
  let fieldWasQuoted = false;
  let started = false;
  let fieldStarted = false;

  const endField = () => {
    record.push({ value: field, quoted: fieldWasQuoted });
    field = '';
    fieldWasQuoted = false;
    fieldStarted = false;
  };

  const endRecord = () => {
    endField();
    // Skip completely empty physical lines (e.g. blank line between rows).
    if (!(record.length === 1 && record[0].value === '' && !record[0].quoted)) {
      records.push({ startLine: recordStartLine, fields: record.map((f) => f.value) });
    }
    record = [];
    started = false;
    fieldStarted = false;
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (c === '\n') line++;
        field += c;
      }
      continue;
    }
    if (c === '"' && field === '' && !fieldStarted) {
      inQuotes = true;
      fieldWasQuoted = true;
      started = true;
      fieldStarted = true;
      continue;
    }
    if (c === ',') {
      endField();
      started = true;
      continue;
    }
    if (c === '\r') {
      if (text[i + 1] === '\n') i++;
      endRecord();
      line++;
      recordStartLine = line;
      continue;
    }
    if (c === '\n') {
      endRecord();
      line++;
      recordStartLine = line;
      continue;
    }
    if (!started) {
      started = true;
      recordStartLine = line;
    }
    fieldStarted = true;
    field += c;
  }
  // Final record without trailing newline.
  if (field !== '' || record.length > 0 || started) {
    endRecord();
  }
  return records;
}

// Parse CSV into { header: [..], headerLine, rows: [{ line, values }] }.
function parseCsvTable(text) {
  const records = parseCsv(text);
  if (records.length === 0) return { header: [], headerLine: 0, rows: [] };
  const first = records[0];
  return {
    header: first.fields.map((h) => h.trim()),
    headerLine: first.startLine,
    rows: records.slice(1).map((r) => ({ line: r.startLine, values: r.fields })),
  };
}

module.exports = { parseCsv, parseCsvTable };
