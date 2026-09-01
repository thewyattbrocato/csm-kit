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

function sliceBetween(markdown, startMarker, endMarker) {
  const start = markdown.indexOf(startMarker);
  assert.notStrictEqual(start, -1, `README is missing ${startMarker.trim()}`);

  const contentStart = start + startMarker.length;
  const end = markdown.indexOf(endMarker, contentStart);
  assert.notStrictEqual(end, -1, `README is missing ${endMarker.trim()}`);

  return markdown.slice(contentStart, end);
}

function consoleBlocks(markdown) {
  return Array.from(markdown.matchAll(/```console\n([\s\S]*?)\n```/g), (match) => match[1]);
}

function commandBlock(blocks, firstLine) {
  const block = blocks.find((candidate) => candidate.startsWith(firstLine));
  assert.ok(block, `missing console block starting with ${firstLine}`);
  return block;
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

test('README Quickstart reuses detailed type commands byte-for-byte', () => {
  const readme = readRelative('README.md');

  const quickstart = sliceBetween(readme, '## Quickstart\n', '> ### Before / after');
  const handoff = sliceBetween(
    readme,
    '### Brief type #2: Handoff Completeness Brief (v0.2)\n',
    '### Brief type #3: QBR Packet (v0.3)\n',
  );
  const qbr = sliceBetween(
    readme,
    '### Brief type #3: QBR Packet (v0.3)\n',
    '### Input schemas\n',
  );

  const quickstartBlocks = consoleBlocks(quickstart);

  assert.strictEqual(
    commandBlock(quickstartBlocks, '$ csmkit brief --type handoff \\'),
    commandBlock(consoleBlocks(handoff), '$ csmkit brief --type handoff \\'),
  );
  assert.strictEqual(
    commandBlock(quickstartBlocks, '$ csmkit brief --type qbr \\'),
    commandBlock(consoleBlocks(qbr), '$ csmkit brief --type qbr \\'),
  );
});

test('README points to the GitLab Pages demo', () => {
  const readme = readRelative('README.md');
  assert.match(readme, /https:\/\/wcbrocato\.gitlab\.io\/csm-kit\/demo\//);
  assert.match(readme, /https:\/\/wcbrocato\.gitlab\.io\/csm-kit\/demo-static\//);
});
