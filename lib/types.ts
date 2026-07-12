// ============================================================================
// types.ts
// Canonical TypeScript interfaces mirroring the Firestore schema exactly as
// specified. Do not add or remove fields here without updating
// firestore.rules and lib/firestoreService.ts to match.
// ============================================================================

/** Deterministic track condition bucket derived from ambient temperature. */
export type TrackCondition = 'COLD' | 'OPTIMAL' | 'HOT';

export type WeightClass = 'LIGHT' | 'MEDIUM' | 'HEAVY';

/**
 * 'AWAITING_DATA' is a legitimate, permanent-until-earned state, not a
 * loading placeholder. Nothing in this codebase is allowed to guess a driver
 * or kart into 'AGGRESSIVE_CORNERING' / 'SMOOTH_SPEED' early.
 */
export type DrivingStyle = 'AGGRESSIVE_CORNERING' | 'SMOOTH_SPEED' | 'AWAITING_DATA';

// ---------------------------------------------------------------------------
// /tracks/{trackId}
// ---------------------------------------------------------------------------
export interface WallSegment {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface TrackLayout {
  layoutId: string;
  imageUrl: string;
  wallsCoordinates: WallSegment[];
  hasSectorTech: boolean;
}

export interface Track {
  trackId: string;
  name: string;
  lengthMeters: number;
  layouts: TrackLayout[];
}

// ---------------------------------------------------------------------------
// /karts/{kartId_layoutId_weight_condition}
// ---------------------------------------------------------------------------
export interface KartDocument {
  kartId: string;
  layoutId: string;
  weightClass: WeightClass;
  trackCondition: TrackCondition;
  /** MUST be null whenever uniqueDriversCount < 6. Never estimated client-side. */
  globalAverageMs: number | null;
  uniqueDriversCount: number;
  styleProfile: DrivingStyle;
}

/** Builds the composite doc id exactly as specified: kartId_layoutId_weight_condition */
export function buildKartDocId(
  kartId: string,
  layoutId: string,
  weightClass: WeightClass,
  trackCondition: TrackCondition
): string {
  return `${kartId}_${layoutId}_${weightClass}_${trackCondition}`;
}

// ---------------------------------------------------------------------------
// /users/{userId}
// ---------------------------------------------------------------------------
export interface UserPrivateProfile {
  weightClass: WeightClass;
  deducedDrivingStyle: DrivingStyle;
}

export interface UserDocument {
  userId: string;
  privateProfile: UserPrivateProfile;
}

// ---------------------------------------------------------------------------
// /users/{userId}/sessions/{sessionId}
// ---------------------------------------------------------------------------
export interface SessionDocument {
  sessionId: string;
  trackId: string;
  layoutId: string;
  kartId: string;
  timestamp: number;
  weatherConditionAtSession: TrackCondition;
  rawLapTimesMs: number[];
  processedValidLapTimesMs: number[];
  sessionAverageMs: number;
}
