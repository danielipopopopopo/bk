'use client';

import { useState } from 'react';
import { Beacon } from '../Beacon';
import { WallSegment } from '../../lib/types';
import { CoachInterventionCandidate } from '../../lib/telemetryProcessor';

interface CoachInterventionProps {
  candidate: CoachInterventionCandidate;
  layoutImageUrl: string;
  wallsCoordinates: WallSegment[];
  /** Normalized coordinate space the wall segments were authored in (see README). */
  viewBoxSize?: number;
  onConfirm: (lapNumber: number, corner: { x: number; y: number }) => void;
  /** Explicit "I don't know" — a real answer, distinct from silently skipping. */
  onNoIdea: (lapNumber: number) => void;
}

/**
 * STATE_COACH_INTERVENTION — a lap landed in the "meaningful mistake" band
 * (median+1500ms .. median+4000ms). This is the app's signature moment: it
 * freezes as a full-screen overlay over the track layout and asks the
 * driver to pinpoint the corner, rather than silently discarding the lap
 * or guessing which corner it was.
 */
export function CoachIntervention({
  candidate,
  layoutImageUrl,
  wallsCoordinates,
  viewBoxSize = 1000,
  onConfirm,
  onNoIdea,
}: CoachInterventionProps) {
  const [pin, setPin] = useState<{ x: number; y: number } | null>(null);
  const deltaMs = candidate.timeMs - candidate.medianTimeMs;

  const handleCanvasClick: React.MouseEventHandler<SVGSVGElement> = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * viewBoxSize;
    const y = ((e.clientY - rect.top) / rect.height) * viewBoxSize;
    setPin({ x, y });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-asphalt/98 backdrop-blur-sm">
      <header className="flex items-center justify-between border-b border-hairline px-6 py-4">
        <Beacon color="coach" pulse label="Coach intervention" />
        <span className="font-mono text-xs text-inkFaint">Session paused</span>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-8">
        <div className="max-w-lg space-y-1.5 text-center">
          <h1 className="font-display text-2xl font-bold text-ink">
            Anomaly detected on Lap {candidate.lapNumber}
          </h1>
          <p className="font-body text-sm text-inkDim">
            Pinpoint the corner where the mistake happened. Tap the layout below.
          </p>
          <p className="font-mono text-xs text-coach">
            +{Math.round(deltaMs)} ms vs. session median ({Math.round(candidate.medianTimeMs)} ms)
          </p>
        </div>

        <div className="relative aspect-square w-full max-w-md border border-hairline bg-panel">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={layoutImageUrl}
            alt="Track layout"
            className="absolute inset-0 h-full w-full object-contain opacity-70"
          />
          <svg
            viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
            className="absolute inset-0 h-full w-full cursor-crosshair"
            onClick={handleCanvasClick}
            role="button"
            aria-label="Tap the corner where the mistake happened"
          >
            {wallsCoordinates.map((wall, i) => (
              <line
                key={i}
                x1={wall.startX}
                y1={wall.startY}
                x2={wall.endX}
                y2={wall.endY}
                stroke="#565C61"
                strokeWidth={4}
                strokeLinecap="round"
              />
            ))}
            {pin && (
              <g>
                <circle cx={pin.x} cy={pin.y} r={22} fill="none" stroke="#FF8A3D" strokeWidth={2} className="animate-beacon" />
                <circle cx={pin.x} cy={pin.y} r={7} fill="#FF8A3D" />
              </g>
            )}
          </svg>
        </div>

        <div className="flex w-full max-w-md flex-col gap-2.5 sm:flex-row">
          <button
            onClick={() => onNoIdea(candidate.lapNumber)}
            className="flex-1 border border-hairline px-4 py-3 font-mono text-xs uppercase tracking-[0.1em] text-inkDim transition-colors hover:border-inkDim hover:text-ink"
          >
            Not sure
          </button>
          <button
            onClick={() => pin && onConfirm(candidate.lapNumber, pin)}
            disabled={!pin}
            className="flex-[2] bg-coach px-4 py-3 font-mono text-xs uppercase tracking-[0.1em] text-asphalt transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
          >
            Confirm corner
          </button>
        </div>
      </div>
    </div>
  );
}
