# DECISIONS.md

One entry per significant build choice: what the alternatives were, what we chose, and the product reasoning. Written to be internalized as *patterns*, not trivia — each ends with the transferable rule.

---

## D1. One engine, many brief types (schema-first), not bespoke tools

**Context:** Discovery surfaced several artifact-shaped pains (renewal prep, sales-to-CS handoffs, QBR packets). Each could be its own mini-tool.

**Alternatives:** (a) one bespoke tool per artifact; (b) a free-form generator that takes any inputs and "figures out" a document; (c) typed schemas + one shared render pipeline.

**Choice:** (c). Brief types register as schemas plus deterministic builders on one dispatcher (`lib/brief.js`): renewal, handoff, and qbr all share the same evidence/rendering contract instead of forking into separate tools.

**Why:** Bespoke tools multiply maintenance and fragment trust. Free-form generation is seductive but untestable — you cannot assert "this sentence is true" against a schema you don't have. Typed schemas make validation, completeness scoring, and citations mechanical, and they turn roadmap items into config-plus-rules instead of rewrites.

> **Pattern:** Define the contract before the output. A tool that validates its own inputs can promise things a generator cannot.

## D2. The citation contract: no source span, no render

**Context:** Generated business documents fail in the room when a reader asks "where did this number come from?" and the answer is "the tool said so."

**Alternatives:** best-effort footnotes; citations only for numbers; trusting the transform layer.

**Choice:** Hard rule — every factual statement carries `file#L<row>` or it is suppressed into the missing-evidence checklist / gap report. Unparseable rows are skipped loudly (the warning names their span) and never become facts. Even absence claims ("no meeting/call in 30 days") cite the range that was searched.

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

**Choice:** A small auditable ruleset (relationship staleness >30d, high-severity ticket open >14d, usage decline >=20%, renewal <=60d without recent meeting/call, overdue renewal date) and arithmetic signals. No network calls anywhere in v0.1.

**Why:** Rules are testable byte-for-byte, explainable when a customer asks "why flagged?", and incapable of hallucinating a fact past the citation contract. The discovery evidence itself identifies over-signaling and opacity as the industry's failure mode for scores — shipping another black box would repeat that mistake. An optional LLM layer remains on the roadmap, strictly gated by D2: it may arrange prose, never originate facts.

> **Pattern:** Earn the right to be clever by first being reliable. Gate any probabilistic component behind the deterministic contract.

## D5. Completeness = evidence presence, not a customer health score

**Context:** A number at the top of the brief invites misreading. Which number belongs there?

**Alternatives:** weighted health score; sentiment estimate; evidence-presence ratio.

**Choice:** A present/total ratio over brief-specific required-evidence units, rendered first, with recommended-field nudges after required gaps. Renewal and QBR use five units (account name, renewal date, three exports); handoff uses seven units (account, sending AE, success criteria, stakeholder map, promises register, risks/dependencies, links).

**Why:** Health scores encode opinions and decay trust when wrong ("why did a green account churn?"). Evidence presence encodes facts about the input set — verifiable, actionable (add the missing export), and a data-hygiene trend over time. Rendering it first tells readers exactly how much skepticism the rest of the brief deserves, which paradoxically raises trust in what did render.

> **Pattern:** Measure what you know, label it plainly, and never dress opinion up as measurement.

## D6. Minutes-saved as THE metric, via a configurable baseline constant

**Context:** Impact must be measurable from day one or the tool becomes invisible work.

**Alternatives:** telemetry platform; time-tracking surveys; vanity counters ("briefs generated"); minutes-saved log with an explicit baseline.

**Choice:** `--stats` appends one JSON line per run — brief type, inputs, completeness, and `minutes_saved = baseline − measured automated time` — with the baseline defaulting to 75 minutes and configurable via flag or env. `csmkit stats` reads the cumulative story back, including a per-type breakdown; legacy records without `brief_type` are grouped as `unspecified`. Opt-in, file-based, zero infrastructure.

**Why:** The 60–90 min/account manual-prep figure is the documented cost being displaced; 75 (its midpoint) is a visible constant anyone can tighten and re-derive, not hidden magic. Per-run JSONL works offline, composes with git, and *is* the audit trail — no dashboard required. Vanity counters prove activity; hours reclaimed prove impact.

> **Pattern:** Pick one metric that maps to a documented cost, expose its assumption as an auditable constant, and log it where anyone can check the math.

## D7. Markdown output (not HTML/PDF/slides)

**Context:** The brief's destination is a renewal meeting, a ticket, a wiki, an email.

**Alternatives:** styled HTML report; PDF; slide-deck generation.

**Choice:** Plain markdown to stdout or a file.

**Why:** Markdown pastes everywhere, diffs cleanly in git (briefs become reviewable artifacts with history), renders in every tool CSM-adjacent teams already use, and keeps the project dependency-free. The QBR packet keeps that contract as slide-oriented markdown sections, not a separate slide-file format.

> **Pattern:** Ship the most boring format that survives every downstream surface. Format ambition belongs in renderers, not in the core contract.

## D8. A minimal flat-YAML subset parser, not a general YAML parser

**Context:** `account.yaml` needs parsing, the project allows no dependencies, and facts need line numbers for citations.

**Alternatives:** embed a full YAML implementation; use JSON instead of YAML; hand-roll a subset with loud failures.

**Choice:** A small parser for flat `key: value` pairs supporting comments and quotes. It later grew only D12's narrow block-list-of-scalars extension for handoff registers. Nesting, mapping values under keys, anchors, and multi-line scalars are still rejected with span-citing errors. Every key, and every supported list item, records its source line.

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

**Choice:** Small aggregates cite every contributing row (`tickets.csv#L4,L6`). When an aggregate has more than eight contributing rows, it cites the min-max physical line range of those contributors (`tickets.csv#L4-L18`) instead of emitting a partial list. Capped risk displays keep at most three detailed rows and add a fully cited overflow aggregate for the remaining qualifying rows, while stats count every qualifying row. Explicit absence claims cite the searched range (`crm.csv#L2-L9`) so the reader can verify the search themselves.

**Why:** Partial citation is how trust erodes silently — a reader who checks one row and finds the other two unsourced stops trusting all of them. Verifiable absence ("we looked at these rows and found no meeting") is often the most decision-relevant fact in renewal prep; it deserves the same rigor as presence.

> **Pattern:** The citation rule applies to negatives and aggregates too, or it protects nothing.

## D11. Stats logging is opt-in, not ambient telemetry

**Context:** The impact metric needs data, and the easy way to get it is silent tracking.

**Alternatives:** always-on logging; networked analytics; opt-in flag writing to a local JSONL.

**Choice:** Nothing is recorded unless the operator passes `--stats`, and records go to a local file they chose (`--stats-file`).

**Why:** A trust-first tool that secretly logs undermines its own thesis. Opt-in keeps the metric honest too: each record represents a deliberate claim of value by the person who ran it, not an inflated passive count. Adoption teams can still aggregate later because the format is plain JSONL.

> **Pattern:** Instrumentation should be a feature the user opts into, never a side effect they discover.

## D12. The handoff schema stays typed: lists of flat scalars, not freeform YAML (v0.2)

**Context:** Brief type #2 needs multi-entry registers (success criteria, stakeholder map, promises, risks, links). A general YAML parser with nested maps would express these "naturally" — and reopen every edge case D8 refused.

**Alternatives:** (a) embed a full YAML implementation now that a schema finally wants nesting; (b) split registers into side-car CSVs; (c) extend the flat subset with exactly one feature: block lists of flat scalars under `key:` (`- item`, each item line-numbered); (d) freeform text sections parsed by heuristics.

**Choice:** (c), plus pipe-delimited register rows inside single scalars (`Name | Role | Handoff role`, `Promise | sold or not_sold | detail`) so one human-editable `handoff.yaml` carries the whole handoff. Everything D8 rejects is still rejected loudly: no nesting, no mapping values, no anchors. Malformed rows are skipped with span-citing warnings, never coerced into facts.

**Why:** Schema-first means the *schema* evolves deliberately while the parsing contract stays small enough to reason about. Lists-of-scalars keep every item citable (`handoff.yaml#L17`) — which is what lets completeness scoring, unproven-promise detection, and the gap report stay mechanical. Freeform input would make "which row proves this?" unanswerable again. Side-car CSVs were rejected because an AE filling out one file is the adoption path; friction at input is friction at adoption.

> **Pattern:** Grow a constrained format by adding the narrowest feature that satisfies the new contract — not by adopting the general tool that satisfies every future one.

## D13. Handoff gaps are addressed back to the AE, as asks for evidence (v0.2)

**Context:** The handoff brief's missing-evidence output could be framed as a neutral scorecard, an audit finding, or requests routed to the receiving CSM.

**Alternatives:** generic checklist like the renewal brief's; a scored "handoff quality grade" sent to CS leadership; gaps logged to a dashboard.

**Choice:** The section is titled **Gap report — for {AE}**, names the sending AE from `ae:` in the YAML, and phrases every line as a specific ask for specific evidence ("Confirm sold status of X — currently unproven", "add a promises register"). Recommended nudges ride along (close_date, week-one questions log).

**Why:** In the handoff workflow, the AE is the only person who can supply what's missing — routing gaps anywhere else guarantees they die. Addressing them to a named person converts a passive score into an actionable request, which mirrors how the discovery evidence describes successful handoffs (enforcement tooling, not blame tooling). It also keeps the citation contract honest: every ask cites the span that exposed the gap, so the AE can verify the claim before fixing it.

> **Pattern:** Point a report at the one person who can act on it, and phrase findings as requests they can say yes to.

## D14. QBR packets stay deterministic; the LLM layer has a named extension point but no key (v0.3)

**Context:** Slide-oriented QBR packets look like the obvious place for generated narrative ("summarize this quarter's wins").

**Alternatives:** ship an optional LLM drafting flag now; wait until the engine has more brief types; hardcode "never".

**Choice:** v0.3 renders slides purely from evaluated rules over the shared pipeline — executive summary, value delivered, open risks, next-quarter plan skeleton all derive deterministically from cited evidence. The LLM layer stays deferred with its seam defined: a future drafting step may sit between evidence assembly and rendering inside `buildQbrBrief`, and per D4/D2 it may arrange prose but every factual sentence must still resolve to a source span or be suppressed.

**Why:** Deterministic-first keeps the packet byte-reproducible (`--as-of`), testable against fixtures, and defensible in the room — the same properties that made the renewal brief trustworthy. Adding generation before the evidence pipeline is proven would couple two risky changes. Naming the extension point (instead of vague "later") makes the deferral a design decision rather than procrastination.

> **Pattern:** Defer a capability by defining exactly where it will plug in and what contract it must obey — not by leaving it out silently.

## D15. Unproven beats both "sold" and silence: UNPROVEN as a first-class state (v0.2)

**Context:** Promise registers record what was sold — but real-world rows arrive blank, typo'd, or ambiguous. Dropping those rows hides risk; defaulting them to sold fabricates commitments.

**Alternatives:** skip unrecognized statuses with a warning (renewal's broken-row precedent); assume sold; render three states.

**Choice:** Three-state status vocabulary: `sold`, `not_sold`, and anything else renders as **UNPROVEN** — in the register table, as a 🟠 risk flag citing the row, and as a confirmation ask in the gap report. Unrecognizable non-empty statuses additionally warn on stderr naming their span.

**Why:** This extends the citation contract's core move (D2: absence claims cite searched ranges) from *facts about data* to *facts about proof*. A promise whose sale can't be evidenced is exactly the kind of silent liability that poisons handoffs, and it deserves louder treatment than suppression — the reader must see that something was claimed without proof. Unproven-state rendering turns "we don't know" into actionable work instead of a hole in the document.

> **Pattern:** When evidence is absent, render the absence of proof itself — labeled, cited, and routed to whoever can cure it.

## D16. Hero-first README with hand-built SVG assets, not doc services

**Context:** v0.1 merged on a strong engine, with handoff/QBR landing via a parallel branch, but the README opened with a problem essay — a visitor needed minutes, not seconds, to learn what the tool does and why it matters. It also needed badges and a flow diagram, and the project's ethos forbids external services and network dependencies.

**Alternatives:** (a) keep prose-first README, add shields.io badges and a Mermaid/Cloud-hosted diagram; (b) restructure hero-first with hand-built local SVGs in `docs/assets/`; (c) no visuals at all.

**Choice:** (b). Above the fold, in order: typographic banner (`banner.svg`) → one-paragraph value prop → flow diagram (`how-it-works.svg`, annotating fail-closed + completeness score) → verbatim excerpt of real generated output with inline `file#L<row>` citations → before/after callout (60–90 min manual baseline from the discovery evidence vs `--stats` minutes-saved per run) → badges row (CI, tests, license, node). All existing PM-artifact depth (problem statement, discovery evidence, roadmap) stays intact below the fold. Every image is a hand-built SVG using system monospace font stacks — zero external fonts, images, or services; each badge links to where its claim is verifiable (live Actions runs, in-repo sources).

**Why:** Visitors decide in seconds, and a trust-first tool's best pitch is a real artifact: an excerpt whose citation spans resolve to rows a reader can click is demonstration, not promise. Third-party badge/diagram services would inject exactly the network dependency the project refuses in code — docs should inherit the project's constraints, not exempt themselves — and their static claims go stale unverified. Hand-built SVGs keep the repo self-contained while the links keep claims checkable. The deep problem/discovery material still serves evaluators who scroll past the fold.

> **Pattern:** Lead with demonstrated proof and defer argumentation. Every surface of a trust-first product — including its docs' images — must obey the same constraints it asks the user to accept.
