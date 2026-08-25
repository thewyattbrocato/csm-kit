# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

## csm-kit invariants (do not break silently)

- **Citation contract:** every factual line rendered by any brief builder (`lib/brief-*.js`) must carry a `file#L<row>` span; facts without a span go to the missing-evidence checklist / gap report instead. Any new section must answer "which row proves this?" before shipping.
- **Stdlib only, no network.** Node core modules exclusively; no dependencies in package.json (`dependencies: {}` is a feature). Tests spawn the real CLI — keep it that way.
- **Brief determinism:** identical inputs + same `--as-of` must produce a byte-identical brief. Brief rendering should not read wall-clock time except for the default as-of date; `--stats` may record timestamp and elapsed runtime after rendering.
- **One engine, many briefs:** `lib/brief.js` is a dispatcher over `BUILDERS` (`renewal` | `handoff` | `qbr`). New brief types register there; shared citation/markdown helpers live in `lib/render.js` — never fork them per brief.

## Build / test / verify

- `npm test` runs `node --test` over `test/*.test.js` (behavior tests: real CLI executions on fixtures under `test/fixtures/`).
- Syntax gate: `node --check bin/csmkit.js web/build-demo.mjs lib/*.js test/*.test.js`.
- Regenerate all three committed examples after changing rendering: `npm run example` (renewal + handoff + qbr, fixed as-of 2026-08-22), then confirm diffs show only intended changes.
- `npm run demo` regenerates the Pages artifacts (`docs/demo-static/index.html`, `docs/demo/index.html`, and the `docs/demo.html` compatibility alias) from committed examples, fixture scenarios, and embedded unmodified `lib/*.js`; CI reruns the generator and rejects drift.
- `test/demo-equivalence.test.js` executes the exact embedded browser runtime in a VM and compares all scenario/type outputs byte-for-byte with the real CLI; `test/demo-network.test.js` guards the no-request contract.

## Sharp edges learned the hard way

- **Fixture line numbers are load-bearing.** Tests assert exact spans like `account.yaml#L6` and `handoff.yaml#L17`. Editing a fixture file shifts every citation below the edit — update affected assertions in the same change (this bit twice while writing the handoff tests).
- Loaders must return a uniform shape even when a CSV is *not provided* (`rows: []`, `empty: true`) or `lib/brief.js` crashes on `.rows.length` (this bug shipped once).
- Meeting detection is token-based: substring matching classified activity types like `ticket_review` as meetings. Same discipline applies to handoff-role vocabulary (`canonicalHandoffRole` is exact-token, never substring).
- `rangeSpan` must be computed from min/max physical lines *before* rows are date-sorted, else ranges render backwards (`#L7-L5`).
- Completeness units are per brief type: renewal/qbr share 5 units (`computeCompleteness` in `lib/brief-renewal.js`), handoff has its own 7 units (`computeHandoffCompleteness`). Changing unit counts requires updating the right computer AND every completeness assertion across both briefs' tests.
- `parseFlatYaml` resolves a `key:` with empty value lazily: it stays pending until the next meaningful line or EOF, then becomes either a list container (if `- item` lines followed) or an empty-value warning. The flush happens *before* processing each new line so warning order stays chronological — don't move that flush or warning-order assertions will scramble.
- Pipe-delimited register rows (`Promise | sold | detail`) merge surplus `|` separators into the last field via `splitPipeFields` — don't replace with plain `split('|')`, it truncates details containing pipes.
- **README hero assets are hand-built house SVGs** (`docs/assets/*.svg`): system monospace font stacks only, no external fonts/images/services (see DECISIONS.md D16). Don't replace them with shields.io/Mermaid or CDN references.
- **The README "Real output" excerpt is asserted verbatim** against `examples/example-renewal-brief.md`. If rendering changes and you regenerate the example, re-check the README excerpt matches (it intentionally omits the signal-table/stakeholder sections; kept lines must match byte-for-byte).
- **The README Quickstart is a runnable contract** (DECISIONS.md D17): its commands must stay byte-consistent with the per-type console blocks and pass the stranger test — clone clean, install (`npm_config_prefix=<tmp> npm install -g .` to avoid touching the real global prefix), run every printed command verbatim including the expected `wrote brief.md (5/5 evidence, 100%)` line. Re-run it whenever fixtures/examples change brief output.
- **Badge claims link to verifiable sources**, not third-party badge services: CI/tests → live Actions workflow, license/node → `package.json`. A "passing" badge must never become a stale uncheckable claim.
