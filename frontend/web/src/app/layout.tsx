import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ExtensionSessionBridge } from "@/components/ExtensionSessionBridge";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SepetIQ — Bilinçli Alışveriş",
  description: "Alışveriş kararlarınızı sorgulayan agentic AI asistanınız.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${inter.variable} antialiased`}>
        <ExtensionSessionBridge />
        {children}
      </body>
    </html>
  );
}
