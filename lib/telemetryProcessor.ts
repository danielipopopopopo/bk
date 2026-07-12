// ============================================================================
// lib/telemetryProcessor.ts
//
// TelemetryProcessor — the entire mathematical analysis engine.
// Every method here is a pure function (or a static method with no hidden
// state) so behavior is 100% deterministic and independently testable.
//
// SUPREME DIRECTIVE: nothing in this file estimates, interpolates, or
// averages over missing data. Where a value cannot be honestly computed,
// the method throws a named error or returns null — never a guess.
// ============================================================================

import { TrackCondition } from './types';

/** Thrown when there isn't even enough raw data to attempt the pipeline. */
export class InsufficientDataError extends Error {
  constructor(message = 'STATE_INSUFFICIENT_DATA') {
    super(message);
    this.name = 'InsufficientDataError';
  }
}

export interface OutlierRejectionResult {
  processedValidLapTimesMs: number[];
  sessionAverageMs: number;
  medianTimeMs: number;
  rejectedLaps: RejectedLap[];
}

export interface RejectedLap {
  /** 1-based lap number in the ORIGINAL rawLaps array (Lap 1 is always the discarded out-lap). */
  lapNumber: number;
  timeMs: number;
  reason: 'OUT_LAP' | 'EXCEEDS_MEDIAN_THRESHOLD';
}

export interface CoachInterventionCandidate {
  /** 1-based lap number in the ORIGINAL rawLaps array, so the UI can say "Lap X" truthfully. */
  lapNumber: number;
  timeMs: number;
  medianTimeMs: number;
}

export interface DriverDeltaResult {
  driverGlobalAvgMs: number;
  deltaMs: number;
  score: number;
}

export class TelemetryProcessor {
  // --------------------------------------------------------------------
  // Step A — Outlier Rejection Algorithm
  // --------------------------------------------------------------------
  /**
   * Discards the warm-up out-lap, computes the median of the remainder,
   * and rejects any lap more than 10% slower than that median (traffic,
   * spins, off-tracks). Throws if there isn't enough raw data to even try.
   * Returns null (not an error) if fewer than 2 clean laps survive — that
   * is a legitimate "not enough clean data" outcome, not a bug.
   */
  static rejectOutliers(rawLaps: number[]): OutlierRejectionResult | null {
    if (rawLaps.length < 3) {
      throw new InsufficientDataError();
    }

    const rejectedLaps: RejectedLap[] = [
      { lapNumber: 1, timeMs: rawLaps[0], reason: 'OUT_LAP' },
    ];

    const withoutOutLap = rawLaps.slice(1);
    const sorted = [...withoutOutLap].sort((a, b) => a - b);
    const medianTimeMs = TelemetryProcessor.calculateMedian(sorted);

    const processedValidLapTimesMs: number[] = [];
    withoutOutLap.forEach((timeMs, i) => {
      if (timeMs > medianTimeMs * 1.1) {
        rejectedLaps.push({
          lapNumber: i + 2, // +1 to move from 0-index to 1-index, +1 because Lap 1 was the out-lap
          timeMs,
          reason: 'EXCEEDS_MEDIAN_THRESHOLD',
        });
      } else {
        processedValidLapTimesMs.push(timeMs);
      }
    });

    if (processedValidLapTimesMs.length < 2) {
      return null;
    }

    const sessionAverageMs =
      processedValidLapTimesMs.reduce((sum, t) => sum + t, 0) / processedValidLapTimesMs.length;

    return { processedValidLapTimesMs, sessionAverageMs, medianTimeMs, rejectedLaps };
  }

  private static calculateMedian(sorted: number[]): number {
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 !== 0) {
      return sorted[mid];
    }
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // --------------------------------------------------------------------
  // Coach intervention detection (feeds STATE_COACH_INTERVENTION)
  // --------------------------------------------------------------------
  /**
   * A lap that's meaningfully slower than median but not catastrophically
   * so (median+1500ms .. median+4000ms) reads as "driver mistake worth
   * reviewing" rather than "traffic/crash, just discard it". Indexed
   * against the original lap numbering so the UI can truthfully say
   * "Lap X", matching what the driver saw on track.
   */
  static findCoachInterventionCandidates(
    rawLaps: number[],
    medianTimeMs: number
  ): CoachInterventionCandidate[] {
    const withoutOutLap = rawLaps.slice(1);
    const candidates: CoachInterventionCandidate[] = [];
    withoutOutLap.forEach((timeMs, i) => {
      if (timeMs > medianTimeMs + 1500 && timeMs < medianTimeMs + 4000) {
        candidates.push({ lapNumber: i + 2, timeMs, medianTimeMs });
      }
    });
    return candidates;
  }

  // --------------------------------------------------------------------
  // Step B — Driver Delta & Scoring Calculation
  // --------------------------------------------------------------------
  /**
   * Returns null (not zero, not the session average itself) when the
   * driver has no prior sessions on this layout. There is nothing to
   * delta against yet, and pretending otherwise would be a guess.
   */
  static calculateDriverDeltaAndScore(
    sessionAverageMs: number,
    historicSessionAverages: number[]
  ): DriverDeltaResult | null {
    if (historicSessionAverages.length === 0) {
      return null;
    }
    const driverGlobalAvgMs =
      historicSessionAverages.reduce((sum, t) => sum + t, 0) / historicSessionAverages.length;
    const deltaMs = sessionAverageMs - driverGlobalAvgMs;
    const score = Math.max(10, Math.min(100, 70 - (deltaMs / 600) * 60));
    return { driverGlobalAvgMs, deltaMs, score };
  }

  // --------------------------------------------------------------------
  // Step C — The 6-Driver Validation Gate
  // --------------------------------------------------------------------
  /**
   * A kart/layout/weight/condition combination may only expose a public
   * globalAverageMs once at least 6 unique drivers have contributed data.
   * Below that, the true population average is not statistically
   * meaningful and must not be shown or guessed at — return null.
   */
  static computeGlobalAverage(
    allSessionAveragesForKart: number[],
    uniqueDriversCount: number
  ): number | null {
    if (uniqueDriversCount < 6 || allSessionAveragesForKart.length === 0) {
      return null;
    }
    return (
      allSessionAveragesForKart.reduce((sum, t) => sum + t, 0) / allSessionAveragesForKart.length
    );
  }

  // --------------------------------------------------------------------
  // Section 1, step 6 — deterministic weather -> TrackCondition mapping
  // --------------------------------------------------------------------
  static mapTemperatureToCondition(tempCelsius: number): TrackCondition {
    if (tempCelsius < 15) return 'COLD';
    if (tempCelsius <= 30) return 'OPTIMAL';
    return 'HOT';
  }
}
