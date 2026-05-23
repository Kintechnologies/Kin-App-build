import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

// P1-L1 (audit v7): Organization JSON-LD. AI-first products live or die in
// Perplexity / ChatGPT search / Google AI Overviews knowledge cards; the
// org entity + sameAs links are how those systems resolve "Kin" to us
// specifically rather than the dozens of other products of the same name.
const ORG_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Kin",
  url: "https://kinai.family",
  logo: "https://kinai.family/icon.png",
  description:
    "Kin is your family's AI assistant — a daily 6am SMS briefing that learns your family's patterns and keeps both parents in sync on the day's schedule.",
};

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
  metadataBase: new URL("https://kinai.family"),
  title: {
    // P2-L1 (audit v7): when a child page sets its own `title` the layout
    // wraps it as "<page> — Kin"; otherwise the default below renders.
    // Without this template every subpage would either silently inherit
    // the layout title OR override it with no brand suffix.
    default: "Kin — The AI that runs your household",
    template: "%s — Kin",
  },
  description:
    "Kin is your family's AI assistant. It learns your family's patterns, coordinates everyone's schedules, and keeps you in sync — starting with a morning text.",
  alternates: {
    // P2-L2 (audit v7): landing/privacy/terms each set their own
    // alternates.canonical; this root canonical covers anything that
    // doesn't override.
    canonical: "/",
  },
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
        {/* P1-L1 (audit v7): Organization JSON-LD for AI search surfaces. */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSON_LD) }}
        />
        {/* P1-L2 (audit v7): ThemeProvider removed — globals.css resolves
            `:root`, `.dark`, and `.light` to the same token set since V6
            dropped the toggle, so the provider was paying a useState +
            localStorage + matchMedia cost on every visitor for nothing. */}
        {children}
      </body>
    </html>
  );
}
