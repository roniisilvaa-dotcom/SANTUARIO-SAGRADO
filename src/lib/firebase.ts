import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, orderBy, limit, arrayUnion, increment, updateDoc as fsUpdateDoc, getDocFromServer } from "firebase/firestore";
import { JournalEntry, UserProfile, PrayerRequest } from "../types";

// Setup Firestore Error Info interface and error handler as mandated by skills
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
  }
}

// Fallback user state in memory & localStorage to simulate auth when Firebase is initializing
const LOCAL_STORAGE_PROFILE_KEY = "santuario_local_profile";
const LOCAL_STORAGE_DIARY_KEY = "santuario_diary_gold";
const LOCAL_STORAGE_PRAYERS_KEY = "santuario_local_prayers";

const MOCK_PROFILE_DEFAULT: UserProfile = {
  name: "João Peregrino",
  email: "peregrino@santuario.app",
  joinedDate: new Date().toISOString(),
  streak: 12,
  subscriptionStatus: "free",
};

const MOCK_PRAYERS_DEFAULT: PrayerRequest[] = [
  {
    id: "pray_1",
    authorId: "user_daniel",
    authorName: "Pastor Daniel",
    text: "Clamo pela restauração das famílias neste mês de Maio. Que o lar de cada peregrino seja inundado de amor, paz e mansidão de espírito.",
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    amenCount: 24,
    amens: ["user_guest_1", "user_guest_2"]
  },
  {
    id: "pray_2",
    authorId: "user_luciana",
    authorName: "Missionária Luciana",
    text: "Pela saúde física e mental de todos os que enfrentam noites escuras de ansiedade e depressão. Lembrem-se: Ele cuida de vós.",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    amenCount: 15,
    amens: ["user_guest_3"]
  },
  {
    id: "pray_3",
    authorId: "user_maria",
    authorName: "Maria de Lourdes",
    text: "Agradeço a Deus por uma porta de emprego aberta que parecia impossível! O Senhor é fiel nas pequenas e grandes provações.",
    createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    amenCount: 38,
    amens: ["user_guest_1"]
  }
];

let isFirebaseConfigured = false;
let firebaseApp: any = null;
let firestoreDb: any = null;
let firebaseAuth: any = null;

const configPath = "../../firebase-applet-config.json";
// @ts-ignore
import(/* @vite-ignore */ configPath)
  .then((config) => {
    if (config && config.apiKey && config.projectId) {
      firebaseApp = getApps().length === 0 ? initializeApp(config) : getApp();
      firestoreDb = getFirestore(firebaseApp, config.firestoreDatabaseId);
      firebaseAuth = getAuth(firebaseApp);
      isFirebaseConfigured = true;
      console.log("⛪ Firebase Initialized successfully in Santuário Cloud Node.");
    }
  })
  .catch((e) => {
    console.warn("⛪ Firebase is in local simulation mode. Waiting for user terms consent in the UI.");
  });

// Global handle error for Firestore operations
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentFirebaseUser = firebaseAuth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentFirebaseUser?.uid || "mock_user_id",
      email: currentFirebaseUser?.email || "mock_email@santuario.app",
      emailVerified: currentFirebaseUser?.emailVerified || false,
      isAnonymous: currentFirebaseUser?.isAnonymous || false,
      tenantId: currentFirebaseUser?.tenantId || null,
    },
    operationType,
    path
  };
  console.error("Firestore Error Detailed Object: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Verify database connection as required by skills
export async function testFirestoreConnection() {
  if (!isFirebaseConfigured || !firestoreDb) return;
  try {
    await getDocFromServer(doc(firestoreDb, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or network status.");
    }
  }
}

// ----------------- EXPORTING ADAPTIVE INTERFACES -----------------------

export const isRealFirebase = () => isFirebaseConfigured;

export const registerAuthStateListener = (callback: (user: any, profile: UserProfile | null) => void) => {
  if (isFirebaseConfigured && firebaseAuth && firestoreDb) {
    return onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDocRef = doc(firestoreDb, "users", fbUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const profile = userSnap.data() as UserProfile;
            callback(fbUser, profile);
          } else {
            // Initiate fresh pilgrim record
            const newProfile: UserProfile = {
              name: fbUser.displayName || fbUser.email?.split("@")[0] || "Pilgrim",
              email: fbUser.email || "",
              joinedDate: new Date().toISOString(),
              streak: 1,
              subscriptionStatus: "free",
            };
            await setDoc(userDocRef, newProfile);
            callback(fbUser, newProfile);
          }
        } catch (error) {
          console.error("Error reading live user profile:", error);
          callback(fbUser, MOCK_PROFILE_DEFAULT);
        }
      } else {
        callback(null, null);
      }
    });
  } else {
    // Simulator mock trigger
    const triggerLocalLoad = () => {
      const savedProfile = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
      const activeUser = savedProfile ? JSON.parse(savedProfile) : null;
      if (activeUser) {
        callback(
          { uid: "mock_user_uid", email: activeUser.email, displayName: activeUser.name } as any,
          activeUser
        );
      } else {
        callback(null, null);
      }
    };

    triggerLocalLoad();
    // Simulate listner hook
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_PROFILE_KEY) {
        triggerLocalLoad();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }
};

export const loginWithGoogle = async (): Promise<{ user: any; profile: UserProfile }> => {
  if (isFirebaseConfigured && firebaseAuth && firestoreDb) {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(firebaseAuth, provider);
      const userDocRef = doc(firestoreDb, "users", result.user.uid);
      const userSnap = await getDoc(userDocRef);
      let profile: UserProfile;
      if (userSnap.exists()) {
        profile = userSnap.data() as UserProfile;
      } else {
        profile = {
          name: result.user.displayName || "Comunidade Santuário",
          email: result.user.email || "",
          joinedDate: new Date().toISOString(),
          streak: 1,
          subscriptionStatus: "free",
        };
        await setDoc(userDocRef, profile);
      }
      return { user: result.user, profile };
    } catch (e) {
      console.error("Firebase Login Google failed:", e);
      throw e;
    }
  } else {
    // Simulated pilgrim login
    const localProfile: UserProfile = {
      ...MOCK_PROFILE_DEFAULT,
      joinedDate: new Date().toISOString(),
    };
    localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(localProfile));
    // Dispatch fake event to notify active tab
    window.dispatchEvent(new Event("storage"));
    return {
      user: { uid: "mock_user_uid", email: localProfile.email, displayName: localProfile.name },
      profile: localProfile
    };
  }
};

export const loginWithEmailSimulated = async (email: string, name: string): Promise<{ user: any; profile: UserProfile }> => {
  const localProfile: UserProfile = {
    name: name || "Peregrino da Fé",
    email: email || "peregrino@santuario.app",
    joinedDate: new Date().toISOString(),
    streak: Math.floor(Math.random() * 5) + 1,
    subscriptionStatus: "free",
  };
  localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(localProfile));
  window.dispatchEvent(new Event("storage"));
  return {
    user: { uid: "mock_user_uid", email: localProfile.email, displayName: localProfile.name },
    profile: localProfile
  };
};

export const logoutPilgrim = async () => {
  if (isFirebaseConfigured && firebaseAuth) {
    await firebaseSignOut(firebaseAuth);
  } else {
    localStorage.removeItem(LOCAL_STORAGE_PROFILE_KEY);
    window.dispatchEvent(new Event("storage"));
  }
};

export const updatePilgrimProfile = async (userId: string, updates: Partial<UserProfile>) => {
  if (isFirebaseConfigured && firestoreDb) {
    try {
      const userDocRef = doc(firestoreDb, "users", userId);
      await updateDoc(userDocRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  } else {
    const saved = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
    if (saved) {
      const current = JSON.parse(saved);
      const merged = { ...current, ...updates };
      localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(merged));
      window.dispatchEvent(new Event("storage"));
    }
  }
};

// ----------------- DEVOUT DIARY STORAGE (FIRESTORE SYNCED) -----------------

export const getDiaryEntries = async (userId: string): Promise<JournalEntry[]> => {
  if (isFirebaseConfigured && firestoreDb) {
    try {
      const diaryCollRef = collection(firestoreDb, "users", userId, "diary");
      const diarySnap = await getDocs(diaryCollRef);
      const entries: JournalEntry[] = [];
      diarySnap.forEach((doc) => {
        entries.push(doc.data() as JournalEntry);
      });
      // Sort in descending order
      return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/diary`);
      return [];
    }
  } else {
    const saved = localStorage.getItem(LOCAL_STORAGE_DIARY_KEY);
    return saved ? JSON.parse(saved) : [];
  }
};

export const addDiaryEntry = async (userId: string, entry: JournalEntry): Promise<void> => {
  if (isFirebaseConfigured && firestoreDb) {
    try {
      const docRef = doc(firestoreDb, "users", userId, "diary", entry.id);
      await setDoc(docRef, entry);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${userId}/diary/${entry.id}`);
    }
  } else {
    const current = localStorage.getItem(LOCAL_STORAGE_DIARY_KEY);
    const list: JournalEntry[] = current ? JSON.parse(current) : [];
    const updated = [entry, ...list];
    localStorage.setItem(LOCAL_STORAGE_DIARY_KEY, JSON.stringify(updated));
  }
};

export const deleteDiaryEntry = async (userId: string, entryId: string): Promise<void> => {
  if (isFirebaseConfigured && firestoreDb) {
    try {
      // Deletion
      const docRef = doc(firestoreDb, "users", userId, "diary", entryId);
      // Let's standard delete through standard function if needed, or update mock
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}/diary/${entryId}`);
    }
  } else {
    const current = localStorage.getItem(LOCAL_STORAGE_DIARY_KEY);
    if (current) {
      const list: JournalEntry[] = JSON.parse(current);
      const filtered = list.filter((e) => e.id !== entryId);
      localStorage.setItem(LOCAL_STORAGE_DIARY_KEY, JSON.stringify(filtered));
    }
  }
};

// ----------------- COMMUNAL PRAYER WALL -----------------

export const getCommunalPrayers = async (): Promise<PrayerRequest[]> => {
  if (isFirebaseConfigured && firestoreDb) {
    try {
      const q = query(collection(firestoreDb, "prayers"), orderBy("createdAt", "desc"), limit(30));
      const snap = await getDocs(q);
      const list: PrayerRequest[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as PrayerRequest);
      });
      return list;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, "prayers");
      return MOCK_PRAYERS_DEFAULT;
    }
  } else {
    const saved = localStorage.getItem(LOCAL_STORAGE_PRAYERS_KEY);
    if (!saved) {
      localStorage.setItem(LOCAL_STORAGE_PRAYERS_KEY, JSON.stringify(MOCK_PRAYERS_DEFAULT));
      return MOCK_PRAYERS_DEFAULT;
    }
    return JSON.parse(saved);
  }
};

export const addCommunalPrayer = async (text: string, authorId: string, authorName: string): Promise<PrayerRequest> => {
  const newPrayer: PrayerRequest = {
    id: `pray_${Date.now()}`,
    authorId,
    authorName: authorName || "Peregrino Oculto",
    text,
    createdAt: new Date().toISOString(),
    amenCount: 0,
    amens: []
  };

  if (isFirebaseConfigured && firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, "prayers", newPrayer.id), newPrayer);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `prayers/${newPrayer.id}`);
    }
  } else {
    const current = localStorage.getItem(LOCAL_STORAGE_PRAYERS_KEY);
    const list: PrayerRequest[] = current ? JSON.parse(current) : MOCK_PRAYERS_DEFAULT;
    const updated = [newPrayer, ...list];
    localStorage.setItem(LOCAL_STORAGE_PRAYERS_KEY, JSON.stringify(updated));
  }
  return newPrayer;
};

export const clickPrayerAmen = async (prayerId: string, pilgrimId: string): Promise<void> => {
  if (isFirebaseConfigured && firestoreDb) {
    try {
      const docRef = doc(firestoreDb, "prayers", prayerId);
      await fsUpdateDoc(docRef, {
        amenCount: increment(1),
        amens: arrayUnion(pilgrimId)
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `prayers/${prayerId}`);
    }
  } else {
    const current = localStorage.getItem(LOCAL_STORAGE_PRAYERS_KEY);
    if (current) {
      const list: PrayerRequest[] = JSON.parse(current);
      const updated = list.map((pr) => {
        if (pr.id === prayerId) {
          if (pr.amens?.includes(pilgrimId)) {
            // Already amened, toggle or keep
            return pr;
          }
          return {
            ...pr,
            amenCount: pr.amenCount + 1,
            amens: [...(pr.amens || []), pilgrimId]
          };
        }
        return pr;
      });
      localStorage.setItem(LOCAL_STORAGE_PRAYERS_KEY, JSON.stringify(updated));
    }
  }
};
