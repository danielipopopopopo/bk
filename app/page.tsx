'use client';

import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { addDoc, collection, getFirestore, serverTimestamp } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SessionFlow } from '../components/SessionFlow';
import { Beacon } from '../components/Beacon';
import { useGeoWeather } from '../hooks/useGeoWeather';
import { app, auth } from '../lib/firebase';
import { TelemetryProcessor } from '../lib/telemetryProcessor';

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rawLapTimesMs, setRawLapTimesMs] = useState<number[]>([0]);
  const [submitted, setSubmitted] = useState(false);
  const [lapInput, setLapInput] = useState('');
  const [sessionSummary, setSessionSummary] = useState<string | null>(null);
  const geoWeather = useGeoWeather();

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const authReady = useMemo(() => !loading && Boolean(auth), [loading]);

  useEffect(() => {
    if (authReady && geoWeather.status === 'IDLE') {
      geoWeather.resolve();
    }
  }, [authReady, geoWeather.status, geoWeather.resolve]);

  const handleGoogleSignIn = useCallback(async () => {
    setBusy(true);
    setError(null);

    try {
      if (!auth) {
        throw new Error('Firebase authentication is not configured.');
      }

      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in with Google.');
    } finally {
      setBusy(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setBusy(true);
    setError(null);

    try {
      if (!auth) {
        throw new Error('Firebase authentication is not configured.');
      }

      await signOut(auth);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign out.');
    } finally {
      setBusy(false);
    }
  }, []);

  function addLap() {
    const value = Number(lapInput);
    if (Number.isNaN(value) || value <= 0) {
      setError('Enter a positive lap time in milliseconds.');
      return;
    }

    setRawLapTimesMs((prev) => [...prev, value]);
    setLapInput('');
    setError(null);
  }

  async function analyzeSession() {
    if (!user) {
      setError('Sign in before analyzing a session.');
      return;
    }

    if (!geoWeather.condition) {
      setError('Complete the weather step first so the session can be tagged with a deterministic track condition.');
      return;
    }

    if (rawLapTimesMs.length < 3) {
      setSubmitted(true);
      setSessionSummary(null);
      setError('At least three recorded laps are required to run the rejection pipeline.');
      return;
    }

    try {
      const result = TelemetryProcessor.rejectOutliers(rawLapTimesMs);
      if (result === null) {
        setSubmitted(true);
        setSessionSummary(null);
        setError('Not enough clean laps survived the rejection pipeline.');
        return;
      }

      // Save the session to Firestore
      try {
        const db = getFirestore(app);
        await addDoc(collection(db, 'sessions'), {
          userId: user.uid,
          createdAt: serverTimestamp(),
          trackCondition: geoWeather.condition,
          rawLaps: rawLapTimesMs,
          cleanLaps: result.processedValidLapTimesMs,
          averageMs: result.sessionAverageMs,
          medianMs: result.medianTimeMs,
          rejectedLaps: result.rejectedLaps,
          // TODO: Add trackId and kartId when that UI is built
        });
      } catch (firestoreError) {
        console.error('Failed to save session:', firestoreError);
        setError(
          firestoreError instanceof Error ? firestoreError.message : 'Could not save session to database.'
        );
        // Don't block the user from seeing the result, even if save fails
      }

      setSubmitted(true);
      setSessionSummary(
        `Condition: ${geoWeather.condition} · Clean laps: ${result.processedValidLapTimesMs.length} · Avg: ${Math.round(result.sessionAverageMs)} ms`
      );
      setError(null);
    } catch (err) {
      // This catch block handles errors from TelemetryProcessor
      setError(err instanceof Error ? err.message : 'Unable to analyze this session.');
    }
  }

  function resetSession() {
    setRawLapTimesMs([0]);
    setSubmitted(false);
    setLapInput('');
    setSessionSummary(null);
    setError(null);
  }

  return (
    <main className="min-h-screen bg-asphalt px-6 py-16 text-ink">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Beacon color="beacon" pulse label="Telemetry app" />
            <p className="font-display text-sm uppercase tracking-[0.35em] text-inkFaint">
              Karting telemetry
            </p>
          </div>
          <h1 className="font-display text-4xl font-bold text-ink sm:text-5xl">
            Deterministic lap analysis for your next session.
          </h1>
          <p className="max-w-3xl text-lg text-inkDim">
            Sign in with Google, capture lap times, and let the app route your session through the geolocation, outlier rejection, and coach-intervention states defined for this project.
          </p>
        </header>

        <section className="rounded-3xl border border-hairline bg-panel p-8 shadow-[0_30px_80px_rgba(0,0,0,0.24)]">
          {loading ? (
            <div className="flex items-center gap-3 text-inkDim">
              <Beacon color="beacon" pulse label="Loading auth" />
              <span>Checking your sign-in state…</span>
            </div>
          ) : user ? (
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-display text-2xl font-semibold text-ink">Signed in</p>
                  <p className="text-inkDim">{user.displayName ?? user.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={busy}
                  className="rounded-full border border-hairline bg-panelRaised px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-beacon hover:text-beacon disabled:opacity-60"
                >
                  {busy ? 'Working…' : 'Sign out'}
                </button>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-2xl border border-hairline bg-asphalt p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-lg font-semibold text-ink">Session builder</p>
                      <p className="mt-1 text-sm text-inkDim">Enter lap times in milliseconds and submit for analysis.</p>
                    </div>
                    <Beacon color="good" label="Ready" />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <input
                      value={lapInput}
                      onChange={(event) => setLapInput(event.target.value)}
                      placeholder="e.g. 54200"
                      className="min-w-[180px] rounded-full border border-hairline bg-panel px-4 py-2.5 text-sm text-ink placeholder:text-inkFaint"
                    />
                    <button
                      onClick={addLap}
                      className="rounded-full bg-beacon px-4 py-2.5 text-sm font-semibold text-asphalt"
                    >
                      Add lap
                    </button>
                    <button
                      onClick={analyzeSession}
                      className="rounded-full border border-hairline px-4 py-2.5 text-sm font-semibold text-ink"
                    >
                      Analyze session
                    </button>
                    <button
                      onClick={resetSession}
                      className="rounded-full border border-hairline px-4 py-2.5 text-sm font-semibold text-ink"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="mt-4 rounded-2xl border border-hairline bg-panelRaised p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-inkFaint">Current laps</p>
                    <p className="mt-2 font-mono text-sm text-ink">
                      {rawLapTimesMs.join(', ')}
                    </p>
                    {sessionSummary ? (
                      <p className="mt-3 text-sm text-inkDim">{sessionSummary}</p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-hairline bg-asphalt p-5">
                  <p className="font-display text-lg font-semibold text-ink">App workflow</p>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-inkDim">
                    <li>Geolocation resolves track condition automatically.</li>
                    <li>If location fails, you choose COLD / OPTIMAL / HOT manually.</li>
                    <li>Outlier rejection and coach intervention states appear when relevant.</li>
                  </ul>
                </div>
              </div>

              <div className="rounded-2xl border border-hairline bg-panelRaised p-4">
                <SessionFlow
                  rawLapTimesMs={rawLapTimesMs}
                  submitted={submitted}
                  authReady={authReady}
                  layoutImageUrl="https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80"
                  wallsCoordinates={[]}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-hairline bg-asphalt p-5">
                <p className="font-display text-lg font-semibold text-ink">Use your Google account</p>
                <p className="mt-2 text-sm text-inkDim">
                  Sign in once and your sessions will be connected to a persistent account.
                </p>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={busy || !auth}
                className="inline-flex w-fit items-center justify-center rounded-full bg-beacon px-6 py-3 font-semibold text-asphalt transition hover:brightness-110 disabled:opacity-60"
              >
                {busy ? 'Connecting…' : auth ? 'Continue with Google' : 'Firebase not configured'}
              </button>
            </div>
          )}

          {error ? <p className="mt-4 text-sm text-[#ff8a3d]">{error}</p> : null}
        </section>
      </div>
    </main>
  );
}
