/**
 * Simple Hisaab (डिजिटल हिसाब)
 * Modern, mobile-first money & interest khata ledger for local/village use.
 * With secure authentication, session persistence, and multi-user data isolation.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { PersonListView } from './components/PersonListView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { AddEditPersonModal } from './components/AddEditPersonModal';
import { PersonDetailsModal } from './components/PersonDetailsModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { TrashModal } from './components/TrashModal';
import { LoginScreen } from './components/LoginScreen';
import { AccountModal } from './components/AccountModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { PersonHisaab, ActiveTab, Language, ThemeMode, StatusFilterOption, AppUser } from './types';
import {
  getPersons,
  savePersons,
  addPerson,
  updatePerson,
  deletePerson,
  getTrashPersons,
  moveToTrash,
  restorePerson,
  restoreAllPersons,
  permanentlyDeletePerson,
  emptyTrash,
  clearAllData,
  loadSampleData,
  getStoredTheme,
  setStoredTheme,
  getStoredLanguage,
  setStoredLanguage,
  getActiveSession,
  clearActiveSession,
  recordMonthlyInterestPayment,
  toggleMonthlyInterestStatus,
} from './utils/storage';
import { calculateStats, i18n } from './utils/formatters';
import {
  auth,
  db,
  savePersonToCloud,
  deletePersonFromCloud,
  saveTrashToCloud,
  deleteTrashFromCloud,
  syncAllLocalToCloud,
  syncAllTrashToCloud,
  ensureFirebaseAuth,
  logOutFirebase,
} from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';

export default function App() {
  // 1. Data & User State
  const [persons, setPersons] = useState<PersonHisaab[]>([]);
  const [trashPersons, setTrashPersons] = useState<PersonHisaab[]>([]);
  const [user, setUser] = useState<AppUser | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [lang, setLang] = useState<Language>('hi'); // Default Hindi for local relevance
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [isAuthRestored, setIsAuthRestored] = useState(false);

  // 2. Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<PersonHisaab | null>(null);
  const [detailsPerson, setDetailsPerson] = useState<PersonHisaab | null>(null);

  // 3. Delete / Clear Confirmation State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    person?: PersonHisaab | null;
    isClearAll?: boolean;
    isTrashAction?: boolean;
  }>({
    isOpen: false,
    person: null,
    isClearAll: false,
    isTrashAction: true,
  });

  // 4. Initial Filter for Persons list (when clicking card on dashboard)
  const [listStatusFilter, setListStatusFilter] = useState<StatusFilterOption>('all');

  // 5. Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (
    type: 'success' | 'error' | 'info',
    message: string,
    action?: { label: string; onClick: () => void }
  ) => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, type, message, action }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Ensure DOM class is always in sync with theme state
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [theme]);

  // Initial Load: Theme, Language, and Auto-Restore Login Session
  useEffect(() => {
    const loadedTheme = getStoredTheme();
    setTheme(loadedTheme);
    setStoredTheme(loadedTheme);

    const loadedLang = getStoredLanguage();
    setLang(loadedLang);

    // Auto-restore previous active session (Remember Me / SessionStorage)
    const existingSession = getActiveSession();
    if (existingSession && existingSession.user) {
      setUser(existingSession.user);
      const userRecords = getPersons(existingSession.user.uid);
      setPersons(userRecords);
      setTrashPersons(getTrashPersons(existingSession.user.uid));
    }
    setIsAuthRestored(true);
  }, []);

  // Whenever user changes, load the isolated dataset for this account
  useEffect(() => {
    if (!isAuthRestored) return;
    if (user) {
      const records = getPersons(user.uid);
      setPersons(records);
      setTrashPersons(getTrashPersons(user.uid));
    } else {
      setPersons([]);
      setTrashPersons([]);
    }
  }, [user, isAuthRestored]);

  // Firebase Auth State Listener & Real-time Cloud Sync for all devices & login methods
  const isSyncingRef = useRef(false);

  // 1. Silent Firebase Auth initialization for cloud operations
  useEffect(() => {
    ensureFirebaseAuth().catch((e) => console.warn('Auth init info:', e));
  }, []);

  // 2. Real-time Cloud Sync listener for current logged-in user (Mobile, Laptop, Tablet simultaneous sessions)
  useEffect(() => {
    if (!user || !user.uid) return;

    let unsubscribePersons: (() => void) | null = null;
    let unsubscribeTrash: (() => void) | null = null;

    try {
      // Real-time persons collection listener
      const personsCollection = collection(db, 'users', user.uid, 'persons');
      unsubscribePersons = onSnapshot(
        personsCollection,
        async (snapshot) => {
          if (isSyncingRef.current) return;
          const cloudPersons: PersonHisaab[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as PersonHisaab;
            if (data && data.id) {
              cloudPersons.push(data);
            }
          });

          if (cloudPersons.length > 0) {
            setPersons(cloudPersons);
            savePersons(cloudPersons, user.uid); // cache locally for offline speed
            // Update details modal in real-time if currently open
            setDetailsPerson((prev) => {
              if (!prev) return null;
              const updated = cloudPersons.find((p) => p.id === prev.id);
              return updated || null;
            });
          } else {
            // If cloud is empty on first device sync, upload any existing local data
            const localItems = getPersons(user.uid);
            if (localItems.length > 0) {
              isSyncingRef.current = true;
              await syncAllLocalToCloud(user.uid, localItems);
              isSyncingRef.current = false;
            }
          }
        },
        (error) => {
          console.warn('Realtime cloud persons sync notice:', error);
        }
      );

      // Real-time trash collection listener
      const trashCollection = collection(db, 'users', user.uid, 'trash');
      unsubscribeTrash = onSnapshot(
        trashCollection,
        (snapshot) => {
          const cloudTrash: PersonHisaab[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as PersonHisaab;
            if (data && data.id) {
              cloudTrash.push(data);
            }
          });
          if (cloudTrash.length > 0) {
            setTrashPersons(cloudTrash);
          }
        },
        (error) => {
          console.warn('Realtime cloud trash sync notice:', error);
        }
      );
    } catch (err) {
      console.warn('Error setting up real-time multi-device listeners:', err);
    }

    return () => {
      if (unsubscribePersons) unsubscribePersons();
      if (unsubscribeTrash) unsubscribeTrash();
    };
  }, [user?.uid]);

  // 3. Firebase Auth State Listener (for Google Sign-In users)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser && firebaseUser.email) {
        const appUser: AppUser = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          phoneNumber: firebaseUser.phoneNumber,
          photoURL: firebaseUser.photoURL,
          providerId: firebaseUser.providerData?.[0]?.providerId || 'google.com',
        };
        setUser(appUser);
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Theme handler
  const handleToggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    setStoredTheme(nextTheme);
  };

  // Language handler
  const handleToggleLang = () => {
    const nextLang: Language = lang === 'en' ? 'hi' : 'en';
    setLang(nextLang);
    setStoredLanguage(nextLang);
  };

  const handleSetLang = (newLang: Language) => {
    setLang(newLang);
    setStoredLanguage(newLang);
  };

  // Computed Dashboard and Reports Statistics
  const stats = useMemo(() => calculateStats(persons), [persons]);

  // Handle Add or Edit Save (Syncs to Cloud Firestore across all devices)
  const handleSavePerson = async (
    data: Omit<PersonHisaab, 'id' | 'createdAt' | 'updatedAt' | 'interestAmount' | 'totalAmount'>
  ) => {
    const userId = user?.uid;
    if (editingPerson) {
      // Update
      const updated = updatePerson(editingPerson.id, data, userId);
      if (updated) {
        const nextList = getPersons(userId);
        setPersons(nextList);
        if (userId) {
          savePersonToCloud(userId, updated).catch((e) => console.warn('Cloud sync error:', e));
        }
        addToast('success', i18n[lang].toastUpdated);
        if (detailsPerson && detailsPerson.id === updated.id) {
          setDetailsPerson(updated);
        }
      }
    } else {
      // Add
      const created = addPerson(data, userId);
      const nextList = getPersons(userId);
      setPersons(nextList);
      if (userId) {
        savePersonToCloud(userId, created).catch((e) => console.warn('Cloud sync error:', e));
      }
      addToast('success', i18n[lang].toastAdded);
    }
    setIsAddModalOpen(false);
    setEditingPerson(null);
  };

  // Handle 1-Click Toggle Payment Status
  const handleToggleStatus = (person: PersonHisaab) => {
    const userId = user?.uid;
    const nextStatus = person.status === 'paid' ? 'pending' : 'paid';
    const updated = updatePerson(person.id, { status: nextStatus }, userId);
    if (updated) {
      const nextList = getPersons(userId);
      setPersons(nextList);
      if (userId) {
        savePersonToCloud(userId, updated).catch((e) => console.warn('Cloud sync error:', e));
      }
      if (detailsPerson && detailsPerson.id === updated.id) {
        setDetailsPerson(updated);
      }
      const msg =
        nextStatus === 'paid'
          ? lang === 'hi'
            ? `${person.name} का खाता पूर्ण चुकता (PAID) मार्क किया गया!`
            : `Marked ${person.name} as PAID!`
          : lang === 'hi'
          ? `${person.name} का खाता बाकी देय (PENDING) किया गया!`
            : `Marked ${person.name} as PENDING!`;
      addToast('success', msg);
    }
  };

  // Handle Interest Payment for Interest Only Mode
  const handlePayInterest = async (
    personId: string,
    monthRecordId: string,
    paymentData: {
      paymentDate: string;
      amount: number;
      paymentMethod?: string;
      note?: string;
    }
  ) => {
    const userId = user?.uid;
    const updated = recordMonthlyInterestPayment(personId, monthRecordId, paymentData, userId);
    if (updated) {
      const nextList = getPersons(userId);
      setPersons(nextList);
      if (userId) {
        savePersonToCloud(userId, updated).catch((e) => console.warn('Cloud sync error:', e));
      }
      if (detailsPerson && detailsPerson.id === updated.id) {
        setDetailsPerson(updated);
      }
      const msg =
        lang === 'hi'
          ? `${updated.name} का ₹${paymentData.amount.toLocaleString('en-IN')} ब्याज भुगतान दर्ज किया गया!`
          : `Interest payment of ₹${paymentData.amount.toLocaleString('en-IN')} recorded for ${updated.name}!`;
      addToast('success', msg);
    }
  };

  // Handle Toggling single Month Interest status
  const handleToggleInterestRecord = async (personId: string, monthRecordId: string) => {
    const userId = user?.uid;
    const updated = toggleMonthlyInterestStatus(personId, monthRecordId, userId);
    if (updated) {
      const nextList = getPersons(userId);
      setPersons(nextList);
      if (userId) {
        savePersonToCloud(userId, updated).catch((e) => console.warn('Cloud sync error:', e));
      }
      if (detailsPerson && detailsPerson.id === updated.id) {
        setDetailsPerson(updated);
      }
      addToast('info', lang === 'hi' ? 'मासिक ब्याज स्थिति अपडेट हो गई!' : 'Monthly interest status updated!');
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    const userId = user?.uid;
    if (deleteModal.isClearAll) {
      if (userId) {
        for (const p of persons) {
          deletePersonFromCloud(userId, p.id).catch(() => {});
        }
        for (const t of trashPersons) {
          deleteTrashFromCloud(userId, t.id).catch(() => {});
        }
      }
      clearAllData(userId);
      setPersons([]);
      setTrashPersons([]);
      setDetailsPerson(null);
      addToast('success', i18n[lang].toastCleared);
    } else if (deleteModal.person) {
      const personId = deleteModal.person.id;
      const personName = deleteModal.person.name;
      const moved = moveToTrash(personId, userId);
      if (moved) {
        setPersons(getPersons(userId));
        setTrashPersons(getTrashPersons(userId));
        if (userId) {
          deletePersonFromCloud(userId, personId).catch(() => {});
          saveTrashToCloud(userId, deleteModal.person).catch(() => {});
        }
        if (detailsPerson && detailsPerson.id === personId) {
          setDetailsPerson(null);
        }
        addToast(
          'info',
          lang === 'hi'
            ? `"${personName}" को कचरा पेटी (Trash) में भेजा गया`
            : `Moved "${personName}" to Trash`,
          {
            label: lang === 'hi' ? 'वापस लें' : 'Undo',
            onClick: () => handleRestorePerson(personId),
          }
        );
      }
    }
    setDeleteModal({ isOpen: false, person: null, isClearAll: false, isTrashAction: true });
  };

  // Restore single person from trash
  const handleRestorePerson = async (personId: string) => {
    const userId = user?.uid;
    const restored = restorePerson(personId, userId);
    if (restored) {
      const updatedList = getPersons(userId);
      setPersons(updatedList);
      setTrashPersons(getTrashPersons(userId));
      if (userId) {
        savePersonToCloud(userId, restored).catch((e) => console.warn('Cloud sync error:', e));
        deleteTrashFromCloud(userId, personId).catch(() => {});
      }
      addToast(
        'success',
        lang === 'hi'
          ? `"${restored.name}" का खाता सफलतापूर्वक रीस्टोर हो गया!`
          : `"${restored.name}" restored successfully!`
      );
    }
  };

  // Restore all from trash
  const handleRestoreAllTrash = async () => {
    const userId = user?.uid;
    const restoredList = restoreAllPersons(userId);
    setPersons(getPersons(userId));
    setTrashPersons(getTrashPersons(userId));
    if (userId) {
      for (const p of restoredList) {
        savePersonToCloud(userId, p).catch(() => {});
        deleteTrashFromCloud(userId, p.id).catch(() => {});
      }
    }
    addToast(
      'success',
      lang === 'hi'
        ? `कचरा पेटी से सभी ${restoredList.length} हिसाब रीस्टोर हो गए!`
        : `Restored all ${restoredList.length} records from Trash!`
    );
  };

  // Permanently delete single person
  const handlePermanentlyDeletePerson = async (personId: string) => {
    const userId = user?.uid;
    permanentlyDeletePerson(personId, userId);
    if (userId) {
      deleteTrashFromCloud(userId, personId).catch(() => {});
    }
    setTrashPersons(getTrashPersons(userId));
    addToast(
      'info',
      lang === 'hi'
        ? 'हिसाब हमेशा के लिए मिटा दिया गया।'
        : 'Record permanently deleted.'
    );
  };

  // Empty entire trash
  const handleEmptyTrash = async () => {
    const userId = user?.uid;
    if (userId) {
      for (const t of trashPersons) {
        deleteTrashFromCloud(userId, t.id).catch(() => {});
      }
    }
    emptyTrash(userId);
    setTrashPersons([]);
    addToast(
      'info',
      lang === 'hi'
        ? 'कचरा पेटी खाली कर दी गई।'
        : 'Trash bin emptied.'
    );
  };

  // Handle Navigation with filter presets
  const handleNavigateToPersons = (filter?: 'pending' | 'paid' | 'all') => {
    if (filter) setListStatusFilter(filter);
    setActiveTab('persons');
  };

  // Load sample test data for this user account
  const handleLoadSample = async () => {
    const userId = user?.uid;
    const samples = loadSampleData(userId);
    setPersons(samples);
    if (userId) {
      await syncAllLocalToCloud(userId, samples);
    }
    addToast('success', lang === 'hi' ? 'सैंपल डेटा लोड हो गया!' : 'Sample data loaded!');
  };

  // Handle User Login Success
  const handleLoginSuccess = (loggedInUser: AppUser, isFirstTime?: boolean) => {
    setUser(loggedInUser);
    const userRecords = getPersons(loggedInUser.uid);
    setPersons(userRecords);
    setActiveTab('home');
    if (isFirstTime) {
      addToast(
        'success',
        lang === 'hi'
          ? `नमस्ते ${loggedInUser.displayName || ''}! आपका खाता तैयार है।`
          : `Welcome ${loggedInUser.displayName || ''}! Your account is ready.`
      );
    } else {
      addToast('success', i18n[lang].loginSuccess);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await logOutFirebase();
    } catch {
      // ignore
    }
    clearActiveSession();
    setUser(null);
    setPersons([]);
    setIsAccountModalOpen(false);
    setActiveTab('home');
    addToast('info', i18n[lang].logoutSuccess);
  };

  const handleOpenAddModal = () => {
    setEditingPerson(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (person: PersonHisaab) => {
    setEditingPerson(person);
    setIsAddModalOpen(true);
  };

  // -------------------------------------------------------------
  // AUTH GUARD: If not logged in, render the secure LoginScreen
  // -------------------------------------------------------------
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
        <LoginScreen
          lang={lang}
          onToggleLang={handleToggleLang}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // AUTHENTICATED DASHBOARD & KHATA VIEW
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Top Navbar */}
      <Navbar
        currentTab={activeTab}
        onTabChange={setActiveTab}
        lang={lang}
        onToggleLang={handleToggleLang}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenAddModal={handleOpenAddModal}
        trashCount={trashPersons.length}
        onOpenTrash={() => setIsTrashModalOpen(true)}
        user={user}
        onLogout={handleLogout}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 pb-20 md:pb-8">
        {activeTab === 'home' && (
          <DashboardView
            persons={persons}
            stats={stats}
            lang={lang}
            onOpenAddModal={handleOpenAddModal}
            onViewPerson={(p) => setDetailsPerson(p)}
            onToggleStatus={handleToggleStatus}
            onNavigateToPersons={handleNavigateToPersons}
            onLoadSample={handleLoadSample}
          />
        )}

        {activeTab === 'persons' && (
          <PersonListView
            key={listStatusFilter} // re-mount with filter
            persons={persons}
            lang={lang}
            initialFilter={listStatusFilter}
            trashCount={trashPersons.length}
            onOpenTrash={() => setIsTrashModalOpen(true)}
            onOpenAddModal={handleOpenAddModal}
            onViewPerson={(p) => setDetailsPerson(p)}
            onEditPerson={handleOpenEditModal}
            onDeletePerson={(p) =>
              setDeleteModal({ isOpen: true, person: p, isClearAll: false, isTrashAction: true })
            }
            onToggleStatus={handleToggleStatus}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            persons={persons}
            stats={stats}
            lang={lang}
            onViewPerson={(p) => setDetailsPerson(p)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            theme={theme}
            onToggleTheme={handleToggleTheme}
            lang={lang}
            onSetLang={handleSetLang}
            onDataRestored={() => {
              setPersons(getPersons(user.uid));
              setTrashPersons(getTrashPersons(user.uid));
              addToast('success', i18n[lang].toastBackupRestored);
            }}
            onRequestClearAll={() =>
              setDeleteModal({ isOpen: true, isClearAll: true, person: null, isTrashAction: false })
            }
            onLoadSample={handleLoadSample}
            totalRecordsCount={persons.length}
            trashCount={trashPersons.length}
            onOpenTrash={() => setIsTrashModalOpen(true)}
            onRestoreAllTrash={handleRestoreAllTrash}
            onEmptyTrash={handleEmptyTrash}
            user={user}
            onOpenAccountModal={() => setIsAccountModalOpen(true)}
          />
        )}
      </main>

      {/* Bottom Navigation for Mobile */}
      <BottomNav
        currentTab={activeTab}
        onTabChange={setActiveTab}
        onOpenAddModal={handleOpenAddModal}
        lang={lang}
      />

      {/* Add / Edit Person Modal */}
      <AddEditPersonModal
        isOpen={isAddModalOpen}
        editItem={editingPerson}
        lang={lang}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingPerson(null);
        }}
        onSave={handleSavePerson}
      />

      {/* Person Details Modal */}
      <PersonDetailsModal
        isOpen={!!detailsPerson}
        person={detailsPerson}
        lang={lang}
        onClose={() => setDetailsPerson(null)}
        onEdit={(p) => {
          setDetailsPerson(null);
          handleOpenEditModal(p);
        }}
        onDelete={(p) => {
          setDetailsPerson(null);
          setDeleteModal({ isOpen: true, person: p, isClearAll: false, isTrashAction: true });
        }}
        onToggleStatus={handleToggleStatus}
        onPayInterest={handlePayInterest}
        onToggleInterestRecord={handleToggleInterestRecord}
      />

      {/* Trash Modal */}
      <TrashModal
        isOpen={isTrashModalOpen}
        trashList={trashPersons}
        lang={lang}
        onClose={() => setIsTrashModalOpen(false)}
        onRestore={(p) => handleRestorePerson(p.id)}
        onRestoreAll={handleRestoreAllTrash}
        onPermanentDelete={(p) => handlePermanentlyDeletePerson(p.id)}
        onEmptyTrash={handleEmptyTrash}
      />

      {/* Delete / Move to Trash / Clear Confirmation Dialog */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        isTrashAction={deleteModal.isTrashAction}
        title={
          deleteModal.isClearAll
            ? i18n[lang].clearConfirmTitle
            : deleteModal.isTrashAction
            ? i18n[lang].moveToTrashConfirmTitle
            : i18n[lang].deleteConfirmTitle
        }
        message={
          deleteModal.isClearAll
            ? i18n[lang].clearConfirmMsg
            : deleteModal.isTrashAction
            ? `${i18n[lang].moveToTrashConfirmMsg} "${deleteModal.person?.name}"?`
            : `${i18n[lang].deleteConfirmMsg} "${deleteModal.person?.name}"?`
        }
        subMessage={
          deleteModal.person
            ? `Amount: ₹${deleteModal.person.totalAmount.toLocaleString('en-IN')}`
            : undefined
        }
        itemName={deleteModal.person?.name}
        lang={lang}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, person: null, isClearAll: false, isTrashAction: true })}
      />

      {/* Account Profile & Details Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        user={user}
        onClose={() => setIsAccountModalOpen(false)}
        onLogout={handleLogout}
        lang={lang}
        totalRecordsCount={persons.length}
      />
    </div>
  );
}
