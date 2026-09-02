'use strict';

const pkg = require('../package.json');
const { isoOf, daysBetween } = require('./load');
const { fmtInt, citeSpan, refList, mdText, isMeetingType, renderCompleteness } = require('./render');

// Brief type #1: Renewal Readiness Brief. Hard rule: every factual statement
// in the rendered brief carries a source span (file#L<n>). Facts that cannot
// be resolved to a span do not render — they surface in the missing-evidence
// checklist instead.

function crmRowsAsOf(crm, asOfDt) {
  return crm.rows.filter((r) => r.dt.getTime() <= asOfDt.getTime());
}

function usageChronologicalRows(usage) {
  return [...usage.rows].sort((a, b) => {
    const periodOrder = a.periodKey - b.periodKey;
    if (periodOrder !== 0) return periodOrder;
    return a.line - b.line;
  });
}

function usageRowsAsOf(usage, asOfDt) {
  const asOfKey =
    asOfDt.getUTCFullYear() * 10000 +
    (asOfDt.getUTCMonth() + 1) * 100 +
    asOfDt.getUTCDate();
  return usageChronologicalRows(usage).filter((r) => r.periodKey <= asOfKey);
}

function ticketOpenAsOf(ticket, asOfDt) {
  if (ticket.openedDt.getTime() > asOfDt.getTime()) return false;
  if (ticket.closedDt) return ticket.closedDt.getTime() > asOfDt.getTime();
  return ticket.open;
}

function evidenceRangeList(...items) {
  return items
    .flatMap((item) => {
      if (!item) return [];
      if (typeof item === 'string') return [item];
      if (item.rows.length > 0 && item.rangeSpan) return [item.rangeSpan];
      return [];
    })
    .map((span) => '`' + span + '`')
    .join(', ');
}

function noRiskRulesEvaluable(crm, tickets, usage, asOfDt) {
  const crmAsOf = crmRowsAsOf(crm, asOfDt);
  const ticketsAsOf = tickets.rows.filter((t) => t.openedDt.getTime() <= asOfDt.getTime());
  const usageAsOf = usageRowsAsOf(usage, asOfDt);
  const firstWithUsers = usageAsOf.find((r) => r.activeUsers !== null);
  const latest = usageAsOf[usageAsOf.length - 1];
  const usageDeclineEvaluable =
    usageAsOf.length >= 2 &&
    firstWithUsers &&
    latest &&
    latest.activeUsers !== null &&
    firstWithUsers.activeUsers > 0 &&
    latest.periodKey !== firstWithUsers.periodKey;
  return crmAsOf.length > 0 && ticketsAsOf.length > 0 && usageDeclineEvaluable;
}

function checklistEvidenceList(account, crm, tickets, usage) {
  return [
    account.spans.name,
    account.spans.renewalDate,
    account.spans.owner,
    account.spans.arrUsd,
    crm.rangeSpan,
    tickets.rangeSpan,
    usage.rangeSpan,
  ]
    .filter(Boolean)
    .map((span) => '`' + span + '`')
    .join(', ');
}

// ---------- completeness ----------

function computeCompleteness(account, crm, tickets, usage) {
  const units = [];
  const push = (label, ok, detail, action) => units.push({ label, ok, detail, action });

  const nameOk = Boolean(account.fields.name);
  const nameDetail = nameOk
    ? '`' + account.spans.name + '`'
    : account.empty?.name && account.spans.name ? 'empty value (`' + account.spans.name + '`)' : 'missing';
  push(
    'Account name (account.yaml)',
    nameOk,
    nameDetail,
    nameOk ? null : 'add `name:` to account.yaml'
  );

  const renewOk = Boolean(account.renewalDate);
  const renewDetail = renewOk
    ? '`' + account.spans.renewalDate + '`'
    : account.empty?.renewalDate && account.spans.renewalDate ? 'empty value (`' + account.spans.renewalDate + '`)'
      : account.spans.renewalDate ? 'invalid value (`' + account.spans.renewalDate + '`)' : 'missing';
  push(
    'Renewal date (account.yaml)',
    renewOk,
    renewDetail,
    renewOk ? null : 'add `renewal_date: YYYY-MM-DD` to account.yaml'
  );
  const crmOk = Boolean(crm.present && !crm.empty);
  push(
    'CRM activity export',
    crmOk,
    crm.present
      ? crm.empty ? `no valid data rows${crm.headerSpan ? ` (\`${crm.headerSpan}\`)` : ''}` : `${crm.rows.length} activities (\`${crm.rangeSpan}\`)`
      : 'not provided',
    crmOk ? null : !crm.present
      ? 'provide --crm <activity-export.csv>'
      : `add at least one valid data row to ${crm.source}`
  );
  const ticketsOk = Boolean(tickets.present && !tickets.empty);
  push(
    'Ticket export',
    ticketsOk,
    tickets.present
      ? tickets.empty ? `no valid data rows${tickets.headerSpan ? ` (\`${tickets.headerSpan}\`)` : ''}` : `${tickets.rows.length} tickets (\`${tickets.rangeSpan}\`)`
      : 'not provided',
    ticketsOk ? null : !tickets.present
      ? 'provide --tickets <ticket-export.csv>'
      : `add at least one valid data row to ${tickets.source}`
  );
  const usageOk = Boolean(usage.present && !usage.empty);
  push(
    'Usage summary',
    usageOk,
    usage.present
      ? usage.empty ? `no valid data rows${usage.headerSpan ? ` (\`${usage.headerSpan}\`)` : ''}` : `${usage.rows.length} periods (\`${usage.rangeSpan}\`)`
      : 'not provided',
    usageOk ? null : !usage.present
      ? 'provide --usage <usage-summary.csv>'
      : `add at least one valid data row to ${usage.source}`
  );

  const present = units.filter((u) => u.ok).length;
  const total = units.length;
  const pct = Math.round((present / total) * 100);
  return { units, present, total, pct };
}

// ---------- sections ----------

function renewalDistancePhrase(days, { emphasis = false } = {}) {
  if (days === 0) return 'is today';
  const distance = `${fmtInt(Math.abs(days))} day${Math.abs(days) === 1 ? '' : 's'}`;
  if (days > 0) return emphasis ? `**${distance} away**` : `${distance} away`;
  return emphasis ? `passed **${distance} ago**` : `passed ${distance} ago`;
}

function renewalCountdown(account, asOfDt) {
  if (!account.renewalDate) return null;
  const d = daysBetween(asOfDt, account.renewalDate.dt);
  const phrase = renewalDistancePhrase(d, { emphasis: true });
  return {
    text: `- Renewal date: **${account.renewalDate.iso}** — ${phrase} at as-of ${isoOf(asOfDt)} — \`${account.spans.renewalDate}\``,
    days: d,
  };
}

function signalRows(crm, tickets, usage, asOfDt) {
  const rows = [];

  if (crm.rows.length > 0) {
    const crmAsOf = crmRowsAsOf(crm, asOfDt);
    if (crmAsOf.length > 0) {
      const last = crmAsOf[crmAsOf.length - 1];
      const who = last.contact ? ` with ${mdText(last.contact)}` : '';
      rows.push({
        signal: 'Last logged activity',
        value: `${last.date} — ${mdText(last.type || 'unspecified type')}${who}`,
        source: citeSpan(crm.source, [last]),
      });
    }

    const msDay = 86400000;
    const recent = crmAsOf.filter((r) => {
      const age = asOfDt.getTime() - r.dt.getTime();
      return age >= 0 && age < 30 * msDay;
    });
    const prior = crmAsOf.filter((r) => {
      const age = asOfDt.getTime() - r.dt.getTime();
      return age >= 30 * msDay && age < 60 * msDay;
    });
    const activityLines = [...recent, ...prior];
    rows.push({
      signal: 'Activity volume (last 30d / prior 30d)',
      value: `${recent.length} / ${prior.length}`,
      source: activityLines.length > 0 ? refList(crm.source, activityLines) : '`' + crm.rangeSpan + '`',
    });
  }

  if (tickets.rows.length > 0) {
    const ticketsAsOf = tickets.rows.filter((t) => t.openedDt.getTime() <= asOfDt.getTime());
    const open = ticketsAsOf.filter((t) => ticketOpenAsOf(t, asOfDt));
    const bySev = (level) => open.filter((t) => t.severity === level).length;
    const unknown = open.filter((t) => t.severity === null).length;
    const unknownPart = unknown > 0 ? ` · ${unknown} unknown` : '';
    const value =
      open.length === 0
        ? `0 open (${ticketsAsOf.length} resolved on record)`
        : `${open.length} open (${bySev('high')} high · ${bySev('medium')} medium · ${bySev('low')} low${unknownPart})`;
    const cited = open.length > 0
      ? open
      : ticketsAsOf.length > 0 ? ticketsAsOf : tickets.rows;
    rows.push({ signal: 'Ticket load', value, source: refList(tickets.source, cited) });
  }

  if (usage.rows.length > 0) {
    const usageRows = usageRowsAsOf(usage, asOfDt);
    if (usageRows.length === 0) return rows;
    const latest = usageRows[usageRows.length - 1];
    const parts = [];
    if (latest.activeUsers !== null) parts.push(`${fmtInt(latest.activeUsers)} active users`);
    if (latest.events !== null) parts.push(`${fmtInt(latest.events)} events`);
    if (parts.length > 0) {
      rows.push({
        signal: `Latest usage period (${mdText(latest.period)})`,
        value: parts.join(' · '),
        source: citeSpan(usage.source, [latest]),
      });
    }
    const firstWithUsers = usageRows.find((r) => r.activeUsers !== null);
    if (
      firstWithUsers &&
      latest.activeUsers !== null &&
      firstWithUsers.activeUsers > 0 &&
      latest.periodKey !== firstWithUsers.periodKey
    ) {
      const delta = Math.round(((latest.activeUsers - firstWithUsers.activeUsers) / firstWithUsers.activeUsers) * 100);
      rows.push({
        signal: `Usage trend (active users, ${mdText(firstWithUsers.period)} → ${mdText(latest.period)})`,
        value: `${delta >= 0 ? '+' : ''}${delta}%`,
        source: citeSpan(usage.source, [firstWithUsers, latest]),
      });
    }
  }

  return rows;
}

function riskFlags(account, crm, tickets, usage, asOfDt, countdownDays) {
  const flags = [];
  let totalCount = 0;
  const pushFlag = (text, count = 1) => {
    flags.push(text);
    totalCount += count;
  };
  const msDay = 86400000;

  if (crm.rows.length > 0) {
    const crmAsOf = crmRowsAsOf(crm, asOfDt);
    if (crmAsOf.length > 0) {
      const last = crmAsOf[crmAsOf.length - 1];
      const idleDays = daysBetween(last.dt, asOfDt);
      if (idleDays > 30) {
        pushFlag(
          `🔴 Relationship going quiet: last logged activity was ${idleDays} days ago (${last.date}) — ${citeSpan(crm.source, [last])}`
        );
      }
    }
  }

  const staleHigh = tickets.rows.filter(
    (t) => ticketOpenAsOf(t, asOfDt) && t.severity === 'high' && daysBetween(t.openedDt, asOfDt) > 14
  );
  for (const t of staleHigh.slice(0, 3)) {
    const age = daysBetween(t.openedDt, asOfDt);
    pushFlag(
      `🔴 High-severity ticket open ${age} days: "${mdText(t.subject || 'untitled')}" — ${citeSpan(tickets.source, [t])}`
    );
  }
  const staleHighOverflow = staleHigh.slice(3);
  if (staleHighOverflow.length > 0) {
    pushFlag(
      `🔴 ${staleHighOverflow.length} additional high-severity ticket${staleHighOverflow.length === 1 ? '' : 's'} open more than 14 days — ${refList(tickets.source, staleHighOverflow)}`,
      staleHighOverflow.length
    );
  }

  if (usage.rows.length >= 2) {
    const usageRows = usageRowsAsOf(usage, asOfDt);
    if (usageRows.length >= 2) {
      const firstWithUsers = usageRows.find((r) => r.activeUsers !== null);
      const latest = usageRows[usageRows.length - 1];
      if (
        firstWithUsers &&
        latest.activeUsers !== null &&
        firstWithUsers.activeUsers > 0 &&
        latest.periodKey !== firstWithUsers.periodKey
      ) {
        const dropPct = ((firstWithUsers.activeUsers - latest.activeUsers) / firstWithUsers.activeUsers) * 100;
        if (dropPct >= 20) {
          pushFlag(
            `🟠 Usage declining: active users down ${Math.round(dropPct)}% (${mdText(firstWithUsers.period)} → ${mdText(latest.period)}) — ${citeSpan(usage.source, [firstWithUsers, latest])}`
          );
        }
      }
    }
  }

  if (countdownDays !== null && countdownDays >= 0 && countdownDays <= 60 && crm.rangeSpan) {
    const crmAsOf = crmRowsAsOf(crm, asOfDt);
    const meetings = crmAsOf.filter((r) => isMeetingType(r.type));
    const futureMeetings = crm.rows.filter((r) => r.dt.getTime() > asOfDt.getTime() && isMeetingType(r.type));
    const recentMeeting = [...meetings].reverse().find((r) => asOfDt.getTime() - r.dt.getTime() < 30 * msDay);
    if (recentMeeting) {
      // Near renewal WITH a recent meeting: not a flag.
    } else if (meetings.length > 0) {
      const lastMeeting = meetings[meetings.length - 1];
      pushFlag(
        `🔴 Renewal within 60 days but no customer meeting/call in the last 30 days (last: ${lastMeeting.date}) — renewal \`${account.spans.renewalDate}\`, last meeting ${citeSpan(crm.source, [lastMeeting])}, search covered \`${crm.rangeSpan}\``
      );
    } else if (futureMeetings.length > 0) {
      pushFlag(
        `🔴 Renewal within 60 days but no customer meeting/call on or before as-of date in the CRM export — renewal \`${account.spans.renewalDate}\`, search covered \`${crm.rangeSpan}\``
      );
    } else {
      pushFlag(
        `🔴 Renewal within 60 days but no customer meeting/call anywhere in the CRM export — renewal \`${account.spans.renewalDate}\`, search covered \`${crm.rangeSpan}\``
      );
    }
  }

  if (countdownDays !== null && countdownDays < 0) {
    pushFlag(`🔴 Renewal date has already passed — confirm actual date — \`${account.spans.renewalDate}\``);
  }

  Object.defineProperty(flags, 'totalCount', { value: totalCount });
  return flags;
}

function stakeholderMapFromCrm(crm, asOfDt) {
  const byContact = new Map();
  for (const r of crmRowsAsOf(crm, asOfDt)) {
    const displayName = (r.contact || '').trim();
    const key = displayName.toLowerCase();
    if (!key) continue;
    const cur = byContact.get(key) || { name: displayName, role: '', last: null, count: 0, lines: [] };
    cur.count += 1;
    cur.lines.push(r);
    if (!cur.last || r.dt.getTime() >= cur.last.dt.getTime()) cur.last = r;
    if (r.role) {
      cur.role = r.role;
    }
    byContact.set(key, cur);
  }
  return [...byContact.values()].sort(
    (a, b) => b.last.dt.getTime() - a.last.dt.getTime()
  );
}

// Shared missing-evidence checklist used by every account.yaml-based brief
// (renewal + QBR): required-evidence actions first, recommended nudges after.
function renderAccountChecklist(out, completeness, account, crm, tickets, usage) {
  const missing = completeness.units.filter((u) => !u.ok);
  const recommended = [];
  if (!account.fields.owner) {
    recommended.push(
      account.empty?.owner && account.spans.owner
        ? `Fix \`owner:\` in account.yaml (empty value — \`${account.spans.owner}\`)`
        : '`owner:` in account.yaml (recommended — names the accountable CSM)'
    );
  }
  if (!account.fields.arrUsd) {
    recommended.push(
      account.empty?.arrUsd && account.spans.arrUsd
        ? `Fix \`arr_usd:\` in account.yaml (empty value — \`${account.spans.arrUsd}\`)`
        : account.spans.arrUsd
        ? `Fix \`arr_usd:\` in account.yaml (invalid value — \`${account.spans.arrUsd}\`)`
        : '`arr_usd:` in account.yaml (recommended — sizes commercial urgency)'
    );
  }

  out.push('## Missing-evidence checklist');
  out.push('');
  if (missing.length === 0 && recommended.length === 0) {
    out.push(`- [x] All required evidence present and all recommended fields filled — ${checklistEvidenceList(account, crm, tickets, usage)}.`);
  }
  for (const u of missing) {
    out.push(`- [ ] ${u.action} — required evidence (${u.label})`);
  }
  for (const rec of recommended) {
    out.push(`- [ ] ${rec.startsWith('Fix ') ? rec : `Add ${rec}`}`);
  }
  out.push('');
}

// ---------- renderer ----------

function buildRenewalBrief({ account, crm, tickets, usage, asOfDt }) {
  const completeness = computeCompleteness(account, crm, tickets, usage);
  const countdown = renewalCountdown(account, asOfDt);
  const signals = signalRows(crm, tickets, usage, asOfDt);
  const risks = riskFlags(account, crm, tickets, usage, asOfDt, countdown ? countdown.days : null);
  const stakeholders = crm.rows.length > 0 ? stakeholderMapFromCrm(crm, asOfDt) : [];

  const out = [];
  const title = account.fields.name ? mdText(account.fields.name.raw) : 'Unnamed account';
  out.push('# Renewal Readiness Brief');
  if (account.fields.name) {
    out.push(`**${title}** — \`${account.spans.name}\``);
  }
  out.push('');
  out.push(`_Generated by csm-kit v${pkg.version} · as-of ${isoOf(asOfDt)}._`);
  out.push(
    '_Every fact below cites its source span (`file#L<row>`). Facts that cannot be traced to a span are omitted and listed in the missing-evidence checklist instead._'
  );
  out.push('');

  renderCompleteness(out, completeness);

  if (countdown) {
    out.push('## Renewal countdown');
    out.push('');
    out.push(countdown.text);
    out.push('');
  }

  if (signals.length > 0) {
    out.push('## Signal table');
    out.push('');
    out.push('| Signal | Value | Source |');
    out.push('|---|---|---|');
    for (const s of signals) out.push(`| ${s.signal} | ${s.value} | ${s.source} |`);
    out.push('');
  }

  const haveEvidence = crm.rows.length > 0 || tickets.rows.length > 0 || usage.rows.length > 0;
  if (risks.length > 0) {
    out.push('## Risk flags');
    out.push('');
    for (const r of risks) out.push(`- ${r}`);
    out.push('');
  } else if (haveEvidence && completeness.present === completeness.total && noRiskRulesEvaluable(crm, tickets, usage, asOfDt)) {
    out.push('## Risk flags');
    out.push('');
    out.push(`_None triggered by the current deterministic rules._ Evidence checked: ${evidenceRangeList(account.spans.renewalDate, crm, tickets, usage)}.`);
    out.push('');
  }

  if (stakeholders.length > 0) {
    out.push('## Stakeholder map');
    out.push('');
    out.push('_Derived from the CRM activity export, most recent touch first._');
    out.push('');
    out.push('| Stakeholder | Role | Last touch | Activities | Source |');
    out.push('|---|---|---|---|---|');
    for (const s of stakeholders) {
      out.push(
        `| ${mdText(s.name)} | ${s.role ? mdText(s.role) : '—'} | ${s.last.date} (${mdText(s.last.type || 'n/a')}) | ${s.count} | ${refList(crm.source, s.lines)} |`
      );
    }
    out.push('');
  }

  // Missing-evidence checklist: everything suppressed above, actionable.
  renderAccountChecklist(out, completeness, account, crm, tickets, usage);

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

module.exports = {
  buildRenewalBrief,
  computeCompleteness,
  crmRowsAsOf,
  usageChronologicalRows,
  usageRowsAsOf,
  ticketOpenAsOf,
  riskFlags,
  stakeholderMapFromCrm,
  evidenceRangeList,
  noRiskRulesEvaluable,
  renderAccountChecklist,
  renewalDistancePhrase,
};
