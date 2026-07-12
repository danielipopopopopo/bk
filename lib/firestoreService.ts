// ============================================================================
// lib/firestoreService.ts
//
// All client-permitted Firestore reads/writes. Anything the security rules
// deny to the client (writes to /tracks or /karts, i.e. the aggregate
// fields) is deliberately NOT implemented here — see firestore.rules and
// the README for why that recomputation belongs in a trusted server
// context instead of being faked client-side.
// ============================================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { KartDocument, SessionDocument, Track, UserDocument } from './types';

// ---------------------------------------------------------------------------
// /tracks
// ---------------------------------------------------------------------------
export async function getTrack(trackId: string): Promise<Track | null> {
  if (!db) return null;

  const snap = await getDoc(doc(db, 'tracks', trackId));
  return snap.exists() ? (snap.data() as Track) : null;
}

// ---------------------------------------------------------------------------
// /karts/{kartDocId} — read-only from the client
// ---------------------------------------------------------------------------
export async function getKartDocument(kartDocId: string): Promise<KartDocument | null> {
  if (!db) return null;

  const snap = await getDoc(doc(db, 'karts', kartDocId));
  return snap.exists() ? (snap.data() as KartDocument) : null;
}

// ---------------------------------------------------------------------------
// /users/{userId}
// ---------------------------------------------------------------------------
export async function getUserDocument(userId: string): Promise<UserDocument | null> {
  if (!db) return null;

  const snap = await getDoc(doc(db, 'users', userId));
  return snap.exists() ? (snap.data() as UserDocument) : null;
}

export async function upsertUserDocument(user: UserDocument): Promise<void> {
  if (!db) return;

  await setDoc(doc(db, 'users', user.userId), user, { merge: true });
}

// ---------------------------------------------------------------------------
// /users/{userId}/sessions/{sessionId}
// ---------------------------------------------------------------------------
export async function writeSession(userId: string, session: SessionDocument): Promise<void> {
  if (!db) return;

  await setDoc(doc(db, 'users', userId, 'sessions', session.sessionId), session);
}

/**
 * Every past sessionAverageMs this driver has recorded on this exact
 * layout — the raw input to Step B's driverGlobalAvgMs / delta / score.
 * Returns an empty array (never a fabricated baseline) if there's no
 * history yet; TelemetryProcessor.calculateDriverDeltaAndScore treats
 * that as "nothing to delta against" and returns null rather than guess.
 */
export async function getUserSessionAveragesForLayout(
  userId: string,
  layoutId: string
): Promise<number[]> {
  if (!db) return [];

  const sessionsRef = collection(db, 'users', userId, 'sessions');
  const q = query(sessionsRef, where('layoutId', '==', layoutId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => (d.data() as SessionDocument).sessionAverageMs);
}
