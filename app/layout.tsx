import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Office Days Tracker",
  description: "Plan + complete in-office days per month",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
