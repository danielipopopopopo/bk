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

/**
 * Zero-guessing boundary applied to infrastructure, not just telemetry math:
 * fail loudly and immediately if any required config value is missing,
 * instead of silently initializing a half-configured Firebase app.
 */
function assertConfigComplete(config: Record<string, string | undefined>): void {
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `[firebase.ts] Missing required environment variables: ${missing.join(', ')}. ` +
        `Copy .env.local.example to .env.local and fill in every value before starting the app.`
    );
  }
}

assertConfigComplete(firebaseConfig);

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);
export const storage: FirebaseStorage = getStorage(app);

export default app;
