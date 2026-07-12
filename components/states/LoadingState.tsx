'use client';

import { Beacon } from '../Beacon';

/** STATE_LOADING — checking auth context / initializing geolocation. */
export function LoadingState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 bg-asphalt px-6">
      <Beacon color="beacon" pulse label="Initializing rig" />
      <div className="flex gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1 w-6 bg-hairline"
            style={{ animation: `pulseBeacon 1.2s ease-in-out ${i * 0.15}s infinite` }}
          />
        ))}
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-inkFaint">
        Authenticating session
      </p>
    </div>
  );
}
