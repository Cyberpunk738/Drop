import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "DROP — Peer-to-Peer File Sharing",
  description: "Send files directly between devices with WebRTC. No account. No upload. Zero server storage.",
  keywords: ["file sharing", "p2p", "webrtc", "airdrop", "direct transfer", "privacy"],
  authors: [{ name: "DROP" }],
  openGraph: {
    title: "DROP — Peer-to-Peer File Sharing",
    description: "Send files directly between devices with WebRTC. No account. No upload.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
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
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans min-h-screen bg-background text-zinc-100 selection:bg-brand-500/20 selection:text-brand-400 relative overflow-x-hidden`}>
        {/* Background ambient lighting */}
        <div className="fixed inset-0 pointer-events-none bg-grid-pattern opacity-40 -z-20" />
        <div className="fixed inset-0 pointer-events-none bg-radial-gradient -z-10" />
        
        {children}
      </body>
    </html>
  );
}
