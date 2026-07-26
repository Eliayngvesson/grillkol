import VisitorTracker from "@/components/analytics/VisitorTracker";
import type { Metadata } from "next";
import "./globals.css";

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
  
     <body>{children}</body>
    </html>
  );
}