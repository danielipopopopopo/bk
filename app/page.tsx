'use client';

import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Beacon } from '../components/Beacon';
import { auth } from '../lib/firebase';

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function handleGoogleSignIn() {
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
  }

  async function handleSignOut() {
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
  }

  return (
    <main className="min-h-screen bg-asphalt px-6 py-16 text-ink">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Beacon color="beacon" pulse label="Firebase connected" />
            <p className="font-display text-sm uppercase tracking-[0.35em] text-inkFaint">
              Karting telemetry
            </p>
          </div>
          <h1 className="font-display text-4xl font-bold text-ink sm:text-5xl">
            Sign in to start tracking your sessions.
          </h1>
          <p className="max-w-2xl text-lg text-inkDim">
            Google authentication is now wired to your Firebase project, so your telemetry activity can be tied to a real account.
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
                  <p className="font-display text-2xl font-semibold text-ink">Welcome back</p>
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

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-hairline bg-asphalt p-5">
                  <p className="font-display text-lg font-semibold text-ink">Telemetry dashboard</p>
                  <p className="mt-2 text-sm text-inkDim">
                    Your signed-in session is ready. You can now start capturing and reviewing lap data from the main app experience.
                  </p>
                </div>

                <div className="rounded-2xl border border-hairline bg-asphalt p-5">
                  <p className="font-display text-lg font-semibold text-ink">Session status</p>
                  <div className="mt-3 flex items-center gap-2">
                    <Beacon color="good" label="Active" />
                    <span className="text-sm text-inkDim">Ready for your next run</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-hairline bg-panelRaised p-5">
                <p className="font-display text-lg font-semibold text-ink">Next steps</p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-inkDim">
                  <li>Connect your telemetry input and start capturing laps.</li>
                  <li>Save your session history to your authenticated account.</li>
                  <li>Use the dashboard to review performance trends over time.</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-hairline bg-asphalt p-5">
                <p className="font-display text-lg font-semibold text-ink">Use your Google account</p>
                <p className="mt-2 text-sm text-inkDim">
                  Sign in once and your sessions can be tied to a persistent user profile.
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

          {error ? (
            <p className="mt-4 text-sm text-[#ff8a3d]">{error}</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
