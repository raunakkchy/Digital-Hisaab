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
 * - Monthly Interest = Principal * Rate / 100
 * - Completed Months = full elapsed months from Dena Date to Today (or Paid Date if status is 'paid')
 * - Total Months = Completed Months + 1 (Current running month is included)
 * - Total Interest = Monthly Interest * Total Months
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

  // Monthly Interest = Principal * Rate / 100
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

  // Total Interest accrued = Monthly Interest * Total Months (including current month)
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
        'जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
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
`📋 *डिजिटल हिसाब | खाता चुकता विवरण*
नमस्ते *${person.name}* जी, आपका केवल-ब्याज खाता पूरी तरह चुकता और बंद कर दिया गया है।

📌 *खाता विवरण (Interest Only Loan):*
• *उधार देने की तारीख:* ${formattedDate}
• *मूलधन राशि (Principal):* ${formatCurrency(person.principalAmount)} *(स्थिर)*
• *मासिक ब्याज दर:* ${person.rate}% प्रति माह (${formatCurrency(person.monthlyInterest)} / माह)
• *कुल समय अवधि:* ${totalMos} महीने
• *कुल चुकाया गया ब्याज:* ${formatCurrency(paidInterest)} (${paidMonthsCount} माह)
${formattedPaidDate ? `• *चुकता तारीख (Settled On):* ${formattedPaidDate}\n` : ''}• *स्थिति:* ✅ पूर्ण चुकता (SETTLED)

${person.note ? `📝 *विवरण:* ${person.note}\n` : ''}${customNote ? `💬 *नोट:* ${customNote}\n` : ''}धन्यवाद!
_डिजिटल हिसाब (Simple Hisaab)_`
        );
      }

      return (
`📋 *डिजिटल हिसाब | मासिक ब्याज विवरण*
नमस्ते *${person.name}* जी, यह आपके केवल-ब्याज खाते का विवरण है।

📌 *खाता विवरण (Interest-Only Statement):*
• *उधार देने की तारीख:* ${formattedDate}
• *मूलधन राशि (Principal):* ${formatCurrency(person.principalAmount)} *(स्थिर)*
• *मासिक ब्याज दर:* ${person.rate}% प्रति माह (${formatCurrency(person.monthlyInterest)} / माह)
• *समय अवधि:* ${totalMos} महीने (चालू माह सहित)
• *कुल जमा ब्याज (Paid):* ${formatCurrency(paidInterest)} (${paidMonthsCount} माह)
• *बाकी देय ब्याज (Pending Due):* ${formatCurrency(dueInterest)} (${pendingMonthsCount} माह)

💰 *वर्तमान देय ब्याज राशि: ${formatCurrency(dueInterest)}*
*(मूलधन: ${formatCurrency(person.principalAmount)} + देय ब्याज: ${formatCurrency(dueInterest)} = कुल: ${formatCurrency(person.totalAmount)})*
• *ब्याज स्थिति:* ${dueInterest > 0 ? '⚠️ बाकी देय (PENDING)' : '✅ अद्यतन (UP TO DATE)'}

${person.note ? `📝 *विवरण:* ${person.note}\n` : ''}${customNote ? `💬 *नोट:* ${customNote}\n` : ''}कृपया समय पर ब्याज जमा करवाएं। धन्यवाद!
_डिजिटल हिसाब (Simple Hisaab)_`
      );
    }

    if (isPaid) {
      return (
`📋 *डिजिटल हिसाब | भुगतान रसीद*
नमस्ते *${person.name}* जी, आपका हिसाब पूर्ण रूप से चुकता हो चुका है।

📌 *भुगतान विवरण (Payment Receipt):*
• *उधार तारीख (Date):* ${formattedDate}
• *मूलधन (Principal):* ${formatCurrency(person.principalAmount)}
• *मासिक ब्याज दर (Rate):* ${person.rate}% प्रति माह
• *कुल महीने:* ${totalMos} महीने
• *कुल ब्याज:* ${formatCurrency(person.interestAmount)}
• *कुल चुकता राशि:* ${formatCurrency(person.totalAmount)}
${formattedPaidDate ? `• *चुकता तारीख (Settled On):* ${formattedPaidDate}\n` : ''}• *स्थिति:* ✅ पूर्ण चुकता (PAID & SETTLED)

${person.note ? `📝 *विवरण:* ${person.note}\n` : ''}${customNote ? `💬 *नोट:* ${customNote}\n` : ''}समय पर भुगतान के लिए आपका बहुत-बहुत धन्यवाद!
_डिजिटल हिसाब (Simple Hisaab)_`
      );
    }

    return (
`📋 *डिजिटल हिसाब | बकाया विवरण व भुगतान सूचना*
नमस्ते *${person.name}* जी, आपके साधारण ब्याज ऋण का विवरण नीचे दिया गया है:

📌 *खाता विवरण (Statement Details):*
• *उधार तारीख (Date):* ${formattedDate}
• *मूलधन (Principal):* ${formatCurrency(person.principalAmount)}
• *ब्याज दर (Rate):* ${person.rate}% प्रति माह (${formatCurrency(person.monthlyInterest)} / माह)
• *कुल समय (Duration):* ${totalMos} महीने (चालू माह सहित)
• *कुल साधारण ब्याज:* ${formatCurrency(person.interestAmount)}
💰 *कुल देय राशि: ${formatCurrency(person.totalAmount)}*
• *स्थिति:* ⏳ बाकी देय (PENDING)

${person.note ? `📝 *विवरण:* ${person.note}\n` : ''}${customNote ? `💬 *नोट:* ${customNote}\n` : ''}कृपया हिसाब देखकर भुगतान की व्यवस्था करें। धन्यवाद!
_डिजिटल हिसाब (Simple Hisaab)_`
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
`📋 *DIGITAL HISAAB | LOAN SETTLED*
Dear *${person.name}*, Greetings! Your Interest-Only account has been fully settled and closed.

📌 *Settlement Summary:*
• *Given Date:* ${formattedDate}
• *Principal Amount:* ${formatCurrency(person.principalAmount)} *(Unchanged)*
• *Monthly Rate:* ${person.rate}% / mo (${formatCurrency(person.monthlyInterest)} / mo)
• *Total Duration:* ${totalMos} Months
• *Total Interest Paid:* ${formatCurrency(paidInterest)} (${paidMonthsCount} months)
${formattedPaidDate ? `• *Settlement Date:* ${formattedPaidDate}\n` : ''}• *Status: FULLY PAID & SETTLED*

${person.note ? `📝 *Note:* ${person.note}\n` : ''}${customNote ? `💬 *Message:* ${customNote}\n` : ''}Thank you very much for the prompt settlement!
_Digital Hisaab_`
      );
    }

    return (
`📋 *DIGITAL HISAAB | INTEREST STATEMENT*
Dear *${person.name}*, Greetings! Here is the statement for your *Interest-Only Account*:

📌 *Account Summary:*
• *Loan Start Date:* ${formattedDate}
• *Original Principal:* ${formatCurrency(person.principalAmount)} *(Unchanged)*
• *Monthly Interest:* ${person.rate}% / mo (${formatCurrency(person.monthlyInterest)} / mo)
• *Billing Duration:* ${totalMos} Months (current month included)
• *Total Interest Paid:* ${formatCurrency(paidInterest)} (${paidMonthsCount} months)
• *Current Interest Due:* ${formatCurrency(dueInterest)} (${pendingMonthsCount} months pending)

💰 *Current Interest Due: ${formatCurrency(dueInterest)}*
*(Principal: ${formatCurrency(person.principalAmount)} + Due Interest: ${formatCurrency(dueInterest)} = Total: ${formatCurrency(person.totalAmount)})*
• *Interest Status:* ${dueInterest > 0 ? '⚠️ PENDING' : '✅ UP TO DATE'}

${person.note ? `📝 *Note:* ${person.note}\n` : ''}${customNote ? `💬 *Message:* ${customNote}\n` : ''}Kindly arrange the monthly interest payment at your earliest convenience. Thank you!
_Digital Hisaab_`
    );
  }

  if (isPaid) {
    return (
`📋 *DIGITAL HISAAB | PAYMENT RECEIPT*
Dear *${person.name}*, Greetings! We confirm that the full settlement for your account has been successfully received.

📌 *Payment Receipt Summary:*
• *Given Date:* ${formattedDate}
• *Principal Amount:* ${formatCurrency(person.principalAmount)}
• *Monthly Rate:* ${person.rate}% / month
• *Billing Period:* ${totalMos} Months
• *Total Simple Interest:* ${formatCurrency(person.interestAmount)}
• *Total Amount Settled:* ${formatCurrency(person.totalAmount)}
${formattedPaidDate ? `• *Settlement Date:* ${formattedPaidDate}\n` : ''}• *Account Status: FULLY PAID & SETTLED*

${person.note ? `📝 *Note:* ${person.note}\n` : ''}${customNote ? `💬 *Message:* ${customNote}\n` : ''}Thank you very much for the prompt settlement!
_Digital Hisaab_`
    );
  }

  return (
`📋 *DIGITAL HISAAB | ACCOUNT STATEMENT*
Dear *${person.name}*, Greetings! Here is the official simple interest statement for your account:

📌 *Account Summary:*
• *Given Date (Dena Date):* ${formattedDate}
• *Principal Amount:* ${formatCurrency(person.principalAmount)}
• *Monthly Interest Rate:* ${person.rate}% / month (${formatCurrency(person.monthlyInterest)} / mo)
• *Applicable Period:* ${totalMos} Months (current month included)
• *Total Simple Interest:* ${formatCurrency(person.interestAmount)}
💰 *Total Amount Due: ${formatCurrency(person.totalAmount)}*
• *Payment Status:* ⏳ PENDING

${person.note ? `📝 *Note:* ${person.note}\n` : ''}${customNote ? `💬 *Message:* ${customNote}\n` : ''}Kindly review the statement and arrange the payment at your earliest convenience. Feel free to get in touch for any queries or clarifications. Thank you!
_Digital Hisaab_`
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
    pendingPayments: 'Pending Payments',
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
    denaDate: 'Dena Date',
    principalAmount: 'Principal Amount',
    principalPlaceholder: 'e.g. 10000',
    paymentModeLabel: 'Payment Mode',
    modeStandard: 'Standard (Lump-Sum)',
    modeStandardDesc: 'Principal + Interest paid together at settlement',
    modeInterestOnly: 'Interest Only',
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
    cash: 'Cash',
    upi: 'PhonePe / GPay / UPI',
    bank: 'Bank Transfer',
    other: 'Other',
    confirmInterestPayment: 'Confirm Interest Payment',
    markAsPaid: 'Mark Paid',
    markAsPending: 'Mark Pending',
    settleLoanPrincipal: 'Settle Entire Loan (Principal & Balance)',
    monthlyInterest: 'Monthly Interest',
    completedMonths: 'Completed Months',
    calculatedInterest: 'Total Interest',
    calculatedTotal: 'Current Total',
    paymentStatus: 'Payment Status',
    statusPaid: 'PAID',
    statusPending: 'PENDING',
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
    sendOtp: 'Send OTP',
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
    appName: 'डिजिटल हिसाब',
    appTagline: 'डिजिटल खाता व मासिक ब्याज प्रबंधन प्रणाली',
    home: 'होम',
    persons: 'खातेदार',
    add: 'हिसाब जोड़ें',
    reports: 'रिपोर्ट्स',
    settings: 'सेटिंग्स',
    searchPlaceholder: 'नाम या मोबाइल नंबर खोजें...',
    quickSearch: 'त्वरित खोज',
    totalPersons: 'कुल खातेदार',
    totalPrincipal: 'कुल मूलधन',
    totalAmount: 'कुल देय राशि',
    totalInterest: 'कुल ब्याज',
    totalMonthlyInterest: 'मासिक ब्याज प्रवाह',
    totalPaidAmount: 'कुल प्राप्त रकम',
    totalPendingAmount: 'कुल बकाया रकम',
    paidPersons: 'चुकता खाते',
    pendingPersons: 'बाकी खाते',
    recentPersons: 'हालिया हिसाब',
    pendingPayments: 'बकाया हिसाब',
    viewAll: 'सभी देखें',
    noPending: 'बधाई! अभी कोई बकाया हिसाब नहीं है।',
    addPersonTitle: 'नया हिसाब जोड़ें',
    editPersonTitle: 'हिसाब बदलें',
    personName: 'खातेदार का नाम',
    personNamePlaceholder: 'नाम दर्ज करें',
    mobileNumber: 'मोबाइल नंबर',
    mobilePlaceholder: 'उदा. 9876543210',
    ratePercent: 'ब्याज दर (%)',
    ratePlaceholder: 'उदा. 5',
    denaDate: 'उधार तारीख',
    principalAmount: 'मूलधन राशि',
    principalPlaceholder: 'उदा. 10000',
    paymentModeLabel: 'भुगतान मॉडल (Payment Mode)',
    modeStandard: 'मानक (एकमुश्त चुकता)',
    modeStandardDesc: 'मूलधन और ब्याज एक साथ हिसाब चुकता करते समय दिया जाता है',
    modeInterestOnly: 'केवल मासिक ब्याज',
    modeInterestOnlyDesc: 'मूलधन स्थिर रहता है, कर्जदार हर महीने केवल ब्याज भरता है',
    payInterestBtn: 'ब्याज जमा करें',
    payInterestTitle: 'मासिक ब्याज भुगतान दर्ज करें',
    monthlyInterestRecords: 'मासिक ब्याज शेड्यूल',
    paymentHistory: 'भुगतान इतिहास',
    totalInterestPaid: 'कुल जमा ब्याज',
    currentInterestDue: 'वर्तमान बकाया ब्याज',
    originalPrincipal: 'मूलधन (स्थिर)',
    monthIndexLabel: 'महीना',
    periodLabel: 'बिलिंग अवधि',
    dueDateLabel: 'देय तारीख',
    interestPaidOn: 'भुगतान तारीख',
    paymentMethod: 'भुगतान माध्यम',
    cash: 'नकद (Cash)',
    upi: 'PhonePe / Google Pay / UPI',
    bank: 'बैंक ट्रांसफर',
    other: 'अन्य',
    confirmInterestPayment: 'ब्याज भुगतान की पुष्टि करें',
    markAsPaid: 'चुकता मार्क करें',
    markAsPending: 'बाकी मार्क करें',
    settleLoanPrincipal: 'पूरा कर्ज़ चुकता करें (मूलधन + बकाया)',
    monthlyInterest: 'मासिक ब्याज',
    completedMonths: 'पूर्ण महीने',
    calculatedInterest: 'कुल ब्याज',
    calculatedTotal: 'कुल हिसाब',
    paymentStatus: 'भुगतान स्थिति',
    statusPaid: 'पूर्ण चुकता (PAID)',
    statusPending: 'बाकी देय (PENDING)',
    paidDateLabel: 'चुकता तारीख',
    simpleInterestRule: 'साधारण ब्याज: बकाया खातों के लिए हर पूर्ण महीने पर अपने आप बढ़ता है।',
    note: 'टिप्पणी / नोट (वैकल्पिक)',
    notePlaceholder: 'उधार का कारण, जमानतदार या अन्य विवरण...',
    saveBtn: 'हिसाब सहेजें',
    updateBtn: 'हिसाब अपडेट करें',
    cancelBtn: 'रद्द करें',
    deleteBtn: 'हटाएं',
    editBtn: 'बदलें',
    viewBtn: 'विवरण देखें',
    all: 'सभी',
    today: 'आज',
    thisMonth: 'इस माह',
    customRange: 'कस्टम अवधि',
    startDate: 'प्रारंभ तिथि',
    endDate: 'अंतिम तिथि',
    actions: 'कार्य',
    exportCsv: 'CSV डाउनलोड',
    exportPdf: 'PDF रिपोर्ट',
    exportPersonCsv: 'खाता CSV',
    exportPersonPdf: 'खाता PDF वाउचर',
    backupData: 'बैकअप JSON डाउनलोड',
    restoreData: 'बैकअप JSON रीस्टोर',
    clearAllData: 'सभी हिसाब साफ़ करें',
    loadSampleData: 'सैंपल डेटा लोड करें',
    noDataTitle: 'अभी कोई हिसाब नहीं जुड़ा है',
    noDataSubtitle: 'आसानी से अपने लेन-देन का हिसाब रखना शुरू करें।',
    addFirstPerson: '+ पहला खाता जोड़ें',
    deleteConfirmTitle: 'हिसाब हटाएं?',
    deleteConfirmMsg: 'क्या आप वाकई हटाना चाहते हैं:',
    deleteIrreversible: 'यह क्रिया वापस नहीं ली जा सकती।',
    trash: 'कचरा पेटी',
    trashBin: 'कचरा पेटी (Trash)',
    trashRecoveryTitle: 'कचरा पेटी व डेटा रिकवरी',
    itemsInTrash: 'आइटम कचरा पेटी में हैं',
    moveToTrash: 'कचरा पेटी में भेजें',
    moveToTrashBtn: 'कचरा पेटी में भेजें',
    moveToTrashConfirmTitle: 'कचरा पेटी में भेजें?',
    moveToTrashConfirmMsg: 'यह हिसाब कचरा पेटी में चला जाएगा, जहाँ से इसे कभी भी वापस लाया जा सकता है।',
    restore: 'रीस्टोर करें',
    restoreAll: 'सभी रीस्टोर करें',
    restoreAllConfirmTitle: 'सभी हिसाब रीस्टोर करें?',
    restoreAllConfirmMsg: 'कचरा पेटी के सभी हिसाब पुनः सक्रिय सूची में आ जाएंगे।',
    emptyTrash: 'कचरा पेटी खाली करें',
    emptyTrashConfirmTitle: 'पूरी कचरा पेटी खाली करें?',
    emptyTrashConfirmMsg: 'कचरा पेटी के सभी हिसाब स्थायी रूप से मिट जाएंगे। यह क्रिया वापस नहीं होगी।',
    permanentDelete: 'हमेशा के लिए मिटाएं',
    permanentDeleteBtn: 'हमेशा के लिए मिटाएं',
    permanentDeleteConfirmTitle: 'स्थायी रूप से मिटाएं?',
    permanentDeleteConfirmMsg: 'यह हिसाब इस डिवाइस से हमेशा के लिए हट जाएगा।',
    trashEmptyTitle: 'कचरा पेटी खाली है',
    trashEmptySubtitle: 'हटाए गए हिसाब यहाँ सुरक्षित रहेंगे, जिन्हें कभी भी रीस्टोर किया जा सकता है।',
    deletedOn: 'मिटाने की तारीख',
    undo: 'वापस लें',
    toastMovedToTrash: 'कचरा पेटी में भेजा गया',
    toastRestored: 'हिसाब वापस रीस्टोर हो गया!',
    toastRestoredAll: 'सभी हिसाब कचरा पेटी से रीस्टोर हो गए!',
    toastTrashEmptied: 'कचरा पेटी खाली कर दी गई!',
    toastPermanentlyDeleted: 'हिसाब हमेशा के लिए मिटा दिया गया।',
    clearConfirmTitle: 'सभी हिसाब साफ़ करें?',
    clearConfirmMsg: 'क्या आप वाकई सभी हिसाब मिटाना चाहते हैं? कृपया पहले बैकअप ले लें।',
    toastAdded: 'नया हिसाब दर्ज हो गया!',
    toastUpdated: 'हिसाब अपडेट हो गया!',
    toastDeleted: 'हिसाब हटा दिया गया!',
    toastStatusChanged: 'भुगतान स्थिति अपडेट हो गई!',
    toastInterestPaid: 'मासिक ब्याज भुगतान सफलतापूर्वक दर्ज हुआ!',
    toastBackupSaved: 'बैकअप फ़ाइल डाउनलोड हो गई!',
    toastBackupRestored: 'बैकअप सफलतापूर्वक रीस्टोर हो गया!',
    toastCleared: 'सभी हिसाब साफ़ कर दिए गए।',
    callPerson: 'कॉल करें',
    whatsappReminder: 'व्हाट्सएप विवरण भेजें',
    ratePresets: ['2%', '3%', '5%', '10%', '12%'],
    amountPresets: [1000, 5000, 10000, 20000, 50000, 100000],
    login: 'लॉगिन / साइन इन',
    logout: 'लॉगआउट',
    account: 'अकाउंट',
    loginTitle: 'डिजिटल हिसाब में साइन इन करें',
    loginSubtitle: 'क्लाउड बैकअप और सुरक्षित स्टोरेज के साथ डेटा सुरक्षित रखें',
    signInWithGoogle: 'Google (Gmail) से लॉगिन करें',
    signInWithPhone: 'मोबाइल नंबर (OTP) से लॉगिन करें',
    enterMobileNumber: 'अपना 10-अंकीय मोबाइल नंबर दर्ज करें',
    sendOtp: 'OTP भेजें',
    enterOtp: '6-अंकीय OTP दर्ज करें',
    verifyOtp: 'OTP सत्यापित करें',
    resendOtp: 'पुनः OTP भेजें',
    changeNumber: 'नंबर बदलें',
    guestMode: 'अतिथि / ऑफ़लाइन जारी रखें',
    cloudSynced: 'क्लाउड सिंक सक्रिय',
    guestOffline: 'ऑफ़लाइन मोड',
    syncToCloud: 'डेटा क्लाउड में सुरक्षित करें',
    syncSuccess: 'क्लाउड के साथ सिंक सफल!',
    loginSuccess: 'लॉगिन सफल रहा!',
    logoutSuccess: 'लॉगआउट सफल रहा।',
    dataSafety: 'सुरक्षित क्लाउड स्टोरेज (Firebase Firestore)',
  },
};
