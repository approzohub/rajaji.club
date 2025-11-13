import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import React from "react";
import { AuthProvider } from "../components/auth-provider";
import "../lib/utils"; // Import utils to run localStorage fix

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RajaJi - Trusted Betting Platform Online",
  description: "Play exciting card games and win big with RajaJi. Join the ultimate gaming experience with trusted betting platform.",
  keywords: "betting platform, card game, gaming, raja ji, online gaming, trusted betting",
  authors: [{ name: "RajaJi Team" }],
  creator: "RajaJi",
  publisher: "RajaJi",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://rajaJi.com'),
  openGraph: {
    title: "RajaJi - Trusted Betting Platform Online",
    description: "Play exciting card games and win big with RajaJi. Join the ultimate gaming experience with trusted betting platform.",
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://rajaJi.com',
    siteName: "RajaJi",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RajaJi - Trusted Betting Platform Online",
    description: "Play exciting card games and win big with RajaJi. Join the ultimate gaming experience with trusted betting platform.",
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/logo.svg', type: 'image/svg+xml' }
    ],
    apple: '/logo.svg',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/logo.svg" />
        <meta name="theme-color" content="#091222" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ backgroundColor: "#091222" }}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
