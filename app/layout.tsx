import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'MaizeMarket — UMich Student Furniture',
    template: '%s | MaizeMarket',
  },
  description:
    'Buy and sell used furniture between verified University of Michigan students. Fast, local, trusted.',
  keywords: ['umich', 'university of michigan', 'furniture', 'student marketplace', 'ann arbor'],
  openGraph: {
    title: 'MaizeMarket — UMich Student Furniture',
    description:
      'Buy and sell used furniture between verified University of Michigan students.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background">
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
