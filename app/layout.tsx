import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@/components/analytics";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "DoyinMart — a marketplace built for African markets",
    template: "%s",
  },
  description:
    "Software, digital products, fashion and more from independent African sellers. Pay with Paystack.",
  openGraph: {
    siteName: "DoyinMart",
    type: "website",
    title: "DoyinMart — a marketplace built for African markets",
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
      <head>
        {/* Apply the saved theme before paint to avoid a light/dark flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}`,
          }}
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
