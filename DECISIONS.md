# DECISIONS.md

One entry per significant build choice: what the alternatives were, what we chose, and the product reasoning. Written to be internalized as *patterns*, not trivia — each ends with the transferable rule.

---

## D1. One engine, many brief types (schema-first), not bespoke tools

**Context:** Discovery surfaced several artifact-shaped pains (renewal prep, sales-to-CS handoffs, QBR packets). Each could be its own mini-tool.

**Alternatives:** (a) one bespoke tool per artifact; (b) a free-form generator that takes any inputs and "figures out" a document; (c) typed schemas + one shared render pipeline.

**Choice:** (c). Brief type #1 ships with an engine whose sections derive from declared schemas and deterministic rules; briefs #2 and #3 will be new schemas on the same engine.

**Why:** Bespoke tools multiply maintenance and fragment trust. Free-form generation is seductive but untestable — you cannot assert "this sentence is true" against a schema you don't have. Typed schemas make validation, completeness scoring, and citations mechanical, and they turn roadmap items into config-plus-rules instead of rewrites.

> **Pattern:** Define the contract before the output. A tool that validates its own inputs can promise things a generator cannot.

## D2. The citation contract: no source span, no render

**Context:** Generated business documents fail in the room when a reader asks "where did this number come from?" and the answer is "the tool said so."

**Alternatives:** best-effort footnotes; citations only for numbers; trusting the transform layer.

**Choice:** Hard rule — every factual statement carries `file#L<row>` or it is suppressed into the missing-evidence checklist. Unparseable rows are skipped loudly (the warning names their span) and never become facts. Even absence claims ("no meeting/call in 30 days") cite the range that was searched.

**Why:** Citations convert the brief from "another summary someone wrote" into evidence a CSM can defend. They also discipline the codebase: every renderer feature must answer "which row proves this?" before it can ship. Adoption follows verifiability — people paste into renewal meetings what they can defend line-by-line.

> **Pattern:** Make trust a structural property of the output, not a property of intent.

## D3. CSV-in, not API integrations, for v0.1

**Context:** Real account data lives in CRM/ticketing systems with APIs. It was tempting to integrate.

**Alternatives:** native API connectors; OAuth SaaS plumbing; CSV/manual exports only.

**Choice:** CSV exports plus one small YAML file. Zero integrations, zero network calls.

**Why:** Integrations spend the entire engineering budget on auth, rate limits, and vendor churn before delivering a single useful artifact — and they cap adoption at companies willing to grant API access. Every CRM and ticket system exports CSV today. Exports also freeze data at a point in time, which makes briefs reproducible (`--as-of`) and diffable. If integrations are ever added they should be thin "export shapers," never a core dependency.

> **Pattern:** Meet users where their data already is. v0.1 earns trust; the platform comes later, if ever.

## D4. Deterministic rules over LLM/ML in v0.1

**Context:** An AI layer would demo flashier and match the market narrative.

**Alternatives:** LLM summarization from day one; ML risk scoring; deterministic rules.

**Choice:** Four auditable risk rules (relationship staleness >30d, high-severity ticket open >14d, usage decline >=20%, renewal <=60d without recent meeting/call) and arithmetic signals. No network calls anywhere in v0.1.

**Why:** Rules are testable byte-for-byte, explainable when a customer asks "why flagged?", and incapable of hallucinating a fact past the citation contract. The discovery evidence itself identifies over-signaling and opacity as the industry's failure mode for scores — shipping another black box would repeat that mistake. An optional LLM layer remains on the roadmap, strictly gated by D2: it may arrange prose, never originate facts.

> **Pattern:** Earn the right to be clever by first being reliable. Gate any probabilistic component behind the deterministic contract.

## D5. Completeness = evidence presence, not a customer health score

**Context:** A number at the top of the brief invites misreading. Which number belongs there?

**Alternatives:** weighted health score; sentiment estimate; evidence-presence ratio.

**Choice:** A `present/5` ratio over required-evidence units (account name, renewal date, three exports), rendered first, with recommended-field nudges (`owner`, `arr_usd`) in the checklist.

**Why:** Health scores encode opinions and decay trust when wrong ("why did a green account churn?"). Evidence presence encodes facts about the input set — verifiable, actionable (add the missing export), and a data-hygiene trend over time. Rendering it first tells readers exactly how much skepticism the rest of the brief deserves, which paradoxically raises trust in what did render.

> **Pattern:** Measure what you know, label it plainly, and never dress opinion up as measurement.

## D6. Minutes-saved as THE metric, via a configurable baseline constant

**Context:** Impact must be measurable from day one or the tool becomes invisible work.

**Alternatives:** telemetry platform; time-tracking surveys; vanity counters ("briefs generated"); minutes-saved log with an explicit baseline.

**Choice:** `--stats` appends one JSON line per run — inputs, completeness, and `minutes_saved = baseline − measured automated time` — with the baseline defaulting to 75 minutes and configurable via flag or env. `csmkit stats` reads the cumulative story back. Opt-in, file-based, zero infrastructure.

**Why:** The 60–90 min/account manual-prep figure is the documented cost being displaced; 75 (its midpoint) is a visible constant anyone can tighten and re-derive, not hidden magic. Per-run JSONL works offline, composes with git, and *is* the audit trail — no dashboard required. Vanity counters prove activity; hours reclaimed prove impact.

> **Pattern:** Pick one metric that maps to a documented cost, expose its assumption as an auditable constant, and log it where anyone can check the math.

## D7. Markdown output (not HTML/PDF/slides)

**Context:** The brief's destination is a renewal meeting, a ticket, a wiki, an email.

**Alternatives:** styled HTML report; PDF; slide-deck generation.

**Choice:** Plain markdown to stdout or a file.

**Why:** Markdown pastes everywhere, diffs cleanly in git (briefs become reviewable artifacts with history), renders in every tool CSM-adjacent teams already use, and keeps the project dependency-free. Slides arrive later (v0.3) as another *renderer* over the same structured evidence — not a new format to maintain.

> **Pattern:** Ship the most boring format that survives every downstream surface. Format ambition belongs in renderers, not in the core contract.

## D8. A minimal flat-YAML subset parser, not a general YAML parser

**Context:** `account.yaml` needs parsing, the project allows no dependencies, and facts need line numbers for citations.

**Alternatives:** embed a full YAML implementation; use JSON instead of YAML; hand-roll a subset with loud failures.

**Choice:** A ~70-line parser for flat `key: value` pairs supporting comments and quotes. Nesting, lists, and multi-line scalars are rejected with span-citing errors. Every key records its source line.

**Why:** The schema is deliberately flat (D1), so full YAML expressiveness buys nothing while multiplying edge cases (anchors, merge keys, block scalars) we would test forever. Loud rejection of unsupported syntax honors the citation ethos: the parser refuses ambiguity instead of guessing. Human-friendly enough for a non-programmer to edit, machine-strict enough to cite.

> **Pattern:** When constraints force you to build small, also make failure modes loud — partial parsers are safe only when they refuse rather than guess.

## D9. Reproducible briefs via `--as-of`

**Context:** Countdowns and activity windows depend on "today," which makes output nondeterministic and tests flaky.

**Alternatives:** always use wall-clock now; freeze a global clock in tests only.

**Choice:** First-class `--as-of YYYY-MM-DD` flag defaulting to today (UTC). Same inputs + same as-of = byte-identical brief.

**Why:** Determinism is what makes the citation contract auditable end-to-end: you can re-render last month's brief and get exactly what was presented, diff it against today's, and see precisely which evidence changed. It also makes tests honest — they execute the real binary rather than mocking time.

> **Pattern:** Any feature that depends on time should let users pin it. Nondeterminism is a bug factory hiding behind realism.

## D10. Aggregate citations: sorted row lists and searched ranges

**Context:** Signals like "3 open tickets" derive from several rows; absence claims derive from none.

**Alternatives:** cite only the "most important" row; omit citations for aggregates; invent per-row citations.

**Choice:** Small aggregates cite every contributing row (`tickets.csv#L4,L6`). When an aggregate has more than eight contributing rows, it cites the min-max physical line range of those contributors (`tickets.csv#L4-L18`) instead of emitting a partial list. Explicit absence claims cite the searched range (`crm.csv#L2-L9`) so the reader can verify the search themselves.

**Why:** Partial citation is how trust erodes silently — a reader who checks one row and finds the other two unsourced stops trusting all of them. Verifiable absence ("we looked at these rows and found no meeting") is often the most decision-relevant fact in renewal prep; it deserves the same rigor as presence.

> **Pattern:** The citation rule applies to negatives and aggregates too, or it protects nothing.

## D11. Stats logging is opt-in, not ambient telemetry

**Context:** The impact metric needs data, and the easy way to get it is silent tracking.

**Alternatives:** always-on logging; networked analytics; opt-in flag writing to a local JSONL.

**Choice:** Nothing is recorded unless the operator passes `--stats`, and records go to a local file they chose (`--stats-file`).

**Why:** A trust-first tool that secretly logs undermines its own thesis. Opt-in keeps the metric honest too: each record represents a deliberate claim of value by the person who ran it, not an inflated passive count. Adoption teams can still aggregate later because the format is plain JSONL.

> **Pattern:** Instrumentation should be a feature the user opts into, never a side effect they discover.
