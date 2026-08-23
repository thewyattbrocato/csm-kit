# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

## csm-kit invariants (do not break silently)

- **Citation contract:** every factual line rendered by `lib/brief.js` must carry a `file#L<row>` span; facts without a span go to the missing-evidence checklist instead. Any new section must answer "which row proves this?" before shipping.
- **Stdlib only, no network.** Node core modules exclusively; no dependencies in package.json (`dependencies: {}` is a feature). Tests spawn the real CLI — keep it that way.
- **Brief determinism:** identical inputs + same `--as-of` must produce a byte-identical brief. Brief rendering should not read wall-clock time except for the default as-of date; `--stats` may record timestamp and elapsed runtime after rendering.

## Build / test / verify

- `npm test` runs `node --test` over `test/*.test.js` (behavior tests: real CLI executions on fixtures under `test/fixtures/`).
- Syntax gate: `node --check bin/csmkit.js lib/*.js test/*.test.js`.
- Regenerate the committed example after changing rendering: `npm run example`, then confirm `git diff examples/example-renewal-brief.md` shows only intended changes.

## Sharp edges learned the hard way

- **Fixture line numbers are load-bearing.** Tests assert exact spans like `account.yaml#L6`. Editing a fixture file shifts every citation below the edit — update affected assertions in the same change.
- Loaders must return a uniform shape even when a CSV is *not provided* (`rows: []`, `empty: true`) or `lib/brief.js` crashes on `.rows.length` (this bug shipped once).
- Meeting detection is token-based: substring matching classified activity types like `ticket_review` as meetings.
- `rangeSpan` must be computed from min/max physical lines *before* rows are date-sorted, else ranges render backwards (`#L7-L5`).
- Completeness counts 5 units (name, renewal_date, three exports). When adding units, update `computeCompleteness` AND every completeness assertion in tests.
