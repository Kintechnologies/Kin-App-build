import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kin — Stop keeping your family schedule in your head",
  description:
    "Kin is the family AI that takes care of scheduling. Never miss a pickup, appointment, or family moment again.",
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
    <html lang="en">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          :root {
            --background: #0C0F0A;
            --surface: #141810;
            --surface2: #1c211a;
            --border: rgba(255, 255, 255, 0.07);
            --text: #F0EDE6;
            --text2: rgba(240, 237, 230, 0.55);
            --text3: rgba(240, 237, 230, 0.28);
            --green: #7CB87A;
            --greenDim: rgba(124, 184, 122, 0.12);
            --greenGlow: rgba(124, 184, 122, 0.25);
            --amber: #D4A843;
            --purple: #A07EC8;
            --font-geist: "Geist", system-ui, sans-serif;
          }
        `}</style>
      </head>
      <body
        style={{
          backgroundColor: "var(--background)",
          color: "var(--text)",
          fontFamily: "var(--font-geist)",
          margin: 0,
          padding: 0,
        }}
      >
        {children}
      </body>
    </html>
  );
}
