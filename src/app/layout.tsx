import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AUFTRAGSTAKTIK — Tactical OSINT Terminal',
  description: 'Open-source intelligence command terminal for tracking global conflict movements',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-tactical-dark antialiased">{children}</body>
    </html>
  );
}
