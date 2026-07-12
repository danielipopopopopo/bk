// ============================================================================
// app/api/weather/route.ts
//
// Section 1 (Weather Telemetry Pipeline), steps 4-6, run server-side.
//
// DEVIATION FROM THE LITERAL SPEC, AND WHY:
// The spec's step 4 fetches OpenWeatherMap directly from the browser with
// `...&appid=${API_KEY}` inlined in the URL. That would ship the API key in
// every client bundle/network request. This route keeps the exact same
// request shape and the exact same deterministic temp->condition mapping,
// just executed on the server, where OPENWEATHERMAP_API_KEY (no
// NEXT_PUBLIC_ prefix) is never exposed to the browser. The client calls
// GET /api/weather?lat=..&lon=.. instead of OpenWeatherMap directly.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { TelemetryProcessor } from '@/lib/telemetryProcessor';

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get('lat');
  const lon = request.nextUrl.searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'MISSING_COORDINATES' }, { status: 400 });
  }

  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'SERVER_MISCONFIGURED_MISSING_API_KEY' }, { status: 500 });
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(
    lat
  )}&lon=${encodeURIComponent(lon)}&units=metric&appid=${apiKey}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    return NextResponse.json({ error: 'WEATHER_FETCH_FAILED' }, { status: 502 });
  }

  if (!response.ok) {
    return NextResponse.json({ error: 'WEATHER_FETCH_FAILED' }, { status: 502 });
  }

  const data = await response.json();
  const tempCelsius = data?.main?.temp;

  // Zero-guessing boundary: no valid temperature reading, no condition.
  // Never default to 'OPTIMAL' just because it's the "safe middle".
  if (typeof tempCelsius !== 'number') {
    return NextResponse.json({ error: 'MALFORMED_WEATHER_PAYLOAD' }, { status: 502 });
  }

  const condition = TelemetryProcessor.mapTemperatureToCondition(tempCelsius);

  return NextResponse.json({ tempCelsius, condition });
}
