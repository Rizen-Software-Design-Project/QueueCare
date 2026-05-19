// This file has two helper functions for downloading data as a spreadsheet (CSV) or a PDF.
// You need to install jsPDF first: run 'npm install jspdf jspdf-autotable'

// exportCSV - takes a list of data rows and lets the user download them as a spreadsheet file
export function exportCSV(data, filename = 'report') {
  if (!data?.length) return

  const headers = Object.keys(data[0])

  const escape = (val) => {
    if (val === null || val === undefined) return ''
    const str = String(val)
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str
  }

  const rows = [
    headers.join(','),
    ...data.map(row => headers.map(h => escape(row[h])).join(',')),
  ]

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = `${filename}-${today()}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// exportPDF - takes a list of data rows and creates a downloadable PDF report with a table and title
export async function exportPDF(data, { title = 'Analytics Report', columns, filename = 'report' } = {}) {
  if (!data?.length) return

  // Load the PDF libraries only when we need them - this keeps the app fast
  const { default: jsPDF }    = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Write the QueueCare title and report name at the top of the PDF
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)   // slate-900
  doc.text('QueueCare', 14, 16)

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(51, 65, 85)   // slate-700
  doc.text(title, 14, 24)

  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184) // slate-400
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 30)

  // Draw a thin horizontal line under the header
  doc.setDrawColor(226, 232, 240) // slate-200
  doc.setLineWidth(0.3)
  doc.line(14, 33, 283, 33)

  // Draw the main data table in the PDF
  const cols = columns ?? Object.keys(data[0]).map(k => ({ header: k, dataKey: k }))

  autoTable(doc, {
    startY: 38,
    columns: cols,
    body: data,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [51, 65, 85],
    },
    headStyles: {
      fillColor: [20, 184, 166],  // teal-500
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.1,
    margin: { left: 14, right: 14 },
  })

  // Write a small page number at the bottom of every page
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.text(
      `Page ${i} of ${pageCount}  ·  QueueCare Analytics`,
      14,
      doc.internal.pageSize.getHeight() - 8,
    )
  }

    // Show the finished PDF in a new browser tab and also start downloading it
  const pdfBlob = doc.output('blob')
  const pdfUrl = URL.createObjectURL(pdfBlob)

  // Open preview in a new tab
  window.open(pdfUrl, '_blank')

  // Also trigger download
  const link = document.createElement('a')
  link.href = pdfUrl
  link.download = `${filename}-${today()}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Delay revoke so the new tab has time to load
  setTimeout(() => {
    URL.revokeObjectURL(pdfUrl)
  }, 10000)
}

// Small helper - returns today's date as a string (e.g. 2025-07-20)
function today() {
  return new Date().toISOString().split('T')[0]
}