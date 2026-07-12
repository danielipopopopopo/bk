'use client';

import { Beacon } from '../Beacon';
import { TrackCondition } from '../../lib/types';

interface ManualWeatherFallbackProps {
  onSelect: (condition: TrackCondition) => void;
}

const OPTIONS: { condition: TrackCondition; label: string; range: string }[] = [
  { condition: 'COLD', label: 'Cold', range: 'Below 15°C' },
  { condition: 'OPTIMAL', label: 'Optimal', range: '15–30°C' },
  { condition: 'HOT', label: 'Hot', range: 'Above 30°C' },
];

/** STATE_MANUAL_WEATHER_FALLBACK — rendered only when location/weather
 * failed. No guess is made on the driver's behalf; three explicit buttons,
 * no default selected. */
export function ManualWeatherFallback({ onSelect }: ManualWeatherFallbackProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 bg-asphalt px-6">
      <Beacon color="bad" label="Auto-detect unavailable" />

      <div className="max-w-sm space-y-2 text-center">
        <h1 className="font-display text-xl font-bold text-ink">Set track condition manually</h1>
        <p className="font-body text-sm text-inkDim">
          We couldn&rsquo;t read your location or the weather service didn&rsquo;t respond. Pick
          the condition that matches trackside right now — this session won&rsquo;t start until
          one is chosen.
        </p>
      </div>

      <div className="grid w-full max-w-sm grid-cols-1 gap-2.5 sm:grid-cols-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.condition}
            onClick={() => onSelect(opt.condition)}
            className="group flex flex-col items-center gap-1.5 border border-hairline bg-panel px-4 py-5 transition-colors hover:border-beacon hover:bg-panelRaised focus-visible:border-beacon"
          >
            <span className="font-display text-base font-bold text-ink group-hover:text-beacon">
              {opt.label}
            </span>
            <span className="font-mono text-[11px] text-inkFaint">{opt.range}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
