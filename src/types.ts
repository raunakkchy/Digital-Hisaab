export type PaymentStatus = 'pending' | 'paid';
export type PaymentMode = 'standard' | 'interest_only';
export type InterestRecordStatus = 'pending' | 'paid';

export interface MonthlyInterestRecord {
  id: string;
  monthIndex: number; // 1, 2, 3...
  monthLabel: string; // e.g. "Month 1 (15 Jan 2026 - 14 Feb 2026)"
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  interestAmount: number; // Monthly interest from original principal
  status: InterestRecordStatus; // 'pending' | 'paid'
  paidDate?: string; // YYYY-MM-DD
  paidAmount?: number;
  paymentMethod?: 'cash' | 'upi' | 'bank' | 'other' | string;
  note?: string;
  paidAt?: string;
}

export interface InterestPaymentHistoryEntry {
  id: string;
  monthRecordId?: string;
  monthIndex?: number;
  monthLabel: string;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMethod?: 'cash' | 'upi' | 'bank' | 'other' | string;
  note?: string;
  createdAt: string;
}

export interface PersonHisaab {
  id: string;
  name: string;
  mobile: string;
  rate: number; // Monthly percentage rate, e.g., 2, 3, 5, 10
  denaDate: string; // YYYY-MM-DD
  principalAmount: number; // in ₹ (kept unchanged)
  paymentMode?: PaymentMode; // 'standard' | 'interest_only'
  monthlyInterest: number; // calculated: principal * rate / 100
  completedMonths: number; // completed full months from denaDate to today (or paidDate)
  totalMonths: number; // total billing months (including current running month)
  interestAmount: number; // total generated simple interest
  totalAmount: number; // calculated current total (Principal + Interest due)
  status: PaymentStatus;
  paidDate?: string; // YYYY-MM-DD when settled if paid
  note?: string;

  // Interest Only details
  interestRecords?: MonthlyInterestRecord[];
  interestPayments?: InterestPaymentHistoryEntry[];
  totalInterestPaid?: number;
  currentInterestDue?: number;
  lastInterestPaidDate?: string;

  // Trash / Soft delete support
  isDeleted?: boolean;
  deletedAt?: string; // ISO string

  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export type ActiveTab = 'home' | 'persons' | 'add' | 'reports' | 'settings';
export type StatusFilterOption = 'all' | 'paid' | 'pending';
export type PaymentModeFilterOption = 'all' | 'standard' | 'interest_only';
export type DateFilterOption = 'all' | 'today' | 'this_month' | 'custom';
export type Language = 'en' | 'hi';
export type ThemeMode = 'light' | 'dark';

export interface UserProfile {
  userId: string;
  displayName?: string;
  email?: string;
  phoneNumber?: string;
  photoURL?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  providerId?: string;
}

export interface LocalAccount {
  id: string; // generated uid
  username: string; // mobile number or username
  displayName: string;
  passwordHash: string; // SHA-256 hash
  salt: string;
  securityQuestion?: string; // legacy support
  securityAnswerHash?: string; // legacy support
  securityQuestion1?: string;
  securityAnswer1Hash?: string;
  securityQuestion2?: string;
  securityAnswer2Hash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalPersons: number;
  totalPrincipal: number;
  totalMonthlyInterest: number;
  totalInterest: number;
  totalAmount: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
  paidPersonsCount: number;
  pendingPersonsCount: number;
  totalInterestCollected?: number;
  totalInterestDue?: number;
  interestOnlyPersonsCount?: number;
}

