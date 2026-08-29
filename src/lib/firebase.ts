import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  User,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { PersonHisaab, UserProfile, LocalAccount } from '../types';

// 1. Initialize Firebase App
const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// 2. Initialize Auth
export const auth = getAuth(app);
try {
  setPersistence(auth, browserLocalPersistence);
} catch (err) {
  console.warn('Firebase persistence warning:', err);
}

// 3. Initialize Firestore (with custom database ID if present)
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// 4. Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Ensure an active Firebase auth session exists (silent anonymous fallback for Firestore rules)
 */
export async function ensureFirebaseAuth(): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    console.warn('Silent anonymous auth info:', err);
    return auth.currentUser;
  }
}

/**
 * Sign in with Google (Gmail)
 */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  await syncUserProfile(result.user);
  return result.user;
}

/**
 * Sign Out
 */
export async function logOut(): Promise<void> {
  await signOut(auth);
}
export const logOutFirebase = logOut;

/**
 * Recursively remove all `undefined` values from objects or arrays so Firestore setDoc never throws.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && data.constructor === Object) {
    const cleanObj: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        cleanObj[key] = sanitizeForFirestore(val);
      }
    }
    return cleanObj as T;
  }
  return data;
}

/**
 * Save user account to Cloud Firestore for Multi-Device Login `/accounts/{cleanUsername}`
 */
export async function saveAccountToCloud(account: LocalAccount): Promise<void> {
  if (!account || !account.username) return;
  try {
    const cleanUser = account.username.trim().toLowerCase();
    const accountRef = doc(db, 'accounts', cleanUser);
    const dataToSave = sanitizeForFirestore({
      ...account,
      username: cleanUser,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(accountRef, dataToSave, { merge: true });
  } catch (err) {
    console.warn('Failed to save account to Cloud Firestore:', err);
  }
}

/**
 * Retrieve user account from Cloud Firestore for Multi-Device Login
 */
export async function getAccountFromCloud(username: string): Promise<LocalAccount | null> {
  if (!username) return null;
  try {
    const cleanUser = username.trim().toLowerCase();
    const accountRef = doc(db, 'accounts', cleanUser);
    const snap = await getDoc(accountRef);
    if (snap.exists()) {
      return snap.data() as LocalAccount;
    }
    return null;
  } catch (err) {
    console.warn('Failed to fetch account from Cloud Firestore:', err);
    return null;
  }
}

/**
 * Sync user profile to Firestore `/users/{userId}`
 */
export async function syncUserProfile(user: User): Promise<void> {
  if (!user || !user.uid) return;
  try {
    const userRef = doc(db, 'users', user.uid);
    const profileData = sanitizeForFirestore({
      userId: user.uid,
      displayName: user.displayName || 'Simple Hisaab User',
      email: user.email || null,
      phoneNumber: user.phoneNumber || null,
      photoURL: user.photoURL || null,
      createdAt: new Date().toISOString(),
    });
    await setDoc(userRef, { ...profileData, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.warn('Error syncing user profile to Firestore:', err);
  }
}

/**
 * Firestore Helper: Save or Update Person in Cloud `/users/{userId}/persons/{personId}`
 */
export async function savePersonToCloud(userId: string, person: PersonHisaab): Promise<void> {
  if (!userId || !person || !person.id) return;
  try {
    const personRef = doc(db, 'users', userId, 'persons', person.id);
    const dataToSave = sanitizeForFirestore({
      ...person,
      userId,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(personRef, dataToSave, { merge: true });
  } catch (err) {
    console.error('Failed to save person to Firestore:', err);
    throw err;
  }
}

/**
 * Firestore Helper: Delete Person from Cloud `/users/{userId}/persons/{personId}`
 */
export async function deletePersonFromCloud(userId: string, personId: string): Promise<void> {
  if (!userId || !personId) return;
  try {
    const personRef = doc(db, 'users', userId, 'persons', personId);
    await deleteDoc(personRef);
  } catch (err) {
    console.error('Failed to delete person from Firestore:', err);
    throw err;
  }
}

/**
 * Firestore Helper: Save item to Cloud Trash `/users/{userId}/trash/{personId}`
 */
export async function saveTrashToCloud(userId: string, item: PersonHisaab): Promise<void> {
  if (!userId || !item || !item.id) return;
  try {
    const trashRef = doc(db, 'users', userId, 'trash', item.id);
    const dataToSave = sanitizeForFirestore({
      ...item,
      userId,
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(trashRef, dataToSave, { merge: true });
  } catch (err) {
    console.warn('Failed to save trash to Cloud:', err);
  }
}

/**
 * Firestore Helper: Delete item from Cloud Trash `/users/{userId}/trash/{personId}`
 */
export async function deleteTrashFromCloud(userId: string, personId: string): Promise<void> {
  if (!userId || !personId) return;
  try {
    const trashRef = doc(db, 'users', userId, 'trash', personId);
    await deleteDoc(trashRef);
  } catch (err) {
    console.warn('Failed to delete trash from Cloud:', err);
  }
}

/**
 * Firestore Helper: Bulk upload all local items to cloud
 */
export async function syncAllLocalToCloud(userId: string, persons: PersonHisaab[]): Promise<number> {
  if (!userId || persons.length === 0) return 0;
  let count = 0;
  for (const p of persons) {
    try {
      await savePersonToCloud(userId, p);
      count++;
    } catch (e) {
      console.warn('Sync item failed:', p.id, e);
    }
  }
  return count;
}

/**
 * Firestore Helper: Bulk upload all trash items to cloud
 */
export async function syncAllTrashToCloud(userId: string, trash: PersonHisaab[]): Promise<number> {
  if (!userId || trash.length === 0) return 0;
  let count = 0;
  for (const t of trash) {
    try {
      await saveTrashToCloud(userId, t);
      count++;
    } catch (e) {
      console.warn('Sync trash failed:', t.id, e);
    }
  }
  return count;
}

/**
 * Fetch all persons for user from Cloud
 */
export async function fetchCloudPersons(userId: string): Promise<PersonHisaab[]> {
  if (!userId) return [];
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'persons'));
    const list: PersonHisaab[] = [];
    snap.forEach((d) => {
      list.push(d.data() as PersonHisaab);
    });
    return list;
  } catch (err) {
    console.warn('Failed to fetch cloud persons:', err);
    return [];
  }
}

/**
 * Fetch all trash items for user from Cloud
 */
export async function fetchCloudTrash(userId: string): Promise<PersonHisaab[]> {
  if (!userId) return [];
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'trash'));
    const list: PersonHisaab[] = [];
    snap.forEach((d) => {
      list.push(d.data() as PersonHisaab);
    });
    return list;
  } catch (err) {
    console.warn('Failed to fetch cloud trash:', err);
    return [];
  }
}
