import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hiking MVP",
  description: "Βρες παρέα για την επόμενη πεζοπορία σου."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#153f2c"
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
