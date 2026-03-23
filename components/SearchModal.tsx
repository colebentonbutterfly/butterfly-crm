"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import LocationBadge from "./LocationBadge";

interface Item {
  id: string;
  name: string;
  category: string;
  location: string;
  barcode: string;
}

export default function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const search = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    fetch(`/api/items?search=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => { setResults((data.items || data).slice(0, 8)); setSelected(0); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    else if (e.key === "Enter" && results[selected]) {
      onClose();
      router.push(`/items/${results[selected].id}`);
    } else if (e.key === "Escape") onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50" />
      <div
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
          <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search items, barcodes, boxes..."
            className="flex-1 text-sm outline-none bg-transparent dark:text-gray-100"
          />
          <kbd className="hidden sm:inline-block text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">ESC</kbd>
        </div>
        {query.trim() && (
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-400 dark:text-gray-500">Searching...</div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400 dark:text-gray-500">No items found</div>
            ) : (
              results.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => { onClose(); router.push(`/items/${item.id}`); }}
                  className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    i === selected ? "bg-attic-50 dark:bg-gray-800" : ""
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{item.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.category} &middot; {item.barcode}</p>
                  </div>
                  <LocationBadge location={item.location} />
                </button>
              ))
            )}
          </div>
        )}
        {!query.trim() && (
          <div className="p-4 text-center text-xs text-gray-400 dark:text-gray-500">
            Type to search &middot; <span className="font-mono">↑↓</span> to navigate &middot; <span className="font-mono">Enter</span> to select
          </div>
        )}
      </div>
    </div>
  );
}
