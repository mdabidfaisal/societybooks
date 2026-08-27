// Shared report export utilities: Excel (.xls) download + print-to-PDF.
//
// PDF: opens a print-ready document in a new window with the society name in
// the header (repeated on every page) and "Powered by <company>" in the
// footer. In Chrome/Edge the user can save it as a PDF via the print dialog.
// XLS: generates a SpreadsheetML 2003 .xls file (opens natively in Excel).

export interface ReportSociety {
  name?: string
  code?: string
  address?: string
  phone?: string
}

export interface ReportTotal {
  label: string
  value: string
}

export interface ReportData {
  filename: string
  title: string
  subtitle?: string
  headers: string[]
  rows: (string | number)[][]
  totals?: ReportTotal[]
  /** 'portrait' (default) or 'landscape' for wide tables */
  orientation?: 'portrait' | 'landscape'
}

const COMPANY = { name: 'CodeProphet', url: 'https://codeprophet.com.bd' }

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function text(value: string | number | null | undefined): string {
  return String(value ?? '')
}

function downloadBlob(content: string, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

// ────────────────────────────────────────────────────────────
// Excel (.xls) — SpreadsheetML 2003
// ────────────────────────────────────────────────────────────

export function exportToExcel(filename: string, sheetName: string, headers: string[], rows: (string | number)[][]) {
  const safeSheet = sheetName.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Sheet1'
  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const cell = (value: string | number) => {
    const isNum = typeof value === 'number' && Number.isFinite(value)
    const type = isNum ? 'Number' : 'String'
    return `<Cell><Data ss:Type="${type}">${esc(isNum ? String(value) : text(value))}</Data></Cell>`
  }

  const headerRow = `<Row ss:StyleID="Header">${headers.map((h) => `<Cell><Data ss:Type="String">${esc(h)}</Data></Cell>`).join('')}</Row>`
  const bodyRows = rows.map((r) => `<Row>${r.map(cell).join('')}</Row>`).join('')

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Bottom"/></Style>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1D4ED8" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${esc(safeSheet)}">
  <Table>
   ${headerRow}
   ${bodyRows}
  </Table>
 </Worksheet>
</Workbook>`

  downloadBlob(xml, 'application/vnd.ms-excel', `${filename}.xls`)
}

// ────────────────────────────────────────────────────────────
// Print-to-PDF
// ────────────────────────────────────────────────────────────

function buildPrintHTML(data: ReportData, samiti?: ReportSociety | null): string {
  const now = new Date().toLocaleString('en-BD', { dateStyle: 'long', timeStyle: 'short' })
  const headerLines: string[] = []
  const addrLine = [samiti?.address, samiti?.phone].filter(Boolean).join(' · ')
  if (addrLine) headerLines.push(`<div class="muted">${escapeHtml(addrLine)}</div>`)
  if (samiti?.code) headerLines.push(`<div class="muted">Samiti Code: ${escapeHtml(samiti.code)}</div>`)

  // Right-align columns whose first row value is numeric
  const numericCols = data.headers.map((_, colIdx) => {
    const sample = data.rows.find((row) => row[colIdx] !== '' && row[colIdx] != null)
    return typeof sample?.[colIdx] === 'number'
  })

  // Column widths: proportional to the longest cell (header or body), so text
  // columns get more room and numeric columns stay compact. table-layout: fixed
  // then guarantees the table always fits the page and never clips content.
  const widths = data.headers.map((h, colIdx) => {
    const maxLen = Math.max(
      h.length,
      ...data.rows.map((row) => text(row[colIdx] ?? '').length)
    )
    return numericCols[colIdx] ? Math.max(maxLen, 8) : Math.max(maxLen, 6)
  })
  const totalWeight = widths.reduce((s, w) => s + w, 0)
  const colgroup = widths.map((w) => {
    const pct = Math.max(4, Math.round((w / totalWeight) * 100))
    return `<col style="width: ${pct}%">`
  }).join('')

  const bodyRows = data.rows.map((row) => {
    const cells = row.map((c, i) => {
      const cls = numericCols[i] ? ' class="num"' : ''
      return `<td${cls}>${escapeHtml(text(c))}</td>`
    }).join('')
    return `<tr>${cells}</tr>`
  }).join('')

  const headCellsRendered = data.headers.map((h, i) => `<th${numericCols[i] ? ' class="num"' : ''}>${escapeHtml(h)}</th>`).join('')

  const totalsBlock = data.totals && data.totals.length > 0
    ? `<div class="totals">
         ${data.totals.map((t) => `<div><span>${escapeHtml(t.label)}</span><strong>${escapeHtml(t.value)}</strong></div>`).join('')}
       </div>`
    : ''

  const landscape = data.orientation === 'landscape'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(data.title)}</title>
<style>
  @media print {
    @page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 14mm; }
    body { margin: 0; padding: 0; }
  }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    color: #111827;
    margin: 0;
  }
  .doc-header {
    text-align: center;
    padding-bottom: 4mm;
    margin-bottom: 5mm;
    border-bottom: 2px solid #1D4ED8;
  }
  .doc-header .society { font-size: 17px; font-weight: 700; color: #1D4ED8; letter-spacing: 0.3px; }
  .doc-header .muted { font-size: 10px; color: #6B7280; margin-top: 1px; }
  .doc-header .report { font-size: 15px; font-weight: 700; color: #111827; margin-top: 5px; }
  .doc-header .subtitle { font-size: 10.5px; color: #374151; margin-top: 2px; }
  .doc-footer {
    margin-top: 8mm;
    padding-top: 3mm;
    border-top: 1px solid #E5E7EB;
    text-align: center;
    font-size: 9px;
    color: #6B7280;
  }
  .doc-footer a { color: #1D4ED8; text-decoration: none; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  th, td {
    border: 1px solid #64748B;
    padding: 5px 7px;
    text-align: left;
    vertical-align: middle;
    font-size: 10px;
    line-height: 1.35;
    overflow-wrap: break-word;
    word-break: break-word;
  }
  th {
    background: #1D4ED8 !important;
    color: #ffffff;
    font-weight: 600;
    vertical-align: middle;
    border-color: #1E40AF;
  }
  td.num, th.num { text-align: right; }
  tbody tr:nth-child(even) td { background: #F1F5F9; }
  .totals {
    margin-top: 5mm;
    border-top: 2px solid #1D4ED8;
    padding-top: 3mm;
    text-align: right;
    font-size: 11px;
  }
  .totals div { margin-top: 2px; }
  .totals span { color: #475569; margin-right: 14px; }
  .totals strong { font-size: 12px; color: #111827; }
  .generated { margin-top: 4mm; font-size: 9px; color: #94A3B8; text-align: center; }
  .generated a { color: #1D4ED8; text-decoration: none; }
</style>
</head>
<body>
  <div class="doc-header">
    <div class="society">${escapeHtml(samiti?.name || 'Samabaya Samiti')}</div>
    ${headerLines.join('\n    ')}
    <div class="report">${escapeHtml(data.title)}</div>
    ${data.subtitle ? `<div class="subtitle">${escapeHtml(data.subtitle)}</div>` : ''}
  </div>

  <div class="content">
    <table>
      <colgroup>
        ${colgroup}
      </colgroup>
      <thead><tr>${headCellsRendered}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
    ${totalsBlock}
    <div class="generated">${escapeHtml(COMPANY.name)} &middot; <a href="${escapeHtml(COMPANY.url)}">${escapeHtml(COMPANY.url)}</a></div>
  </div>

  <div class="doc-footer">Powered by <a href="${escapeHtml(COMPANY.url)}">${escapeHtml(COMPANY.name)}</a> · Generated on ${escapeHtml(now)}</div>
</body>
</html>`
}

export function printReport(data: ReportData, samiti?: ReportSociety | null) {
  const html = buildPrintHTML(data, samiti)
  const win = window.open('', '_blank', 'width=960,height=720')
  if (!win) {
    alert('Please allow pop-ups to generate the PDF.')
    return
  }

  win.document.write(html)
  win.document.close()
  win.focus()

  let printed = false
  const doPrint = () => {
    if (printed) return
    printed = true
    win.focus()
    win.print()
  }
  win.onload = doPrint
  setTimeout(doPrint, 600)
}
