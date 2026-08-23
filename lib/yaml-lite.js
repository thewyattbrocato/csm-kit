'use strict';

// Minimal YAML subset parser for account.yaml — flat `key: value` maps only,
// with per-key line numbers so facts cite spans like account.yaml#L4.
// Deliberately NOT a general YAML parser: v0.1 schemas are flat on purpose
// (see DECISIONS.md, "Schema-first"). Supported:
//   - comments (full-line and trailing ` # ...`)
//   - single/double-quoted values, plain values
//   - blank lines between pairs
// Rejected loudly: nesting, lists, anchors, multi-line scalars.

function parseFlatYaml(text, sourceLabel = 'account.yaml') {
  const entries = {}; // key -> { value, line }
  const errors = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((raw, idx) => {
    const lineNo = idx + 1;
    let line = raw;
    if (/^\t/.test(line)) {
      errors.push(`${sourceLabel}#L${lineNo}: tab indentation is not supported; use spaces`);
      return;
    }
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) return;

    if (/^-\s/.test(trimmed)) {
      errors.push(`${sourceLabel}#L${lineNo}: list items are not supported in v0.1 (flat keys only)`);
      return;
    }

    // Split off a trailing comment that is preceded by whitespace and outside quotes.
    let commentStart = -1;
    let inQuote = null;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuote) {
        if (c === inQuote) inQuote = null;
      } else if (c === '"' || c === "'") {
        inQuote = c;
      } else if (c === '#' && i > 0 && /\s/.test(line[i - 1])) {
        commentStart = i;
        break;
      }
    }
    if (commentStart !== -1) line = line.slice(0, commentStart);

    const match = line.match(/^([A-Za-z0-9_.-]+)\s*:\s*(.*)$/);
    if (!match) {
      errors.push(
        `${sourceLabel}#L${lineNo}: expected "key: value" (nesting/multi-line values are not supported in v0.1)`
      );
      return;
    }
    const key = match[1];
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    if (value === '') {
      errors.push(`${sourceLabel}#L${lineNo}: empty value for "${key}"`);
      entries[key] = { value, line: lineNo, empty: true };
      return;
    }
    entries[key] = { value, line: lineNo };
  });

  return { entries, errors };
}

module.exports = { parseFlatYaml };
