# csm-kit

**Evidence-cited Customer Success briefs from plain CSV exports.** One CLI, many brief types. Every factual line in a generated brief cites its source (`file.csv#L42`) — a fact that cannot be traced to a source span does not render. No dependencies, no integrations, no LLM calls required.

---

## The problem

Customer Success teams drown in manual evidence assembly right before the moments that matter most:

> **QBR / renewal prep eats the job.** A majority of CS leaders say their teams spend more time on QBR prep than on the strategic conversation it enables ([Gainsight State of Customer Success 2025, via retainsure](https://retainsure.com/blog/qbr-preparation-time)). Practitioners describe "manual screenshots piped into Excel, rebuilt into charts, reformatted into slides" ([prospeo.io](https://prospeo.io)); context reconstruction costs **60–90 minutes per account per cycle**, dropping under 30 only with retrieval tooling ([remio.ai](https://remio.ai)).

> **CRM hygiene is cognitive load.** Reps spend 15–20 minutes post-call reconstructing context, updating fields "just enough to move on," burning 3–6 hours a week on manual entry — leaving forecasts "built on sand" ([klu.so](https://klu.so); [r/CRM discussion](https://www.reddit.com/r/CRM/)).

> **Sales→CS handoffs lose the deal's context.** CS never reliably receives promised-vs-sold scope, the real stakeholder map, or implicit commitments ([desertwestdigital.com](https://desertwestdigital.com)) — and up to 70% of B2B churn is claimed to be seeded in the first 90 days ([b2bnotes.com](https://b2bnotes.com)). The literature names **handoff completeness** as a leading indicator worth instrumenting ([rocketlane.com](https://rocketlane.com), [sifthub.io](https://sifthub.io)).

> **Health scores nobody trusts.** Over-signaling is the most common design failure ([youngju.dev](https://youngju.dev)), with CSMs reporting ~15 hrs/week manually maintaining scores across dashboards ([jam.dev](https://jam.dev)).

> **Retrieval, not existence, is the bottleneck.** Interaction workers spend ~20% of the workweek just searching for internal information ([McKinsey, via remio.ai](https://remio.ai)). "The problem is rarely that information does not exist… the problem is retrieval speed."

The information exists — in CRM exports, ticket systems, and usage reports. What's missing is fast, trustworthy **assembly into the artifacts CSMs actually produce**, with provenance you can defend in the room.

## Why briefs first

We considered several candidate tools (health-score auditors, feedback synthesizers, coverage planners). The brief engine wins as v0.1 because:

1. **Highest-frequency pain.** Renewal/QBR prep happens every cycle for every account; the discovery evidence above quantifies it at 60–90 min/account. It is the sharpest recurring cost.
2. **One engine, many artifacts.** Brief types share one schema→validate→render pipeline. Renewal Readiness (v0.1) proves the engine; Handoff Completeness and QBR packets become config-plus-renderer increments, not new products.
3. **Trust is the adoption mechanism.** Tooling fails when its output needs re-verification. The citation contract makes every claim checkable in one click-of-the-eye, which is what gets a brief pasted into the renewal meeting instead of rebuilt by hand.
4. **Deterministic before intelligent.** Rules are auditable and offline. An LLM layer can come later *behind* the citation contract (it may draft prose; facts must still resolve to source rows).

## The citation contract (the hard rule)

Every factual statement rendered by csm-kit resolves to a source span — `account.yaml#L7`, `crm.csv#L42`, `tickets.csv#L12,L15`, or a searched range like `crm.csv#L2-L9` for explicit absence claims ("no meeting anywhere in this export"). If a fact cannot resolve to a span, it is **not rendered**; instead it appears in the missing-evidence checklist. Broken input rows are skipped with a warning naming their span and never silently become facts.

## What v0.1 ships: the Renewal Readiness Brief

Inputs: one `account.yaml` plus up to three CSV exports (CRM activity, tickets, usage). Output: one markdown brief containing:

- **Evidence completeness score** — which required evidence is present/missing, rendered first so the reader knows how much trust the rest deserves
- **Renewal countdown** — days remaining, cited to the YAML line
- **Signal table** — last activity, activity volume windows, ticket load by severity, latest usage, usage trend; every row cited
- **Risk flags** — four deterministic rules (relationship going quiet >30d; high-severity ticket open >14d; usage decline ≥20%; renewal ≤60d without recent customer meeting/call), each citing its evidence
- **Stakeholder map** — contacts derived from the CRM export, most recent touch first
- **Missing-evidence checklist** — actionable gaps, not vague warnings

```console
$ npm install -g .          # exposes the `csmkit` binary (or call node bin/csmkit.js)
$ csmkit brief \
    --account examples/acme/account.yaml \
    --crm examples/acme/crm.csv \
    --tickets examples/acme/tickets.csv \
    --usage examples/acme/usage.csv \
    --as-of 2026-08-22 \
    --out brief.md
wrote brief.md (5/5 evidence, 100%)
```

See [`examples/example-renewal-brief.md`](examples/example-renewal-brief.md) for real generated output.

### Input schemas

`account.yaml` (flat `key: value`):

| Field | Required | Purpose |
|---|---|---|
| `name` | yes | Account identity |
| `renewal_date` | yes | Countdown + proximity rules (YYYY-MM-DD) |
| `owner` | recommended | Accountable CSM |
| `arr_usd` | recommended | Commercial urgency sizing |
| `tier` | optional | Context |

CSV columns are matched case-insensitively with common aliases (e.g. `priority`→severity, `created`→opened). Dates are strict ISO `YYYY-MM-DD`. Rows that fail validation are skipped with a `file#L<n>` warning on stderr.

| Export | Required columns | Optional |
|---|---|---|
| CRM activity (`--crm`) | `date`, `type`, `contact`, `summary` | `role` |
| Tickets (`--tickets`) | `opened`, `severity`, `status`, `subject` | `closed` |
| Usage summary (`--usage`) | `period`, `active_users` | `events` |

## Success metrics

**Primary impact metric — minutes saved per run.** Manual renewal prep is documented at 60–90 min/account. Each `--stats` run appends one JSON line to `.csmkit-stats.jsonl`:

```json
{"ts":"2026-08-22T19:35:43Z","run":"brief","account":"Acme Manufacturing Co.","inputs":{"crm_rows":7,"ticket_rows":4,"usage_periods":6},"completeness_pct":100,"risk_flags":2,"stakeholders":3,"baseline_manual_minutes":75,"automated_minutes":0.05,"minutes_saved":74.95}
```

- Baseline defaults to **75 minutes** (midpoint of the documented 60–90 range) and is configurable per run (`--baseline-minutes`, env `CSMKIT_BASELINE_MINUTES`). The baseline is an explicit, auditable constant — never auto-inflated. `minutes_saved = baseline − measured automated run time`.
- `csmkit stats` reads the log back: runs, accounts covered, total and average minutes saved. That cumulative number is the adoption/impact story, inspectable by anyone with access to the file.
- **Secondary metric:** completeness percentage over time — a leading indicator of CRM/data hygiene per account.

## Roadmap

- **v0.1 (this release)** — Renewal Readiness Brief, completeness score, `--stats` impact log. Deterministic, offline, zero dependencies.
- **v0.2 — Brief type #2: Handoff Completeness Brief.** Schema from the handoff-failure literature: promised-vs-sold register, stakeholder map, implicit-commitments list, success criteria, kickoff question log. Rendered from a typed YAML + exports; scored for completeness; gap report addressed back to the AE. Reuses this engine end-to-end — the increment is the schema and one risk-rule pack.
- **v0.3 — Brief type #3: QBR packet.** Same evidence pipeline, slide-oriented markdown rendering (per-section blocks suitable for conversion), plus attendance/outcome fields.
- **Later — optional LLM drafting layer, gated by the citation contract.** The model may rearrange prose and suggest next steps; any factual sentence must still carry a resolvable source span or it does not ship.

## Development

```console
npm test        # behavior tests: executes the real CLI on fixtures
```

Node.js stdlib only (no dependencies, no network calls). Tests execute the actual binary against fixture files and assert rendered content, exact citation spans, completeness math, and stats-log appends. `--as-of YYYY-MM-DD` makes briefs reproducible: same inputs + same as-of date = byte-identical output.

## License

MIT
