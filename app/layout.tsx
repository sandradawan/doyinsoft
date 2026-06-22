import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@/components/analytics";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "DoyinSoft — a marketplace built for African markets",
    template: "%s",
  },
  description:
    "Software, digital products, fashion and more from independent African sellers. Pay with Paystack.",
  openGraph: {
    siteName: "DoyinSoft",
    type: "website",
    title: "DoyinSoft — a marketplace built for African markets",
    description: "Software, digital products, fashion and more from independent sellers.",
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
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
