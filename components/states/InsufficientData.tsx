'use client';

import { Beacon } from '../Beacon';

interface InsufficientDataProps {
  /** Raw lap count this driver has logged locally this session. Gate is 3. */
  localLapCount?: number;
  /** Unique driver count backing this kart/layout/weight/condition doc. Gate is 6. */
  globalUniqueDriversCount?: number;
}

const LOCAL_GATE = 3;
const GLOBAL_GATE = 6;

function Meter({
  current,
  required,
  label,
  unit,
}: {
  current: number;
  required: number;
  label: string;
  unit: string;
}) {
  const pct = Math.min(100, Math.round((current / required) * 100));
  const met = current >= required;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-inkDim">{label}</span>
        <span className="font-mono text-sm text-ink">
          {current}
          <span className="text-inkFaint"> / {required} {unit}</span>
        </span>
      </div>
      <div className="h-1.5 w-full bg-hairline">
        <div
          className={`h-full transition-all duration-500 ${met ? 'bg-good' : 'bg-beacon'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * STATE_INSUFFICIENT_DATA — active when the local driver has fewer than 3
 * valid laps, or the global kart document has fewer than 6 unique drivers.
 * Both meters render whenever their respective count is provided; nothing
 * here fabricates a score or average to fill the gap.
 */
export function InsufficientData({ localLapCount, globalUniqueDriversCount }: InsufficientDataProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 bg-asphalt px-6">
      <Beacon color="beacon" pulse label="Gathering data" />

      <div className="max-w-sm space-y-1 text-center">
        <h1 className="font-display text-xl font-bold text-ink">Not enough data yet</h1>
        <p className="font-body text-sm text-inkDim">
          Scoring and rankings are withheld until these thresholds are met — nothing is
          estimated in the meantime.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-5 border border-hairline bg-panel p-5">
        {typeof localLapCount === 'number' && (
          <Meter current={localLapCount} required={LOCAL_GATE} label="Valid laps this session" unit="laps" />
        )}
        {typeof globalUniqueDriversCount === 'number' && (
          <Meter
            current={globalUniqueDriversCount}
            required={GLOBAL_GATE}
            label="Unique drivers on this kart"
            unit="drivers"
          />
        )}
      </div>
    </div>
  );
}
