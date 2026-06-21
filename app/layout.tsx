import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "DoyinSoft — software built for African markets",
    template: "%s",
  },
  description:
    "Desktop, mobile and web apps from independent developers. Buy licenses, pay with Paystack, Flutterwave or card.",
  openGraph: {
    siteName: "DoyinSoft",
    type: "website",
    title: "DoyinSoft — software built for African markets",
    description: "Desktop, mobile and web apps from independent developers.",
  },
  twitter: { card: "summary" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
