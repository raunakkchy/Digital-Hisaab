import { PersonHisaab, DashboardStats, Language, PaymentStatus, PaymentMode, MonthlyInterestRecord, InterestRecordStatus } from '../types';

/**
 * Calculate completed months from Dena Date to target date (today or paidDate).
 * Full calendar months elapsed.
 */
export function getCompletedMonths(startDateStr: string, endDateStr?: string): number {
  if (!startDateStr) return 0;
  
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  if (!sy || !sm || !sd) return 0;
  
  const start = new Date(sy, sm - 1, sd);
  let end: Date;
  
  if (endDateStr) {
    const [ey, em, ed] = endDateStr.split('-').map(Number);
    if (!ey || !em || !ed) {
      end = new Date();
    } else {
      end = new Date(ey, em - 1, ed);
    }
  } else {
    end = new Date();
  }

  // Normalize hours for accurate day comparison
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (end < start) return 0;

  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  
  // If the end day of month is less than start day of month, this month is not completed yet
  if (end.getDate() < start.getDate()) {
    // Exception: If end date is the last day of month (e.g. Feb 28 for Jan 31)
    const nextDay = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
    const isEndOfMonth = nextDay.getDate() === 1;
    if (!isEndOfMonth || end.getDate() >= start.getDate()) {
      months--;
    }
  }

  return Math.max(0, months);
}

/**
 * Add calendar months to a YYYY-MM-DD date string
 */
export function addMonthsToDate(dateStr: string, monthsToAdd: number): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;

  const targetDate = new Date(y, m - 1 + monthsToAdd, d);
  // Handle month rollover if source day doesn't exist in target month (e.g., 31 Jan -> Feb)
  const expectedMonth = (m - 1 + monthsToAdd) % 12;
  const normalizedExpectedMonth = expectedMonth < 0 ? expectedMonth + 12 : expectedMonth;
  if (targetDate.getMonth() !== normalizedExpectedMonth) {
    targetDate.setDate(0); // Last day of previous month
  }

  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Subtract days from a YYYY-MM-DD date string
 */
export function subtractDaysFromDate(dateStr: string, daysToSub = 1): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d - daysToSub);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Generate or synchronize monthly interest records from Dena Date to current billing month.
 * Automatically adds new month's record when a new month starts.
 * Keeps paid records intact with their payment date and amount.
 */
export function syncMonthlyInterestRecords(
  principalAmount: number,
  rate: number,
  denaDateStr?: string,
  existingRecords: MonthlyInterestRecord[] = [],
  status: PaymentStatus = 'pending',
  paidDateStr?: string,
  lang: Language = 'hi'
): {
  interestRecords: MonthlyInterestRecord[];
  totalInterestPaid: number;
  currentInterestDue: number;
  completedMonths: number;
  totalMonths: number;
} {
  const p = isNaN(principalAmount) || principalAmount < 0 ? 0 : principalAmount;
  const r = isNaN(rate) || rate < 0 ? 0 : rate;
  const monthlyInterest = Number(((p * r) / 100).toFixed(2));

  if (!denaDateStr) {
    return {
      interestRecords: [],
      totalInterestPaid: 0,
      currentInterestDue: 0,
      completedMonths: 0,
      totalMonths: 0,
    };
  }

  let targetDate = '';
  if (status === 'paid') {
    targetDate = paidDateStr || denaDateStr;
  } else {
    targetDate = new Date().toISOString().split('T')[0];
  }

  const completedMonths = getCompletedMonths(denaDateStr, targetDate);
  const totalMonths = denaDateStr && targetDate >= denaDateStr ? completedMonths + 1 : 0;

  if (totalMonths <= 0) {
    return {
      interestRecords: [],
      totalInterestPaid: 0,
      currentInterestDue: 0,
      completedMonths: 0,
      totalMonths: 0,
    };
  }

  const recordsMap = new Map<number, MonthlyInterestRecord>();
  if (Array.isArray(existingRecords)) {
    for (const rec of existingRecords) {
      if (rec && typeof rec.monthIndex === 'number') {
        recordsMap.set(rec.monthIndex, rec);
      }
    }
  }

  const resultRecords: MonthlyInterestRecord[] = [];
  let totalInterestPaid = 0;
  let currentInterestDue = 0;

  for (let i = 1; i <= totalMonths; i++) {
    const periodStart = addMonthsToDate(denaDateStr, i - 1);
    const nextMonthDate = addMonthsToDate(denaDateStr, i);
    const periodEnd = subtractDaysFromDate(nextMonthDate, 1);
    const dueDate = nextMonthDate;

    const existing = recordsMap.get(i);

    const monthLabel =
      lang === 'hi'
        ? `महीना ${i} (${formatDate(periodStart, 'hi')} - ${formatDate(periodEnd, 'hi')})`
        : `Month ${i} (${formatDate(periodStart, 'en')} - ${formatDate(periodEnd, 'en')})`;

    if (existing) {
      const isRecordPaid = existing.status === 'paid';
      const paidAmount = isRecordPaid ? (existing.paidAmount ?? monthlyInterest) : undefined;

      const updatedRecord: MonthlyInterestRecord = {
        ...existing,
        id: existing.id || `month_rec_${i}_${Date.now()}`,
        monthIndex: i,
        monthLabel,
        periodStart,
        periodEnd,
        dueDate,
        interestAmount: monthlyInterest,
        status: isRecordPaid ? 'paid' : 'pending',
        paidAmount,
      };

      if (isRecordPaid) {
        totalInterestPaid += paidAmount || monthlyInterest;
      } else {
        currentInterestDue += monthlyInterest;
      }
      resultRecords.push(updatedRecord);
    } else {
      // Automatically create new pending month record
      const newRec: MonthlyInterestRecord = {
        id: `month_rec_${i}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        monthIndex: i,
        monthLabel,
        periodStart,
        periodEnd,
        dueDate,
        interestAmount: monthlyInterest,
        status: 'pending',
      };
      currentInterestDue += monthlyInterest;
      resultRecords.push(newRec);
    }
  }

  return {
    interestRecords: resultRecords,
    totalInterestPaid: Number(totalInterestPaid.toFixed(2)),
    currentInterestDue: Number(currentInterestDue.toFixed(2)),
    completedMonths,
    totalMonths,
  };
}

/**
 * Calculate Simple Interest and Current Total according to the formula:
 * - Monthly Interest = Principal × Rate / 100
 * - Completed Months = full elapsed months from Dena Date to Today (or Paid Date if status is 'paid')
 * - Total Months = Completed Months + 1 (Current running month is included)
 * - Total Interest = Monthly Interest × Total Months
 * - For Standard Mode: Current Total = Principal + Total Interest
 * - For Interest Only Mode: Original Principal remains unchanged.
 *   Current Total Due = Principal + Current Pending Interest Due.
 */
export function calculateHisaab(
  principal: number,
  rate: number,
  denaDateStr?: string,
  status: PaymentStatus = 'pending',
  paidDateStr?: string,
  paymentMode: PaymentMode = 'standard',
  existingInterestRecords: MonthlyInterestRecord[] = []
): {
  monthlyInterest: number;
  completedMonths: number;
  totalMonths: number;
  interestAmount: number;
  totalAmount: number;
  interestRecords?: MonthlyInterestRecord[];
  totalInterestPaid?: number;
  currentInterestDue?: number;
} {
  const p = isNaN(principal) || principal < 0 ? 0 : principal;
  const r = isNaN(rate) || rate < 0 ? 0 : rate;

  // Monthly Interest = Principal × Rate / 100
  const monthlyInterest = Number(((p * r) / 100).toFixed(2));

  // Determine target date: If paid, freeze interest at paidDate (or denaDate if paid immediately)
  let targetDate = '';
  if (status === 'paid') {
    targetDate = paidDateStr || denaDateStr || '';
  } else {
    targetDate = new Date().toISOString().split('T')[0];
  }

  const completedMonths = denaDateStr ? getCompletedMonths(denaDateStr, targetDate) : 0;

  // Include current running month: If denaDate is valid and targetDate >= denaDate, totalMonths is completedMonths + 1
  let totalMonths = 0;
  if (denaDateStr && targetDate >= denaDateStr) {
    totalMonths = completedMonths + 1;
  }

  // Total Interest accrued = Monthly Interest × Total Months (including current month)
  const interestAmount = Number((monthlyInterest * totalMonths).toFixed(2));

  if (paymentMode === 'interest_only') {
    const synced = syncMonthlyInterestRecords(
      p,
      r,
      denaDateStr,
      existingInterestRecords,
      status,
      paidDateStr
    );

    // In Interest Only mode:
    // If loan is settled ('paid'), total due is 0 or paid amount
    // If loan is 'pending', total amount due today = Principal + Pending Interest Due
    const currentInterestDue = status === 'paid' ? 0 : synced.currentInterestDue;
    const totalAmount = status === 'paid' ? 0 : Number((p + currentInterestDue).toFixed(2));

    return {
      monthlyInterest,
      completedMonths: synced.completedMonths,
      totalMonths: synced.totalMonths,
      interestAmount,
      totalAmount,
      interestRecords: synced.interestRecords,
      totalInterestPaid: synced.totalInterestPaid,
      currentInterestDue,
    };
  }

  // Standard Lump-sum mode
  const totalAmount = status === 'paid' ? Number((p + interestAmount).toFixed(2)) : Number((p + interestAmount).toFixed(2));

  return {
    monthlyInterest,
    completedMonths,
    totalMonths,
    interestAmount,
    totalAmount,
  };
}

/**
 * Format currency in Indian Rupees format (e.g., ₹1,00,000.00 or ₹10,000.00)
 */
export function formatCurrency(amount: number, showDecimals = true): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
  
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return formatted;
}

/**
 * Format date nicely
 */
export function formatDate(dateString: string, lang: Language = 'en'): string {
  if (!dateString) return '-';
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    if (!year || !month || !day) return dateString;
    
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return dateString;

    if (lang === 'hi') {
      const monthsHi = [
        'जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
        'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'
      ];
      return `${day} ${monthsHi[month - 1]} ${year}`;
    }

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Indian Mobile number validation
 * Accepts 10-digit formats (with or without +91 / 0 prefix)
 */
export function isValidIndianMobile(mobile: string): boolean {
  if (!mobile || mobile.trim() === '') return true; // Optional field
  const clean = mobile.replace(/[\s\-()]/g, '');
  // Match 10 digits starting with 6-9, optionally with +91 or 0 prefix
  const regex = /^(?:\+91|91|0)?[6789]\d{9}$/;
  return regex.test(clean);
}

/**
 * Calculate all aggregate statistics for dashboard & reports
 */
export function calculateStats(persons: PersonHisaab[]): DashboardStats {
  let totalPrincipal = 0;
  let totalMonthlyInterest = 0;
  let totalInterest = 0;
  let totalAmount = 0;
  let totalPaidAmount = 0;
  let totalPendingAmount = 0;
  let paidPersonsCount = 0;
  let pendingPersonsCount = 0;
  let totalInterestCollected = 0;
  let totalInterestDue = 0;
  let interestOnlyPersonsCount = 0;

  for (const person of persons) {
    totalPrincipal += person.principalAmount || 0;
    totalMonthlyInterest += person.monthlyInterest || 0;
    totalInterest += person.interestAmount || 0;
    totalAmount += person.totalAmount || 0;

    if (person.paymentMode === 'interest_only') {
      interestOnlyPersonsCount++;
      totalInterestCollected += person.totalInterestPaid || 0;
      totalInterestDue += person.currentInterestDue || 0;
    }

    if (person.status === 'paid') {
      totalPaidAmount += person.paymentMode === 'interest_only' ? (person.principalAmount + (person.totalInterestPaid || 0)) : (person.totalAmount || 0);
      paidPersonsCount++;
    } else {
      totalPendingAmount += person.totalAmount || 0;
      pendingPersonsCount++;
    }
  }

  return {
    totalPersons: persons.length,
    totalPrincipal: Number(totalPrincipal.toFixed(2)),
    totalMonthlyInterest: Number(totalMonthlyInterest.toFixed(2)),
    totalInterest: Number(totalInterest.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
    totalPaidAmount: Number(totalPaidAmount.toFixed(2)),
    totalPendingAmount: Number(totalPendingAmount.toFixed(2)),
    paidPersonsCount,
    pendingPersonsCount,
    totalInterestCollected: Number(totalInterestCollected.toFixed(2)),
    totalInterestDue: Number(totalInterestDue.toFixed(2)),
    interestOnlyPersonsCount,
  };
}

/**
 * Generate a beautifully formatted, highly professional WhatsApp message
 * for payment reminders (Pending) and receipts (Paid) in Hindi and English.
 * Tailored specifically for standard loans and "Interest Only" loans.
 */
export function generateProfessionalWhatsAppMessage(
  person: PersonHisaab,
  lang: Language = 'hi',
  customNote?: string
): string {
  const totalMos = person.totalMonths || (person.completedMonths + 1);
  const isPaid = person.status === 'paid';
  const formattedDate = formatDate(person.denaDate, lang);
  const formattedPaidDate = person.paidDate ? formatDate(person.paidDate, lang) : '';
  const isInterestOnly = person.paymentMode === 'interest_only';

  if (lang === 'hi') {
    if (isInterestOnly) {
      const paidInterest = person.totalInterestPaid || 0;
      const dueInterest = person.currentInterestDue || 0;
      const paidMonthsCount = person.interestRecords ? person.interestRecords.filter((r) => r.status === 'paid').length : 0;
      const pendingMonthsCount = person.interestRecords ? person.interestRecords.filter((r) => r.status === 'pending').length : 0;

      if (isPaid) {
        return (
`*━━━━━━━━━━━━━━━━━━━━━━━━━*
   *🧾 सरल हिसाब | पूर्ण चुकता रसीद*
*━━━━━━━━━━━━━━━━━━━━━━━━━*

नमस्ते *${person.name}* जी 🙏,
प्रणाम।

आपके *केवल ब्याज खाता (Interest Only Loan)* का मूलधन एवं ब्याज पूर्णतः चुकता हो चुका है।

📋 *खाता रसीद विवरण:*
▫️ *शुरुआती तारीख:* ${formattedDate}
▫️ *मूलधन राशि (Principal):* ${formatCurrency(person.principalAmount)} *(अपरिवर्तित)*
▫️ *मासिक ब्याज दर:* ${person.rate}% प्रति माह (${formatCurrency(person.monthlyInterest)} / माह)
▫️ *कुल अवधि:* ${totalMos} महीने
▫️ *कुल जमा किया गया ब्याज:* ${formatCurrency(paidInterest)} (${paidMonthsCount} माह)
${formattedPaidDate ? `▫️ *चुकता तारीख (Settled On):* ${formattedPaidDate}\n` : ''}
─────────────────────────
✅ *खाता स्थिति: मूलधन व ब्याज पूर्ण चुकता (SETTLED)*
─────────────────────────
${person.note ? `📝 *टिप्पणी:* ${person.note}\n` : ''}${customNote ? `💬 *संदेश:* ${customNote}\n` : ''}
समय पर भुगतान करने के लिए हार्दिक धन्यवाद! 🙏

*— सरल हिसाब (Simple Hisaab)*`
        );
      }

      return (
`*━━━━━━━━━━━━━━━━━━━━━━━━━*
   *🧾 सरल हिसाब | मासिक ब्याज विवरण*
*━━━━━━━━━━━━━━━━━━━━━━━━━*

नमस्ते *${person.name}* जी 🙏,
सादर प्रणाम।

यह आपके *केवल ब्याज खाते (Interest-Only Loan)* का अद्यतन विवरण है:

📋 *खाता विवरण (Interest-Only Statement):*
▫️ *ऋण आरंभ तारीख:* ${formattedDate}
▫️ *मूलधन राशि (Principal):* ${formatCurrency(person.principalAmount)} *(अपरिवर्तित)*
▫️ *मासिक ब्याज दर:* ${person.rate}% प्रति माह (${formatCurrency(person.monthlyInterest)} / माह)
▫️ *कुल लागू महीने:* ${totalMos} माह (चालू महीना सहित)
▫️ *कुल जमा ब्याज (Paid):* ${formatCurrency(paidInterest)} (${paidMonthsCount} माह चुकता)
▫️ *वर्तमान बाकी ब्याज (Pending Due):* ${formatCurrency(dueInterest)} (${pendingMonthsCount} माह बकाया)

─────────────────────────
💰 *वर्तमान कुल देय ब्याज: ${formatCurrency(dueInterest)}*
*(मूलधन: ${formatCurrency(person.principalAmount)} + बाकी ब्याज: ${formatCurrency(dueInterest)} = कुल: ${formatCurrency(person.totalAmount)})*
─────────────────────────
▫️ *ब्याज स्थिति:* ${dueInterest > 0 ? '⏳ मासिक ब्याज बकाया (PENDING)' : '✅ चालू माह तक ब्याज चुकता'}
${person.note ? `📝 *नोट:* ${person.note}\n` : ''}${customNote ? `💬 *संदेश:* ${customNote}\n` : ''}
कृपया चालू महीने के ब्याज का मिलान कर भुगतान करने का कष्ट करें।
धन्यवाद! 🙏

*— सरल हिसाब (Simple Hisaab)*`
      );
    }

    if (isPaid) {
      return (
`*━━━━━━━━━━━━━━━━━━━━━━━━━*
   *🧾 सरल हिसाब | भुगतान रसीद*
*━━━━━━━━━━━━━━━━━━━━━━━━━*

नमस्ते *${person.name}* जी 🙏,
प्रणाम।

आपके खाते का पूरा भुगतान सफलतापूर्वक प्राप्त हो चुका है।

📋 *भुगतान विवरण (Payment Receipt):*
▫️ *देना तारीख (Date):* ${formattedDate}
▫️ *मूलधन राशि (Principal):* ${formatCurrency(person.principalAmount)}
▫️ *मासिक ब्याज दर (Rate):* ${person.rate}% प्रति माह
▫️ *कुल अवधि:* ${totalMos} महीने
▫️ *कुल साधारण ब्याज:* ${formatCurrency(person.interestAmount)}
▫️ *कुल चुकता राशि:* ${formatCurrency(person.totalAmount)}
${formattedPaidDate ? `▫️ *चुकता तारीख (Settled On):* ${formattedPaidDate}\n` : ''}
─────────────────────────
✅ *खाता स्थिति: पूर्ण चुकता (PAID & SETTLED)*
─────────────────────────
${person.note ? `📝 *टिप्पणी:* ${person.note}\n` : ''}${customNote ? `💬 *संदेश:* ${customNote}\n` : ''}
समय पर भुगतान करने के लिए आपका हार्दिक धन्यवाद! 🙏

*— सरल हिसाब (Simple Hisaab)*`
      );
    }

    return (
`*━━━━━━━━━━━━━━━━━━━━━━━━━*
   *🧾 सरल हिसाब | खाता विवरण*
*━━━━━━━━━━━━━━━━━━━━━━━━━*

नमस्ते *${person.name}* जी 🙏,
सादर प्रणाम।

यह आपके खाते के साधारण ब्याज और वर्तमान कुल देय हिसाब का अधिकृत विवरण है:

📋 *हिसाब विवरण (Statement Details):*
▫️ *देना तारीख (Date):* ${formattedDate}
▫️ *मूलधन राशि (Principal):* ${formatCurrency(person.principalAmount)}
▫️ *मासिक ब्याज दर (Rate):* ${person.rate}% प्रति माह (${formatCurrency(person.monthlyInterest)} / माह)
▫️ *लागू अवधि (Duration):* ${totalMos} महीने (चालू महीना सहित)
▫️ *कुल साधारण ब्याज:* ${formatCurrency(person.interestAmount)}

─────────────────────────
💰 *वर्तमान कुल देय राशि: ${formatCurrency(person.totalAmount)}*
─────────────────────────
▫️ *भुगतान स्थिति:* ⏳ बकाया (PENDING)
${person.note ? `📝 *नोट/विवरण:* ${person.note}\n` : ''}${customNote ? `💬 *संदेश:* ${customNote}\n` : ''}
कृपया सुविधानुसार हिसाब का मिलान कर भुगतान करने का कष्ट करें। 
किसी भी प्रश्न या जानकारी के लिए संपर्क कर सकते हैं।

धन्यवाद! 🙏
*— सरल हिसाब (Simple Hisaab)*`
    );
  }

  // English Version
  if (isInterestOnly) {
    const paidInterest = person.totalInterestPaid || 0;
    const dueInterest = person.currentInterestDue || 0;
    const paidMonthsCount = person.interestRecords ? person.interestRecords.filter((r) => r.status === 'paid').length : 0;
    const pendingMonthsCount = person.interestRecords ? person.interestRecords.filter((r) => r.status === 'pending').length : 0;

    if (isPaid) {
      return (
`*━━━━━━━━━━━━━━━━━━━━━━━━━*
  *🧾 SIMPLE HISAAB | LOAN SETTLED*
*━━━━━━━━━━━━━━━━━━━━━━━━━*

Dear *${person.name}*,
Greetings!

Your Interest-Only account has been fully settled and closed.

📋 *Settlement Summary:*
▫️ *Given Date:* ${formattedDate}
▫️ *Principal Amount:* ${formatCurrency(person.principalAmount)} *(Unchanged)*
▫️ *Monthly Rate:* ${person.rate}% / mo (${formatCurrency(person.monthlyInterest)} / mo)
▫️ *Total Duration:* ${totalMos} Months
▫️ *Total Interest Paid:* ${formatCurrency(paidInterest)} (${paidMonthsCount} months)
${formattedPaidDate ? `▫️ *Settlement Date:* ${formattedPaidDate}\n` : ''}
─────────────────────────
✅ *Status: FULLY PAID & SETTLED*
─────────────────────────
${person.note ? `📝 *Note:* ${person.note}\n` : ''}${customNote ? `💬 *Message:* ${customNote}\n` : ''}
Thank you very much for the prompt settlement! 🙏

*— Simple Hisaab*`
      );
    }

    return (
`*━━━━━━━━━━━━━━━━━━━━━━━━━*
 *🧾 SIMPLE HISAAB | INTEREST STATEMENT*
*━━━━━━━━━━━━━━━━━━━━━━━━━*

Dear *${person.name}*,
Greetings!

Here is the statement for your *Interest-Only Account*:

📋 *Account Summary:*
▫️ *Loan Start Date:* ${formattedDate}
▫️ *Original Principal:* ${formatCurrency(person.principalAmount)} *(Unchanged)*
▫️ *Monthly Interest:* ${person.rate}% / mo (${formatCurrency(person.monthlyInterest)} / mo)
▫️ *Billing Duration:* ${totalMos} Months (current month included)
▫️ *Total Interest Paid:* ${formatCurrency(paidInterest)} (${paidMonthsCount} months)
▫️ *Current Interest Due:* ${formatCurrency(dueInterest)} (${pendingMonthsCount} months pending)

─────────────────────────
💰 *Current Interest Due: ${formatCurrency(dueInterest)}*
*(Principal: ${formatCurrency(person.principalAmount)} + Due Interest: ${formatCurrency(dueInterest)} = Total: ${formatCurrency(person.totalAmount)})*
─────────────────────────
▫️ *Interest Status:* ${dueInterest > 0 ? '⏳ PENDING' : '✅ UP TO DATE'}
${person.note ? `📝 *Note:* ${person.note}\n` : ''}${customNote ? `💬 *Message:* ${customNote}\n` : ''}
Kindly arrange the monthly interest payment at your earliest convenience.

Thank you! 🙏
*— Simple Hisaab*`
    );
  }

  if (isPaid) {
    return (
`*━━━━━━━━━━━━━━━━━━━━━━━━━*
  *🧾 SIMPLE HISAAB | PAYMENT RECEIPT*
*━━━━━━━━━━━━━━━━━━━━━━━━━*

Dear *${person.name}*,
Greetings!

We confirm that the full settlement for your account has been successfully received.

📋 *Payment Receipt Summary:*
▫️ *Given Date:* ${formattedDate}
▫️ *Principal Amount:* ${formatCurrency(person.principalAmount)}
▫️ *Monthly Rate:* ${person.rate}% / month
▫️ *Billing Period:* ${totalMos} Months
▫️ *Total Simple Interest:* ${formatCurrency(person.interestAmount)}
▫️ *Total Amount Settled:* ${formatCurrency(person.totalAmount)}
${formattedPaidDate ? `▫️ *Settlement Date:* ${formattedPaidDate}\n` : ''}
─────────────────────────
✅ *Account Status: FULLY PAID & SETTLED*
─────────────────────────
${person.note ? `📝 *Note:* ${person.note}\n` : ''}${customNote ? `💬 *Message:* ${customNote}\n` : ''}
Thank you very much for the prompt settlement! 🙏

*— Simple Hisaab*`
    );
  }

  return (
`*━━━━━━━━━━━━━━━━━━━━━━━━━*
 *🧾 SIMPLE HISAAB | ACCOUNT STATEMENT*
*━━━━━━━━━━━━━━━━━━━━━━━━━*

Dear *${person.name}*,
Greetings!

Here is the official simple interest statement for your account:

📋 *Account Summary:*
▫️ *Given Date (Dena Date):* ${formattedDate}
▫️ *Principal Amount:* ${formatCurrency(person.principalAmount)}
▫️ *Monthly Interest Rate:* ${person.rate}% / month (${formatCurrency(person.monthlyInterest)} / mo)
▫️ *Applicable Period:* ${totalMos} Months (current month included)
▫️ *Total Simple Interest:* ${formatCurrency(person.interestAmount)}

─────────────────────────
💰 *Total Amount Due: ${formatCurrency(person.totalAmount)}*
─────────────────────────
▫️ *Payment Status:* ⏳ PENDING
${person.note ? `📝 *Note:* ${person.note}\n` : ''}${customNote ? `💬 *Message:* ${customNote}\n` : ''}
Kindly review the statement and arrange the payment at your earliest convenience.
Feel free to get in touch for any queries or clarifications.

Thank you! 🙏
*— Simple Hisaab*`
  );
}

/**
 * Get direct WhatsApp Web / App intent URL
 */
export function getWhatsAppUrl(mobile: string, message: string): string {
  const cleanMobile = mobile.replace(/[^0-9]/g, '');
  const mobileWithCode = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
  return `https://wa.me/${mobileWithCode}?text=${encodeURIComponent(message)}`;
}

/**
 * Translations dictionary for English and Hindi UI
 */
export const i18n = {
  en: {
    appName: 'Digital Hisaab Management System',
    appTagline: 'Digital Money Lending & Interest Ledger Management System',
    home: 'Home',
    persons: 'Persons',
    add: 'Add Person',
    reports: 'Reports',
    settings: 'Settings',
    searchPlaceholder: 'Search by name or mobile number...',
    quickSearch: 'Quick Search',
    totalPersons: 'Total Persons',
    totalPrincipal: 'Total Principal',
    totalAmount: 'Total Amount',
    totalInterest: 'Total Interest',
    totalMonthlyInterest: 'Monthly Interest Flow',
    totalPaidAmount: 'Total Paid Amount',
    totalPendingAmount: 'Total Pending Amount',
    paidPersons: 'Paid Persons',
    pendingPersons: 'Pending Persons',
    recentPersons: 'Recent Entries',
    pendingPayments: 'Pending Payments (बाकी वसूली)',
    viewAll: 'View All',
    noPending: 'Great! No pending payments right now.',
    addPersonTitle: 'Add New Hisaab',
    editPersonTitle: 'Edit Hisaab Details',
    personName: 'Person Name',
    personNamePlaceholder: 'Enter name',
    mobileNumber: 'Mobile Number',
    mobilePlaceholder: 'e.g. 9876543210',
    ratePercent: 'Monthly Rate (%)',
    ratePlaceholder: 'e.g. 5',
    denaDate: 'Dena Date (तारीख)',
    principalAmount: 'Principal Amount (₹)',
    principalPlaceholder: 'e.g. 10000',
    paymentModeLabel: 'Payment Mode',
    modeStandard: 'Standard (Lump-Sum)',
    modeStandardDesc: 'Principal + Interest paid together at settlement',
    modeInterestOnly: 'Interest Only (मासिक ब्याज)',
    modeInterestOnlyDesc: 'Principal remains unchanged, borrower pays interest each month',
    payInterestBtn: 'Pay Interest',
    payInterestTitle: 'Record Interest Payment',
    monthlyInterestRecords: 'Monthly Interest Schedule',
    paymentHistory: 'Payment History',
    totalInterestPaid: 'Total Interest Paid',
    currentInterestDue: 'Current Interest Due',
    originalPrincipal: 'Original Principal (Unchanged)',
    monthIndexLabel: 'Month',
    periodLabel: 'Billing Period',
    dueDateLabel: 'Due Date',
    interestPaidOn: 'Paid on',
    paymentMethod: 'Payment Mode / Method',
    cash: 'Cash (नकद)',
    upi: 'PhonePe / GPay / UPI',
    bank: 'Bank Transfer (बैंक)',
    other: 'Other',
    confirmInterestPayment: 'Confirm Interest Payment',
    markAsPaid: 'Mark Paid',
    markAsPending: 'Mark Pending',
    settleLoanPrincipal: 'Settle Entire Loan (Principal & Balance)',
    monthlyInterest: 'Monthly Interest (₹)',
    completedMonths: 'Completed Months',
    calculatedInterest: 'Total Interest',
    calculatedTotal: 'Current Total',
    paymentStatus: 'Payment Status',
    statusPaid: 'PAID (चुकता)',
    statusPending: 'PENDING (बाकी)',
    paidDateLabel: 'Settlement Date',
    simpleInterestRule: 'Simple Interest: Increases automatically every completed month for pending accounts.',
    note: 'Note (Optional)',
    notePlaceholder: 'Add any remarks, village name, item reference...',
    saveBtn: 'Save Hisaab',
    updateBtn: 'Update Hisaab',
    cancelBtn: 'Cancel',
    deleteBtn: 'Delete',
    editBtn: 'Edit',
    viewBtn: 'View Details',
    all: 'All',
    today: 'Today',
    thisMonth: 'This Month',
    customRange: 'Custom Range',
    startDate: 'From Date',
    endDate: 'To Date',
    actions: 'Actions',
    exportCsv: 'Export CSV',
    exportPdf: 'Export PDF',
    exportPersonCsv: 'Export Person CSV',
    exportPersonPdf: 'Export Person PDF',
    backupData: 'Export Backup JSON',
    restoreData: 'Import Backup JSON',
    clearAllData: 'Clear All Data',
    loadSampleData: 'Load Sample Data',
    noDataTitle: 'No Hisaab Added Yet',
    noDataSubtitle: 'Start maintaining your money records easily.',
    addFirstPerson: '+ Add Your First Person',
    deleteConfirmTitle: 'Delete Confirmation',
    deleteConfirmMsg: 'Are you sure you want to delete this record for',
    deleteIrreversible: 'This action cannot be undone.',
    trash: 'Trash Bin',
    trashBin: 'Trash & Recycle Bin',
    trashRecoveryTitle: 'Trash & Data Recovery',
    itemsInTrash: 'records in trash',
    moveToTrash: 'Move to Trash',
    moveToTrashBtn: 'Move to Trash',
    moveToTrashConfirmTitle: 'Move to Trash?',
    moveToTrashConfirmMsg: 'This hisaab will be moved to the Trash Bin. You can restore it anytime.',
    restore: 'Restore',
    restoreAll: 'Restore All',
    restoreAllConfirmTitle: 'Restore All Records?',
    restoreAllConfirmMsg: 'All hisaab records in the trash will be restored back to your active list.',
    emptyTrash: 'Empty Trash',
    emptyTrashConfirmTitle: 'Empty Entire Trash Bin?',
    emptyTrashConfirmMsg: 'All records currently in the trash will be permanently deleted. This action cannot be undone.',
    permanentDelete: 'Delete Forever',
    permanentDeleteBtn: 'Delete Forever',
    permanentDeleteConfirmTitle: 'Permanently Delete?',
    permanentDeleteConfirmMsg: 'This record will be permanently deleted from this device and cannot be recovered.',
    trashEmptyTitle: 'Trash Bin is Empty',
    trashEmptySubtitle: 'Deleted records will appear here safely. You can restore them anytime.',
    deletedOn: 'Deleted on',
    undo: 'Undo',
    toastMovedToTrash: 'moved to Trash',
    toastRestored: 'Record restored successfully!',
    toastRestoredAll: 'All records restored from trash!',
    toastTrashEmptied: 'Trash emptied successfully!',
    toastPermanentlyDeleted: 'Record permanently deleted.',
    clearConfirmTitle: 'Clear All Records?',
    clearConfirmMsg: 'This will delete ALL hisaab entries from this device. Please make sure you have exported a backup.',
    toastAdded: 'Person hisaab added successfully!',
    toastUpdated: 'Person hisaab updated successfully!',
    toastDeleted: 'Person hisaab deleted successfully!',
    toastStatusChanged: 'Payment status updated!',
    toastInterestPaid: 'Interest payment recorded successfully!',
    toastBackupSaved: 'Backup file downloaded successfully!',
    toastBackupRestored: 'Backup restored successfully!',
    toastCleared: 'All data cleared successfully!',
    callPerson: 'Call',
    whatsappReminder: 'WhatsApp Reminder',
    ratePresets: ['2%', '3%', '5%', '10%', '12%'],
    amountPresets: [1000, 5000, 10000, 20000, 50000, 100000],
    login: 'Login / Sign In',
    logout: 'Log Out',
    account: 'Account',
    loginTitle: 'Sign In to Digital Hisaab Management System',
    loginSubtitle: 'Secure your money records with Cloud Backup & Multi-device Sync',
    signInWithGoogle: 'Continue with Google (Gmail)',
    signInWithPhone: 'Continue with Mobile Number',
    enterMobileNumber: 'Enter Mobile Number',
    sendOtp: 'Send OTP (सत्यापन कोड)',
    enterOtp: 'Enter 6-digit OTP Code',
    verifyOtp: 'Verify & Login',
    resendOtp: 'Resend OTP',
    changeNumber: 'Change Number',
    guestMode: 'Continue as Guest / Offline',
    cloudSynced: 'Cloud Synced',
    guestOffline: 'Offline Mode',
    syncToCloud: 'Sync Local Data to Cloud',
    syncSuccess: 'Synced data with cloud successfully!',
    loginSuccess: 'Logged in successfully!',
    logoutSuccess: 'Logged out successfully.',
    dataSafety: 'Secure Cloud Storage (Firebase Firestore)',
  },
  hi: {
    appName: 'डिजिटल हिसाब मैनेजमेंट सिस्टम',
    appTagline: 'आधुनिक डिजिटल रुपया व मासिक ब्याज हिसाब-किताब प्रबंधन प्रणाली',
    home: 'होम',
    persons: 'व्यक्ति सूची',
    add: 'नया हिसाब',
    reports: 'रिपोर्ट्स',
    settings: 'सेटिंग्स',
    searchPlaceholder: 'नाम या मोबाइल नंबर से खोजें...',
    quickSearch: 'त्वरित खोज',
    totalPersons: 'कुल व्यक्ति',
    totalPrincipal: 'कुल मूलधन',
    totalAmount: 'कुल देय रकम',
    totalInterest: 'कुल ब्याज',
    totalMonthlyInterest: 'मासिक ब्याज प्रवाह',
    totalPaidAmount: 'कुल प्राप्त (चुकता)',
    totalPendingAmount: 'कुल बाकी (लंबित)',
    paidPersons: 'चुकता व्यक्ति',
    pendingPersons: 'बाकी व्यक्ति',
    recentPersons: 'हालिया प्रविष्टियाँ',
    pendingPayments: 'बाकी वसूली सूची',
    viewAll: 'सभी देखें',
    noPending: 'बहुत बढ़िया! अभी कोई रकम बाकी नहीं है।',
    addPersonTitle: 'नया हिसाब दर्ज करें',
    editPersonTitle: 'हिसाब में सुधार करें',
    personName: 'व्यक्ति का नाम',
    personNamePlaceholder: 'Enter name',
    mobileNumber: 'मोबाइल नंबर',
    mobilePlaceholder: 'उदा. 9876543210',
    ratePercent: 'मासिक ब्याज दर (%)',
    ratePlaceholder: 'उदा. 5',
    denaDate: 'देना तारीख',
    principalAmount: 'मूलधन राशि (₹)',
    principalPlaceholder: 'उदा. 10000',
    paymentModeLabel: 'भुगतान का प्रकार (Payment Mode)',
    modeStandard: '🔄 साधारण एकमुश्त (Standard)',
    modeStandardDesc: 'मूलधन + ब्याज अंत में एक साथ चुकता होता है',
    modeInterestOnly: '📅 केवल ब्याज भुगतान (Interest Only)',
    modeInterestOnlyDesc: 'मूलधन स्थिर (अपरिवर्तित) रहेगा, कर्जदार हर महीने सिर्फ ब्याज देगा',
    payInterestBtn: '💰 ब्याज जमा करें (Pay Interest)',
    payInterestTitle: 'मासिक ब्याज भुगतान दर्ज करें',
    monthlyInterestRecords: 'मासिक ब्याज रिकॉर्ड (Monthly Schedule)',
    paymentHistory: 'ब्याज भुगतान इतिहास (Payment History)',
    totalInterestPaid: 'कुल जमा ब्याज (Total Interest Paid)',
    currentInterestDue: 'वर्तमान बाकी ब्याज (Current Interest Due)',
    originalPrincipal: 'मूलधन राशि (अपरिवर्तित)',
    monthIndexLabel: 'माह',
    periodLabel: 'ब्याज अवधि',
    dueDateLabel: 'देय तारीख',
    interestPaidOn: 'जमा तारीख',
    paymentMethod: 'भुगतान का माध्यम',
    cash: 'नकद (Cash)',
    upi: 'PhonePe / Google Pay / UPI',
    bank: 'बैंक ट्रांसफर (Bank Transfer)',
    other: 'अन्य (Other)',
    confirmInterestPayment: 'ब्याज भुगतान दर्ज करें',
    markAsPaid: 'जमा मार्क करें',
    markAsPending: 'बाकी मार्क करें',
    settleLoanPrincipal: 'पूरा हिसाब चुकता करें (मूलधन + बकाया ब्याज)',
    monthlyInterest: 'मासिक ब्याज (₹)',
    completedMonths: 'पूर्ण महीने',
    calculatedInterest: 'कुल ब्याज',
    calculatedTotal: 'वर्तमान कुल रकम',
    paymentStatus: 'भुगतान स्थिति',
    statusPaid: 'चुकता (PAID)',
    statusPending: 'बाकी (PENDING)',
    paidDateLabel: 'चुकता तारीख',
    simpleInterestRule: 'साधारण ब्याज: बाकी खातों के लिए हर पूर्ण महीने पर ब्याज स्वतः बढ़ता है।',
    note: 'टिप्पणी / नोट (वैकल्पIC)',
    notePlaceholder: 'गांव का नाम, सामान का विवरण या कोई खास बात...',
    saveBtn: 'हिसाब सुरक्षित करें',
    updateBtn: 'अपडेट करें',
    cancelBtn: 'रद्द करें',
    deleteBtn: 'हटाएं',
    editBtn: 'संपादित करें',
    viewBtn: 'विवरण देखें',
    all: 'सभी',
    today: 'आज',
    thisMonth: 'इस महीने',
    customRange: 'कस्टम तारीख',
    startDate: 'प्रारंभ तारीख',
    endDate: 'अंतिम तारीख',
    actions: 'क्रियाएँ',
    exportCsv: 'CSV डाउनलोड करें',
    exportPdf: 'PDF रिपोर्ट डाउनलोड करें',
    exportPersonCsv: 'व्यक्ति का CSV',
    exportPersonPdf: 'व्यक्ति का PDF बिल',
    backupData: 'बैकअप JSON फाइल डाउनलोड',
    restoreData: 'बैकअप JSON रीस्टोर करें',
    clearAllData: 'पूरा डेटा साफ़ करें',
    loadSampleData: 'डेमो डेटा लोड करें',
    noDataTitle: 'अभी तक कोई हिसाब नहीं जोड़ा गया',
    noDataSubtitle: 'रुपये-पैसे का हिसाब-किताब आसानी से रखना शुरू करें।',
    addFirstPerson: '+ पहला हिसाब जोड़ें',
    deleteConfirmTitle: 'हटाने की पुष्टि करें',
    deleteConfirmMsg: 'क्या आप सचमुच इस रिकॉर्ड को हटाना चाहते हैं:',
    deleteIrreversible: 'यह रिकॉर्ड हमेशा के लिए हट जाएगा।',
    trash: 'कचरा पेटी (ट्रैश)',
    trashBin: 'कचरा पेटी व रीसायकल बिन',
    trashRecoveryTitle: 'कचरा पेटी और डेटा रिकवरी (Trash)',
    itemsInTrash: 'हिसाब ट्रैश में सुरक्षित हैं',
    moveToTrash: 'ट्रैश में डालें',
    moveToTrashBtn: 'ट्रैश में भेजें',
    moveToTrashConfirmTitle: 'ट्रैश (कचरा पेटी) में भेजें?',
    moveToTrashConfirmMsg: 'यह हिसाब ट्रैश में सुरक्षित रहेगा। आप इसे कभी भी वापस (Restore) ला सकते हैं।',
    restore: 'वापस लाएं (Restore)',
    restoreAll: 'सभी वापस लाएं (Restore All)',
    restoreAllConfirmTitle: 'सभी हिसाब वापस लाएं?',
    restoreAllConfirmMsg: 'ट्रैश में मौजूद सभी हिसाब वापस आपकी मुख्य खाता सूची में जोड़ दिए जाएंगे।',
    emptyTrash: 'ट्रैश खाली करें (Empty Trash)',
    emptyTrashConfirmTitle: 'क्या आप पूरी कचरा पेटी खाली करना चाहते हैं?',
    emptyTrashConfirmMsg: 'ट्रैश में मौजूद सभी रिकॉर्ड हमेशा के लिए मिट जाएंगे और उन्हें वापस नहीं लाया जा सकेगा।',
    permanentDelete: 'हमेशा के लिए मिटाएं',
    permanentDeleteBtn: 'हमेशा के लिए मिटाएं',
    permanentDeleteConfirmTitle: 'स्थायी रूप से हटाएं?',
    permanentDeleteConfirmMsg: 'यह हिसाब इस डिवाइस से पूरी तरह मिटा दिया जाएगा और इसे दोबारा वापस नहीं लाया जा सकेगा।',
    trashEmptyTitle: 'कचरा पेटी (ट्रैश) खाली है',
    trashEmptySubtitle: 'हटाए गए हिसाब यहाँ सुरक्षित रहेंगे और आप उन्हें कभी भी वापस ला सकते हैं।',
    deletedOn: 'हटाया गया',
    undo: 'वापस लें (Undo)',
    toastMovedToTrash: 'को ट्रैश में भेजा गया',
    toastRestored: 'हिसाब सफलतापूर्वक वापस आ गया!',
    toastRestoredAll: 'सभी हिसाब ट्रैश से सफलतापूर्वक वापस आ गए!',
    toastTrashEmptied: 'कचरा पेटी सफलतापूर्वक खाली कर दी गई!',
    toastPermanentlyDeleted: 'रिकॉर्ड हमेशा के लिए हटा दिया गया।',
    clearConfirmTitle: 'सारा डेटा साफ़ करें?',
    clearConfirmMsg: 'यह इस डिवाइस से सभी हिसाब मिटा देगा। कृपया पहले बैकअप ले लें।',
    toastAdded: 'नया हिसाब सफलतापूर्वक जुड़ गया!',
    toastUpdated: 'हिसाब सफलतापूर्वक अपडेट हो गया!',
    toastDeleted: 'रिकॉर्ड हटा दिया गया!',
    toastStatusChanged: 'भुगतान स्थिति बदल दी गई!',
    toastInterestPaid: 'ब्याज भुगतान सफलतापूर्वक दर्ज हो गया!',
    toastBackupSaved: 'बैकअप फ़ाइल डाउनलोड हो गई!',
    toastBackupRestored: 'डेटा सफलतापूर्वक रीस्टोर हो गया!',
    toastCleared: 'सारा डेटा साफ़ कर दिया गया!',
    callPerson: 'कॉल करें',
    whatsappReminder: 'व्हाट्सएप पर तगादा भेजें',
    ratePresets: ['2%', '3%', '5%', '10%', '12%'],
    amountPresets: [1000, 5000, 10000, 20000, 50000, 100000],
    login: 'लॉग इन / साइन इन',
    logout: 'लॉग आउट',
    account: 'खाता / प्रोफ़ाइल',
    loginTitle: 'डिजिटल हिसाब मैनेजमेंट सिस्टम में लॉग इन करें',
    loginSubtitle: 'क्लाउड बैकअप और सुरक्षित खाता प्रबंधन के लिए लॉगिन करें',
    signInWithGoogle: 'Google (Gmail) से लॉगिन करें',
    signInWithPhone: 'मोबाइल नंबर (OTP) से लॉगिन करें',
    enterMobileNumber: 'अपना 10-अंकों का मोबाइल नंबर दर्ज करें',
    sendOtp: 'OTP कोड भेजें (Send OTP)',
    enterOtp: '6-अंकों का OTP कोड दर्ज करें',
    verifyOtp: 'OTP सत्यापित करें व लॉगिन करें',
    resendOtp: 'दोबारा OTP भेजें',
    changeNumber: 'नंबर बदलें',
    guestMode: 'बिना लॉगिन जारी रखें (Guest/Offline)',
    cloudSynced: 'क्लाउड सिंक सक्रिय',
    guestOffline: 'ऑफलाइन मोड',
    syncToCloud: 'लोकल डेटा को क्लाउड पर सेव करें',
    syncSuccess: 'डेटा सफलतापूर्वक क्लाउड पर सिंक हो गया!',
    loginSuccess: 'सफलतापूर्वक लॉग इन हो गया!',
    logoutSuccess: 'सफलतापूर्वक लॉग आउट हो गया।',
    dataSafety: 'सुरक्षित क्लाउड स्टोरेज (Firebase Firestore)',
  },
};

