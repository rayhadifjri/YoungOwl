import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Ambient } from '@/components/ambient';
import './globals.css';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Young Owl',
  description: 'Cybersecurity learning platform and penetration-testing lab',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans">
        <Ambient />
        {children}
      </body>
    </html>
  );
}
