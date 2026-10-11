import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  CACHE_SIZE_UNLIMITED,
  enableNetwork,
  disableNetwork,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

let dbInstance: any;

try {
  const dbId = (firebaseConfig as any).firestoreDatabaseId;
  const cacheConfig = {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    }),
  };
  
  if (dbId) {
    dbInstance = initializeFirestore(app, cacheConfig, dbId);
  } else {
    dbInstance = initializeFirestore(app, cacheConfig);
  }
} catch (e) {
  console.warn("Firestore persistent local cache initialization failed, falling back to default:", e);
  dbInstance = (firebaseConfig as any).firestoreDatabaseId 
    ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
    : getFirestore(app);
}

// Auto-reconnect resilience for browser connectivity changes
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    try {
      if (dbInstance) {
        await enableNetwork(dbInstance);
        console.log('[Firestore] Connection restored - Cloud synchronization resumed.');
      }
    } catch (e) {
      console.warn('[Firestore] Network enable warning:', e);
    }
  });

  window.addEventListener('offline', async () => {
    try {
      if (dbInstance) {
        await disableNetwork(dbInstance);
        console.log('[Firestore] Device offline - Switched cleanly to offline local cache.');
      }
    } catch (e) {
      console.warn('[Firestore] Network disable warning:', e);
    }
  });
}

export const db = dbInstance;
export const auth = getAuth();
export const isPlaceholderConfig = firebaseConfig.projectId === 'remixed-project-id' || firebaseConfig.apiKey === 'remixed-api-key';

/**
 * Deeply sanitizes any document payload before sending to Firestore.
 * Strips all undefined fields to prevent Firestore serialization crashes.
 */
export function cleanFirestorePayload<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanFirestorePayload(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestorePayload(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

/**
 * Direct server ping to test Firestore live reachability
 */
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(dbInstance, 'settings', 'hotel_info'));
    return true;
  } catch (error) {
    return false;
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errCode = (error && typeof error === 'object' && 'code' in error) ? String((error as any).code) : '';
  
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  // If the error code is 'unavailable' or contains 'unavailable' / connection problems,
  // we do NOT throw. It is a standard connectivity notification for offline/fallback modes.
  const isConnectionIssue = 
    errCode === 'unavailable' || 
    errMessage.toLowerCase().includes('unavailable') ||
    errMessage.toLowerCase().includes('could not reach') ||
    errMessage.toLowerCase().includes('offline') ||
    errMessage.toLowerCase().includes('network');

  if (isConnectionIssue) {
    console.warn('Firestore connectivity status: App operating in offline/resilient local fallback mode.', JSON.stringify(errInfo));
    return; // Don't throw to prevent React rendering or snapshot subscription crashes!
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
