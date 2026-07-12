// ============================================================================
// lib/firebase.ts
// Production Firebase infrastructure configuration. Initializes exactly one
// app instance (guards against Next.js hot-reload double-init) and exports
// typed Firestore, Auth, and Storage handles for the rest of the codebase.
// ============================================================================

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function isConfigComplete(config: Record<string, string | undefined>): boolean {
  return Object.values(config).every(Boolean);
}

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

function getOrCreateFirebaseApp(): FirebaseApp {
  if (app) return app;

  if (!isConfigComplete(firebaseConfig)) {
    return null as unknown as FirebaseApp;
  }

  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return app;
}

export const auth: Auth | null = (() => {
  if (authInstance) return authInstance;

  const firebaseApp = getOrCreateFirebaseApp();
  if (!firebaseApp) return null;

  authInstance = getAuth(firebaseApp);
  return authInstance;
})();

export const db: Firestore | null = (() => {
  if (dbInstance) return dbInstance;

  const firebaseApp = getOrCreateFirebaseApp();
  if (!firebaseApp) return null;

  dbInstance = getFirestore(firebaseApp);
  return dbInstance;
})();

export const storage: FirebaseStorage | null = (() => {
  if (storageInstance) return storageInstance;

  const firebaseApp = getOrCreateFirebaseApp();
  if (!firebaseApp) return null;

  storageInstance = getStorage(firebaseApp);
  return storageInstance;
})();

export default getOrCreateFirebaseApp();
