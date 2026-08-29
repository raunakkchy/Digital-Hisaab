import { useState, useEffect, type FormEvent } from 'react';
import { X, Calculator, IndianRupee, Calendar, User, Phone, Percent, FileText, RefreshCw, Clock } from 'lucide-react';
import { PersonHisaab, Language, PaymentStatus, PaymentMode } from '../types';
import { formatCurrency, isValidIndianMobile, i18n } from '../utils/formatters';

interface AddEditPersonModalProps {
  isOpen: boolean;
  editItem?: PersonHisaab | null;
  lang: Language;
  onClose: () => void;
  onSave: (
    data: Omit<
      PersonHisaab,
      'id' | 'createdAt' | 'updatedAt' | 'monthlyInterest' | 'completedMonths' | 'totalMonths' | 'interestAmount' | 'totalAmount'
    >
  ) => void;
}

export function AddEditPersonModal({
  isOpen,
  editItem,
  lang,
  onClose,
  onSave,
}: AddEditPersonModalProps) {
  const t = i18n[lang];

  const todayStr = new Date().toISOString().split('T')[0];

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [rate, setRate] = useState<number | string>(3);
  const [denaDate, setDenaDate] = useState(todayStr);
  const [principalAmount, setPrincipalAmount] = useState<number | string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('standard');
  const [status, setStatus] = useState<PaymentStatus>('pending');
  const [note, setNote] = useState('');

  // Form Errors
  const [errors, setErrors] = useState<{
    name?: string;
    denaDate?: string;
    principalAmount?: string;
    rate?: string;
    mobile?: string;
  }>({});

  // Populate data when editing
  useEffect(() => {
    if (editItem) {
      setName(editItem.name);
      setMobile(editItem.mobile || '');
      setRate(editItem.rate);
      setDenaDate(editItem.denaDate || todayStr);
      setPrincipalAmount(editItem.principalAmount);
      setPaymentMode(editItem.paymentMode || 'standard');
      setStatus(editItem.status);
      setNote(editItem.note || '');
    } else {
      // Defaults for new entry
      setName('');
      setMobile('');
      setRate(3);
      setDenaDate(todayStr);
      setPrincipalAmount('');
      setPaymentMode('standard');
      setStatus('pending');
      setNote('');
    }
    setErrors({});
  }, [editItem, isOpen, todayStr]);

  if (!isOpen) return null;

  const numPrincipal = Number(principalAmount) || 0;
  const numRate = Number(rate) || 0;
  const calculatedMonthlyInterest = Number(((numPrincipal * numRate) / 100).toFixed(2));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = lang === 'hi' ? 'कृपया व्यक्ति का नाम दर्ज करें।' : 'Please enter person name.';
    }

    if (!denaDate) {
      newErrors.denaDate = lang === 'hi' ? 'कृपया तारीख चुनें।' : 'Please select dena date.';
    }

    if (!principalAmount || numPrincipal <= 0) {
      newErrors.principalAmount =
        lang === 'hi' ? 'मूलधन 0 से अधिक होना चाहिए।' : 'Principal amount must be greater than 0.';
    }

    if (numRate < 0) {
      newErrors.rate = lang === 'hi' ? 'ब्याज दर शून्य या अधिक होनी चाहिए।' : 'Rate cannot be negative.';
    }

    if (mobile.trim() && !isValidIndianMobile(mobile)) {
      newErrors.mobile =
        lang === 'hi'
          ? 'कृपया वैध 10 अंकों का मोबाइल नंबर दर्ज करें।'
          : 'Please enter a valid 10-digit mobile number.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      name: name.trim(),
      mobile: mobile.trim(),
      rate: numRate,
      denaDate,
      principalAmount: numPrincipal,
      paymentMode,
      status,
      paidDate: status === 'paid' ? (editItem?.paidDate || todayStr) : undefined,
      note: note.trim(),
      interestRecords: editItem?.interestRecords,
      interestPayments: editItem?.interestPayments,
      totalInterestPaid: editItem?.totalInterestPaid,
      currentInterestDue: editItem?.currentInterestDue,
      lastInterestPaidDate: editItem?.lastInterestPaidDate,
    });
  };

  const setAmountPreset = (amt: number) => {
    setPrincipalAmount(amt);
    if (errors.principalAmount) {
      setErrors((prev) => ({ ...prev, principalAmount: undefined }));
    }
  };

  const setRatePreset = (r: number) => {
    setRate(r);
    if (errors.rate) {
      setErrors((prev) => ({ ...prev, rate: undefined }));
    }
  };

  return (
    <div
      id="modal-backdrop-add-person"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="modal-card-person-form"
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {editItem ? t.editPersonTitle : t.addPersonTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'hi' ? 'साधारण हिसाब व मासिक ब्याज फॉर्म' : 'Simple Interest & monthly money ledger'}
              </p>
            </div>
          </div>
          <button
            id="btn-close-person-modal"
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 flex-1">
          {/* Payment Mode Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
              <span>{t.paymentModeLabel}</span>
              <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Standard Mode */}
              <button
                type="button"
                id="btn-mode-standard"
                onClick={() => setPaymentMode('standard')}
                className={`p-3 rounded-xl border text-left transition relative ${
                  paymentMode === 'standard'
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      paymentMode === 'standard' ? 'border-amber-600 bg-amber-600' : 'border-slate-400'
                    }`}
                  >
                    {paymentMode === 'standard' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {t.modeStandard}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pl-6 leading-tight">
                  {t.modeStandardDesc}
                </p>
              </button>

              {/* Interest Only Mode */}
              <button
                type="button"
                id="btn-mode-interest-only"
                onClick={() => setPaymentMode('interest_only')}
                className={`p-3 rounded-xl border text-left transition relative ${
                  paymentMode === 'interest_only'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      paymentMode === 'interest_only' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-400'
                    }`}
                  >
                    {paymentMode === 'interest_only' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {t.modeInterestOnly}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pl-6 leading-tight">
                  {t.modeInterestOnlyDesc}
                </p>
              </button>
            </div>

            {paymentMode === 'interest_only' && (
              <div className="mt-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2">
                <Clock className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="font-semibold">
                    {lang === 'hi' ? 'केवल मासिक ब्याज मोड सक्रिय:' : 'Interest Only Mode Active:'}
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {lang === 'hi'
                      ? 'मूलधन राशि अपरिवर्तित रहेगी। हर महीने का ब्याज अलग से दर्ज होगा और आप "Pay Interest" बटन से मासिक ब्याज जमा कर सकेंगे।'
                      : 'Original Principal remains unchanged. Monthly interest is tracked in separate records and can be paid each month with receipt history.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Person Name */}
          <div>
            <label htmlFor="input-person-name" className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-500" />
              <span>{t.personName}</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              id="input-person-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder={t.personNamePlaceholder}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                errors.name
                  ? 'border-rose-500 focus:ring-rose-500/30'
                  : 'border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-amber-500/20'
              }`}
            />
            {errors.name && <p className="mt-1 text-xs font-semibold text-rose-500">{errors.name}</p>}
          </div>

          {/* Mobile Number & Dena Date in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Mobile Number */}
            <div>
              <label htmlFor="input-mobile-number" className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>{t.mobileNumber}</span>
                <span className="text-xs font-normal text-slate-400">({lang === 'hi' ? 'वैकल्पिक' : 'optional'})</span>
              </label>
              <input
                id="input-mobile-number"
                type="tel"
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value);
                  if (errors.mobile) setErrors((prev) => ({ ...prev, mobile: undefined }));
                }}
                placeholder={t.mobilePlaceholder}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                  errors.mobile
                    ? 'border-rose-500 focus:ring-rose-500/30'
                    : 'border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-amber-500/20'
                }`}
              />
              {errors.mobile && <p className="mt-1 text-xs font-semibold text-rose-500">{errors.mobile}</p>}
            </div>

            {/* Dena Date */}
            <div>
              <label htmlFor="input-dena-date" className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>{t.denaDate}</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-dena-date"
                type="date"
                value={denaDate}
                onChange={(e) => {
                  setDenaDate(e.target.value);
                  if (errors.denaDate) setErrors((prev) => ({ ...prev, denaDate: undefined }));
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition ${
                  errors.denaDate
                    ? 'border-rose-500 focus:ring-rose-500/30'
                    : 'border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-amber-500/20'
                }`}
              />
              {errors.denaDate && <p className="mt-1 text-xs font-semibold text-rose-500">{errors.denaDate}</p>}
            </div>
          </div>

          {/* Principal Amount with Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="input-principal-amount" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{t.principalAmount}</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs text-slate-500 font-medium">
                {lang === 'hi' ? 'त्वरित चयन:' : 'Quick:'}
              </span>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold">
                ₹
              </div>
              <input
                id="input-principal-amount"
                type="number"
                min="0"
                step="any"
                value={principalAmount}
                onChange={(e) => {
                  setPrincipalAmount(e.target.value);
                  if (errors.principalAmount) setErrors((prev) => ({ ...prev, principalAmount: undefined }));
                }}
                placeholder={t.principalPlaceholder}
                className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl border text-base font-bold bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                  errors.principalAmount
                    ? 'border-rose-500 focus:ring-rose-500/30'
                    : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20'
                }`}
              />
            </div>
            {errors.principalAmount && (
              <p className="mt-1 text-xs font-semibold text-rose-500">{errors.principalAmount}</p>
            )}

            {/* Quick Amount Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[5000, 10000, 20000, 50000, 100000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  id={`btn-preset-amt-${amt}`}
                  onClick={() => setAmountPreset(amt)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${
                    numPrincipal === amt
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  +{amt >= 100000 ? `${amt / 100000}L` : `${amt / 1000}k`} ({formatCurrency(amt, false)})
                </button>
              ))}
            </div>
          </div>

          {/* Monthly Rate (%) with Quick Rate Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="input-rate-percent" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-amber-500" />
                <span>{t.ratePercent}</span>
                <span className="text-xs font-normal text-slate-400">
                  ({lang === 'hi' ? 'प्रति माह / Per month' : 'Per month'})
                </span>
              </label>
              {numPrincipal > 0 && numRate > 0 && (
                <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                  {formatCurrency(calculatedMonthlyInterest)} / माह
                </span>
              )}
            </div>

            <div className="relative">
              <input
                id="input-rate-percent"
                type="number"
                min="0"
                step="0.1"
                value={rate}
                onChange={(e) => {
                  setRate(e.target.value);
                  if (errors.rate) setErrors((prev) => ({ ...prev, rate: undefined }));
                }}
                placeholder={t.ratePlaceholder}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                  errors.rate
                    ? 'border-rose-500 focus:ring-rose-500/30'
                    : 'border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-amber-500/20'
                }`}
              />
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                % / माह
              </div>
            </div>
            {errors.rate && <p className="mt-1 text-xs font-semibold text-rose-500">{errors.rate}</p>}

            {/* Quick Rate Buttons */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[0, 2, 2.5, 3, 5, 10].map((r) => (
                <button
                  key={r}
                  type="button"
                  id={`btn-preset-rate-${r}`}
                  onClick={() => setRatePreset(r)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${
                    numRate === r
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  {r}% / माह
                </button>
              ))}
            </div>
          </div>

          {/* Note (Optional) */}
          <div>
            <label htmlFor="input-note" className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>{t.note}</span>
            </label>
            <textarea
              id="input-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.notePlaceholder}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-normal bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition resize-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              id="btn-cancel-person-form"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              {t.cancelBtn}
            </button>
            <button
              id="btn-submit-person-form"
              type="submit"
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/25 transition active:scale-98"
            >
              {editItem ? t.updateBtn : t.saveBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
