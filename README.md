# Karting Telemetry & Performance Analytics

Deterministic lap-time analytics for karting: outlier rejection, driver
scoring, a public 6-driver leaderboard gate, and a coach-intervention flow
that asks the driver to pinpoint mistakes on the track layout.

## File map (matches the requested delivery sequence)

| # | Spec item | File |
|---|---|---|
| 1 | `.env.local` template | `.env.local.example` |
| 2 | Firebase infra config | `lib/firebase.ts` |
| 3 | Firestore security rules | `firestore.rules` |
| 4 | `TelemetryProcessor` engine | `lib/telemetryProcessor.ts` |
| 5 | UI state-switching component tree | `components/SessionFlow.tsx` + `components/states/*` |

Supporting files the spec also assigned to "AI responsibility":

- `lib/types.ts` — every TypeScript interface, 1:1 with the Firestore schema.
- `lib/firestoreService.ts` — all client-permitted CRUD.
- `app/api/weather/route.ts`, `hooks/useGeoWeather.ts` — the geolocation →
  weather → `TrackCondition` pipeline (Section 1).
- `hooks/useSessionFSM.ts` — the finite state machine (Section 4).
- `tailwind.config.ts`, `app/globals.css` — the pit-wall visual identity.

## Setup

```bash
npm install next react react-dom firebase tailwindcss
cp .env.local.example .env.local   # fill in every value
npm run dev
```

`lib/firebase.ts` throws immediately on startup if any Firebase env var is
missing — there is no silent partial-init fallback.

## Deliberate deviations from the literal spec, and why

**1. The weather API key moved server-side.**
The spec's Section 1 step 4 fetches OpenWeatherMap directly from the browser
with the key inlined in the URL (`...&appid=${API_KEY}`). That ships the key
in every client request. `app/api/weather/route.ts` makes the exact same
request and applies the exact same deterministic temp→condition mapping
(`TelemetryProcessor.mapTemperatureToCondition`), just server-side, so
`OPENWEATHERMAP_API_KEY` (no `NEXT_PUBLIC_` prefix) never reaches the
browser. `useGeoWeather.ts` calls `/api/weather?lat=..&lon=..` instead of
OpenWeatherMap directly. Nothing about the mapping logic itself changed.

**2. `firestore.rules` denies client writes to `/karts` (and `/tracks`).**
`globalAverageMs`, `uniqueDriversCount`, and `styleProfile` are aggregates
across *all* users. A single client can never honestly know the true
`uniqueDriversCount` — it can only see its own session — so `lib/firestoreService.ts`
deliberately does not implement a client-side "recompute the kart aggregate"
function; doing so would mean guessing at a number one client can't actually
verify, which is exactly what the spec's anti-guessing directive rules out.
That recomputation belongs in a trusted server context (a Cloud Function
triggered on session writes, running with the Admin SDK) that this deliverable
doesn't include, since it wasn't asked for and lives outside this app's
client codebase. The rules file blocks the insecure shortcut so it can't be
added by accident later.

**3. The FSM gained two states beyond the five named in Section 4.**
`STATE_LOADING`, `STATE_GEO_LOCATION_PROMPT`, `STATE_MANUAL_WEATHER_FALLBACK`,
`STATE_INSUFFICIENT_DATA`, and `STATE_COACH_INTERVENTION` are exactly as
specified. They only cover "something needs attention" branches, so
`hooks/useSessionFSM.ts` adds:
- `STATE_SESSION_ACTIVE` — condition resolved, driver is logging laps normally.
- `STATE_RESULTS` — laps processed cleanly, no pending coach review.

Neither renames nor alters any of the original five.

**4. Coach-intervention track canvas assumes a normalized coordinate space.**
`wallsCoordinates` in the schema doesn't specify a unit system. `CoachIntervention.tsx`
assumes wall coordinates are authored in a normalized square (default
`viewBoxSize={1000}`) and exposes that as a prop so it can be matched to
however your layout images are actually digitized — this is a rendering
assumption, not a data-processing one, so it doesn't touch the math engine.

## What's explicitly your responsibility (per the spec's own division)

- Wiring your Login/Registration UI to the `auth` instance exported from
  `lib/firebase.ts`, and passing a real `authReady` boolean into `SessionFlow`.
- The Cloud Function (or equivalent trusted server job) that recomputes
  `/karts/{kartDocId}` aggregates from all users' sessions — see deviation #2.
- Populating `/tracks` documents with real layout images and wall coordinates.

## Math engine summary (`lib/telemetryProcessor.ts`)

- `rejectOutliers` — drops the out-lap, computes the median of the rest,
  rejects anything `> median * 1.10`, throws `InsufficientDataError` under 3
  raw laps, returns `null` (not an error) if fewer than 2 laps survive.
- `findCoachInterventionCandidates` — laps in `(median+1500, median+4000)` ms,
  indexed against original lap numbers so "Lap X" in the UI is truthful.
- `calculateDriverDeltaAndScore` — returns `null` when the driver has no
  history on this layout yet, otherwise the exact delta/score formula from
  the spec, clamped to `[10, 100]`.
- `computeGlobalAverage` — the 6-driver gate; `null` below threshold.
- `mapTemperatureToCondition` — the exact `COLD` / `OPTIMAL` / `HOT` cutoffs.
