import React, { useState } from 'react';
import {
  X,
  Phone,
  Calendar,
  Percent,
  FileSpreadsheet,
  FileDown,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  MessageCircle,
  Share2,
  Calculator,
  Copy,
  Check,
  Send,
  Sparkles,
  IndianRupee,
  History,
  CreditCard,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  PlusCircle,
} from 'lucide-react';
import { PersonHisaab, Language, MonthlyInterestRecord } from '../types';
import {
  formatCurrency,
  formatDate,
  generateProfessionalWhatsAppMessage,
  getWhatsAppUrl,
  i18n,
} from '../utils/formatters';
import { exportPersonCsv, exportPersonPdf } from '../utils/export';

interface PersonDetailsModalProps {
  isOpen: boolean;
  person: PersonHisaab | null;
  lang: Language;
  onClose: () => void;
  onEdit: (person: PersonHisaab) => void;
  onDelete: (person: PersonHisaab) => void;
  onToggleStatus: (person: PersonHisaab) => void;
  onPayInterest?: (
    personId: string,
    monthRecordId: string,
    paymentData: {
      paymentDate: string;
      amount: number;
      paymentMethod?: string;
      note?: string;
    }
  ) => void;
  onToggleInterestRecord?: (personId: string, monthRecordId: string) => void;
}

export function PersonDetailsModal({
  isOpen,
  person,
  lang,
  onClose,
  onEdit,
  onDelete,
  onToggleStatus,
  onPayInterest,
  onToggleInterestRecord,
}: PersonDetailsModalProps) {
  const [waLanguage, setWaLanguage] = useState<Language>(lang);
  const [customMsgNote, setCustomMsgNote] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [showWaPreview, setShowWaPreview] = useState<boolean>(false);

  // Pay Interest Dialog State
  const [payInterestModalOpen, setPayInterestModalOpen] = useState(false);
  const [selectedMonthId, setSelectedMonthId] = useState<string>('');
  const [payAmount, setPayAmount] = useState<number | string>('');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState<string>('cash');
  const [payNote, setPayNote] = useState<string>('');

  if (!isOpen || !person) return null;

  const t = i18n[lang];
  const isInterestOnly = person.paymentMode === 'interest_only';
  const interestRecords = person.interestRecords || [];
  const interestPayments = person.interestPayments || [];
  const pendingRecords = interestRecords.filter((r) => r.status === 'pending');
  const paidRecords = interestRecords.filter((r) => r.status === 'paid');

  const waFormattedMessage = generateProfessionalWhatsAppMessage(
    person,
    waLanguage,
    customMsgNote.trim() || undefined
  );

  const handleWhatsAppSend = () => {
    if (!person.mobile) {
      alert(lang === 'hi' ? 'कृपया पहले मोबाइल नंबर दर्ज करें।' : 'Please enter a mobile number first.');
      return;
    }
    const url = getWhatsAppUrl(person.mobile, waFormattedMessage);
    window.open(url, '_blank');
  };

  const handleCopyWhatsAppMessage = async () => {
    try {
      await navigator.clipboard.writeText(waFormattedMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleCall = () => {
    if (!person.mobile) return;
    window.location.href = `tel:${person.mobile}`;
  };

  const handleShareSummary = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Hisaab - ${person.name}`,
          text: waFormattedMessage,
        });
      } catch {
        // User cancelled or not supported
      }
    } else {
      handleCopyWhatsAppMessage();
    }
  };

  // Open Pay Interest Dialog
  const handleOpenPayInterest = (recordId?: string) => {
    const targetId = recordId || (pendingRecords.length > 0 ? pendingRecords[0].id : interestRecords[0]?.id || '');
    setSelectedMonthId(targetId);
    const targetRecord = interestRecords.find((r) => r.id === targetId);
    setPayAmount(targetRecord ? targetRecord.interestAmount : person.monthlyInterest);
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMethod('cash');
    setPayNote('');
    setPayInterestModalOpen(true);
  };

  const handleSaveInterestPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMonthId) return;
    const numAmt = Number(payAmount) || person.monthlyInterest;
    if (onPayInterest) {
      onPayInterest(person.id, selectedMonthId, {
        paymentDate: payDate,
        amount: numAmt,
        paymentMethod: payMethod,
        note: payNote.trim() || undefined,
      });
    }
    setPayInterestModalOpen(false);
  };

  return (
    <div
      id="modal-backdrop-details"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="modal-card-person-details"
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Payment Status Badge */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                person.status === 'paid'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}
            >
              {person.status === 'paid' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t.statusPaid}</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  <span>{t.statusPending}</span>
                </>
              )}
            </span>

            {/* Payment Mode Tag */}
            {isInterestOnly ? (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                <span>{t.modeInterestOnly}</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                <Calculator className="w-3 h-3 text-slate-500" />
                <span>{t.modeStandard}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              id="btn-share-details"
              type="button"
              onClick={handleShareSummary}
              className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
              title="Share Summary"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              id="btn-close-details-modal"
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {/* Person Name & Mobile Card */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mb-1 break-words">
                  {person.name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'hi' ? 'उधार तारीख' : 'Given Date'}: {formatDate(person.denaDate, lang)} • {person.rate}% {lang === 'hi' ? 'प्रति माह' : '/mo'}
                </p>
              </div>
              {isInterestOnly && (
                <button
                  type="button"
                  id="btn-top-pay-interest"
                  onClick={() => handleOpenPayInterest()}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{t.payInterestBtn}</span>
                </button>
              )}
            </div>

            {person.mobile ? (
              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
                  <Phone className="w-4 h-4 text-amber-500" />
                  <a href={`tel:${person.mobile}`} className="hover:underline text-amber-600 dark:text-amber-400 font-semibold">
                    {person.mobile}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    id="btn-call-person"
                    type="button"
                    onClick={handleCall}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 transition shadow-2xs"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t.callPerson}</span>
                  </button>
                  <button
                    id="btn-whatsapp-person"
                    type="button"
                    onClick={() => setShowWaPreview(!showWaPreview)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200 transition shadow-2xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{showWaPreview ? (lang === 'hi' ? 'विवरण छुपाएं' : 'Hide WhatsApp') : (lang === 'hi' ? 'व्हाट्सएप भेजें' : 'WhatsApp')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic mt-2">
                {lang === 'hi' ? 'कोई मोबाइल नंबर दर्ज नहीं है' : 'No mobile number provided'}
              </p>
            )}
          </div>

          {/* INTEREST ONLY SPECIFIC SECTION */}
          {isInterestOnly ? (
            <div className="space-y-4">
              {/* 4 Quick Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. Principal Amount */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>{t.originalPrincipal}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-semibold">
                      {lang === 'hi' ? 'स्थिर' : 'Fixed'}
                    </span>
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                    {formatCurrency(person.principalAmount)}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {lang === 'hi' ? 'मूलधन हमेशा स्थिर रहेगा' : 'Principal remains untouched'}
                  </p>
                </div>

                {/* 2. Monthly Interest */}
                <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40">
                  <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                    {lang === 'hi' ? 'मासिक ब्याज' : 'Monthly Interest'}
                  </div>
                  <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                    {formatCurrency(person.monthlyInterest)}
                  </div>
                  <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                    {person.rate}% {lang === 'hi' ? 'प्रति माह' : 'per month'}
                  </p>
                </div>

                {/* 3. Total Interest Paid */}
                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40">
                  <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                    {lang === 'hi' ? 'कुल जमा ब्याज' : 'Total Interest Paid'}
                  </div>
                  <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatCurrency(person.totalInterestPaid || 0)}
                  </div>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {paidRecords.length} {lang === 'hi' ? 'माह चुकता' : 'mos paid'}
                  </p>
                </div>

                {/* 4. Current Interest Due */}
                <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/40">
                  <div className="text-[11px] font-bold text-rose-800 dark:text-rose-300">
                    {lang === 'hi' ? 'वर्तमान बाकी ब्याज' : 'Current Interest Due'}
                  </div>
                  <div className="text-lg font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                    {formatCurrency(person.currentInterestDue || 0)}
                  </div>
                  <p className="text-[10px] text-rose-700 dark:text-rose-300 mt-0.5">
                    {pendingRecords.length} {lang === 'hi' ? 'माह बाकी' : 'mos due'}
                  </p>
                </div>
              </div>

              {/* Total Payable Banner */}
              <div className="p-4 rounded-xl bg-slate-900 text-white dark:bg-slate-800 border border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-slate-300 block">
                    {lang === 'hi' ? 'कुल देय (मूलधन + बाकी ब्याज)' : 'Total Due (Principal + Due Interest)'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {formatCurrency(person.principalAmount)} + {formatCurrency(person.currentInterestDue || 0)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-amber-400">
                    {formatCurrency(person.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Pay Interest Big Action Button */}
              {pendingRecords.length > 0 && (
                <button
                  type="button"
                  id="btn-pay-interest-main"
                  onClick={() => handleOpenPayInterest()}
                  className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 cursor-pointer"
                >
                  <IndianRupee className="w-4 h-4" />
                  <span>
                    {lang === 'hi'
                      ? `ब्याज जमा करें (Pay Interest - ₹${person.monthlyInterest})`
                      : `Pay Interest (₹${person.monthlyInterest})`}
                  </span>
                </button>
              )}

              {/* Monthly Interest Schedule Table / Cards */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-4 py-3 bg-slate-100/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {lang === 'hi' ? 'मासिक ब्याज रिकॉर्ड' : 'Monthly Interest Records'}
                    </span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                      {interestRecords.length} {lang === 'hi' ? 'माह' : 'mos'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {paidRecords.length} {lang === 'hi' ? 'Paid' : 'Paid'} • {pendingRecords.length} {lang === 'hi' ? 'Pending' : 'Pending'}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                  {interestRecords.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      {lang === 'hi' ? 'कोई मासिक रिकॉर्ड नहीं' : 'No monthly records found'}
                    </div>
                  ) : (
                    interestRecords.map((rec: MonthlyInterestRecord) => (
                      <div
                        key={rec.id}
                        className={`p-3.5 flex items-center justify-between gap-2 transition ${
                          rec.status === 'paid'
                            ? 'bg-emerald-50/30 dark:bg-emerald-950/10'
                            : 'bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {rec.monthLabel}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                rec.status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              }`}
                            >
                              {rec.status === 'paid' ? (lang === 'hi' ? 'चुकता' : 'Paid') : (lang === 'hi' ? 'बाकी' : 'Pending')}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {formatDate(rec.periodStart, lang)} - {formatDate(rec.periodEnd, lang)}
                          </div>
                          {rec.status === 'paid' && rec.paidDate && (
                            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-medium">
                              <CheckCircle className="w-3 h-3" />
                              <span>
                                {lang === 'hi' ? 'जमा तारीख:' : 'Paid on:'} {formatDate(rec.paidDate, lang)}
                                {rec.paymentMethod ? ` (${rec.paymentMethod})` : ''}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right mr-1">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                              {formatCurrency(rec.interestAmount)}
                            </span>
                          </div>
                          {rec.status === 'pending' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenPayInterest(rec.id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition shadow-2xs cursor-pointer"
                            >
                              {lang === 'hi' ? 'ब्याज जमा करें' : 'Pay Interest'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onToggleInterestRecord && onToggleInterestRecord(person.id, rec.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title={lang === 'hi' ? 'बाकी मार्क करें' : 'Mark as pending'}
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Payment History Log */}
              {interestPayments.length > 0 && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-100/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {lang === 'hi' ? 'ब्याज भुगतान इतिहास' : 'Interest Payment History'}
                    </span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold">
                      {interestPayments.length}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                    {interestPayments.map((pay) => (
                      <div key={pay.id} className="p-3 text-xs flex items-center justify-between bg-white dark:bg-slate-900">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <span>{pay.monthLabel || `Month ${pay.monthIndex}`}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {pay.paymentMethod || 'cash'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {formatDate(pay.paymentDate, lang)}
                            {pay.note && ` • "${pay.note}"`}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                            +{formatCurrency(pay.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STANDARD SIMPLE INTEREST BREAKDOWN */
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="bg-slate-100/80 dark:bg-slate-800/80 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 gap-1">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  {lang === 'hi' ? 'उधार तारीख' : 'Given Date'}: {formatDate(person.denaDate, lang)}
                </span>
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Percent className="w-3.5 h-3.5" />
                  {person.rate}% {lang === 'hi' ? 'मासिक दर' : 'Monthly Rate'}
                </span>
              </div>
              <div className="p-4 space-y-3 bg-white dark:bg-slate-900">
                {/* Principal */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">
                    {lang === 'hi' ? 'मूलधन (Principal)' : 'Principal Amount'}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(person.principalAmount)}
                  </span>
                </div>

                {/* Monthly Rate & Monthly Interest */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">
                    {lang === 'hi' ? `मासिक ब्याज (${person.rate}%)` : `Monthly Interest (${person.rate}%)`}
                  </span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(person.monthlyInterest)} / महीना
                  </span>
                </div>

                {/* Total Months Elapsed & Charged */}
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-slate-600 dark:text-slate-400 font-medium block">
                      {lang === 'hi' ? 'कुल महीने (Total Months)' : 'Charged Months'}
                    </span>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400">
                      {lang === 'hi' ? 'चालू माह शामिल' : 'Current month included'}
                    </span>
                  </div>
                  <span className="font-bold font-mono px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs">
                    {person.totalMonths || (person.completedMonths + 1)} {lang === 'hi' ? 'माह' : 'Mos'}
                  </span>
                </div>

                {/* Total Simple Interest */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                    <Calculator className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'hi'
                        ? `कुल साधारण ब्याज (${person.totalMonths || (person.completedMonths + 1)} माह)`
                        : `Total Simple Interest (${person.totalMonths || (person.completedMonths + 1)} mos)`}
                    </span>
                  </span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">
                    +{formatCurrency(person.interestAmount)}
                  </span>
                </div>

                {/* Settlement Date if Paid */}
                {person.status === 'paid' && person.paidDate && (
                  <div className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                    <span>{lang === 'hi' ? 'चुकता तारीख (Settled Date)' : 'Settled on'}</span>
                    <span className="font-bold">{formatDate(person.paidDate, lang)}</span>
                  </div>
                )}

                {/* Grand Total Due / Paid */}
                <div className="pt-3 border-t border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="block text-xs uppercase font-bold text-slate-500 dark:text-slate-400">
                      {lang === 'hi' ? 'कुल देय राशि' : 'Current Total Due'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {person.status === 'pending'
                        ? lang === 'hi'
                          ? 'हर पूर्ण माह पर साधारण ब्याज बढ़ेगा'
                          : 'Simple interest increases monthly'
                        : lang === 'hi'
                        ? 'पूर्ण चुकता हिसाब (ब्याज स्थिर)'
                        : 'Settled in full (interest frozen)'}
                    </span>
                  </div>
                  <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                    {formatCurrency(person.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Dedicated WhatsApp Reminder / Invoice Preview & Send Card */}
          {person.mobile && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 overflow-hidden">
              <div className="px-4 py-2.5 bg-emerald-100/70 dark:bg-emerald-900/40 border-b border-emerald-200/80 dark:border-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {lang === 'hi' ? 'व्हाट्सएप पर विवरण भेजें' : 'Professional WhatsApp Statement'}
                  </span>
                </div>
                {/* Language Toggle for WhatsApp */}
                <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-emerald-200 dark:border-emerald-700 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setWaLanguage('hi')}
                    className={`px-2 py-0.5 rounded-md transition ${
                      waLanguage === 'hi'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600'
                    }`}
                  >
                    हिंदी
                  </button>
                  <button
                    type="button"
                    onClick={() => setWaLanguage('en')}
                    className={`px-2 py-0.5 rounded-md transition ${
                      waLanguage === 'en'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              <div className="p-3.5 space-y-3">
                {/* Optional Custom Message Note */}
                <div>
                  <label className="block text-[11px] font-semibold text-emerald-900 dark:text-emerald-300 mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>
                      {lang === 'hi'
                        ? 'संदेश में व्यक्तिगत नोट जोड़ें (वैकल्पिक):'
                        : 'Add Custom Note / Remark (Optional):'}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={customMsgNote}
                    onChange={(e) => setCustomMsgNote(e.target.value)}
                    placeholder={
                      lang === 'hi'
                        ? 'उदा. कृपया रविवार तक ब्याज जमा करवाएं...'
                        : 'e.g. Kindly arrange payment by this weekend...'
                    }
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-emerald-200 dark:border-emerald-800/80 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Formatted Message Preview Bubble */}
                <div className="relative group">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center justify-between">
                    <span>{lang === 'hi' ? 'संदेश का प्रारूप (Preview):' : 'Message Preview:'}</span>
                    <button
                      type="button"
                      onClick={handleCopyWhatsAppMessage}
                      className="text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 normal-case text-xs font-semibold"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{lang === 'hi' ? 'कॉपी हो गया!' : 'Copied!'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{lang === 'hi' ? 'कॉपी करें' : 'Copy'}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200/70 dark:border-emerald-900/60 font-sans text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto select-all shadow-inner">
                    {waFormattedMessage}
                  </pre>
                </div>

                {/* Action buttons: Send on WhatsApp & Copy */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    id="btn-send-whatsapp-direct"
                    type="button"
                    onClick={handleWhatsAppSend}
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] transition flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/30 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{lang === 'hi' ? 'व्हाट्सएप पर भेजें (Send on WhatsApp)' : 'Send via WhatsApp'}</span>
                  </button>
                  <button
                    id="btn-copy-whatsapp-text"
                    type="button"
                    onClick={handleCopyWhatsAppMessage}
                    className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center justify-center gap-1.5"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-bold">{lang === 'hi' ? 'कॉपी हुआ' : 'Copied'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{lang === 'hi' ? 'टेक्स्ट कॉपी' : 'Copy Text'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Note Section */}
          {person.note && (
            <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/30 text-xs text-amber-900 dark:text-amber-200">
              <span className="font-bold block mb-1">
                {lang === 'hi' ? 'टिप्पणी / नोट:' : 'Note / Remarks:'}
              </span>
              <p className="leading-relaxed whitespace-pre-wrap">{person.note}</p>
            </div>
          )}

          {/* Status Change Toggle Button */}
          <button
            id="btn-toggle-payment-status"
            type="button"
            onClick={() => onToggleStatus(person)}
            className={`w-full py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer ${
              person.status === 'pending'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
            }`}
          >
            {person.status === 'pending' ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>{lang === 'hi' ? 'खाता पूर्ण चुकता मार्क करें (Settle Account)' : 'Mark Account as Settled'}</span>
              </>
            ) : (
              <>
                <Clock className="w-5 h-5" />
                <span>{lang === 'hi' ? 'खाता बाकी देय मार्क करें' : 'Mark Account as Active/Pending'}</span>
              </>
            )}
          </button>

          {/* Export Actions for Person */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              id="btn-export-person-pdf"
              type="button"
              onClick={() => exportPersonPdf(person)}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold transition cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-rose-500" />
              <span>{t.exportPersonPdf}</span>
            </button>
            <button
              id="btn-export-person-csv"
              type="button"
              onClick={() => exportPersonCsv(person)}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>{t.exportPersonCsv}</span>
            </button>
          </div>
        </div>

        {/* Footer Actions: Edit and Delete */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
          <button
            id="btn-delete-person"
            type="button"
            onClick={() => onDelete(person)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>{t.deleteBtn}</span>
          </button>
          <button
            id="btn-edit-person"
            type="button"
            onClick={() => onEdit(person)}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 transition shadow-xs cursor-pointer"
          >
            <Edit2 className="w-4 h-4" />
            <span>{t.editBtn}</span>
          </button>
        </div>
      </div>

      {/* PAY INTEREST SUB-MODAL / DIALOG */}
      {payInterestModalOpen && (
        <div
          id="modal-backdrop-pay-interest"
          className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-100"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPayInterestModalOpen(false);
          }}
        >
          <div
            id="modal-card-pay-interest"
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/80 dark:bg-emerald-950/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                  ₹
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {t.payInterestBtn}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {person.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayInterestModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-200/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveInterestPayment} className="p-5 space-y-3.5">
              {/* Select Month Record */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  {lang === 'hi' ? 'महीना चुनें (Select Month):' : 'Select Month Record:'}
                </label>
                <select
                  value={selectedMonthId}
                  onChange={(e) => {
                    setSelectedMonthId(e.target.value);
                    const sel = interestRecords.find((r) => r.id === e.target.value);
                    if (sel) setPayAmount(sel.interestAmount);
                  }}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {interestRecords.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.monthLabel} ({formatCurrency(r.interestAmount)}) - {r.status === 'paid' ? (lang === 'hi' ? 'चुकता' : 'Paid') : (lang === 'hi' ? 'बाकी' : 'Pending')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  {lang === 'hi' ? 'ब्याज राशि (Amount):' : 'Interest Amount:'}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Payment Date */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  {lang === 'hi' ? 'भुगतान तारीख (Payment Date):' : 'Payment Date:'}
                </label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  {lang === 'hi' ? 'भुगतान माध्यम (Payment Method):' : 'Payment Mode:'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'cash', label: lang === 'hi' ? 'नकद (Cash)' : 'Cash' },
                    { id: 'upi', label: 'UPI / Online' },
                    { id: 'bank', label: lang === 'hi' ? 'बैंक' : 'Bank' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayMethod(m.id)}
                      className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition ${
                        payMethod === m.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remark Note */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  {lang === 'hi' ? 'टिप्पणी (Note):' : 'Note / Remarks:'}
                </label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder={lang === 'hi' ? 'उदा. नकद प्राप्त / UPI संदर्भ' : 'e.g. Received in cash'}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Informational note */}
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {lang === 'hi' ? 'महत्वपूर्ण:' : 'Important:'}
                </span>{' '}
                {lang === 'hi'
                  ? 'मूलधन राशि ₹' + person.principalAmount.toLocaleString('en-IN') + ' स्थिर रहेगी। जमा किया गया ब्याज मूलधन में नहीं जुड़ेगा।'
                  : 'Original principal remains unchanged. Paid interest will not be added to principal.'}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayInterestModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 cursor-pointer"
                >
                  {lang === 'hi' ? 'भुगतान सहेजें' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
