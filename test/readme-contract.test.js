'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function readRelative(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function readmeRealOutputExcerpt(readme) {
  const heading = '## Real output\n';
  const start = readme.indexOf(heading);
  assert.notStrictEqual(start, -1, 'README is missing the Real output section');

  const fenceStart = readme.indexOf('````markdown\n', start);
  assert.notStrictEqual(fenceStart, -1, 'README Real output section is missing its markdown fence');

  const contentStart = fenceStart + '````markdown\n'.length;
  const fenceEnd = readme.indexOf('\n````', contentStart);
  assert.notStrictEqual(fenceEnd, -1, 'README Real output markdown fence is not closed');

  return readme.slice(contentStart, fenceEnd);
}

function section(markdown, heading) {
  const start = markdown.indexOf(`${heading}\n`);
  assert.notStrictEqual(start, -1, `example is missing ${heading}`);

  const next = markdown.indexOf('\n## ', start + heading.length);
  return next === -1 ? markdown.slice(start).trimEnd() : markdown.slice(start, next).trimEnd();
}

test('README Real output excerpt matches generated example sections byte-for-byte', () => {
  const readme = readRelative('README.md');
  const example = readRelative('examples/example-renewal-brief.md');

  const expected = [
    section(example, '## Evidence completeness: 5/5 (100%)'),
    section(example, '## Renewal countdown'),
    section(example, '## Risk flags'),
  ].join('\n\n');

  assert.strictEqual(readmeRealOutputExcerpt(readme), expected);
});
