import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { IntroSplash } from "@/common/ui/IntroSplash";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FinThropic",
  description: "Answers from the club's own documents, with citations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: intro-gate.js sets data-intro on <html> before React hydrates.
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Must run before the first paint (see the file); 0.5 KB, same origin, cached. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/brand/intro-gate.js" />
      </head>
      <body className="min-h-full flex flex-col">
        <IntroSplash src="/brand/finthropic-logo-reveal.mp4" />
        {children}
      </body>
    </html>
  );
}
