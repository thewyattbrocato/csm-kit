'use strict';

const pkg = require('../package.json');
const { isoOf } = require('./load');
const { fmtInt, citeSpan, refList, mdText, renderCompleteness } = require('./render');

// Brief type #2: Sales-to-CS Handoff Completeness Brief (v0.2).
// Same engine contract as the renewal brief: every factual line carries a
// source span or it does not render. Register rows whose sold-status cannot
// be proven render as UNPROVEN state — never silently as sold, never dropped
// (D2/D10 lineage). The gap report is addressed back to the sending AE.

// ---------- completeness ----------

function computeHandoffCompleteness(handoff, questions) {
  const units = [];
  const push = (label, ok, detail, action) => units.push({ label, ok, detail, action });

  const src = handoff.source;
  const meta = handoff.listMeta;

  const accountOk = Boolean(handoff.fields.account);
  push(
    'Account name (handoff.yaml)',
    accountOk,
    accountOk ? `\`${handoff.spans.account}\`` : handoff.spans.account ? `empty value (\`${handoff.spans.account}\`)` : 'missing',
    accountOk ? null : 'add `account:` to handoff.yaml'
  );

  const aeOk = Boolean(handoff.fields.ae);
  push(
    'Sending AE (handoff.yaml)',
    aeOk,
    aeOk ? `\`${handoff.spans.ae}\`` : handoff.spans.ae ? `empty value (\`${handoff.spans.ae}\`)` : 'missing',
    aeOk ? null : 'add `ae:` to handoff.yaml (names who receives this gap report)'
  );

  const criteriaDetail = (listMeta_, count, singular, plural) =>
    count > 0
      ? `${count} ${count === 1 ? singular : plural} (\`${listMeta_.span}\`)`
      : `no entries${listMeta_.span ? ` (\`${listMeta_.span}\`)` : ''}`;
  push(
    'Goals / success criteria',
    meta.criteria.count > 0,
    criteriaDetail(meta.criteria, meta.criteria.count, 'criterion', 'criteria'),
    meta.criteria.count > 0 ? null : 'add at least one `success_criteria:` list entry to handoff.yaml'
  );
  push(
    'Stakeholder map',
    meta.stakeholders.count > 0,
    criteriaDetail(meta.stakeholders, meta.stakeholders.count, 'stakeholder', 'stakeholders'),
    meta.stakeholders.count > 0 ? null : 'add at least one `stakeholders:` list entry ("Name | Role | Handoff role") to handoff.yaml'
  );
  push(
    'Promises register (promised-vs-sold)',
    meta.promises.count > 0,
    criteriaDetail(meta.promises, meta.promises.count, 'promise', 'promises'),
    meta.promises.count > 0 ? null : 'add a `promises:` register ("What was promised | sold or not_sold | detail") to handoff.yaml'
  );
  push(
    'Risks / dependencies',
    meta.risks.count > 0,
    criteriaDetail(meta.risks, meta.risks.count, 'risk', 'risks'),
    meta.risks.count > 0 ? null : 'add at least one `risks:` list entry to handoff.yaml'
  );
  push(
    'Links (recordings / proposal)',
    meta.links.count > 0,
    criteriaDetail(meta.links, meta.links.count, 'link', 'links'),
    meta.links.count > 0 ? null : 'add at least one `links:` list entry (call recordings, proposal docs) to handoff.yaml'
  );

  const present = units.filter((u) => u.ok).length;
  const total = units.length;
  const pct = Math.round((present / total) * 100);
  return { units, present, total, pct };
}

// ---------- sections ----------

function handoffRiskFlags(handoff, crm, asOfDt) {
  const flags = [];
  let totalCount = 0;
  const pushFlag = (text, count = 1) => {
    flags.push(text);
    totalCount += count;
  };

  // Unproven promises: absence of proof renders as unproven state, never
  // as an assumed sale and never as silence.
  for (const p of handoff.promises) {
    if (p.status === null) {
      pushFlag(
        `🟠 Promise status unproven: "${mdText(p.desc)}" is not recorded as sold or not_sold — confirm with the AE — \`${handoff.source}#L${p.line}\``
      );
    }
  }

  // Stakeholder-map coverage rule (only evaluable when the map itself exists;
  // otherwise the gap report already demands it).
  if (handoff.listMeta.stakeholders.count > 0) {
    const hasSponsorOrBuyer = handoff.stakeholders.some(
      (s) => s.canonicalRole === 'sponsor' || s.canonicalRole === 'buyer'
    );
    if (!hasSponsorOrBuyer) {
      pushFlag(
        `🟠 Stakeholder map names no executive sponsor or economic buyer — map covered \`${handoff.listMeta.stakeholders.span}\``
      );
    }
  }

  // Relationship continuity: mapped stakeholders with zero CRM-recorded
  // activity. Absence claims cite the searched range (D10 lineage).
  if (crm.rows.length > 0) {
    const crmAsOf = crm.rows.filter((r) => r.dt.getTime() <= asOfDt.getTime());
    const contactIndex = new Map();
    for (const r of crmAsOf) {
      const key = (r.contact || '').trim().toLowerCase();
      if (!key) continue;
      if (!contactIndex.has(key)) contactIndex.set(key, []);
      contactIndex.get(key).push(r);
    }
    const unmatched = handoff.stakeholders.filter((s) => !contactIndex.has(s.name.trim().toLowerCase()));
    for (const s of unmatched.slice(0, 3)) {
      pushFlag(
        `🟠 No CRM-recorded activity for mapped stakeholder "${mdText(s.name)}"${s.role ? ` (${mdText(s.role)})` : ''} as-of ${isoOf(asOfDt)} — \`${handoff.source}#L${s.line}\`, search covered \`${crm.rangeSpan}\``
      );
    }
    if (unmatched.length > 3) {
      const overflow = unmatched.slice(3);
      pushFlag(
        `🟠 ${overflow.length} additional mapped stakeholder${overflow.length === 1 ? '' : 's'} with no CRM-recorded activity — ${citeSpan(handoff.source, overflow)}, search covered \`${crm.rangeSpan}\``,
        overflow.length
      );
    }
  }

  Object.defineProperty(flags, 'totalCount', { value: totalCount });
  return flags;
}

function crmTouchFor(stakeholder, crm, asOfDt) {
  const key = stakeholder.name.trim().toLowerCase();
  const matches = crm.rows.filter(
    (r) => r.dt.getTime() <= asOfDt.getTime() && (r.contact || '').trim().toLowerCase() === key
  );
  if (matches.length === 0) return { count: 0, last: null };
  const last = matches.reduce((a, b) => (b.dt.getTime() >= a.dt.getTime() ? b : a));
  return { count: matches.length, last, rows: matches };
}

function gapReportItems(completeness, handoff, questions) {
  const items = [];
  for (const u of completeness.units.filter((u) => !u.ok)) {
    items.push(`[ ] ${u.action} — required evidence (${u.label})`);
  }
  for (const p of handoff.promises) {
    if (p.status === null) {
      items.push(`[ ] Confirm sold status of "${mdText(p.desc)}" — currently unproven (\`${handoff.source}#L${p.line}\`)`);
    }
  }
  if (!handoff.closeDate) {
    if (handoff.emptyCloseDate && handoff.spans.closeDate) {
      items.push(`[ ] Fix \`close_date:\` in handoff.yaml (empty value — \`${handoff.spans.closeDate}\`)`);
    } else if (handoff.spans.closeDate) {
      items.push(`[ ] Fix \`close_date:\` in handoff.yaml (invalid date — \`${handoff.spans.closeDate}\`)`);
    } else {
      items.push('[ ] Add `close_date:` in handoff.yaml (recommended — anchors the onboarding timeline)');
    }
  }
  if (!questions.present) {
    items.push('[ ] Log week-one questions during onboarding (recommended — leading indicator for kickoff re-discovery)');
  } else if (questions.empty) {
    items.push(`[ ] add at least one valid data row to ${questions.source} (week-one questions log)`);
  }
  return items;
}

// ---------- renderer ----------

function buildHandoffBrief({ handoff, crm, questions, asOfDt }) {
  const completeness = computeHandoffCompleteness(handoff, questions);
  const risks = handoffRiskFlags(handoff, crm, asOfDt);
  const gaps = gapReportItems(completeness, handoff, questions);

  const out = [];
  const title = handoff.fields.account ? mdText(handoff.fields.account.raw) : 'Unnamed account';
  out.push('# Sales-to-CS Handoff Completeness Brief');
  if (handoff.fields.account) {
    out.push(`**${title}** — \`${handoff.spans.account}\``);
  }
  out.push('');
  if (handoff.fields.ae) {
    out.push(`_Handoff sent by AE **${mdText(handoff.fields.ae.raw)}** — \`${handoff.spans.ae}\`._`);
  }
  out.push(`_Generated by csm-kit v${pkg.version} · as-of ${isoOf(asOfDt)}._`);
  out.push(
    '_Every fact below cites its source span (`file#L<row>`). Facts that cannot be traced to a span are omitted and listed in the gap report instead._'
  );
  out.push('');

  renderCompleteness(out, completeness);

  if (risks.length > 0) {
    out.push('## Handoff risk flags');
    out.push('');
    for (const r of risks) out.push(`- ${r}`);
    out.push('');
  }

  if (handoff.promises.length > 0) {
    out.push('## Promises register (promised-vs-sold)');
    out.push('');
    out.push('| Promise | Status | Detail | Source |');
    out.push('|---|---|---|---|');
    for (const p of handoff.promises) {
      const status =
        p.status === 'sold' ? 'Sold' : p.status === 'not_sold' ? 'Not sold' : '**UNPROVEN**';
      out.push(
        `| ${mdText(p.desc)} | ${status} | ${p.detail ? mdText(p.detail) : '—'} | \`${handoff.source}#L${p.line}\` |`
      );
    }
    out.push('');
  }

  if (handoff.criteria.length > 0) {
    out.push('## Goals / success criteria');
    out.push('');
    out.push('| # | Goal / success criterion | Source |');
    out.push('|---|---|---|');
    handoff.criteria.forEach((c, i) => {
      out.push(`| ${i + 1} | ${mdText(c.text)} | \`${handoff.source}#L${c.line}\` |`);
    });
    out.push('');
  }

  if (handoff.stakeholders.length > 0) {
    out.push('## Stakeholder map');
    out.push('');
    out.push('_From the handoff record' + (crm.rows.length > 0 ? ', enriched with CRM activity where names match._' : '._'));
    out.push('');
    if (crm.rows.length > 0) {
      out.push('| Stakeholder | Role | Handoff role | Last CRM touch | Activities | Source |');
      out.push('|---|---|---|---|---|---|');
      for (const s of handoff.stakeholders) {
        const touch = crmTouchFor(s, crm, asOfDt);
        const lastCell = touch.last
          ? `${touch.last.date} (${mdText(touch.last.type || 'n/a')})`
          : `none as-of ${isoOf(asOfDt)} (searched \`${crm.rangeSpan}\`)`;
        const sourceCell = touch.rows
          ? `\`${handoff.source}#L${s.line}\` · ${refList(crm.source, touch.rows)}`
          : `\`${handoff.source}#L${s.line}\``;
        out.push(
          `| ${mdText(s.name)} | ${s.role ? mdText(s.role) : '—'} | ${s.handoffRole ? mdText(s.handoffRole) : '—'} | ${lastCell} | ${fmtInt(touch.count)} | ${sourceCell} |`
        );
      }
    } else {
      out.push('| Stakeholder | Role | Handoff role | Source |');
      out.push('|---|---|---|---|');
      for (const s of handoff.stakeholders) {
        out.push(
          `| ${mdText(s.name)} | ${s.role ? mdText(s.role) : '—'} | ${s.handoffRole ? mdText(s.handoffRole) : '—'} | \`${handoff.source}#L${s.line}\` |`
        );
      }
    }
    out.push('');
  }

  if (handoff.risks.length > 0) {
    out.push('## Risks / dependencies');
    out.push('');
    for (const r of handoff.risks) out.push(`- ${mdText(r.text)} — \`${handoff.source}#L${r.line}\``);
    out.push('');
  }

  if (handoff.links.length > 0) {
    out.push('## Links (recordings / proposal)');
    out.push('');
    for (const l of handoff.links) out.push(`- ${mdText(l.text)} — \`${handoff.source}#L${l.line}\``);
    out.push('');
  }

  if (questions.rows.length > 0) {
    out.push('## Week-one questions');
    out.push('');
    out.push('_Questions asked by the receiving CSM during week one (leading indicator)._');
    out.push('');
    out.push('| Date | Question | Asked by | Source |');
    out.push('|---|---|---|---|');
    for (const q of questions.rows) {
      out.push(
        `| ${q.date} | ${mdText(q.question)} | ${q.askedBy ? mdText(q.askedBy) : '—'} | ${citeSpan(questions.source, [q])} |`
      );
    }
    out.push('');
  }

  // Gap report: the missing-evidence checklist, addressed back to the AE
  // who sent the handoff (every ask is specific missing/unproven evidence).
  out.push(
    handoff.fields.ae
      ? `## Gap report — for ${mdText(handoff.fields.ae.raw)}, AE (\`${handoff.spans.ae}\`)`
      : '## Gap report — for the sending AE'
  );
  out.push('');
  if (gaps.length === 0) {
    const evidence = [
      handoff.spans.account,
      handoff.spans.ae,
      handoff.listMeta.criteria.span,
      handoff.listMeta.stakeholders.span,
      handoff.listMeta.promises.span,
      handoff.listMeta.risks.span,
      handoff.listMeta.links.span,
      crm.rows.length > 0 ? crm.rangeSpan : null,
    ]
      .filter(Boolean)
      .map((span) => '`' + span + '`')
      .join(', ');
    out.push(`- [x] All required evidence present — ${evidence}.`);
  } else {
    out.push('_Address each item below back to the AE who sent this handoff; every ask is missing or unproven evidence._');
    out.push('');
    for (const g of gaps) out.push(`- ${g}`);
  }
  out.push('');

  const statsContext = {
    account: title,
    inputs: {
      success_criteria: handoff.criteria.length,
      stakeholders: handoff.stakeholders.length,
      promises: handoff.promises.length,
      risks: handoff.risks.length,
      links: handoff.links.length,
      questions: questions.rows.length,
    },
    completeness_pct: completeness.pct,
    risk_flags: risks.totalCount ?? risks.length,
    unproven_promises: handoff.promises.filter((p) => p.status === null).length,
    stakeholders: handoff.stakeholders.length,
  };

  return { markdown: out.join('\n'), completeness, statsContext };
}

module.exports = { buildHandoffBrief, computeHandoffCompleteness };
