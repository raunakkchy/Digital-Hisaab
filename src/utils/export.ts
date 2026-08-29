import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PersonHisaab } from '../types';
import { formatCurrency, formatDate, calculateStats } from './formatters';

/**
 * Clean CSV escape helper
 */
function escapeCsv(text: string | number | undefined | null): string {
  if (text === null || text === undefined) return '""';
  const str = String(text).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Export ALL persons into hisaab_full_data.csv
 */
export function exportAllCsv(persons: PersonHisaab[]): void {
  const headers = [
    'Person Name',
    'Mobile Number',
    'Monthly Rate (%)',
    'Monthly Interest (INR)',
    'Dena Date',
    'Total Months (incl. current)',
    'Principal Amount (INR)',
    'Total Simple Interest (INR)',
    'Current Total Amount (INR)',
    'Payment Status',
    'Paid Date',
    'Note',
  ];

  const rows = persons.map((p) => [
    escapeCsv(p.name),
    escapeCsv(p.mobile || '-'),
    escapeCsv(`${p.rate}%/mo`),
    escapeCsv(p.monthlyInterest),
    escapeCsv(p.denaDate),
    escapeCsv(p.totalMonths || (p.completedMonths + 1)),
    escapeCsv(p.principalAmount),
    escapeCsv(p.interestAmount),
    escapeCsv(p.totalAmount),
    escapeCsv(p.status.toUpperCase()),
    escapeCsv(p.paidDate || '-'),
    escapeCsv(p.note || ''),
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hisaab_full_data.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export PERSON-WISE CSV
 * Example: Rahul_hisaab.csv
 */
export function exportPersonCsv(person: PersonHisaab): void {
  const totalMos = person.totalMonths || (person.completedMonths + 1);
  const rows = [
    ['Person Name', escapeCsv(person.name)],
    ['Mobile Number', escapeCsv(person.mobile || '-')],
    ['Monthly Rate (%)', escapeCsv(`${person.rate}% per month`)],
    ['Monthly Interest (INR)', escapeCsv(person.monthlyInterest)],
    ['Dena Date', escapeCsv(person.denaDate)],
    ['Total Months (incl. current)', escapeCsv(totalMos)],
    ['Principal Amount (INR)', escapeCsv(person.principalAmount)],
    ['Total Simple Interest (INR)', escapeCsv(person.interestAmount)],
    ['Current Total Amount (INR)', escapeCsv(person.totalAmount)],
    ['Payment Status', escapeCsv(person.status.toUpperCase())],
    ['Paid Date', escapeCsv(person.paidDate || '-')],
    ['Note', escapeCsv(person.note || '-')],
    ['Created Date', escapeCsv(person.createdAt ? person.createdAt.split('T')[0] : '-')],
  ];

  const headers = ['Field', 'Value'];
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const cleanName = person.name.replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '_').substring(0, 30);
  a.download = `${cleanName || 'person'}_hisaab.csv`;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate and download Full PDF report
 */
export function exportAllPdf(persons: PersonHisaab[]): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const stats = calculateStats(persons);
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Header Banner
  doc.setFillColor(30, 41, 59); // Dark slate
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('DIGITAL HISAAB MANAGEMENT SYSTEM', 14, 13);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated on: ${currentDate} | Total Records: ${stats.totalPersons}`, 14, 22);

  // Summary Metrics Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 34, 182, 34, 3, 3, 'FD');

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text('TOTAL PERSONS', 20, 42);
  doc.text('TOTAL PRINCIPAL', 65, 42);
  doc.text('TOTAL AMOUNT', 115, 42);
  doc.text('PAID / PENDING', 160, 42);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${stats.totalPersons}`, 20, 49);
  doc.text(`Rs. ${stats.totalPrincipal.toLocaleString('en-IN')}`, 65, 49);
  doc.text(`Rs. ${stats.totalAmount.toLocaleString('en-IN')}`, 115, 49);
  doc.text(`${stats.paidPersonsCount} Paid / ${stats.pendingPersonsCount} Pend`, 160, 49);

  // Second line of summary: Paid and Pending amounts
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(22, 101, 52); // Green
  doc.text(`Paid: Rs. ${stats.totalPaidAmount.toLocaleString('en-IN')}`, 20, 60);
  doc.setTextColor(185, 28, 28); // Red
  doc.text(`Pending: Rs. ${stats.totalPendingAmount.toLocaleString('en-IN')}`, 115, 60);

  // Table of persons
  const tableData = persons.map((p, index) => [
    index + 1,
    p.name,
    p.mobile || '-',
    `${p.rate}%/mo`,
    p.denaDate,
    `${p.totalMonths || (p.completedMonths + 1)}m`,
    `Rs. ${p.principalAmount.toLocaleString('en-IN')}`,
    `Rs. ${p.interestAmount.toLocaleString('en-IN')}`,
    `Rs. ${p.totalAmount.toLocaleString('en-IN')}`,
    p.status.toUpperCase(),
  ]);

  autoTable(doc, {
    startY: 74,
    head: [['#', 'Name', 'Mobile', 'Rate', 'Date', 'Mos', 'Principal', 'Interest', 'Total', 'Status']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 32 },
      2: { cellWidth: 22 },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 20, halign: 'right' },
      8: { cellWidth: 22, halign: 'right' },
      9: { cellWidth: 15, halign: 'center' },
    },
    didParseCell: function (data) {
      if (data.section === 'body' && data.column.index === 9) {
        const text = String(data.cell.raw);
        if (text === 'PAID') {
          data.cell.styles.textColor = [22, 101, 52];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [194, 65, 12];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    foot: [
      [
        '',
        'TOTAL',
        '',
        '',
        '',
        '',
        `Rs. ${stats.totalPrincipal.toLocaleString('en-IN')}`,
        `Rs. ${stats.totalInterest.toLocaleString('en-IN')}`,
        `Rs. ${stats.totalAmount.toLocaleString('en-IN')}`,
        '',
      ],
    ],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
    },
    margin: { left: 13, right: 13 },
  });

  // Footer note
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Digital Hisaab Management System - Page ${i} of ${pageCount}`, 14, 290);
    doc.text('Authorized Hisaab Record', 160, 290);
  }

  doc.save('digital_hisaab_full_report.pdf');
}

/**
 * Generate and download Person-wise PDF report voucher
 */
export function exportPersonPdf(person: PersonHisaab): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5', // Neat voucher format for person invoice
  });

  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Header Box
  doc.setFillColor(15, 23, 42); // deep navy
  doc.rect(0, 0, 148, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DIGITAL HISAAB MANAGEMENT', 12, 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Personal Money & Interest Voucher', 12, 18);
  doc.text(`Date: ${currentDate}`, 108, 18);

  // Person Details Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, 30, 124, 28, 2, 2, 'FD');

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text('PERSON NAME / BORROWER', 16, 38);
  doc.text('MOBILE NUMBER', 80, 38);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(person.name, 16, 46);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(person.mobile || 'Not Provided', 80, 46);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Dena Date: ${formatDate(person.denaDate)}`, 16, 53);
  doc.text(`Interest Rate: ${person.rate}%`, 80, 53);

  const totalMos = person.totalMonths || (person.completedMonths + 1);

  // Financial Breakdown Table
  const items = [
    ['Principal Amount (Mool Dhan)', `Rs. ${person.principalAmount.toLocaleString('en-IN')}`],
    [`Monthly Interest (${person.rate}%/mo)`, `Rs. ${person.monthlyInterest.toLocaleString('en-IN')}`],
    ['Total Charged Months (incl. current)', `${totalMos} Months`],
    [`Total Simple Interest (${totalMos} mos)`, `Rs. ${person.interestAmount.toLocaleString('en-IN')}`],
    ['Total Amount Payable (Kul Rakam)', `Rs. ${person.totalAmount.toLocaleString('en-IN')}`],
    ['Current Payment Status', person.status.toUpperCase()],
  ];

  autoTable(doc, {
    startY: 64,
    head: [['Particulars / Hisaab Item', 'Amount / Value']],
    body: items,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: [30, 41, 59],
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 74 },
      1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: function (data) {
      if (data.section === 'body' && data.row.index === 4) {
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.textColor = [15, 23, 42];
        data.cell.styles.fontSize = 10;
      }
      if (data.section === 'body' && data.row.index === 5 && data.column.index === 1) {
        if (person.status === 'paid') {
          data.cell.styles.textColor = [22, 101, 52];
        } else {
          data.cell.styles.textColor = [194, 65, 12];
        }
      }
    },
    margin: { left: 12, right: 12 },
  });

  // Note Box if note exists
  let nextY = (doc as any).lastAutoTable.finalY + 6;
  if (person.note && person.note.trim()) {
    doc.setFillColor(254, 252, 232); // Light yellow note
    doc.setDrawColor(254, 240, 138);
    doc.roundedRect(12, nextY, 124, 18, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(133, 77, 14);
    doc.setFont('helvetica', 'bold');
    doc.text('Note / Remarks:', 16, nextY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const splitNote = doc.splitTextToSize(person.note, 116);
    doc.text(splitNote, 16, nextY + 11);
    nextY += 24;
  }

  // Signatures Section
  doc.setDrawColor(203, 213, 225);
  doc.line(16, nextY + 22, 55, nextY + 22);
  doc.line(85, nextY + 22, 124, nextY + 22);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Giver Signature', 20, nextY + 27);
  doc.text('Receiver Signature', 88, nextY + 27);

  const cleanName = person.name.replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '_').substring(0, 25);
  doc.save(`${cleanName || 'hisaab'}_voucher.pdf`);
}
