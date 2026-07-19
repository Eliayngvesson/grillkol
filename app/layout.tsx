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
      <body>{children}</body>
    </html>
  );
}