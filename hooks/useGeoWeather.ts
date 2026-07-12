// ============================================================================
// hooks/useGeoWeather.ts
// Section 1, steps 1-6: browser geolocation -> /api/weather -> TrackCondition.
// No manual input, no guessing — on any failure the caller is expected to
// route to STATE_MANUAL_WEATHER_FALLBACK rather than assume a condition.
// ============================================================================

'use client';

import { useCallback, useState } from 'react';
import { TrackCondition } from '../lib/types';

export type GeoWeatherStatus = 'IDLE' | 'LOCATING' | 'FETCHING_WEATHER' | 'RESOLVED' | 'FAILED';

export interface GeoWeatherState {
  status: GeoWeatherStatus;
  condition: TrackCondition | null;
  tempCelsius: number | null;
  error: string | null;
}

const INITIAL_STATE: GeoWeatherState = {
  status: 'IDLE',
  condition: null,
  tempCelsius: null,
  error: null,
};

export function useGeoWeather() {
  const [state, setState] = useState<GeoWeatherState>(INITIAL_STATE);

  const resolve = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'FAILED', condition: null, tempCelsius: null, error: 'GEOLOCATION_UNSUPPORTED' });
      return;
    }

    setState((s) => ({ ...s, status: 'LOCATING', error: null }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setState((s) => ({ ...s, status: 'FETCHING_WEATHER' }));

        try {
          const res = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}`);
          if (!res.ok) {
            throw new Error('WEATHER_FETCH_FAILED');
          }
          const data: { tempCelsius: number; condition: TrackCondition } = await res.json();
          setState({
            status: 'RESOLVED',
            condition: data.condition,
            tempCelsius: data.tempCelsius,
            error: null,
          });
        } catch {
          setState({ status: 'FAILED', condition: null, tempCelsius: null, error: 'WEATHER_FETCH_FAILED' });
        }
      },
      () => {
        setState({ status: 'FAILED', condition: null, tempCelsius: null, error: 'GEOLOCATION_PERMISSION_DENIED' });
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return { ...state, resolve, reset };
}
