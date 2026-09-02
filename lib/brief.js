'use strict';

const { buildRenewalBrief } = require('./brief-renewal');
const { buildHandoffBrief } = require('./brief-handoff');
const { buildQbrBrief } = require('./brief-qbr');

// One engine, many brief types (DECISIONS.md D1). Each brief type is a typed
// schema plus deterministic rules over the shared render pipeline; adding a
// type is an increment here, not a fork of the engine.

const BUILDERS = {
  renewal: buildRenewalBrief,
  handoff: buildHandoffBrief,
  qbr: buildQbrBrief,
};

const BRIEF_TYPES = Object.keys(BUILDERS);

function buildBrief({ type = 'renewal', ...inputs }) {
  if (!Object.prototype.hasOwnProperty.call(BUILDERS, type)) {
    throw new Error(`unknown brief type "${type}"`);
  }
  const builder = BUILDERS[type];
  return builder(inputs);
}

module.exports = { buildBrief, BRIEF_TYPES, fmtInt: require('./render').fmtInt };
