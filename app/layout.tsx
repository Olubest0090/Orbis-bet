import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orbis Bet",
  description: "In-game sports betting for Politics & War",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
