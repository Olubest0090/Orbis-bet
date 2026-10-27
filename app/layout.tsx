import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  metadataBase: new URL("https://orbis-bet.vercel.app"),
  title: "Orbis Bet",
  description: "Football betting with in-game cash for Politics & War players. 18+ · Bet responsibly.",
  openGraph: {
    title: "Orbis Bet",
    description: "Real football odds, singles and accumulators, played with in-game cash. 18+ · Bet responsibly.",
    siteName: "Orbis Bet",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Orbis Bet",
    description: "Real football odds, singles and accumulators, played with in-game cash. 18+ · Bet responsibly.",
  },
};

export const viewport: Viewport = {
  themeColor: "#060914",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
