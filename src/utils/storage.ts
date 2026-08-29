import { PersonHisaab, ThemeMode, Language, LocalAccount, AppUser } from '../types';
import { calculateHisaab } from './formatters';

const STORAGE_KEY_THEME = 'simple_hisaab_theme';
const STORAGE_KEY_LANG = 'simple_hisaab_lang';
const STORAGE_KEY_ACCOUNTS = 'simple_hisaab_accounts_v1';
const STORAGE_KEY_AUTH_SESSION = 'simple_hisaab_session_v1';
const STORAGE_KEY_REMEMBER_ME = 'simple_hisaab_remember_v1';

// Dynamic person storage key per user account so data is separated
export function getUserPersonsStorageKey(userId: string | null | undefined): string {
  if (!userId) {
    return 'simple_hisaab_persons_default';
  }
  return `simple_hisaab_persons_user_${userId}`;
}

// -------------------------------------------------------------
// SECURE CRYPTO UTILITIES (SHA-256 Hashing with Salt)
// -------------------------------------------------------------

/**
 * Generate a random cryptographic salt
 */
export function generateSalt(length = 16): string {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute SHA-256 hash of password with salt using Web Crypto API
 */
export async function hashPasswordWithSalt(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt + '_SimpleHisaabKey2026');
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// -------------------------------------------------------------
// LOCAL ACCOUNTS & AUTH MANAGEMENT
// -------------------------------------------------------------

export function getStoredAccounts(): LocalAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading accounts from localStorage', err);
    return [];
  }
}

export function saveStoredAccounts(accounts: LocalAccount[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
  } catch (err) {
    console.error('Error saving accounts to localStorage', err);
  }
}

/**
 * Register a new user account with secure password hashing and 2 Security Questions
 */
export async function registerLocalAccount(
  username: string,
  pass: string,
  displayName: string,
  securityQuestion1?: string,
  securityAnswer1?: string,
  securityQuestion2?: string,
  securityAnswer2?: string
): Promise<{ success: boolean; account?: LocalAccount; error?: string }> {
  const cleanUsername = username.trim().toLowerCase();
  const cleanDisplay = displayName.trim() || username.trim();

  if (!cleanUsername || cleanUsername.length < 3) {
    return { success: false, error: 'Username/Mobile must be at least 3 characters long.' };
  }
  if (!pass || pass.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters long.' };
  }

  const accounts = getStoredAccounts();
  const existing = accounts.find((a) => a.username.toLowerCase() === cleanUsername);
  if (existing) {
    return { success: false, error: 'An account with this Mobile Number/Username already exists.' };
  }

  const salt = generateSalt();
  const passwordHash = await hashPasswordWithSalt(pass, salt);

  let securityAnswer1Hash: string | undefined;
  if (securityQuestion1 && securityAnswer1) {
    securityAnswer1Hash = await hashPasswordWithSalt(securityAnswer1.trim().toLowerCase(), salt);
  }

  let securityAnswer2Hash: string | undefined;
  if (securityQuestion2 && securityAnswer2) {
    securityAnswer2Hash = await hashPasswordWithSalt(securityAnswer2.trim().toLowerCase(), salt);
  }

  const newAccount: LocalAccount = {
    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    username: cleanUsername,
    displayName: cleanDisplay,
    passwordHash,
    salt,
    // Legacy support
    securityQuestion: securityQuestion1?.trim() || undefined,
    securityAnswerHash: securityAnswer1Hash,
    // 2 Security Questions
    securityQuestion1: securityQuestion1?.trim() || undefined,
    securityAnswer1Hash,
    securityQuestion2: securityQuestion2?.trim() || undefined,
    securityAnswer2Hash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  accounts.push(newAccount);
  saveStoredAccounts(accounts);

  return { success: true, account: newAccount };
}

/**
 * Authenticate user with Mobile/Username and Password
 */
export async function authenticateLocalAccount(
  username: string,
  pass: string
): Promise<{ success: boolean; account?: LocalAccount; error?: string; notFound?: boolean }> {
  const cleanUsername = username.trim().toLowerCase();
  const accounts = getStoredAccounts();
  const account = accounts.find((a) => a.username.toLowerCase() === cleanUsername);

  if (!account) {
    return { success: false, error: 'Account not found with this Mobile/Username.', notFound: true };
  }

  const testHash = await hashPasswordWithSalt(pass, account.salt);
  if (testHash !== account.passwordHash) {
    return { success: false, error: 'Incorrect password. Please try again.' };
  }

  return { success: true, account };
}

/**
 * Smart Login or Auto-Register helper:
 * If account exists, checks password. If account does not exist, creates it immediately and logs in!
 */
export async function smartLoginOrAutoRegister(
  username: string,
  pass: string,
  displayName?: string
): Promise<{ success: boolean; account?: LocalAccount; isNew?: boolean; error?: string }> {
  const cleanUser = username.trim().toLowerCase();
  const cleanPass = pass || '1234';
  const cleanName = displayName?.trim() || username.trim();

  const accounts = getStoredAccounts();
  const existing = accounts.find((a) => a.username.toLowerCase() === cleanUser);

  if (existing) {
    const testHash = await hashPasswordWithSalt(cleanPass, existing.salt);
    if (testHash === existing.passwordHash) {
      return { success: true, account: existing, isNew: false };
    }
    return { success: false, error: 'Incorrect password for existing account.' };
  }

  // Auto-create new account
  const regResult = await registerLocalAccount(
    cleanUser,
    cleanPass,
    cleanName,
    'City',
    'default'
  );

  if (regResult.success && regResult.account) {
    // New accounts start clean with 0 records
    clearAllData(regResult.account.id);
    return { success: true, account: regResult.account, isNew: true };
  }

  return { success: false, error: regResult.error || 'Failed to create account.' };
}

/**
 * Instant Quick Guest Login (1-click, clean empty khata)
 */
export async function createQuickGuestAccount(customName?: string): Promise<AppUser> {
  const name = customName?.trim() || 'Guest User (अतिथि)';
  const guestId = 'guest_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

  const guestUser: AppUser = {
    uid: guestId,
    displayName: name,
    email: null,
    phoneNumber: null,
    photoURL: null,
    providerId: 'guest',
  };

  // New guest starts with clean empty records
  clearAllData(guestId);

  return guestUser;
}

/**
 * 1-Click Demo Account with pre-loaded realistic sample data
 */
export async function createDemoAccount(): Promise<AppUser> {
  const demoId = 'demo_account_v1';
  const demoUser: AppUser = {
    uid: demoId,
    displayName: 'डेमो खाता (Demo Account)',
    email: 'demo@simplehisaab.com',
    phoneNumber: '9876543210',
    photoURL: null,
    providerId: 'demo',
  };

  // Seed rich sample data ONLY for Demo Account
  loadSampleData(demoId);

  return demoUser;
}

/**
 * Retrieve configured security questions for a given username/mobile
 */
export function getAccountSecurityQuestions(username: string): {
  found: boolean;
  question1?: string;
  question2?: string;
  hasTwoQuestions?: boolean;
} {
  const cleanUsername = username.trim().toLowerCase();
  if (!cleanUsername) return { found: false };

  const accounts = getStoredAccounts();
  const account = accounts.find((a) => a.username.toLowerCase() === cleanUsername);
  if (!account) return { found: false };

  const q1 = account.securityQuestion1 || account.securityQuestion;
  const q2 = account.securityQuestion2;
  const hasTwo = Boolean(account.securityQuestion1 && account.securityQuestion2 && account.securityAnswer2Hash);

  return {
    found: true,
    question1: q1,
    question2: q2,
    hasTwoQuestions: hasTwo,
  };
}

/**
 * Reset password using 2 Security Questions & Answers (with backward compatibility)
 */
export async function resetPasswordWithTwoSecurityAnswers(
  username: string,
  securityAnswer1: string,
  securityAnswer2: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const cleanUsername = username.trim().toLowerCase();
  const accounts = getStoredAccounts();
  const index = accounts.findIndex((a) => a.username.toLowerCase() === cleanUsername);

  if (index === -1) {
    return { success: false, error: 'Account not found with this Mobile/Username.' };
  }

  const account = accounts[index];
  const q1 = account.securityQuestion1 || account.securityQuestion;
  const hash1 = account.securityAnswer1Hash || account.securityAnswerHash;
  const q2 = account.securityQuestion2;
  const hash2 = account.securityAnswer2Hash;

  if (!q1 || !hash1) {
    return { success: false, error: 'No security questions configured for this account.' };
  }

  // Validate Answer 1
  const testHash1 = await hashPasswordWithSalt(securityAnswer1.trim().toLowerCase(), account.salt);
  if (testHash1 !== hash1) {
    return { success: false, error: 'Security Answer 1 is incorrect.' };
  }

  // If question 2 exists, validate Answer 2
  if (q2 && hash2) {
    const testHash2 = await hashPasswordWithSalt(securityAnswer2.trim().toLowerCase(), account.salt);
    if (testHash2 !== hash2) {
      return { success: false, error: 'Security Answer 2 is incorrect.' };
    }
  }

  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: 'New password must be at least 4 characters long.' };
  }

  const newSalt = generateSalt();
  const newPasswordHash = await hashPasswordWithSalt(newPassword, newSalt);

  let newHash1: string | undefined;
  if (q1) {
    newHash1 = await hashPasswordWithSalt(securityAnswer1.trim().toLowerCase(), newSalt);
  }

  let newHash2: string | undefined;
  if (q2 && securityAnswer2) {
    newHash2 = await hashPasswordWithSalt(securityAnswer2.trim().toLowerCase(), newSalt);
  }

  accounts[index] = {
    ...account,
    passwordHash: newPasswordHash,
    salt: newSalt,
    securityQuestion: q1,
    securityAnswerHash: newHash1,
    securityQuestion1: q1,
    securityAnswer1Hash: newHash1,
    securityQuestion2: q2,
    securityAnswer2Hash: newHash2,
    updatedAt: new Date().toISOString(),
  };

  saveStoredAccounts(accounts);
  return { success: true };
}

/**
 * Reset password using Security Question & Answer (legacy single answer wrapper)
 */
export async function resetPasswordWithSecurityAnswer(
  username: string,
  securityAnswer: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  return resetPasswordWithTwoSecurityAnswers(username, securityAnswer, '', newPassword);
}

// -------------------------------------------------------------
// SESSION PERSISTENCE (Remember Me & Session Storage)
// -------------------------------------------------------------

export interface SessionData {
  user: AppUser;
  rememberMe: boolean;
  loggedInAt: string;
}

/**
 * Save active session
 */
export function saveActiveSession(user: AppUser, rememberMe: boolean): void {
  const session: SessionData = {
    user,
    rememberMe,
    loggedInAt: new Date().toISOString(),
  };

  try {
    if (rememberMe) {
      localStorage.setItem(STORAGE_KEY_AUTH_SESSION, JSON.stringify(session));
      sessionStorage.removeItem(STORAGE_KEY_AUTH_SESSION);
    } else {
      sessionStorage.setItem(STORAGE_KEY_AUTH_SESSION, JSON.stringify(session));
      localStorage.removeItem(STORAGE_KEY_AUTH_SESSION);
    }
  } catch (err) {
    console.error('Error saving session:', err);
  }
}

/**
 * Restore active session if available
 */
export function getActiveSession(): SessionData | null {
  try {
    // Check sessionStorage first
    const sessionRaw = sessionStorage.getItem(STORAGE_KEY_AUTH_SESSION);
    if (sessionRaw) {
      return JSON.parse(sessionRaw);
    }

    // Check localStorage (Remember Me)
    const localRaw = localStorage.getItem(STORAGE_KEY_AUTH_SESSION);
    if (localRaw) {
      return JSON.parse(localRaw);
    }

    return null;
  } catch (err) {
    console.error('Error reading session:', err);
    return null;
  }
}

/**
 * Clear active session on logout
 */
export function clearActiveSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY_AUTH_SESSION);
    localStorage.removeItem(STORAGE_KEY_AUTH_SESSION);
  } catch (err) {
    console.error('Error clearing session:', err);
  }
}

/**
 * Remembered username for login autofill
 */
export function getRememberedUsername(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_REMEMBER_ME) || '';
  } catch {
    return '';
  }
}

export function setRememberedUsername(username: string, remember: boolean): void {
  try {
    if (remember && username) {
      localStorage.setItem(STORAGE_KEY_REMEMBER_ME, username);
    } else {
      localStorage.removeItem(STORAGE_KEY_REMEMBER_ME);
    }
  } catch {
    // ignore
  }
}

// -------------------------------------------------------------
// HISAAB DATA MANAGEMENT (Separated per User Account)
// -------------------------------------------------------------

export function recalculatePerson(person: PersonHisaab): PersonHisaab {
  const {
    monthlyInterest,
    completedMonths,
    totalMonths,
    interestAmount,
    totalAmount,
    interestRecords,
    totalInterestPaid,
    currentInterestDue,
  } = calculateHisaab(
    person.principalAmount,
    person.rate,
    person.denaDate,
    person.status,
    person.paidDate,
    person.paymentMode || 'standard',
    person.interestRecords || []
  );

  return {
    ...person,
    monthlyInterest,
    completedMonths,
    totalMonths,
    interestAmount,
    totalAmount,
    interestRecords: person.paymentMode === 'interest_only' ? (interestRecords || person.interestRecords) : person.interestRecords,
    totalInterestPaid: person.paymentMode === 'interest_only' ? totalInterestPaid : person.totalInterestPaid,
    currentInterestDue: person.paymentMode === 'interest_only' ? currentInterestDue : person.currentInterestDue,
  };
}

export function getPersons(userId?: string | null): PersonHisaab[] {
  try {
    const key = getUserPersonsStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((p) => recalculatePerson(p));
    }
    return [];
  } catch (err) {
    console.error('Error reading persons from localStorage', err);
    return [];
  }
}

export function savePersons(persons: PersonHisaab[], userId?: string | null): void {
  try {
    const key = getUserPersonsStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(persons));
  } catch (err) {
    console.error('Error saving persons to localStorage', err);
  }
}

export function addPerson(
  data: Omit<
    PersonHisaab,
    'id' | 'createdAt' | 'updatedAt' | 'monthlyInterest' | 'completedMonths' | 'totalMonths' | 'interestAmount' | 'totalAmount'
  >,
  userId?: string | null
): PersonHisaab {
  const persons = getPersons(userId);
  const todayStr = new Date().toISOString().split('T')[0];
  const paidDate = data.status === 'paid' ? (data.paidDate || todayStr) : undefined;
  const paymentMode = data.paymentMode || 'standard';

  const {
    monthlyInterest,
    completedMonths,
    totalMonths,
    interestAmount,
    totalAmount,
    interestRecords,
    totalInterestPaid,
    currentInterestDue,
  } = calculateHisaab(
    data.principalAmount,
    data.rate,
    data.denaDate,
    data.status,
    paidDate,
    paymentMode,
    data.interestRecords || []
  );

  const newPerson: PersonHisaab = {
    ...data,
    id: 'hisaab_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    paymentMode,
    monthlyInterest,
    completedMonths,
    totalMonths,
    interestAmount,
    totalAmount,
    paidDate,
    interestRecords: paymentMode === 'interest_only' ? (interestRecords || []) : undefined,
    interestPayments: data.interestPayments || [],
    totalInterestPaid: paymentMode === 'interest_only' ? (totalInterestPaid || 0) : undefined,
    currentInterestDue: paymentMode === 'interest_only' ? (currentInterestDue || 0) : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updatedList = [newPerson, ...persons];
  savePersons(updatedList, userId);
  return newPerson;
}

export function updatePerson(
  id: string,
  updates: Partial<Omit<PersonHisaab, 'id' | 'createdAt' | 'updatedAt'>>,
  userId?: string | null
): PersonHisaab | null {
  const persons = getPersons(userId);
  const index = persons.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const current = persons[index];
  const merged = { ...current, ...updates };
  const todayStr = new Date().toISOString().split('T')[0];

  let paidDate = merged.paidDate;
  if (merged.status === 'paid') {
    if (!paidDate) {
      paidDate = todayStr;
    }
  } else {
    paidDate = undefined;
  }

  const paymentMode = merged.paymentMode || 'standard';

  const {
    monthlyInterest,
    completedMonths,
    totalMonths,
    interestAmount,
    totalAmount,
    interestRecords,
    totalInterestPaid,
    currentInterestDue,
  } = calculateHisaab(
    merged.principalAmount,
    merged.rate,
    merged.denaDate,
    merged.status,
    paidDate,
    paymentMode,
    merged.interestRecords || []
  );

  const updatedPerson: PersonHisaab = {
    ...merged,
    paymentMode,
    paidDate,
    monthlyInterest,
    completedMonths,
    totalMonths,
    interestAmount,
    totalAmount,
    interestRecords: paymentMode === 'interest_only' ? (interestRecords || merged.interestRecords) : merged.interestRecords,
    totalInterestPaid: paymentMode === 'interest_only' ? totalInterestPaid : merged.totalInterestPaid,
    currentInterestDue: paymentMode === 'interest_only' ? currentInterestDue : merged.currentInterestDue,
    updatedAt: new Date().toISOString(),
  };

  persons[index] = updatedPerson;
  savePersons(persons, userId);
  return updatedPerson;
}

/**
 * Record monthly interest payment for an Interest Only account:
 * - Principal amount remains untouched.
 * - Updates target monthly record to 'paid' with payment date, amount, method, and note.
 * - Adds record to payment history.
 * - Recalculates total interest paid, current interest due, and total amount due.
 */
export function recordMonthlyInterestPayment(
  personId: string,
  monthRecordId: string,
  paymentData: {
    paymentDate: string;
    amount: number;
    paymentMethod?: string;
    note?: string;
  },
  userId?: string | null
): PersonHisaab | null {
  const persons = getPersons(userId);
  const index = persons.findIndex((p) => p.id === personId);
  if (index === -1) return null;

  const current = persons[index];
  const existingRecords = current.interestRecords ? [...current.interestRecords] : [];
  const targetRecordIndex = existingRecords.findIndex((r) => r.id === monthRecordId);

  let targetRecordLabel = '';
  let targetMonthIndex = 1;

  if (targetRecordIndex !== -1) {
    const target = existingRecords[targetRecordIndex];
    targetRecordLabel = target.monthLabel;
    targetMonthIndex = target.monthIndex;

    existingRecords[targetRecordIndex] = {
      ...target,
      status: 'paid',
      paidDate: paymentData.paymentDate,
      paidAmount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod || 'cash',
      note: paymentData.note,
      paidAt: new Date().toISOString(),
    };
  }

  const newPaymentEntry: {
    id: string;
    monthRecordId: string;
    monthIndex: number;
    monthLabel: string;
    amount: number;
    paymentDate: string;
    paymentMethod?: string;
    note?: string;
    createdAt: string;
  } = {
    id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    monthRecordId,
    monthIndex: targetMonthIndex,
    monthLabel: targetRecordLabel || `Month ${targetMonthIndex}`,
    amount: paymentData.amount,
    paymentDate: paymentData.paymentDate,
    paymentMethod: paymentData.paymentMethod || 'cash',
    note: paymentData.note,
    createdAt: new Date().toISOString(),
  };

  const existingPayments = current.interestPayments ? [...current.interestPayments] : [];
  const updatedPayments = [newPaymentEntry, ...existingPayments];

  // Recalculate with updated interest records
  const {
    monthlyInterest,
    completedMonths,
    totalMonths,
    interestAmount,
    totalAmount,
    interestRecords,
    totalInterestPaid,
    currentInterestDue,
  } = calculateHisaab(
    current.principalAmount,
    current.rate,
    current.denaDate,
    current.status,
    current.paidDate,
    'interest_only',
    existingRecords
  );

  const updatedPerson: PersonHisaab = {
    ...current,
    monthlyInterest,
    completedMonths,
    totalMonths,
    interestAmount,
    totalAmount,
    interestRecords: interestRecords || existingRecords,
    interestPayments: updatedPayments,
    totalInterestPaid,
    currentInterestDue,
    lastInterestPaidDate: paymentData.paymentDate,
    updatedAt: new Date().toISOString(),
  };

  persons[index] = updatedPerson;
  savePersons(persons, userId);
  return updatedPerson;
}

/**
 * Toggle an individual month's interest status between Paid and Pending
 */
export function toggleMonthlyInterestStatus(
  personId: string,
  monthRecordId: string,
  userId?: string | null
): PersonHisaab | null {
  const persons = getPersons(userId);
  const index = persons.findIndex((p) => p.id === personId);
  if (index === -1) return null;

  const current = persons[index];
  const existingRecords = current.interestRecords ? [...current.interestRecords] : [];
  const targetIndex = existingRecords.findIndex((r) => r.id === monthRecordId);
  if (targetIndex === -1) return null;

  const rec = existingRecords[targetIndex];
  const newStatus = rec.status === 'paid' ? 'pending' : 'paid';
  const todayStr = new Date().toISOString().split('T')[0];

  existingRecords[targetIndex] = {
    ...rec,
    status: newStatus,
    paidDate: newStatus === 'paid' ? todayStr : undefined,
    paidAmount: newStatus === 'paid' ? rec.interestAmount : undefined,
    paidAt: newStatus === 'paid' ? new Date().toISOString() : undefined,
  };

  // Recalculate
  const {
    monthlyInterest,
    completedMonths,
    totalMonths,
    interestAmount,
    totalAmount,
    interestRecords,
    totalInterestPaid,
    currentInterestDue,
  } = calculateHisaab(
    current.principalAmount,
    current.rate,
    current.denaDate,
    current.status,
    current.paidDate,
    'interest_only',
    existingRecords
  );

  const updatedPerson: PersonHisaab = {
    ...current,
    monthlyInterest,
    completedMonths,
    totalMonths,
    interestAmount,
    totalAmount,
    interestRecords: interestRecords || existingRecords,
    totalInterestPaid,
    currentInterestDue,
    updatedAt: new Date().toISOString(),
  };

  persons[index] = updatedPerson;
  savePersons(persons, userId);
  return updatedPerson;
}

export function deletePerson(id: string, userId?: string | null): boolean {
  const persons = getPersons(userId);
  const filtered = persons.filter((p) => p.id !== id);
  if (filtered.length !== persons.length) {
    savePersons(filtered, userId);
    return true;
  }
  return false;
}

// -------------------------------------------------------------
// TRASH & RECYCLE BIN MANAGEMENT
// -------------------------------------------------------------

export function getUserTrashStorageKey(userId: string | null | undefined): string {
  if (!userId) {
    return 'simple_hisaab_trash_default';
  }
  return `simple_hisaab_trash_user_${userId}`;
}

export function getTrashPersons(userId?: string | null): PersonHisaab[] {
  try {
    const key = getUserTrashStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((p) => recalculatePerson(p));
    }
    return [];
  } catch (err) {
    console.error('Error reading trash from localStorage', err);
    return [];
  }
}

export function saveTrashPersons(trashList: PersonHisaab[], userId?: string | null): void {
  try {
    const key = getUserTrashStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(trashList));
  } catch (err) {
    console.error('Error saving trash to localStorage', err);
  }
}

/**
 * Move a person's hisaab to Trash (Recycle Bin)
 */
export function moveToTrash(id: string, userId?: string | null): PersonHisaab | null {
  const persons = getPersons(userId);
  const targetIndex = persons.findIndex((p) => p.id === id);
  if (targetIndex === -1) return null;

  const targetPerson = persons[targetIndex];
  const updatedActive = persons.filter((p) => p.id !== id);
  savePersons(updatedActive, userId);

  const trashItem: PersonHisaab = {
    ...targetPerson,
    isDeleted: true,
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const trash = getTrashPersons(userId);
  const updatedTrash = [trashItem, ...trash.filter((t) => t.id !== id)];
  saveTrashPersons(updatedTrash, userId);

  return trashItem;
}

/**
 * Restore a person from Trash back to active ledger
 */
export function restorePerson(id: string, userId?: string | null): PersonHisaab | null {
  const trash = getTrashPersons(userId);
  const targetIndex = trash.findIndex((t) => t.id === id);
  if (targetIndex === -1) return null;

  const targetItem = trash[targetIndex];
  const updatedTrash = trash.filter((t) => t.id !== id);
  saveTrashPersons(updatedTrash, userId);

  const restoredItem: PersonHisaab = {
    ...targetItem,
    isDeleted: false,
    deletedAt: undefined,
    updatedAt: new Date().toISOString(),
  };

  const persons = getPersons(userId);
  const updatedPersons = [recalculatePerson(restoredItem), ...persons.filter((p) => p.id !== id)];
  savePersons(updatedPersons, userId);

  return restoredItem;
}

/**
 * Restore all records from Trash back to active ledger
 */
export function restoreAllPersons(userId?: string | null): PersonHisaab[] {
  const trash = getTrashPersons(userId);
  if (trash.length === 0) return [];

  const restoredList = trash.map((t) => ({
    ...t,
    isDeleted: false,
    deletedAt: undefined,
    updatedAt: new Date().toISOString(),
  }));

  const activePersons = getPersons(userId);
  const merged = [...restoredList.map((p) => recalculatePerson(p)), ...activePersons];
  savePersons(merged, userId);
  saveTrashPersons([], userId);

  return restoredList;
}

/**
 * Permanently delete a record from Trash
 */
export function permanentlyDeletePerson(id: string, userId?: string | null): boolean {
  const trash = getTrashPersons(userId);
  const filtered = trash.filter((t) => t.id !== id);
  if (filtered.length !== trash.length) {
    saveTrashPersons(filtered, userId);
    return true;
  }
  return false;
}

/**
 * Permanently wipe all items from Trash
 */
export function emptyTrash(userId?: string | null): void {
  const key = getUserTrashStorageKey(userId);
  localStorage.removeItem(key);
}

/**
 * Get count of items in trash
 */
export function getTrashCount(userId?: string | null): number {
  return getTrashPersons(userId).length;
}

export function clearAllData(userId?: string | null): void {
  const key = getUserPersonsStorageKey(userId);
  localStorage.removeItem(key);
}

// -------------------------------------------------------------
// THEME & LANGUAGE PREFERENCES
// -------------------------------------------------------------

export function getStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_THEME);
    if (stored === 'dark' || stored === 'light') return stored;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // fallback
  }
  return 'light';
}

export function setStoredTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (err) {
    console.error('Error saving theme', err);
  }
}

export function getStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_LANG);
    if (stored === 'hi' || stored === 'en') return stored;
  } catch {
    // fallback
  }
  return 'hi';
}

export function setStoredLanguage(lang: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY_LANG, lang);
  } catch (err) {
    console.error('Error saving language', err);
  }
}

// -------------------------------------------------------------
// EXPORT & IMPORT BACKUP (Per User)
// -------------------------------------------------------------

export function exportBackupJSON(userId?: string | null, username?: string): void {
  const currentPersons = getPersons(userId);
  const data = {
    appName: 'Simple Hisaab',
    exportedAt: new Date().toISOString(),
    accountUser: username || userId || 'default',
    version: '3.0',
    recordsCount: currentPersons.length,
    persons: currentPersons,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hisaab_backup_${(username || 'account').replace(/\s+/g, '_')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importBackupJSON(
  jsonStr: string,
  userId?: string | null
): { success: boolean; count?: number; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    let itemsToImport: PersonHisaab[] = [];

    if (Array.isArray(parsed)) {
      itemsToImport = parsed;
    } else if (parsed && Array.isArray(parsed.persons)) {
      itemsToImport = parsed.persons;
    } else {
      return { success: false, error: 'Invalid backup file format' };
    }

    const validItems: PersonHisaab[] = [];
    for (const item of itemsToImport) {
      if (item && item.name && typeof item.principalAmount === 'number') {
        const denaDate = item.denaDate || new Date().toISOString().split('T')[0];
        const status = item.status === 'paid' ? 'paid' : 'pending';
        const paidDate = item.paidDate;
        const paymentMode = item.paymentMode || 'standard';

        const {
          monthlyInterest,
          completedMonths,
          totalMonths,
          interestAmount,
          totalAmount,
          interestRecords,
          totalInterestPaid,
          currentInterestDue,
        } = calculateHisaab(
          item.principalAmount,
          item.rate || 0,
          denaDate,
          status,
          paidDate,
          paymentMode,
          item.interestRecords || []
        );

        validItems.push({
          id: item.id || 'hisaab_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          name: String(item.name).trim(),
          mobile: item.mobile ? String(item.mobile).trim() : '',
          rate: Number(item.rate) || 0,
          denaDate,
          principalAmount: Number(item.principalAmount) || 0,
          paymentMode,
          monthlyInterest,
          completedMonths,
          totalMonths,
          interestAmount,
          totalAmount,
          status,
          paidDate,
          interestRecords: paymentMode === 'interest_only' ? (interestRecords || item.interestRecords) : item.interestRecords,
          interestPayments: item.interestPayments || [],
          totalInterestPaid: paymentMode === 'interest_only' ? totalInterestPaid : item.totalInterestPaid,
          currentInterestDue: paymentMode === 'interest_only' ? currentInterestDue : item.currentInterestDue,
          lastInterestPaidDate: item.lastInterestPaidDate,
          note: item.note ? String(item.note) : '',
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
        });
      }
    }

    if (validItems.length === 0) {
      return { success: false, error: 'No valid hisaab records found in backup' };
    }

    savePersons(validItems, userId);
    return { success: true, count: validItems.length };
  } catch {
    return { success: false, error: 'Failed to read JSON file' };
  }
}

// -------------------------------------------------------------
// SAMPLE DATA LOADER (Per User)
// -------------------------------------------------------------

export function loadSampleData(userId?: string | null): PersonHisaab[] {
  const today = new Date();
  const formatDateOffsetMonths = (monthsAgo: number, daysOffset = 0) => {
    const d = new Date(today.getFullYear(), today.getMonth() - monthsAgo, today.getDate() - daysOffset);
    return d.toISOString().split('T')[0];
  };

  const sampleList: Array<
    Omit<
      PersonHisaab,
      'id' | 'createdAt' | 'updatedAt' | 'monthlyInterest' | 'completedMonths' | 'totalMonths' | 'interestAmount' | 'totalAmount'
    >
  > = [
    {
      name: 'Ramesh Patel (राकेश भाई)',
      mobile: '9825012345',
      rate: 3,
      denaDate: formatDateOffsetMonths(4, 2),
      principalAmount: 50000,
      paymentMode: 'interest_only',
      status: 'pending',
      note: 'Tractor loan (Interest Only). Pays ₹1500 monthly interest.',
    },
    {
      name: 'Suresh Verma (सुरेश वर्मा)',
      mobile: '9414098765',
      rate: 2,
      denaDate: formatDateOffsetMonths(2, 5),
      principalAmount: 20000,
      paymentMode: 'standard',
      status: 'pending',
      note: 'Shop inventory investment.',
    },
    {
      name: 'Manoj Kumar Sharma',
      mobile: '9876543210',
      rate: 5,
      denaDate: formatDateOffsetMonths(3, 0),
      principalAmount: 10000,
      paymentMode: 'standard',
      status: 'paid',
      paidDate: formatDateOffsetMonths(1, 0),
      note: 'Paid in cash with 2 months interest. Settled.',
    },
    {
      name: 'Dinesh Yadav (दिनेश यादव)',
      mobile: '9123456780',
      rate: 2.5,
      denaDate: formatDateOffsetMonths(3, 4),
      principalAmount: 80000,
      paymentMode: 'interest_only',
      status: 'pending',
      note: 'Dairy business loan - monthly interest model.',
    },
    {
      name: 'Pooja Devi (पूजा देवी)',
      mobile: '9798011223',
      rate: 0,
      denaDate: formatDateOffsetMonths(0, 10),
      principalAmount: 5000,
      paymentMode: 'standard',
      status: 'pending',
      note: 'Friendly assistance (0% interest).',
    },
  ];

  clearAllData(userId);
  const created: PersonHisaab[] = [];
  for (const s of sampleList) {
    created.push(addPerson(s, userId));
  }
  return created;
}
