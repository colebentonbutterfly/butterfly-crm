import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Butterfly Assets CRM",
  description: "Internal CRM for Butterfly Assets LLC",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
