import { stringify } from 'csv-stringify/sync'
import PDFDocument from 'pdfkit'
import Expense from '../models/Expense.js'
import { gbpToThb } from '../utils/currency.js'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FONT_REGULAR = path.join(__dirname, '../fonts/Sarabun-Regular.ttf')
const FONT_BOLD    = path.join(__dirname, '../fonts/Sarabun-Bold.ttf')

function formatGBP(n) {
  return '£' + Number(n).toFixed(2)
}
function formatTHB(n) {
  return '฿' + Math.round(Number(n)).toLocaleString('en-GB')
}
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export async function buildCsv(userId) {
  const expenses = await Expense.find({ user: userId })
    .sort({ date: -1, createdAt: -1 })
    .lean()
  const rows = expenses.map((e) => ({
    Date: e.date,
    Category: e.category,
    Description: e.description || '',
    Note: e.note || '',
    'Amount (GBP)': Number(e.amountGBP).toFixed(2),
    'Amount (THB)': Math.round(e.amountTHB),
    Source: e.source
  }))
  return stringify(rows, { header: true })
}

export async function buildPdf(userId, username) {
  const expenses = await Expense.find({ user: userId })
    .sort({ date: -1, createdAt: -1 })
    .lean()

  const totalGBP = expenses.reduce((s, e) => s + e.amountGBP, 0)
  const totalTHB = expenses.reduce((s, e) => s + e.amountTHB, 0)
  const initialFundTHB = 1_500_000
  const remainingTHB = initialFundTHB - totalTHB
  const remainingGBP = remainingTHB / 45

  const doc = new PDFDocument({ size: 'A4', margin: 40 })
  // Register Thai-capable fonts so Thai script renders correctly
  doc.registerFont('Thai', FONT_REGULAR)
  doc.registerFont('Thai-Bold', FONT_BOLD)
  const chunks = []
  doc.on('data', (c) => chunks.push(c))

  // Header
  doc.font('Thai-Bold').fontSize(20).fillColor('#1f2937').text('UK Finance Tracker', { align: 'left' })
  doc.font('Thai').fontSize(10).fillColor('#6b7280').text('Expense Report', { align: 'left' })
  doc.moveDown(0.5)
  doc.font('Thai').fontSize(9).fillColor('#9ca3af').text(
    `Account: ${username || 'unknown'}  ·  Generated: ${new Date().toLocaleString('en-GB')}`
  )
  doc.moveDown(1)

  // Summary box
  const summaryY = doc.y
  doc.rect(40, summaryY, 515, 70).fillAndStroke('#f3f4f6', '#e5e7eb')
  doc.font('Thai').fillColor('#1f2937').fontSize(10)
  doc.text('Total spent', 55, summaryY + 12)
  doc.fontSize(13).text(`${formatGBP(totalGBP)}  (${formatTHB(totalTHB)})`, 55, summaryY + 28)
  doc.fontSize(10).fillColor('#1f2937').text('Remaining balance', 280, summaryY + 12)
  doc.fontSize(13).text(`${formatGBP(remainingGBP)}  (${formatTHB(remainingTHB)})`, 280, summaryY + 28)
  doc.fontSize(10).fillColor('#6b7280').text(`${expenses.length} records`, 55, summaryY + 50)
  doc.text(`Initial fund: ${formatTHB(initialFundTHB)}`, 280, summaryY + 50)

  doc.y = summaryY + 90
  doc.x = 40

  // Table header
  doc.font('Thai').fontSize(11).fillColor('#1f2937').text('Expenses', { underline: false })
  doc.moveDown(0.3)

  const cols = [
    { x: 40, w: 70, label: 'Date' },
    { x: 110, w: 110, label: 'Category' },
    { x: 220, w: 200, label: 'Description' },
    { x: 425, w: 60, label: 'GBP', align: 'right' },
    { x: 490, w: 65, label: 'THB', align: 'right' }
  ]

  function drawHeader() {
    const y = doc.y
    doc.rect(40, y - 2, 515, 18).fill('#f9fafb')
    doc.fillColor('#374151').fontSize(9).font('Thai-Bold')
    cols.forEach((c) => {
      doc.text(c.label, c.x + 4, y + 2, { width: c.w - 8, align: c.align || 'left' })
    })
    doc.font('Thai')
    doc.y = y + 18
  }
  drawHeader()

  // Rows
  doc.font('Thai').fontSize(8.5).fillColor('#1f2937')
  for (const e of expenses) {
    if (doc.y > 770) {
      doc.addPage()
      doc.y = 40
      drawHeader()
    }
    const y = doc.y
    doc.text(formatDate(e.date), cols[0].x + 4, y + 2, {
      width: cols[0].w - 8,
      align: cols[0].align || 'left'
    })
    doc.text(e.category, cols[1].x + 4, y + 2, {
      width: cols[1].w - 8,
      align: cols[1].align || 'left'
    })
    doc.text(e.description || '—', cols[2].x + 4, y + 2, {
      width: cols[2].w - 8,
      align: cols[2].align || 'left',
      ellipsis: true,
      lineBreak: false
    })
    doc.text(formatGBP(e.amountGBP), cols[3].x + 4, y + 2, {
      width: cols[3].w - 8,
      align: 'right'
    })
    doc.text(formatTHB(e.amountTHB), cols[4].x + 4, y + 2, {
      width: cols[4].w - 8,
      align: 'right'
    })
    doc.y = y + 16
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#f3f4f6').stroke()
  }

  doc.end()
  await new Promise((resolve) => doc.on('end', resolve))
  return Buffer.concat(chunks)
}
