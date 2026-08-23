'use strict';

const pkg = require('../package.json');
const { isoOf, daysBetween } = require('./load');
const { fmtInt, citeSpan, refList, mdText, isMeetingType, renderCompleteness } = require('./render');
const {
  computeCompleteness,
  crmRowsAsOf,
  usageRowsAsOf,
  ticketOpenAsOf,
  riskFlags,
  stakeholderMapFromCrm,
  evidenceRangeList,
  noRiskRulesEvaluable,
  renderAccountChecklist,
} = require('./brief-renewal');

// Brief type #3: QBR Packet (v0.3). Same evidence pipeline and risk rules as
// the renewal brief (one engine, many briefs), rendered as slide-oriented
// markdown blocks ready to paste into a deck. Deterministic only — no LLM
// layer (see DECISIONS.md; the extension point is buildQbrBrief itself).

function usageTrend(usageRows) {
  const latest = usageRows[usageRows.length - 1];
  const firstWithUsers = usageRows.find((r) => r.activeUsers !== null);
  if (!firstWithUsers || !latest || latest.activeUsers === null || firstWithUsers.activeUsers <= 0) return null;
  if (latest.periodKey === firstWithUsers.periodKey) return null;
  const delta = Math.round(((latest.activeUsers - firstWithUsers.activeUsers) / firstWithUsers.activeUsers) * 100);
  return { first: firstWithUsers, latest, delta };
}

function execSummaryBullets(account, crm, tickets, usage, asOfDt) {
  const bullets = [];
  const msDay = 86400000;

  const usageRows = usage.rows.length > 0 ? usageRowsAsOf(usage, asOfDt) : [];
  if (usageRows.length > 0) {
    const latest = usageRows[usageRows.length - 1];
    const parts = [];
    if (latest.activeUsers !== null) parts.push(`${fmtInt(latest.activeUsers)} active users`);
    if (latest.events !== null) parts.push(`${fmtInt(latest.events)} events`);
    if (parts.length > 0) {
      bullets.push(`- Latest usage (${mdText(latest.period)}): ${parts.join(' · ')} — ${citeSpan(usage.source, [latest])}`);
    }
  }

  if (tickets.rows.length > 0) {
    const ticketsAsOf = tickets.rows.filter((t) => t.openedDt.getTime() <= asOfDt.getTime());
    const open = ticketsAsOf.filter((t) => ticketOpenAsOf(t, asOfDt));
    const high = open.filter((t) => t.severity === 'high').length;
    const cited = open.length > 0 ? open : ticketsAsOf.length > 0 ? ticketsAsOf : tickets.rows;
    bullets.push(`- Open tickets: ${open.length} (${high} high) — ${refList(tickets.source, cited)}`);
  }

  const crmAsOf = crm.rows.length > 0 ? crmRowsAsOf(crm, asOfDt) : [];
  if (crmAsOf.length > 0) {
    const last = crmAsOf[crmAsOf.length - 1];
    const idleDays = daysBetween(last.dt, asOfDt);
    const ago = idleDays === 0 ? 'today' : `${fmtInt(idleDays)} day${idleDays === 1 ? '' : 's'} ago`;
    bullets.push(`- Last customer activity: ${last.date} (${mdText(last.type || 'n/a')}), ${ago} — ${citeSpan(crm.source, [last])}`);
  }

  if (account.renewalDate) {
    const d = daysBetween(asOfDt, account.renewalDate.dt);
    const phrase =
      d === 0 ? 'is today' : d > 0 ? `${fmtInt(d)} days away` : `passed ${fmtInt(-d)} days ago`;
    bullets.push(`- Renewal: ${account.renewalDate.iso} (${phrase}) — \`${account.spans.renewalDate}\``);
  }

  return bullets;
}

function valueBullets(crm, tickets, usage, asOfDt) {
  const bullets = [];

  const usageRows = usage.rows.length > 0 ? usageRowsAsOf(usage, asOfDt) : [];
  const trend = usageRows.length >= 2 ? usageTrend(usageRows) : null;
  if (trend) {
    bullets.push(
      `- Active-user growth: ${trend.delta >= 0 ? '+' : ''}${trend.delta}% (${mdText(trend.first.period)} → ${mdText(trend.latest.period)}) — ${citeSpan(usage.source, [trend.first, trend.latest])}`
    );
  }

  const withEvents = usageRows.filter((r) => r.events !== null);
  if (withEvents.length > 0) {
    const totalEvents = withEvents.reduce((a, r) => a + r.events, 0);
    bullets.push(
      `- Total events tracked: ${fmtInt(totalEvents)} across ${withEvents.length} period${withEvents.length === 1 ? '' : 's'} — ${refList(usage.source, withEvents)}`
    );
  }

  if (tickets.rows.length > 0) {
    const ticketsAsOf = tickets.rows.filter((t) => t.openedDt.getTime() <= asOfDt.getTime());
    const resolved = ticketsAsOf.filter((t) => !ticketOpenAsOf(t, asOfDt));
    if (resolved.length > 0) {
      bullets.push(
        `- Tickets resolved on record: ${resolved.length} — ${refList(tickets.source, resolved)}`
      );
    }
  }

  const crmAsOf = crm.rows.length > 0 ? crmRowsAsOf(crm, asOfDt) : [];
  const meetings = crmAsOf.filter((r) => isMeetingType(r.type));
  if (meetings.length > 0) {
    bullets.push(
      `- Customer meetings/calls held: ${meetings.length} — ${refList(crm.source, meetings)}`
    );
  }

  return bullets;
}

// Deterministic next-quarter plan: each item derives from an evaluated rule
// and cites its evidence. No LLM drafting — that layer, when it arrives,
// hooks in here behind the citation contract.
function planItems(account, crm, tickets, usage, asOfDt) {
  const items = [];
  const msDay = 86400000;

  const usageRows = usage.rows.length > 0 ? usageRowsAsOf(usage, asOfDt) : [];
  const trend = usageRows.length >= 2 ? usageTrend(usageRows) : null;
  if (trend && trend.delta <= -20) {
    items.push(
      `- Reverse the active-user decline (${trend.delta}%, ${mdText(trend.first.period)} → ${mdText(trend.latest.period)}) — ${citeSpan(usage.source, [trend.first, trend.latest])}`
    );
  }

  const staleHigh = tickets.rows.filter(
    (t) => ticketOpenAsOf(t, asOfDt) && t.severity === 'high' && daysBetween(t.openedDt, asOfDt) > 14
  );
  for (const t of staleHigh.slice(0, 3)) {
    items.push(
      `- Close high-severity ticket "${mdText(t.subject || 'untitled')}" (open ${daysBetween(t.openedDt, asOfDt)} days) — ${citeSpan(tickets.source, [t])}`
    );
  }

  const crmAsOf = crm.rows.length > 0 ? crmRowsAsOf(crm, asOfDt) : [];
  if (crmAsOf.length > 0) {
    const last = crmAsOf[crmAsOf.length - 1];
    if (daysBetween(last.dt, asOfDt) > 30) {
      const who = last.contact ? ` with ${mdText(last.contact)}` : '';
      items.push(
        `- Re-establish cadence${who} — last touch ${last.date} (${daysBetween(last.dt, asOfDt)} days ago) — ${citeSpan(crm.source, [last])}`
      );
    }
  }

  if (account.renewalDate) {
    const d = daysBetween(asOfDt, account.renewalDate.dt);
    if (d >= 0 && d <= 120) {
      items.push(
        `- Confirm renewal timeline and paper process (renewal ${account.renewalDate.iso}, ${d === 0 ? 'today' : `${fmtInt(d)} days away`}) — \`${account.spans.renewalDate}\``
      );
    }
  }

  return items;
}

function buildQbrBrief({ account, crm, tickets, usage, asOfDt }) {
  const completeness = computeCompleteness(account, crm, tickets, usage);

  const out = [];
  const title = account.fields.name ? mdText(account.fields.name.raw) : 'Unnamed account';
  out.push(account.fields.name ? `# QBR Packet — ${title}` : '# QBR Packet');
  if (account.fields.name) {
    out.push(`**${title}** — \`${account.spans.name}\``);
  }
  out.push('');
  out.push(`_Generated by csm-kit v${pkg.version} · as-of ${isoOf(asOfDt)}. Deterministic packet — every fact cites its source span (\`file#L<row>\`)._`);
  out.push('');

  renderCompleteness(out, completeness);

  const exec = execSummaryBullets(account, crm, tickets, usage, asOfDt);
  if (exec.length > 0) {
    out.push('## Slide: Executive summary');
    out.push('');
    for (const b of exec) out.push(b);
    out.push('');
  }

  const value = valueBullets(crm, tickets, usage, asOfDt);
  if (value.length > 0) {
    out.push('## Slide: Value delivered');
    out.push('');
    for (const b of value) out.push(b);
    out.push('');
  }

  // Open risks reuse the renewal rule pack verbatim; same suppression law:
  // a "none" statement only renders when every rule had usable evidence.
  const risks = riskFlags(account, crm, tickets, usage, asOfDt, account.renewalDate ? daysBetween(asOfDt, account.renewalDate.dt) : null);
  const haveEvidence = crm.rows.length > 0 || tickets.rows.length > 0 || usage.rows.length > 0;
  if (risks.length > 0) {
    out.push('## Slide: Open risks');
    out.push('');
    for (const r of risks) out.push(`- ${r}`);
    out.push('');
  } else if (haveEvidence && completeness.present === completeness.total && noRiskRulesEvaluable(crm, tickets, usage, asOfDt)) {
    out.push('## Slide: Open risks');
    out.push('');
    out.push(`- _None triggered by the current deterministic rules._ Evidence checked: ${evidenceRangeList(account.spans.renewalDate, crm, tickets, usage)}.`);
    out.push('');
  }

  const plan = planItems(account, crm, tickets, usage, asOfDt);
  out.push('## Slide: Next-quarter plan');
  out.push('');
  if (plan.length > 0) {
    for (const item of plan) out.push(item);
  } else {
    out.push('- Seed the agenda from the executive summary above; no deterministic priorities triggered.');
  }
  out.push('- Assign an owner and due date to each item above.');
  out.push('');

  renderAccountChecklist(out, completeness, account, crm, tickets, usage);

  const stakeholders = crm.rows.length > 0 ? stakeholderMapFromCrm(crm, asOfDt) : [];

  const statsContext = {
    account: title,
    inputs: {
      crm_rows: crm.rows.length,
      ticket_rows: tickets.rows.length,
      usage_periods: usage.rows.length,
    },
    completeness_pct: completeness.pct,
    risk_flags: risks.totalCount ?? risks.length,
    stakeholders: stakeholders.length,
  };

  return { markdown: out.join('\n'), completeness, statsContext };
}

module.exports = { buildQbrBrief };
