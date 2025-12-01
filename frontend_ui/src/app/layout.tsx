import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chord Probability Explorer',
  description: 'Explore chord progression probabilities using N-gram models',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

