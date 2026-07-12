import type { Config } from 'tailwindcss';

// Design tokens for the "pit wall" visual identity — see README.md for the
// rationale. Real timing-tower software (MoTeC, AiM) is dark by convention
// for trackside legibility in direct sun, tabular-numeral led, and built
// from hairlines rather than shadows/gradients — that's the reference
// point here, not a generic dark-mode default.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './hooks/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        asphalt: '#0B0D0F', // page background
        panel: '#15181B', // card/panel surface
        panelRaised: '#1C2023',
        hairline: '#262B2E', // dividers, borders
        beacon: '#F5A623', // amber — active/live/attention
        good: '#35C48C', // faster than baseline
        bad: '#FF5C5C', // slower than baseline / errors
        coach: '#FF8A3D', // coach-intervention accent
        ink: '#E8EAED', // primary text
        inkDim: '#8A9199', // secondary text
        inkFaint: '#565C61', // tertiary / disabled text
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        none: '0px',
        sm: '2px',
        DEFAULT: '3px',
      },
      keyframes: {
        pulseBeacon: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        beacon: 'pulseBeacon 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
