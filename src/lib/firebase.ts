import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { PersonHisaab, UserProfile } from '../types';

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
 * Sync user profile to Firestore `/users/{userId}`
 */
export async function syncUserProfile(user: User): Promise<void> {
  if (!user || !user.uid) return;
  try {
    const userRef = doc(db, 'users', user.uid);
    const profileData: UserProfile = {
      userId: user.uid,
      displayName: user.displayName || 'Simple Hisaab User',
      email: user.email || undefined,
      phoneNumber: user.phoneNumber || undefined,
      photoURL: user.photoURL || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(userRef, { ...profileData, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.warn('Error syncing user profile to Firestore:', err);
  }
}

/**
 * Firestore Helper: Save or Update Person in Cloud `/users/{userId}/persons/{personId}`
 */
export async function savePersonToCloud(userId: string, person: PersonHisaab): Promise<void> {
  if (!userId || !person.id) return;
  try {
    const personRef = doc(db, 'users', userId, 'persons', person.id);
    await setDoc(
      personRef,
      {
        ...person,
        userId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
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
