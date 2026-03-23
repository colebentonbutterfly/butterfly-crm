"use client";

import { ReactNode, useState, useEffect } from "react";
import { ToastProvider } from "./Toast";
import SearchModal from "./SearchModal";

export default function Providers({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Register service worker for PWA
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <ToastProvider>
      {children}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </ToastProvider>
  );
}
