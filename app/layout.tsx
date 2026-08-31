import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Newsreader } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500"],
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-editorial",
  weight: ["400"],
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "DROP — Peer-to-Peer File Sharing",
  description: "Direct device-to-device file transfer with WebRTC. No account. No upload. Zero storage.",
  keywords: ["file sharing", "p2p", "webrtc", "airdrop", "direct transfer", "privacy", "editorial"],
  authors: [{ name: "DROP" }],
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light bg-white text-ink">
      <body
        className={`${inter.variable} ${newsreader.variable} ${jetbrainsMono.variable} font-sans min-h-screen bg-paper text-ink selection:bg-fog selection:text-ink antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
