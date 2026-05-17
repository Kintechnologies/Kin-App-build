import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Inter, Playfair_Display } from "next/font/google";
import ThemeProvider from "@/components/ThemeProvider";
import "./globals.css";

// Inter — body text. Light/regular/medium per the ALD design system.
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-geist-sans",
  display: "swap",
});

// Playfair Display — serif headlines, the "modern classic" voice.
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Kin — The AI that runs your household",
  description:
    "Kin is your family's AI assistant. It learns your family's patterns, coordinates everyone's schedules, and keeps you in sync — starting with a morning text.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} ${playfair.variable} font-sans antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
