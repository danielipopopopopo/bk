'use client';

interface BeaconProps {
  color?: 'beacon' | 'good' | 'bad' | 'coach';
  pulse?: boolean;
  label: string;
}

const COLOR_MAP: Record<NonNullable<BeaconProps['color']>, string> = {
  beacon: 'bg-beacon',
  good: 'bg-good',
  bad: 'bg-bad',
  coach: 'bg-coach',
};

/** The signature element: a single pit-wall status light + mono label, reused
 * at every FSM state so the driver always has one consistent "what's the rig
 * doing right now" signal, the way a real timing tower has one status lamp. */
export function Beacon({ color = 'beacon', pulse = false, label }: BeaconProps) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${COLOR_MAP[color]} ${pulse ? 'animate-beacon' : ''}`}
        aria-hidden="true"
      />
      <span className="font-mono text-xs uppercase tracking-[0.14em] text-inkDim">{label}</span>
    </div>
  );
}
