import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kin — Stop keeping your family schedule in your head",
  description:
    "Kin watches your family's schedule and tells you what matters — before you have to figure it out yourself.",
  openGraph: {
    title: "Kin — Stop keeping your family schedule in your head",
    description:
      "Kin watches your family's schedule and tells you what matters — before you have to figure it out yourself.",
    url: "https://kinai.family",
    siteName: "Kin",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kin — Stop keeping your family schedule in your head",
    description:
      "Kin watches your family's schedule and tells you what matters — before you have to figure it out yourself.",
  },
  metadataBase: new URL("https://kinai.family"),
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
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body
        style={{
          fontFamily: `var(${GeistSans.variable}), system-ui, sans-serif`,
        }}
      >
        {children}
      </body>
    </html>
  );
}
