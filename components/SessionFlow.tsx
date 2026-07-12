'use client';

import { useSessionFSM } from '../hooks/useSessionFSM';
import { LoadingState } from './states/LoadingState';
import { GeoLocationPrompt } from './states/GeoLocationPrompt';
import { ManualWeatherFallback } from './states/ManualWeatherFallback';
import { InsufficientData } from './states/InsufficientData';
import { CoachIntervention } from './states/CoachIntervention';
import { Beacon } from './Beacon';
import { WallSegment } from '../lib/types';

interface SessionFlowProps {
  rawLapTimesMs: number[];
  submitted: boolean;
  authReady: boolean;
  layoutImageUrl: string;
  wallsCoordinates: WallSegment[];
  /** Unique driver count for the relevant kart doc, if already loaded — used only by STATE_INSUFFICIENT_DATA's second meter. */
  globalUniqueDriversCount?: number;
}

/**
 * Renders exactly one screen for the current FSM state. This is the
 * "React/Next.js UI component tree for managing state switching" the spec
 * asks for — a thin router, with each state's real content living in its
 * own component under components/states/.
 */
export function SessionFlow({
  rawLapTimesMs,
  submitted,
  authReady,
  layoutImageUrl,
  wallsCoordinates,
  globalUniqueDriversCount,
}: SessionFlowProps) {
  const fsm = useSessionFSM({ rawLapTimesMs, submitted, authReady });

  switch (fsm.state) {
    case 'STATE_LOADING':
      return <LoadingState />;

    case 'STATE_GEO_LOCATION_PROMPT':
      return <GeoLocationPrompt status={fsm.geoWeather.status} />;

    case 'STATE_MANUAL_WEATHER_FALLBACK':
      return <ManualWeatherFallback onSelect={fsm.setManualCondition} />;

    case 'STATE_INSUFFICIENT_DATA':
      return (
        <InsufficientData
          localLapCount={Math.max(0, rawLapTimesMs.length - 1)}
          globalUniqueDriversCount={globalUniqueDriversCount}
        />
      );

    case 'STATE_COACH_INTERVENTION':
      if (!fsm.pendingCoachLap) return null; // unreachable: state implies a candidate exists
      return (
        <CoachIntervention
          candidate={fsm.pendingCoachLap}
          layoutImageUrl={layoutImageUrl}
          wallsCoordinates={wallsCoordinates}
          onConfirm={(lapNumber) => fsm.acknowledgeCoachLap(lapNumber)}
          onNoIdea={(lapNumber) => fsm.acknowledgeCoachLap(lapNumber)}
        />
      );

    case 'STATE_SESSION_ACTIVE':
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-asphalt px-6">
          <Beacon color="good" pulse label={`Condition: ${fsm.resolvedCondition}`} />
          <p className="font-body text-sm text-inkDim">Session live — log laps to continue.</p>
        </div>
      );

    case 'STATE_RESULTS':
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-asphalt px-6">
          <Beacon color="good" label="Session processed" />
          {fsm.analysis?.kind === 'OK' && (
            <p className="font-mono text-3xl text-ink">
              {Math.round(fsm.analysis.outlierResult.sessionAverageMs)} ms
              <span className="ml-2 text-sm text-inkFaint">avg (clean)</span>
            </p>
          )}
        </div>
      );

    default:
      return null;
  }
}
