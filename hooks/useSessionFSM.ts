// ============================================================================
// hooks/useSessionFSM.ts
//
// The finite state machine described in Section 4, wired to real data.
//
// The spec names 5 states, which cover the "something needs the user's
// attention" branches but not the ordinary happy path. Two states are added
// so the machine is actually complete enough to drive a UI:
//   - STATE_SESSION_ACTIVE : condition resolved, driver is out on track
//                            logging laps, nothing exceptional yet.
//   - STATE_RESULTS        : laps processed cleanly, no pending coach
//                            review — show the session summary.
// Both are additive; none of the 5 spec'd states were renamed or altered.
// ============================================================================

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useGeoWeather } from './useGeoWeather';
import {
  CoachInterventionCandidate,
  InsufficientDataError,
  OutlierRejectionResult,
  TelemetryProcessor,
} from '../lib/telemetryProcessor';
import { TrackCondition } from '../lib/types';

export type FSMState =
  | 'STATE_LOADING'
  | 'STATE_GEO_LOCATION_PROMPT'
  | 'STATE_MANUAL_WEATHER_FALLBACK'
  | 'STATE_SESSION_ACTIVE'
  | 'STATE_INSUFFICIENT_DATA'
  | 'STATE_COACH_INTERVENTION'
  | 'STATE_RESULTS';

type Analysis =
  | { kind: 'INSUFFICIENT' }
  | { kind: 'OK'; outlierResult: OutlierRejectionResult; coachCandidates: CoachInterventionCandidate[] };

interface UseSessionFSMArgs {
  /** Raw lap times for the in-progress session, including the out-lap at index 0. */
  rawLapTimesMs: number[];
  /** Flip to true once the driver ends the session and asks for analysis. */
  submitted: boolean;
  /** True once your auth context has resolved a signed-in user. */
  authReady: boolean;
}

export function useSessionFSM({ rawLapTimesMs, submitted, authReady }: UseSessionFSMArgs) {
  const geoWeather = useGeoWeather();
  const [manualCondition, setManualCondition] = useState<TrackCondition | null>(null);
  const [acknowledgedLaps, setAcknowledgedLaps] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (authReady && geoWeather.status === 'IDLE') {
      geoWeather.resolve();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, geoWeather.status]);

  const resolvedCondition: TrackCondition | null = manualCondition ?? geoWeather.condition;

  const analysis: Analysis | null = useMemo(() => {
    if (!submitted) return null;
    try {
      const outlierResult = TelemetryProcessor.rejectOutliers(rawLapTimesMs);
      if (outlierResult === null) {
        return { kind: 'INSUFFICIENT' };
      }
      const coachCandidates = TelemetryProcessor.findCoachInterventionCandidates(
        rawLapTimesMs,
        outlierResult.medianTimeMs
      );
      return { kind: 'OK', outlierResult, coachCandidates };
    } catch (err) {
      if (err instanceof InsufficientDataError) {
        return { kind: 'INSUFFICIENT' };
      }
      throw err;
    }
  }, [submitted, rawLapTimesMs]);

  const pendingCoachLap: CoachInterventionCandidate | undefined =
    analysis?.kind === 'OK'
      ? analysis.coachCandidates.find((c) => !acknowledgedLaps.has(c.lapNumber))
      : undefined;

  const state: FSMState = useMemo(() => {
    if (!authReady) return 'STATE_LOADING';
    if (geoWeather.status === 'LOCATING' || geoWeather.status === 'FETCHING_WEATHER') {
      return 'STATE_GEO_LOCATION_PROMPT';
    }
    if (geoWeather.status === 'FAILED' && manualCondition === null) {
      return 'STATE_MANUAL_WEATHER_FALLBACK';
    }
    if (resolvedCondition === null) {
      return 'STATE_GEO_LOCATION_PROMPT';
    }
    if (!submitted) {
      return 'STATE_SESSION_ACTIVE';
    }
    if (analysis?.kind === 'INSUFFICIENT') {
      return 'STATE_INSUFFICIENT_DATA';
    }
    if (pendingCoachLap) {
      return 'STATE_COACH_INTERVENTION';
    }
    if (analysis?.kind === 'OK') {
      return 'STATE_RESULTS';
    }
    return 'STATE_SESSION_ACTIVE';
  }, [authReady, geoWeather.status, manualCondition, resolvedCondition, submitted, analysis, pendingCoachLap]);

  return {
    state,
    resolvedCondition,
    geoWeather,
    setManualCondition,
    analysis,
    pendingCoachLap,
    acknowledgeCoachLap: (lapNumber: number) =>
      setAcknowledgedLaps((prev) => new Set(prev).add(lapNumber)),
  };
}
