import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://orivatis.com"),
  title: {
    default: "ORIVATIS",
    template: "%s | ORIVATIS"
  },
  applicationName: "ORIVATIS",
  description: "Βρες πεζοπορίες, γνώρισε παρέα και ανέβα βουνό μαζί.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "ORIVATIS",
    description: "Βρες πεζοπορίες, γνώρισε παρέα και ανέβα βουνό μαζί.",
    url: "https://orivatis.com",
    siteName: "ORIVATIS",
    locale: "el_GR",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "ORIVATIS",
    description: "Βρες πεζοπορίες, γνώρισε παρέα και ανέβα βουνό μαζί."
  },
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#16251c"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="el">
      <body>{children}</body>
    </html>
  );
}
