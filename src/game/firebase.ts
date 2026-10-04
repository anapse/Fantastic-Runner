import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import rawConfig from '../../firebase-applet-config.json';

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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {},
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Public client config
const firebaseConfig = {
  projectId: rawConfig.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: rawConfig.appId || import.meta.env.VITE_FIREBASE_APP_ID,
  apiKey: rawConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: rawConfig.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  storageBucket: rawConfig.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: rawConfig.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const databaseId = rawConfig.firestoreDatabaseId || import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID;
export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

// Connectivity validation
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'ranking', '_test_connection_ping'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network unavailable.');
      return false;
    }
    // A permission denied or document not found error still indicates server connectivity
    return true;
  }
}

/**
 * Interface for Fantastic-Runner ranking documents.
 * Common mandatory fields across all ANAPSE games:
 * - playerName
 * - score
 */
export interface RankingEntry {
  id?: string;
  playerName: string; // Obligatorio
  score: number;      // Obligatorio
  distance?: number;
  kills?: number;
  coins?: number;
  gems?: number;
  createdAt?: string;
}

/**
 * Saves a player's final score to the 'ranking' collection in Firestore.
 */
export async function saveScoreToRanking(entry: {
  playerName: string;
  score: number;
  distance?: number;
  kills?: number;
  coins?: number;
  gems?: number;
}): Promise<string> {
  const cleanName = (entry.playerName || 'Corredor').trim().slice(0, 30) || 'Corredor';
  const cleanScore = Math.max(0, Math.floor(entry.score || 0));

  const payload: RankingEntry = {
    playerName: cleanName,
    score: cleanScore,
    distance: Math.max(0, Math.floor(entry.distance || 0)),
    kills: Math.max(0, Math.floor(entry.kills || 0)),
    coins: Math.max(0, Math.floor(entry.coins || 0)),
    gems: Math.max(0, Math.floor(entry.gems || 0)),
    createdAt: new Date().toISOString(),
  };

  try {
    const docRef = await addDoc(collection(db, 'ranking'), payload);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'ranking');
  }
}

/**
 * Fetches the TOP 50 players ordered by score descending.
 */
export async function fetchTopRanking(topLimit = 50): Promise<RankingEntry[]> {
  try {
    const rankingQuery = query(
      collection(db, 'ranking'),
      orderBy('score', 'desc'),
      limit(topLimit)
    );

    const snapshot = await getDocs(rankingQuery);
    const results: RankingEntry[] = [];

    snapshot.forEach((d) => {
      const data = d.data();
      results.push({
        id: d.id,
        playerName: data.playerName || 'Anónimo',
        score: typeof data.score === 'number' ? data.score : 0,
        distance: typeof data.distance === 'number' ? data.distance : 0,
        kills: typeof data.kills === 'number' ? data.kills : 0,
        coins: typeof data.coins === 'number' ? data.coins : 0,
        gems: typeof data.gems === 'number' ? data.gems : 0,
        createdAt: data.createdAt || undefined,
      });
    });

    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'ranking');
  }
}

/**
 * Interface for summary & statistics shown on the /admin dashboard.
 */
export interface AdminDashboardData {
  totalRecords: number;
  bestScore: number;
  bestPlayer: string;
  latestScore: number;
  latestPlayer: string;
  latestDate: string;
  totalCoins: number;
  totalKills: number;
  maxDistance: number;
  top50: RankingEntry[];
  hasData: boolean;
}

/**
 * Fetches all necessary data to build the /admin dashboard.
 */
export async function fetchAdminDashboardData(): Promise<AdminDashboardData> {
  try {
    const rankingQuery = query(
      collection(db, 'ranking'),
      orderBy('score', 'desc'),
      limit(100)
    );

    const snapshot = await getDocs(rankingQuery);
    const allEntries: RankingEntry[] = [];

    let totalCoins = 0;
    let totalKills = 0;
    let maxDistance = 0;

    snapshot.forEach((d) => {
      const data = d.data();
      const entry: RankingEntry = {
        id: d.id,
        playerName: data.playerName || 'Anónimo',
        score: typeof data.score === 'number' ? data.score : 0,
        distance: typeof data.distance === 'number' ? data.distance : 0,
        kills: typeof data.kills === 'number' ? data.kills : 0,
        coins: typeof data.coins === 'number' ? data.coins : 0,
        gems: typeof data.gems === 'number' ? data.gems : 0,
        createdAt: data.createdAt || undefined,
      };

      allEntries.push(entry);
      totalCoins += entry.coins || 0;
      totalKills += entry.kills || 0;
      if ((entry.distance || 0) > maxDistance) {
        maxDistance = entry.distance || 0;
      }
    });

    const top50 = allEntries.slice(0, 50);
    const hasData = allEntries.length > 0;
    const bestScore = hasData ? (allEntries[0]?.score || 0) : 0;
    const bestPlayer = hasData ? (allEntries[0]?.playerName || 'N/A') : 'N/A';

    // Find the latest recorded score by createdAt
    let latestEntry: RankingEntry | null = null;
    for (const e of allEntries) {
      if (!latestEntry) {
        latestEntry = e;
      } else if (e.createdAt && latestEntry.createdAt && e.createdAt > latestEntry.createdAt) {
        latestEntry = e;
      }
    }

    const latestScore = latestEntry ? latestEntry.score : 0;
    const latestPlayer = latestEntry ? latestEntry.playerName : 'N/A';
    const latestDate = latestEntry?.createdAt || 'N/A';

    return {
      totalRecords: allEntries.length,
      bestScore,
      bestPlayer,
      latestScore,
      latestPlayer,
      latestDate,
      totalCoins,
      totalKills,
      maxDistance,
      top50,
      hasData,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'ranking');
  }
}
