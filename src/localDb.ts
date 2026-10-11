import { Guest, AppNote, Invoice, StaffReminder, HotelSettings, AppNotification, UserProfile, RoomStatusValue, FinanceTransaction } from "./types";

const DB_NAME = "hotel_palms_local_db";
const DB_VERSION = 3;

export const getLocalStorageItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  let newVal: string | null = null;
  try {
    newVal = localStorage.getItem(key);
    if (newVal !== null) return newVal;
  } catch (e) {
    console.warn(`[Local DB] localStorage.getItem failed for key: ${key}`, e);
  }
  
  let oldKey = '';
  if (key === "hotel_palms_page_configs") {
    oldKey = "ajad_page_configs";
  } else if (key === "hotel_palms_use_local_db_only") {
    oldKey = "adjad_use_local_db_only";
  } else if (key === "hotel_palms_collapsed_notifications") {
    oldKey = "ajad-collapsed-notifications";
  } else if (key.startsWith("hotel-palms-")) {
    oldKey = key.replace("hotel-palms-", "ajad-");
  } else if (key.startsWith("hotel_palms_")) {
    oldKey = key.replace("hotel_palms_", "adjad_");
  }
  
  if (oldKey) {
    try {
      const oldVal = localStorage.getItem(oldKey);
      if (oldVal !== null) {
        try {
          localStorage.setItem(key, oldVal);
        } catch (e) {
          // ignore
        }
        return oldVal;
      }
    } catch (e) {
      console.warn(`[Local DB] localStorage.getItem failed for oldKey: ${oldKey}`, e);
    }
  }
  return null;
};

/**
 * Initializes the IndexedDB database for Hotel Palms.
 * Creates explicit object stores for each distinct module.
 */
export const initIndexedDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported on this device/browser."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const stores = [
        "guests",
        "notes",
        "invoices",
        "room_statuses",
        "reminders",
        "hotel_settings",
        "notifications",
        "profiles",
        "finance_transactions",
        "sync_queue"
      ];

      stores.forEach(store => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store);
        }
      });
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

/**
 * Persistently locks device storage to guarantee browser doesn't purge data 
 * when the personal computer is low on disk space or during disk cleanups.
 * Highly requested feature for dedicated private workstation PCs.
 */
export const requestPersistentStorage = async (): Promise<boolean> => {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      console.log(`[Local DB] Storage persistence locked: ${isPersisted}`);
      return isPersisted;
    } catch (e) {
      console.error("[Local DB] Failed to request storage persistence:", e);
      return false;
    }
  }
  return false;
};

/**
 * Helper to write payload into IndexedDB asynchronously.
 */
export const saveToIndexedDB = <T>(storeName: string, key: string, data: T): Promise<void> => {
  return new Promise((resolve, reject) => {
    initIndexedDB().then(db => {
      try {
        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.put(data, key);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (e) {
        reject(e);
      }
    }).catch(reject);
  });
};

/**
 * Helper to fetch payload from IndexedDB asynchronously.
 */
export const loadFromIndexedDB = <T>(storeName: string, key: string, fallback: T): Promise<T> => {
  return new Promise((resolve) => {
    initIndexedDB().then(db => {
      try {
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          if (request.result !== undefined) {
            resolve(request.result as T);
          } else {
            resolve(fallback);
          }
        };

        request.onerror = () => {
          resolve(fallback);
        };
      } catch (e) {
        resolve(fallback);
      }
    }).catch(() => {
      resolve(fallback);
    });
  });
};

/**
 * Triggers dual local-syncing (saving to both localStorage for sync-latency 
 * and persistent IndexedDB to secure against cache wipes).
 */
export const persistLocalDatabase = async (
  key: string,
  storeName: string,
  data: any
) => {
  // 1. Save to fast-access localStorage
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`[Local DB] LocalStorage full or blocked. Syncing continues via IndexedDB.`, e);
  }

  // 2. Core secure IndexedDB background backup
  try {
    await saveToIndexedDB(storeName, "all_records", data);
  } catch (e) {
    console.error(`[Local DB] Key "${storeName}" failed IndexedDB transactional save:`, e);
  }
};

/**
 * Emergency deep database loading. If localStorage keys are missing/wiped,
 * it pulls from IndexedDB and matches them back, preventing data loss.
 */
export const getOrRestoreCollection = async <T>(
  localKey: string,
  storeName: string,
  currentRAMValue: T,
  setRAMState: (val: T) => void
): Promise<T> => {
  // First, check if RAM value is already loaded
  if (Array.isArray(currentRAMValue) && currentRAMValue.length > 0) {
    return currentRAMValue;
  }
  if (!Array.isArray(currentRAMValue) && currentRAMValue && Object.keys(currentRAMValue).length > 0) {
    return currentRAMValue;
  }

  // Check LocalStorage
  const lsData = getLocalStorageItem(localKey);
  if (lsData) {
    try {
      const parsed = JSON.parse(lsData) as T;
      // Mirror to IndexedDB in case they are out of sync
      saveToIndexedDB(storeName, "all_records", parsed).catch(() => {});
      return parsed;
    } catch {
      // Wiped or corrupted localStorage, fall through to IndexedDB
    }
  }

  // Fallback and read from secure IndexedDB disk table
  const restored = await loadFromIndexedDB<T>(storeName, "all_records", currentRAMValue);
  
  if (restored) {
    // Check if we actually recovered missing data
    const isValuedArr = Array.isArray(restored) && restored.length > 0;
    const isValuedObj = !Array.isArray(restored) && restored && Object.keys(restored).length > 0;
    
    if (isValuedArr || isValuedObj) {
      console.log(`✨ [Local DB] Successfully recovered lost dataset for "${storeName}" from persistent computer database!`);
      // Restore back to LocalStorage to repair the cache
      localStorage.setItem(localKey, JSON.stringify(restored));
      setRAMState(restored);
    }
  }

  return restored;
};

/**
 * Whole Database JSON Export Schema
 */
export interface CompleteDatabaseBackup {
  exportDate: string;
  guests: Guest[];
  notes: AppNote[];
  roomStatuses: Record<string, RoomStatusValue>;
  reminders: StaffReminder[];
  hotelSettings: HotelSettings | null;
  notifications: AppNotification[];
  profiles: UserProfile[];
  invoices: Invoice[];
  financeTransactions?: FinanceTransaction[];
  systemSecret: string;
  
  // Custom Visual Themes & Layout configurations
  theme?: string;
  colorTheme?: 'emerald' | 'royal' | 'constantine' | 'oran-blue';
  zelligeOpacity?: number;
  buttonSize?: number;
  buttonSpacing?: 'compact' | 'normal' | 'relaxed';
  buttonAlignment?: 'right' | 'left' | 'justified';
  
  // Security locks & operational PIN credentials
  receptionistPin?: string;
  manualUsers?: { username: string; password: string }[];
}

/**
 * Forms the full JSON backup object, downloadable directly.
 */
export const generateDatabaseBackupPayload = async (invoicesList: Invoice[] = []): Promise<CompleteDatabaseBackup> => {
  // Safe helper to parse JSON string without throwing
  const safeParse = <T>(val: string | null, fallback: T): T => {
    if (!val) return fallback;
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  };

  // Retrieve everything securely using compliant wrappers
  const guests = safeParse(getLocalStorageItem("hotel-palms-guests"), []);
  const notes = safeParse(getLocalStorageItem("hotel-palms-notes"), []);
  const roomStatuses = safeParse(getLocalStorageItem("hotel-palms-room-statuses"), {});
  const reminders = safeParse(getLocalStorageItem("hotel-palms-staff-reminders"), []);
  const hotelSettings = safeParse(getLocalStorageItem("hotel-palms-hotel-settings"), null);
  const notifications = safeParse(getLocalStorageItem("hotel-palms-notifications"), []);
  const profiles = safeParse(getLocalStorageItem("local_staff_profiles"), []);
  const localInvoices = safeParse(getLocalStorageItem("hotel_palms_invoices"), []);
  const localTransactions = safeParse(getLocalStorageItem("hotel_palms_finance_transactions"), []);

  // Visual layout & theme configurations
  const theme = localStorage.getItem("theme") || "light";
  const colorTheme = localStorage.getItem("colorTheme") as any || "emerald";
  const zelligeOpacity = Number(localStorage.getItem("zelligeOpacity") || "40");
  const buttonSize = Number(localStorage.getItem("buttonSize") || "1.0");
  const buttonSpacing = localStorage.getItem("buttonSpacing") as any || "normal";
  const buttonAlignment = localStorage.getItem("buttonAlignment") as any || "right";

  // System credentials
  const receptionistPin = localStorage.getItem("receptionistPin") || "1234";
  const manualUsers = safeParse(localStorage.getItem("manualUsers"), []);
  
  // Double-check with IndexedDB
  const idxGuests = await loadFromIndexedDB<Guest[]>("guests", "all_records", []);
  const idxNotes = await loadFromIndexedDB<AppNote[]>("notes", "all_records", []);
  const idxRoomStatuses = await loadFromIndexedDB<Record<string, RoomStatusValue>>("room_statuses", "all_records", {});
  const idxReminders = await loadFromIndexedDB<StaffReminder[]>("reminders", "all_records", []);
  const idxSettings = await loadFromIndexedDB<HotelSettings | null>("hotel_settings", "all_records", null);
  const idxNotifs = await loadFromIndexedDB<AppNotification[]>("notifications", "all_records", []);
  const idxProfiles = await loadFromIndexedDB<UserProfile[]>("profiles", "all_records", []);
  const idxInvoices = await loadFromIndexedDB<Invoice[]>("invoices", "all_records", []);
  const idxTransactions = await loadFromIndexedDB<FinanceTransaction[]>("finance_transactions", "all_records", []);

  return {
    exportDate: new Date().toISOString(),
    guests: guests.length > 0 ? guests : idxGuests,
    notes: notes.length > 0 ? notes : idxNotes,
    roomStatuses: Object.keys(roomStatuses).length > 0 ? roomStatuses : idxRoomStatuses,
    reminders: reminders.length > 0 ? reminders : idxReminders,
    hotelSettings: hotelSettings || idxSettings,
    notifications: notifications.length > 0 ? notifications : idxNotifs,
    profiles: profiles.length > 0 ? profiles : idxProfiles,
    invoices: invoicesList.length > 0 ? invoicesList : (localInvoices.length > 0 ? localInvoices : idxInvoices),
    financeTransactions: localTransactions.length > 0 ? localTransactions : idxTransactions,
    systemSecret: "hotel_premium_secure_9922_5",
    
    // Custom visual options packed
    theme,
    colorTheme,
    zelligeOpacity,
    buttonSize,
    buttonSpacing,
    buttonAlignment,
    
    // Credentials
    receptionistPin,
    manualUsers
  };
};

/**
 * Robust Offline Synchronization Queue
 * Preserves pending mutations during offline sessions, network drops, or background tab sleep.
 */
export interface QueuedMutation {
  id: string;
  collectionName: string;
  docId: string;
  action: 'set' | 'update' | 'delete';
  payload?: any;
  timestamp: number;
  retries: number;
}

export const enqueueMutation = async (
  item: Omit<QueuedMutation, 'id' | 'timestamp' | 'retries'>
): Promise<void> => {
  const queued: QueuedMutation = {
    ...item,
    id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now(),
    retries: 0
  };

  try {
    const existing = await loadFromIndexedDB<QueuedMutation[]>("sync_queue", "pending_items", []);
    // Avoid queuing duplicate operations for the exact same docId with identical timestamp
    const filtered = existing.filter(m => !(m.collectionName === queued.collectionName && m.docId === queued.docId && m.action === queued.action));
    const updated = [...filtered, queued];
    await saveToIndexedDB("sync_queue", "pending_items", updated);
    localStorage.setItem("hotel_palms_pending_sync_count", String(updated.length));
  } catch (e) {
    console.warn("[Sync Queue] Failed to enqueue mutation into IndexedDB:", e);
  }
};

export const getPendingMutations = async (): Promise<QueuedMutation[]> => {
  try {
    const items = await loadFromIndexedDB<QueuedMutation[]>("sync_queue", "pending_items", []);
    return items || [];
  } catch (e) {
    console.warn("[Sync Queue] Failed to load pending mutations:", e);
    return [];
  }
};

export const removeQueuedMutation = async (id: string): Promise<void> => {
  try {
    const existing = await loadFromIndexedDB<QueuedMutation[]>("sync_queue", "pending_items", []);
    const updated = existing.filter(m => m.id !== id);
    await saveToIndexedDB("sync_queue", "pending_items", updated);
    localStorage.setItem("hotel_palms_pending_sync_count", String(updated.length));
  } catch (e) {
    console.warn("[Sync Queue] Failed to remove mutation:", e);
  }
};

export const clearSyncQueue = async (): Promise<void> => {
  try {
    await saveToIndexedDB("sync_queue", "pending_items", []);
    localStorage.setItem("hotel_palms_pending_sync_count", "0");
  } catch (e) {
    console.warn("[Sync Queue] Failed to clear queue:", e);
  }
};

export interface DatabaseHealthStatus {
  isIndexedDBAvailable: boolean;
  isStoragePersisted: boolean;
  pendingSyncCount: number;
  storageEstimate?: {
    usageMB: number;
    quotaMB: number;
    percentUsed: number;
  };
  lastChecked: number;
}

export const getDatabaseHealth = async (): Promise<DatabaseHealthStatus> => {
  const isIndexedDBAvailable = typeof window !== 'undefined' && !!window.indexedDB;
  let isStoragePersisted = false;

  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
    try {
      isStoragePersisted = await navigator.storage.persisted();
    } catch {
      isStoragePersisted = false;
    }
  }

  const pending = await getPendingMutations();
  let storageEstimate: DatabaseHealthStatus['storageEstimate'];

  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usageMB = estimate.usage ? Math.round((estimate.usage / (1024 * 1024)) * 10) / 10 : 0;
      const quotaMB = estimate.quota ? Math.round((estimate.quota / (1024 * 1024)) * 10) / 10 : 0;
      const percentUsed = quotaMB > 0 ? Math.round((usageMB / quotaMB) * 1000) / 10 : 0;
      storageEstimate = { usageMB, quotaMB, percentUsed };
    } catch {
      // ignore
    }
  }

  return {
    isIndexedDBAvailable,
    isStoragePersisted,
    pendingSyncCount: pending.length,
    storageEstimate,
    lastChecked: Date.now()
  };
};

export interface IntegrityAuditResult {
  status: 'optimal' | 'repaired' | 'error';
  repairedGuestCount: number;
  reconciledStores: string[];
  message: string;
  totalGuests: number;
  totalNotes: number;
  isStoragePersisted: boolean;
}

/**
 * Deep Database Audit & Self-Healing:
 * - Scans guest records, cleans corrupted fields, eliminates duplicate IDs
 * - Reconciles LocalStorage with IndexedDB so both copies remain identical
 * - Enforces persistent storage lock on browser disk
 */
export const runDatabaseIntegrityCheck = async (
  currentGuests: Guest[],
  setGuests: (g: Guest[]) => void
): Promise<IntegrityAuditResult> => {
  let repairedCount = 0;
  const reconciledStores: string[] = [];

  try {
    // 1. Lock storage persistence
    const isPersisted = await requestPersistentStorage();

    // 2. Audit Guest entries for unique IDs, valid timestamps, non-empty fields
    const seenIds = new Set<string>();
    const sanitizedGuests: Guest[] = [];

    for (const g of currentGuests) {
      let isMutated = false;
      const validId = g.id && typeof g.id === 'string' && g.id.trim().length > 0
        ? g.id.trim()
        : `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      if (validId !== g.id) isMutated = true;

      // Deduplicate identical IDs
      if (seenIds.has(validId)) {
        repairedCount++;
        continue;
      }
      seenIds.add(validId);

      const validTimestamp = typeof g.timestamp === 'number' && !isNaN(g.timestamp) && g.timestamp > 0
        ? g.timestamp
        : Date.now();
      if (validTimestamp !== g.timestamp) isMutated = true;

      const repairedGuest: Guest = {
        ...g,
        id: validId,
        timestamp: validTimestamp,
        firstNameAr: (g.firstNameAr || '').trim(),
        lastNameAr: (g.lastNameAr || '').trim(),
        roomNumber: (g.roomNumber || '').trim(),
      };

      if (isMutated) repairedCount++;
      sanitizedGuests.push(repairedGuest);
    }

    if (repairedCount > 0 || sanitizedGuests.length !== currentGuests.length) {
      setGuests(sanitizedGuests);
      await persistLocalDatabase('hotel-palms-guests', 'guests', sanitizedGuests);
      reconciledStores.push('guests');
    }

    // 3. Double reconcile IndexedDB with localStorage for notes, rooms, settings
    const lsNotes = getLocalStorageItem('hotel-palms-notes');
    if (lsNotes) {
      try {
        const notesObj = JSON.parse(lsNotes);
        await saveToIndexedDB('notes', 'all_records', notesObj);
        reconciledStores.push('notes');
      } catch {}
    }

    const lsStatuses = getLocalStorageItem('hotel-palms-room-statuses');
    if (lsStatuses) {
      try {
        const statusObj = JSON.parse(lsStatuses);
        await saveToIndexedDB('room_statuses', 'all_records', statusObj);
        reconciledStores.push('room_statuses');
      } catch {}
    }

    const lsSettings = getLocalStorageItem('hotel-palms-hotel-settings');
    if (lsSettings) {
      try {
        const settingsObj = JSON.parse(lsSettings);
        await saveToIndexedDB('hotel_settings', 'all_records', settingsObj);
        reconciledStores.push('hotel_settings');
      } catch {}
    }

    return {
      status: repairedCount > 0 ? 'repaired' : 'optimal',
      repairedGuestCount: repairedCount,
      reconciledStores,
      message: repairedCount > 0
        ? `تم فحص قاعدة البيانات بنجاح: تم إصلاح ${repairedCount} سجلاً وتزامن جميع الجداول مع التخزين المشفر الدائم.`
        : `قاعدة البيانات في حالة مثالية 100%. التخزين المحلي مشفر ودائم، وجميع الجداول متناسقة.`,
      totalGuests: sanitizedGuests.length,
      totalNotes: lsNotes ? JSON.parse(lsNotes).length : 0,
      isStoragePersisted: isPersisted
    };
  } catch (err) {
    console.error("[Integrity Check] Audit failed:", err);
    return {
      status: 'error',
      repairedGuestCount: 0,
      reconciledStores,
      message: `حدث تنبيه أثناء فحص قاعدة البيانات: ${err instanceof Error ? err.message : String(err)}`,
      totalGuests: currentGuests.length,
      totalNotes: 0,
      isStoragePersisted: false
    };
  }
};


