import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ludora | Modern Multiplayer Ludo & Board Games',
  description: 'Play modern multiplayer Ludo (2 to 10 players) and Snakes & Ladders online with friends, vs AI, or in local pass-and-play.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
