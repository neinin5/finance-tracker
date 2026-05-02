import { Resend } from 'resend'
import Expense from '../models/Expense.js'
import { gbpToThb } from '../utils/currency.js'

function formatGBP(n) {
  return '£' + Number(n).toFixed(2)
}
function formatTHB(n) {
  return '฿' + Math.round(Number(n)).toLocaleString('en-GB')
}

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY)
}

async function buildSummary(userId, username) {
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const twoWeeksAgo = new Date(now)
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

  const isoWeekAgo = weekAgo.toISOString().slice(0, 10)
  const isoTwoWeeksAgo = twoWeeksAgo.toISOString().slice(0, 10)

  const allExpenses = await Expense.find({ user: userId }).lean()
  const thisWeek = allExpenses.filter((e) => e.date >= isoWeekAgo)
  const lastWeek = allExpenses.filter(
    (e) => e.date >= isoTwoWeeksAgo && e.date < isoWeekAgo
  )

  const thisWeekGBP = thisWeek.reduce((s, e) => s + e.amountGBP, 0)
  const thisWeekTHB = thisWeek.reduce((s, e) => s + e.amountTHB, 0)
  const lastWeekGBP = lastWeek.reduce((s, e) => s + e.amountGBP, 0)
  const totalSpentTHB = allExpenses.reduce((s, e) => s + e.amountTHB, 0)
  const remainingTHB = 1_500_000 - totalSpentTHB
  const remainingGBP = remainingTHB / 45

  // Top categories this week
  const byCategory = {}
  for (const e of thisWeek) {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amountTHB
  }
  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const change = lastWeekGBP > 0 ? ((thisWeekGBP - lastWeekGBP) / lastWeekGBP) * 100 : null

  return {
    username,
    rangeStart: isoWeekAgo,
    rangeEnd: now.toISOString().slice(0, 10),
    thisWeekGBP,
    thisWeekTHB,
    lastWeekGBP,
    lastWeekTHB: lastWeek.reduce((s, e) => s + e.amountTHB, 0),
    change,
    count: thisWeek.length,
    remainingGBP,
    remainingTHB,
    topCategories,
    expenses: thisWeek
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10)
  }
}

function renderSummaryHtml(s) {
  const arrow = s.change === null ? '' : s.change >= 0 ? '▲' : '▼'
  const changeColor = s.change === null
    ? '#6b7280'
    : s.change >= 0
      ? '#dc2626'
      : '#059669'
  const changeText =
    s.change === null
      ? 'No spending last week'
      : `${arrow} ${Math.abs(s.change).toFixed(1)}% vs last week`

  const catRows = s.topCategories
    .map(
      ([name, thb]) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;">${escapeHtml(name)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;text-align:right;color:#1f2937;">
          ${formatGBP(thb / 45)}
          <div style="font-size:11px;color:#9ca3af;">${formatTHB(thb)}</div>
        </td>
      </tr>`
    )
    .join('')

  const expenseRows = s.expenses
    .map(
      (e) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#6b7280;">
          ${new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
        </td>
        <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;font-size:12px;">
          ${escapeHtml(e.category)}<br>
          <span style="color:#9ca3af;font-size:11px;">${escapeHtml(e.description || '—')}</span>
        </td>
        <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:12px;color:#1f2937;">
          ${formatGBP(e.amountGBP)}
          <div style="color:#9ca3af;font-size:11px;">${formatTHB(e.amountTHB)}</div>
        </td>
      </tr>`
    )
    .join('')

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:24px;">
    <tr><td>
      <h1 style="margin:0 0 4px;font-size:20px;color:#1f2937;">Weekly Spending Summary</h1>
      <p style="margin:0 0 24px;color:#6b7280;font-size:13px;">
        Hi ${escapeHtml(s.username)} — here's your week (${s.rangeStart} → ${s.rangeEnd}).
      </p>

      <div style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:24px;border-radius:12px;margin-bottom:16px;">
        <p style="margin:0;font-size:13px;opacity:0.9;">This week's spending</p>
        <p style="margin:6px 0 0;font-size:28px;font-weight:700;">${formatGBP(s.thisWeekGBP)}</p>
        <p style="margin:4px 0 0;opacity:0.85;font-size:14px;">(${formatTHB(s.thisWeekTHB)})</p>
        <p style="margin:12px 0 0;color:#fff;font-size:13px;opacity:0.85;">
          <span style="color:${s.change === null ? '#fff' : '#fef9c3'};">${changeText}</span> · ${s.count} transactions
        </p>
      </div>

      <div style="background:white;padding:18px;border-radius:12px;margin-bottom:16px;">
        <p style="margin:0 0 4px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Remaining fund</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:#1f2937;">${formatGBP(s.remainingGBP)}</p>
        <p style="margin:2px 0 0;color:#6b7280;font-size:13px;">(${formatTHB(s.remainingTHB)})</p>
      </div>

      ${
        s.topCategories.length
          ? `<div style="background:white;padding:18px;border-radius:12px;margin-bottom:16px;">
        <h2 style="margin:0 0 12px;font-size:14px;color:#1f2937;">Top categories this week</h2>
        <table width="100%" cellpadding="0" cellspacing="0">${catRows}</table>
      </div>`
          : ''
      }

      ${
        s.expenses.length
          ? `<div style="background:white;padding:18px;border-radius:12px;margin-bottom:16px;">
        <h2 style="margin:0 0 12px;font-size:14px;color:#1f2937;">Recent transactions</h2>
        <table width="100%" cellpadding="0" cellspacing="0">${expenseRows}</table>
      </div>`
          : `<div style="background:white;padding:18px;border-radius:12px;margin-bottom:16px;color:#6b7280;font-size:13px;text-align:center;">
        No expenses recorded this week.
      </div>`
      }

      <p style="text-align:center;color:#9ca3af;font-size:11px;margin:24px 0 0;">
        Sent by UK Finance Tracker · ${new Date().getFullYear()}
      </p>
    </td></tr>
  </table>
</body>
</html>`
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendWeeklySummary({ userId, username, to }) {
  const resend = getResend()
  if (!resend) {
    throw new Error(
      'Email is not configured. Set RESEND_API_KEY in the server environment.'
    )
  }
  const recipient = to || process.env.WEEKLY_SUMMARY_TO
  if (!recipient) {
    throw new Error(
      'No recipient address. Set WEEKLY_SUMMARY_TO in the server environment or pass `to` in the request body.'
    )
  }
  const summary = await buildSummary(userId, username)
  const html = renderSummaryHtml(summary)
  const from = process.env.RESEND_FROM || 'onboarding@resend.dev'

  const { data, error } = await resend.emails.send({
    from,
    to: recipient,
    subject: `Weekly summary: ${formatGBP(summary.thisWeekGBP)} this week`,
    html
  })
  if (error) {
    throw new Error(`Resend error: ${error.message || JSON.stringify(error)}`)
  }
  return { id: data?.id, recipient, summary }
}
