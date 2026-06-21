import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DoyinSoft — software built for African markets",
  description:
    "Desktop, mobile and web apps from independent developers. Buy licenses, pay with Paystack, Flutterwave or card.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
