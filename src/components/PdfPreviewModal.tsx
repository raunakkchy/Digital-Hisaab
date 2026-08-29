import { useState, useEffect, useRef } from 'react';
import {
  X,
  FileDown,
  Printer,
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  Clock,
  User,
  Phone,
  Calendar,
  IndianRupee,
  FileText,
  Eye,
  Percent,
} from 'lucide-react';
import { PersonHisaab, Language } from '../types';
import {
  formatCurrency,
  formatDate,
  calculateStats,
  generateProfessionalWhatsAppMessage,
} from '../utils/formatters';
import {
  exportPersonPdf,
  exportAllPdf,
  getPersonPdfBlobUrl,
  getAllPdfBlobUrl,
} from '../utils/export';

interface PdfPreviewModalProps {
  isOpen: boolean;
  title: string;
  docType: 'person_voucher' | 'full_report';
  person?: PersonHisaab | null;
  persons?: PersonHisaab[];
  lang: Language;
  onClose: () => void;
}

export function PdfPreviewModal({
  isOpen,
  title,
  docType,
  person,
  persons = [],
  lang,
  onClose,
}: PdfPreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'pdf' | 'slip'>('pdf');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Generate and manage PDF Blob URL
  useEffect(() => {
    if (!isOpen) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      return;
    }

    try {
      let url = '';
      if (docType === 'person_voucher' && person) {
        url = getPersonPdfBlobUrl(person);
      } else if (docType === 'full_report') {
        url = getAllPdfBlobUrl(persons);
      }
      setBlobUrl(url);

      return () => {
        if (url) URL.revokeObjectURL(url);
      };
    } catch (err) {
      console.error('Failed to generate PDF blob:', err);
    }
  }, [isOpen, docType, person, persons]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (docType === 'person_voucher' && person) {
      exportPersonPdf(person);
    } else {
      exportAllPdf(persons);
    }
  };

  const handlePrint = () => {
    if (viewMode === 'slip') {
      window.print();
      return;
    }
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch {
        // Fallback
      }
    }
    if (blobUrl) {
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
        printWindow.print();
      }
    }
  };

  const handleShare = async () => {
    if (docType === 'person_voucher' && person) {
      const msg = generateProfessionalWhatsAppMessage(person, lang);
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Hisaab Voucher - ${person.name}`,
            text: msg,
          });
          return;
        } catch {
          // User cancelled
        }
      }
      navigator.clipboard.writeText(msg);
      alert(lang === 'hi' ? 'विवरण क्लिपबोर्ड पर कॉपी हो गया!' : 'Statement copied to clipboard!');
    } else {
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Digital Hisaab Full Report',
            text: `Digital Hisaab Full Summary Report - ${persons.length} accounts.`,
          });
        } catch {
          // Cancelled
        }
      }
    }
  };

  const stats = calculateStats(persons);
  const todayFormatted = formatDate(new Date().toISOString().split('T')[0], lang);

  return (
    <div
      id="modal-backdrop-pdf-preview"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="modal-card-pdf-preview"
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full my-auto overflow-hidden flex flex-col h-[92vh] max-h-[92vh]"
      >
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 truncate">
                {title}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {lang === 'hi' ? 'लाइव प्रिंट व डाउनलोड प्रिव्यू' : 'Live Print & Download Preview'}
              </p>
            </div>
          </div>

          {/* Mode switch (PDF document vs Visual Slip) */}
          <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-700/60 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('pdf')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                viewMode === 'pdf'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{lang === 'hi' ? 'PDF फाइल' : 'PDF File'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('slip')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                viewMode === 'slip'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{lang === 'hi' ? 'रसीद स्लिप' : 'Receipt Slip'}</span>
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1 sm:gap-2">
            {viewMode === 'pdf' && (
              <div className="hidden md:flex items-center gap-1 mr-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(z - 15, 60))}
                  className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono font-bold px-1 text-slate-600 dark:text-slate-300">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(z + 15, 160))}
                  className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(100)}
                  className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            )}

            <button
              id="btn-preview-print"
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Print PDF / Slip"
            >
              <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span className="hidden sm:inline">{lang === 'hi' ? 'प्रिंट' : 'Print'}</span>
            </button>

            <button
              id="btn-preview-share"
              type="button"
              onClick={handleShare}
              className="p-2 rounded-xl text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Share"
            >
              <Share2 className="w-4 h-4 text-emerald-600" />
            </button>

            <button
              id="btn-preview-download-direct"
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-98 transition shadow-xs cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>{lang === 'hi' ? 'PDF डाउनलोड' : 'Download PDF'}</span>
            </button>

            <button
              id="btn-close-pdf-preview"
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Content Area */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-950 overflow-y-auto p-2 sm:p-4 flex items-center justify-center">
          {viewMode === 'pdf' ? (
            /* PDF Iframe / Object View */
            blobUrl ? (
              <div
                className="w-full h-full rounded-xl overflow-hidden bg-white shadow-md border border-slate-200 dark:border-slate-800 flex flex-col"
                style={{
                  transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease',
                }}
              >
                <iframe
                  ref={iframeRef}
                  src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                  className="w-full h-full border-none rounded-xl bg-white"
                  title="PDF Live Preview"
                />
              </div>
            ) : (
              <div className="text-center p-8 text-slate-400">
                <p>{lang === 'hi' ? 'PDF लोड हो रहा है...' : 'Generating PDF Preview...'}</p>
              </div>
            )
          ) : (
            /* High-Contrast Interactive Slip / Voucher Mode (Ideal for instant mobile view & Print) */
            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 animate-in zoom-in-95">
              {docType === 'person_voucher' && person ? (
                <>
                  {/* Voucher Header */}
                  <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 block">
                        DIGITAL HISAAB RECEIPT & VOUCHER
                      </span>
                      <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                        {person.name}
                      </h1>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                          person.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {person.status === 'paid' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>PAID / चुकता</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            <span>PENDING / बाकी देय</span>
                          </>
                        )}
                      </span>
                      <p className="text-xs text-slate-400 mt-1">Date: {todayFormatted}</p>
                    </div>
                  </div>

                  {/* Customer / Loan Meta */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">खातेदार (Borrower)</span>
                      <strong className="text-slate-900 dark:text-slate-100 text-sm">{person.name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">मोबाइल नंबर (Mobile)</span>
                      <strong className="text-slate-900 dark:text-slate-100 text-sm">
                        {person.mobile || 'Not Provided'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">उधार तारीख (Dena Date)</span>
                      <strong className="text-slate-900 dark:text-slate-100 text-sm">
                        {formatDate(person.denaDate, lang)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">ब्याज दर (Rate)</span>
                      <strong className="text-amber-600 dark:text-amber-400 text-sm font-black">
                        {person.rate}% प्रति माह
                      </strong>
                    </div>
                  </div>

                  {/* Financial Breakdown Table */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-900 text-white font-bold">
                        <tr>
                          <th className="p-3">हिसाब विवरण (Particulars)</th>
                          <th className="p-3 text-right">राशि / मूल्य (Amount)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        <tr>
                          <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                            मूलधन राशि (Principal Mool Dhan)
                          </td>
                          <td className="p-3 text-right font-black text-slate-900 dark:text-slate-100">
                            {formatCurrency(person.principalAmount)}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                            मासिक ब्याज दर ({person.rate}% / महीना)
                          </td>
                          <td className="p-3 text-right font-bold text-amber-600 dark:text-amber-400">
                            {formatCurrency(person.monthlyInterest)} / माह
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                            कुल गणना महीने (Charged Months)
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900 dark:text-slate-100">
                            {person.totalMonths || (person.completedMonths + 1)} महीने
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                            कुल साधारण ब्याज (Total Simple Interest)
                          </td>
                          <td className="p-3 text-right font-bold text-amber-600 dark:text-amber-400">
                            +{formatCurrency(person.interestAmount)}
                          </td>
                        </tr>
                        <tr className="bg-slate-100/90 dark:bg-slate-800 font-extrabold text-sm">
                          <td className="p-3 text-slate-900 dark:text-slate-100">
                            कुल देय रकम (Grand Total Payable)
                          </td>
                          <td className="p-3 text-right text-base text-slate-900 dark:text-slate-100 font-black">
                            {formatCurrency(person.totalAmount)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Note Section if exists */}
                  {person.note && (
                    <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                      <strong>टिप्पणी / Note:</strong> {person.note}
                    </div>
                  )}

                  {/* Signatures */}
                  <div className="pt-6 border-t border-dashed border-slate-300 dark:border-slate-700 grid grid-cols-2 gap-8 text-center text-xs text-slate-500">
                    <div>
                      <div className="border-b border-slate-400 dark:border-slate-600 w-3/4 mx-auto mb-2 pt-6"></div>
                      <span>देने वाले के हस्ताक्षर (Lender Signature)</span>
                    </div>
                    <div>
                      <div className="border-b border-slate-400 dark:border-slate-600 w-3/4 mx-auto mb-2 pt-6"></div>
                      <span>लेने वाले के हस्ताक्षर (Borrower Signature)</span>
                    </div>
                  </div>
                </>
              ) : (
                /* Full Ledger Summary Slip */
                <>
                  <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">
                        DIGITAL HISAAB FULL LEDGER REPORT
                      </h1>
                      <p className="text-xs text-slate-400">Generated on {todayFormatted}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
                        {persons.length} Records
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                    <div>
                      <span className="text-slate-400 block">कुल मूलधन (Principal)</span>
                      <strong className="text-slate-900 dark:text-slate-100 text-sm">
                        {formatCurrency(stats.totalPrincipal)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">कुल ब्याज (Interest)</span>
                      <strong className="text-amber-600 dark:text-amber-400 text-sm">
                        {formatCurrency(stats.totalInterest)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">कुल प्राप्त रकम (Paid)</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatCurrency(stats.totalPaidAmount)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">कुल बकाया रकम (Pending)</span>
                      <strong className="text-rose-600 dark:text-rose-400 text-sm">
                        {formatCurrency(stats.totalPendingAmount)}
                      </strong>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-900 text-white font-bold">
                        <tr>
                          <th className="p-2.5">#</th>
                          <th className="p-2.5">खातेदार</th>
                          <th className="p-2.5">तारीख</th>
                          <th className="p-2.5">दर</th>
                          <th className="p-2.5 text-right">मूलधन</th>
                          <th className="p-2.5 text-right">कुल देय</th>
                          <th className="p-2.5 text-center">स्थिति</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {persons.map((p, idx) => (
                          <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 font-bold">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100">{p.name}</td>
                            <td className="p-2.5 text-slate-500">{p.denaDate}</td>
                            <td className="p-2.5 text-amber-600 font-bold">{p.rate}%</td>
                            <td className="p-2.5 text-right font-semibold">{formatCurrency(p.principalAmount)}</td>
                            <td className="p-2.5 text-right font-bold text-slate-900 dark:text-slate-100">
                              {formatCurrency(p.totalAmount)}
                            </td>
                            <td className="p-2.5 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  p.status === 'paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-900'
                                }`}
                              >
                                {p.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
