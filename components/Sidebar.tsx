"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import ThemeToggle from "./ThemeToggle";
import Logo, { IconLogo } from "./Logo";

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
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-attic-800 text-white flex items-center justify-between px-4 py-2"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 8px)" }}
      >
        <div className="flex items-center gap-2">
          <IconLogo className="w-7 h-8 shrink-0" />
          <span className="font-bold text-lg" style={{ fontFamily: "Georgia, 'Palatino Linotype', serif" }}>
            Deb&apos;s Attic
          </span>
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
        <div className="p-5 border-b border-attic-700">
          <Logo variant="header" />
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
            <p className="text-attic-400 text-xs italic" style={{ fontFamily: "Georgia, 'Palatino Linotype', serif", letterSpacing: "0.5px" }}>
              Every item tells a story
            </p>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Spacer for mobile header - matches header height + safe area */}
      <div className="md:hidden h-14" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }} />
    </>
  );
}
