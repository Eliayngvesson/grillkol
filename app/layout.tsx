import VisitorTracker from "@/components/analytics/VisitorTracker";
import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Grillkol – Beställ grillkol",
  description: "Beställ grillkol med hemleverans.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
 <VisitorTracker />
  
     <body>{children}<Script src="/_vercel/insights/script.js" strategy="afterInteractive" /></body>
    </html>
  );
}