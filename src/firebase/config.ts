import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBw0Yo8vw5tOV0cBKRIcmLBSacBx4VIT9c",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "saloon-aquiness.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "saloon-aquiness",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "saloon-aquiness.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "787792115271",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:787792115271:web:fcc4b427380ead20ede362"
};

// Initialize Firebase safely
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Durable offline storage: every write is kept on the device (IndexedDB) until the
// server confirms it, so jobs entered with bad signal are never lost.
const createDb = () => {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
  } catch {
    // Already initialised (hot reload) or persistence unsupported -> default instance
    return getFirestore(app);
  }
};

export const db = createDb();
export const auth = getAuth(app);

export const isFirebaseConfigured = (): boolean => {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
};
