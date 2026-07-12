'use client';

import { Beacon } from '../Beacon';
import { GeoWeatherStatus } from '../../hooks/useGeoWeather';

interface GeoLocationPromptProps {
  status: GeoWeatherStatus;
}

const COPY: Record<string, string> = {
  LOCATING: 'Waiting on location permission',
  FETCHING_WEATHER: 'Reading track-side conditions',
};

/** STATE_GEO_LOCATION_PROMPT — actively waiting on the browser permission
 * dialog, then on the weather lookup it feeds. */
export function GeoLocationPrompt({ status }: GeoLocationPromptProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 bg-asphalt px-6 text-center">
      <Beacon color="beacon" pulse label={status === 'LOCATING' ? 'Locating' : 'Fetching weather'} />

      <div className="max-w-sm space-y-2">
        <h1 className="font-display text-xl font-bold text-ink">
          {COPY[status] ?? 'Resolving track condition'}
        </h1>
        <p className="font-body text-sm text-inkDim">
          Allow location access in your browser to auto-detect ambient temperature and lock in a
          deterministic track condition. Nothing is timed until this resolves.
        </p>
      </div>

      <div className="h-px w-40 overflow-hidden bg-hairline">
        <div className="h-full w-1/3 animate-beacon bg-beacon" />
      </div>
    </div>
  );
}
