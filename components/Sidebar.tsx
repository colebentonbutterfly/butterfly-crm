"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" },
  { href: "/inventory", label: "Inventory", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  { href: "/boxes", label: "Boxes", icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" },
  { href: "/items/new", label: "Add Item", icon: "M12 4v16m8-8H4" },
  { href: "/scanner", label: "Scan Barcode", icon: "M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" },
  { href: "/price-lookup", label: "Price Lookup", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { href: "/print-barcodes", label: "Print Labels", icon: "M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" },
  { href: "/activity", label: "Activity Log", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <>
      {/* Mobile header - iOS safe area aware */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-attic-800 text-white flex items-center justify-between px-4 py-3"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 12px)" }}
      >
        <div className="flex items-center gap-2">
          <AtticLogo size={28} />
          <span className="font-bold text-lg">Deb&apos;s Attic</span>
        </div>
        <button onClick={() => setOpen(!open)} className="p-2 -mr-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={open ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>

      {/* Overlay */}
      {open && <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-attic-800 text-white z-40 transform transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 overflow-y-auto overscroll-contain`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="p-6 border-b border-attic-700">
          <div className="flex items-center gap-3">
            <AtticLogo size={40} />
            <div>
              <h1 className="font-bold text-xl">Deb&apos;s Attic</h1>
              <p className="text-attic-300 text-xs">Estate Inventory</p>
            </div>
          </div>
        </div>
        <nav className="p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                  active
                    ? "bg-attic-600 text-white"
                    : "text-attic-200 hover:bg-attic-700 hover:text-white"
                }`}
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-attic-700 space-y-3"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)" }}
        >
          {session?.user && (
            <div className="flex items-center justify-between">
              <span className="text-attic-300 text-xs">Signed in as {session.user.name}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-attic-400 hover:text-white text-xs underline min-h-[44px] flex items-center"
              >
                Sign out
              </button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-attic-400 text-xs">2 Pods → 1 Container</p>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Spacer for mobile header - matches header height + safe area */}
      <div className="md:hidden h-14" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }} />
    </>
  );
}

// Deb's Attic Logo Component - SVG house/attic icon with DA monogram
function AtticLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background rounded square */}
      <rect width="40" height="40" rx="8" fill="#c46224" />
      {/* House/attic roof */}
      <path d="M20 6L6 18H10V32H30V18H34L20 6Z" fill="#78350f" stroke="#fdf8f0" strokeWidth="0.5" />
      {/* Attic window/triangle */}
      <path d="M20 8L10 17H30L20 8Z" fill="#d47a2e" />
      {/* Door */}
      <rect x="16" y="22" width="8" height="10" rx="1" fill="#fdf8f0" opacity="0.9" />
      {/* Window left */}
      <rect x="11" y="19" width="4" height="4" rx="0.5" fill="#fdf8f0" opacity="0.7" />
      {/* Window right */}
      <rect x="25" y="19" width="4" height="4" rx="0.5" fill="#fdf8f0" opacity="0.7" />
      {/* DA text */}
      <text x="20" y="29" fontSize="7" textAnchor="middle" fill="#78350f" fontWeight="bold" fontFamily="sans-serif">DA</text>
    </svg>
  );
}

export { AtticLogo };
