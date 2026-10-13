import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Mak Ai — AI Vocal Coach",
  description: "Turn any song into a vocal coaching session. Romanize, translate, and practice with clarity.",
  openGraph: {
    title:       "Mak Ai — AI Vocal Coach",
    description: "Mak Ai — turn any song into a vocal coach. Romanize · Emotion · Difficulty.",
    type:        "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {/* GSAP + ScrambleTextPlugin via CDN */}
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrambleTextPlugin.min.js"
          strategy="beforeInteractive"
        />
        <div className="min-h-screen gradient-glow">{children}</div>
      </body>
    </html>
  );
}
