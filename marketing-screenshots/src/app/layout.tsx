import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Kindred — App Store Screenshots",
  description: "Screenshot generator for Kindred App Store assets.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmSerif.variable}`} style={{ height: "100%" }}>
      <body style={{ minHeight: "100%", fontFamily: "var(--font-sans)", WebkitFontSmoothing: "antialiased" }}>
        {children}
      </body>
    </html>
  );
}
