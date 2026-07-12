import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Karting Telemetry',
  description: 'Sign in with Google and manage your telemetry sessions.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
