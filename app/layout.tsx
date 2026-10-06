import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://hikemazi.com"),
  title: {
    default: "HikeMazi",
    template: "%s | HikeMazi"
  },
  applicationName: "HikeMazi",
  description: "Βρες πεζοπορίες, γνώρισε παρέα και ανέβα βουνό μαζί.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "HikeMazi",
    description: "Βρες πεζοπορίες, γνώρισε παρέα και ανέβα βουνό μαζί.",
    url: "https://hikemazi.com",
    siteName: "HikeMazi",
    locale: "el_GR",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "HikeMazi",
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
