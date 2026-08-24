# csm-kit

**Evidence-cited Customer Success briefs from plain CSV exports.** One CLI, three brief types (renewal readiness, handoff completeness, QBR packets). Every factual line in a generated brief cites its source (`file.csv#L42`) — a fact that cannot be traced to a source span does not render. No dependencies, no integrations, no LLM calls, no network calls.

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
2. **One engine, many artifacts.** Brief types share one schema→validate→render pipeline. Renewal Readiness (v0.1) proved the engine; Handoff Completeness (v0.2) and QBR packets (v0.3) were config-plus-renderer increments, not new products.
3. **Trust is the adoption mechanism.** Tooling fails when its output needs re-verification. The citation contract makes every claim checkable in one click-of-the-eye, which is what gets a brief pasted into the renewal meeting instead of rebuilt by hand.
4. **Deterministic before intelligent.** Rules are auditable and offline. An LLM layer can come later *behind* the citation contract (it may draft prose; facts must still resolve to source rows).

## The citation contract (the hard rule)

Every factual statement rendered by csm-kit resolves to a source span — `account.yaml#L7`, `crm.csv#L42`, `tickets.csv#L12,L15`, or a searched range like `crm.csv#L2-L9` for explicit absence claims ("no meeting anywhere in this export"). If a fact cannot resolve to a span, it is **not rendered**; instead it appears in the missing-evidence checklist or gap report. Broken input rows are skipped with a warning naming their span and never silently become facts. Promises whose sold-status cannot be proven render as explicit **UNPROVEN** state — never silently as sold, never dropped.

## What ships

### Brief type #1: Renewal Readiness Brief (v0.1)

Inputs: one `account.yaml` plus up to three CSV exports (CRM activity, tickets, usage). Output: one markdown brief containing:

- **Evidence completeness score** — which required evidence is present/missing, rendered first so the reader knows how much trust the rest deserves
- **Renewal countdown** — days remaining, cited to the YAML line
- **Signal table** — last activity, activity volume windows, ticket load by severity, latest usage, usage trend; every row cited
- **Risk flags** — deterministic rules (relationship going quiet >30d; high-severity ticket open >14d; usage decline ≥20%; renewal ≤60d without recent customer meeting/call; overdue renewal date), each citing its evidence
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

### Brief type #2: Handoff Completeness Brief (v0.2)

Inputs: one `handoff.yaml` (the whole sales→CS handoff in one typed file), an optional CRM activity export (enriches the stakeholder map with relationship history), and an optional week-one questions log. Output: one markdown brief containing:

- **Evidence completeness score over seven units** — account, sending AE, success criteria, stakeholder map, promises register, risks/dependencies, links
- **Promises register (promised-vs-sold)** — each promise rendered Sold / Not sold / **UNPROVEN**, per-row cited
- **Goals / success criteria** and **risks / dependencies**, each entry cited
- **Stakeholder map** with handoff roles, cross-referenced against CRM activity; stakeholders with no recorded activity are flagged with the searched range
- **Handoff risk flags** — unproven promises, maps missing an executive sponsor/economic buyer, silent stakeholders
- **Week-one questions log** (leading indicator) when provided
- **Gap report addressed back to the AE** — every missing/unproven item phrased as a specific ask for the one person who can cure it

```console
$ csmkit brief --type handoff \
    --handoff examples/acme/handoff.yaml \
    --crm examples/acme/crm.csv \
    --questions examples/acme/questions.csv \
    --as-of 2026-08-22 --out handoff.md
```

See [`examples/example-handoff-brief.md`](examples/example-handoff-brief.md).

### Brief type #3: QBR Packet (v0.3)

Inputs: same as renewal (`account.yaml` + up to three CSV exports). Output: slide-oriented markdown, deterministic only — no LLM layer (its extension point is named in DECISIONS.md D14):

- **Slide: Executive summary** — latest usage, open ticket load, last customer activity, renewal countdown; each bullet independently cited (suppressed if its evidence is absent)
- **Slide: Value delivered** — active-user growth, total events tracked, tickets resolved on record, meetings/calls held
- **Slide: Open risks** — reuses the renewal risk-rule pack verbatim, spans included
- **Slide: Next-quarter plan** — skeleton items derived deterministically from evaluated rules, plus owner/date assignment prompts

```console
$ csmkit brief --type qbr \
    --account examples/acme/account.yaml \
    --crm examples/acme/crm.csv \
    --tickets examples/acme/tickets.csv \
    --usage examples/acme/usage.csv \
    --as-of 2026-08-22 --out qbr.md
```

See [`examples/example-qbr-packet.md`](examples/example-qbr-packet.md).

### Input schemas

`account.yaml` (flat `key: value`; used by renewal + qbr):

| Field | Required | Purpose |
|---|---|---|
| `name` | yes | Account identity |
| `renewal_date` | yes | Countdown + proximity rules (YYYY-MM-DD) |
| `owner` | recommended | Accountable CSM |
| `arr_usd` | recommended | Commercial urgency sizing |
| `tier` | optional | Context |

CSV columns are matched case-insensitively with common aliases (e.g. `priority`→severity, `created`→opened). Date fields are strict ISO `YYYY-MM-DD`; usage `period` accepts `YYYY-M`, `YYYY-MM`, or `YYYY-MM-DD`. Rows that fail validation are skipped with a `file#L<n>` warning on stderr.

| Export | Required columns | Optional |
|---|---|---|
| CRM activity (`--crm`) | `date`, `type`, `contact`, `summary` | `role` |
| Tickets (`--tickets`) | `opened`, `severity`, `status`, `subject` | `closed` |
| Usage summary (`--usage`) | `period`, `active_users` | `events` |

`handoff.yaml` (flat pairs plus block lists of `- scalar` items; used by handoff):

| Field | Required | Purpose |
|---|---|---|
| `account` | yes | Account identity |
| `ae` | yes | Sending AE — the gap report is addressed here |
| `close_date` | recommended | Onboarding timeline anchor (YYYY-MM-DD) |
| `success_criteria:` | yes (≥1 item) | Goals/success criteria list |
| `stakeholders:` | yes (≥1 item) | One per line: `Name \| Role \| Handoff role` |
| `promises:` | yes (≥1 item) | One per line: `Promise \| sold or not_sold \| detail` |
| `risks:` | yes (≥1 item) | Risks / dependencies |
| `links:` | yes (≥1 item) | Call recordings, proposal docs |

Handoff roles use exact-token vocabulary (`executive_sponsor`, `economic_buyer`, `champion`, `technical_buyer`, `day_to_day`, …); unrecognized roles still render but do not count toward the sponsor/buyer rule. Promise statuses accept `sold`, `not_sold` (plus `not included` / `excluded` spellings); anything else renders as UNPROVEN with a warning.

Week-one questions log (`--questions`, optional CSV): columns `date`, `question`, optional `asked_by`.

Input flags are strict by brief type: `--handoff` and `--questions` are handoff-only, while `--tickets` and `--usage` are accepted only for renewal and qbr.

## Success metrics

**Primary impact metric — minutes saved per run.** Manual renewal prep is documented at 60–90 min/account. Each `--stats` run appends one JSON line to `.csmkit-stats.jsonl`:

```json
{"ts":"2026-08-22T19:35:43.000Z","tool":"csm-kit","version":"0.3.0","run":"brief","brief_type":"qbr","account":"Acme Manufacturing Co.","inputs":{"crm_rows":7,"ticket_rows":4,"usage_periods":6},"completeness_pct":100,"risk_flags":2,"stakeholders":3,"baseline_manual_minutes":75,"automated_minutes":0.05,"minutes_saved":74.95}
```

- Baseline defaults to **75 minutes** (midpoint of the documented 60–90 range) and is configurable per run (`--baseline-minutes`, env `CSMKIT_BASELINE_MINUTES`). The baseline is an explicit, auditable constant — never auto-inflated. `minutes_saved = baseline − measured automated run time`.
- Records carry `brief_type` (`renewal` | `handoff` | `qbr`), and `csmkit stats` breaks minutes saved down per type; legacy records without that field are grouped as `unspecified`.
- `csmkit stats` reads the log back: runs, accounts covered, total and average minutes saved. That cumulative number is the adoption/impact story, inspectable by anyone with access to the file.
- **Secondary metric:** completeness percentage over time — a leading indicator of CRM/data hygiene per account.

## Roadmap

- ~~**v0.1** — Renewal Readiness Brief~~ ✅ shipped
- ~~**v0.2 — Handoff Completeness Brief**~~ ✅ shipped: promised-vs-sold register with UNPROVEN state, stakeholder map enriched from CRM, week-one questions log, gap report addressed back to the AE.
- ~~**v0.3 — QBR packet renderer**~~ ✅ shipped: slide-oriented deterministic markdown reusing the shared evidence pipeline.
- **Later — optional LLM drafting layer, gated by the citation contract.** The model may rearrange prose and suggest next steps; any factual sentence must still carry a resolvable source span or it does not ship. Extension point: inside `buildQbrBrief` between evidence assembly and rendering (DECISIONS.md D14).

## Development

```console
npm test        # behavior tests: executes the real CLI on fixtures
npm run example # regenerate all three committed example briefs
```

Node.js stdlib only (no dependencies, no network calls). Tests execute the actual binary against fixture files and assert rendered content, exact citation spans, completeness math, and stats-log appends. `--as-of YYYY-MM-DD` makes briefs reproducible: same inputs + same as-of date = byte-identical output.

## License

MIT
