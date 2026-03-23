import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Deb's Attic - Estate Inventory",
  description: "Inventory management for estate items across pods and shipping containers",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Deb's Attic",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#78350f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-180.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const t = localStorage.getItem('theme');
            if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            }
          } catch(e) {}
        `}} />
      </head>
      <body className="bg-attic-50 text-gray-900 min-h-[100dvh] dark:bg-gray-900 dark:text-gray-100">
        <Providers>
          <div className="flex min-h-[100dvh]">
            <Sidebar />
            <main className="flex-1 md:ml-64 print:ml-0">
              <div className="p-4 md:p-6 max-w-7xl mx-auto pb-safe">
                {children}
              </div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
