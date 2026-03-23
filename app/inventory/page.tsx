"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { CATEGORIES, LOCATIONS } from "@/lib/categories";

interface Item {
  id: string;
  name: string;
  description: string | null;
  category: string;
  location: string;
  condition: string | null;
  quantity: number;
  barcode: string;
  photoUrl: string | null;
  boxNumber: string | null;
  updatedAt: string;
}

function LocationBadge({ location }: { location: string }) {
  const cls =
    location === "Pod 1" ? "badge-pod1" :
    location === "Pod 2" ? "badge-pod2" :
    location === "Shipping Container" ? "badge-container" :
    location === "Donated" ? "badge-donated" :
    "badge-trash";
  return <span className={cls}>{location}</span>;
}

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const fetchItems = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (location) params.set("location", location);

    fetch(`/api/items?${params}`)
      .then((r) => r.json())
      .then(setItems)
      .finally(() => setLoading(false));
  }, [search, category, location]);

  useEffect(() => {
    const timer = setTimeout(fetchItems, 300);
    return () => clearTimeout(timer);
  }, [fetchItems]);

  return (
    <div className="space-y-4 mt-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-lg ${viewMode === "list" ? "bg-attic-100 text-attic-700" : "text-gray-400 hover:text-gray-600"}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-attic-100 text-attic-700" : "text-gray-400 hover:text-gray-600"}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <Link href="/items/new" className="btn-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <input
              type="text"
              placeholder="Search items, barcodes, boxes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
            />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="select-field">
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={location} onChange={(e) => setLocation(e.target.value)} className="select-field">
            <option value="">All Locations</option>
            {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500">{items.length} item{items.length !== 1 ? "s" : ""} found</p>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-attic-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 text-lg mb-2">No items found</p>
          <p className="text-gray-400 text-sm mb-4">Try adjusting your search or filters</p>
          <Link href="/items/new" className="btn-primary">Add First Item</Link>
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-2">
          {items.map((item) => (
            <Link key={item.id} href={`/items/${item.id}`} className="card block hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                {item.photoUrl ? (
                  <img src={item.photoUrl} alt={item.name} className="w-16 h-16 object-cover rounded-lg shrink-0" />
                ) : (
                  <div className="w-16 h-16 bg-attic-100 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-8 h-8 text-attic-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
                    <LocationBadge location={item.location} />
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{item.category}{item.boxNumber ? ` · Box ${item.boxNumber}` : ""}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{item.barcode}</p>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  {item.condition && <p className="text-xs text-gray-400">{item.condition}</p>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <Link key={item.id} href={`/items/${item.id}`} className="card block hover:shadow-md transition-shadow p-3">
              {item.photoUrl ? (
                <img src={item.photoUrl} alt={item.name} className="w-full h-32 object-cover rounded-lg mb-2" />
              ) : (
                <div className="w-full h-32 bg-attic-100 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-12 h-12 text-attic-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              )}
              <h3 className="font-medium text-gray-900 text-sm truncate">{item.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{item.category}</p>
              <div className="mt-1.5">
                <LocationBadge location={item.location} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
