'use strict';

// Minimal YAML subset parser for csm-kit schemas — flat `key: value` maps
// plus one deliberately small extension: block lists of flat scalars
// (`key:` followed by `- item` lines), which the handoff schema needs for
// its multi-entry registers. Every key and every list item records its
// source line so facts cite spans like handoff.yaml#L12.
// Deliberately NOT a general YAML parser (see DECISIONS.md, "Schema-first").
// Supported:
//   - comments (full-line and trailing ` # ...`)
//   - single/double-quoted values, plain values
//   - blank lines between pairs or between list items
//   - `key:` followed by `- scalar` items (stored as entries[key].list)
// Rejected loudly: nesting, mapping values under keys, anchors, multi-line
// scalars, stray list items with no preceding `key:`.

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
    (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function stripTrailingComment(value) {
  let commentStart = -1;
  let inQuote = null;
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (inQuote) {
      if (c === inQuote) inQuote = null;
    } else if (c === '"' || c === "'") {
      inQuote = c;
    } else if (c === '#' && i > 0 && /\s/.test(value[i - 1])) {
      commentStart = i;
      break;
    }
  }
  return commentStart === -1 ? value : value.slice(0, commentStart);
}

function parseFlatYaml(text, sourceLabel = 'account.yaml') {
  const entries = Object.create(null); // key -> { value, line, empty?, list?: [{ value, line }] }
  const errors = [];
  const lines = text.split(/\r?\n/);

  const setEntry = (key, entry) => {
    if (Object.prototype.hasOwnProperty.call(entries, key)) {
      errors.push(
        `${sourceLabel}#L${entry.line}: duplicate key "${key}" (previous value at ${sourceLabel}#L${entries[key].line}); later value wins`
      );
    }
    entries[key] = entry;
  };

  // A `key:` line with an empty inline value stays pending until we see what
  // follows: `- item` lines attach as its list; any other meaningful line
  // (or EOF) resolves it as an empty-value finding. This keeps the warning
  // text identical to the pre-list parser for plain empty scalars.
  let pending = null; // { key, line, list: [] }

  const flushPending = () => {
    if (!pending) return;
    if (pending.list.length > 0) {
      setEntry(pending.key, { value: '', line: pending.line, list: pending.list });
    } else {
      errors.push(`${sourceLabel}#L${pending.line}: empty value for "${pending.key}"`);
      setEntry(pending.key, { value: '', line: pending.line, empty: true });
    }
    pending = null;
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const lineNo = idx + 1;
    let line = lines[idx];
    if (/^\t/.test(line)) {
      flushPending();
      errors.push(`${sourceLabel}#L${lineNo}: tab indentation is not supported; use spaces`);
      continue;
    }
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    // List item line: only valid while a `key:` is pending.
    const listItem = trimmed.match(/^-(?:\s+(.*))?$/);
    if (listItem) {
      if (!pending) {
        errors.push(
          `${sourceLabel}#L${lineNo}: list items are only supported directly after a "key:" line`
        );
        continue;
      }
      const rawValue = stripTrailingComment(listItem[1] ?? '').trim();
      if (rawValue === '') {
        errors.push(`${sourceLabel}#L${lineNo}: list item with no value`);
        continue;
      }
      const normalized = stripQuotes(rawValue);
      if (normalized.trim() === '') {
        errors.push(`${sourceLabel}#L${lineNo}: list item with no value`);
        continue;
      }
      pending.list.push({ value: normalized, line: lineNo });
      continue;
    }

    // Anything else closes any open list.
    flushPending();

    line = stripTrailingComment(line);

    const match = line.match(/^([A-Za-z0-9_.-]+)\s*:\s*(.*)$/);
    if (!match) {
      errors.push(
        `${sourceLabel}#L${lineNo}: expected "key: value" (nesting/multi-line values are not supported)`
      );
      continue;
    }
    const key = match[1];
    const value = match[2].trim();
    if (value === '') {
      pending = { key, line: lineNo, list: [] };
      continue;
    }
    const normalized = stripQuotes(value);
    if (normalized.trim() === '') {
      errors.push(`${sourceLabel}#L${lineNo}: empty value for "${key}"`);
      setEntry(key, { value: '', line: lineNo, empty: true });
    } else {
      setEntry(key, { value: normalized, line: lineNo });
    }
  }

  flushPending();

  return { entries, errors };
}

module.exports = { parseFlatYaml };
