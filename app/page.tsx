"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LocationBadge from "@/components/LocationBadge";
import { SkeletonStats } from "@/components/Skeleton";

interface Stats {
  total: number;
  byLocation: Record<string, number>;
  byCategory: { category: string; count: number }[];
  recentItems: {
    id: string;
    name: string;
    category: string;
    location: string;
    updatedAt: string;
  }[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/items/stats")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonStats />;
  if (!stats) return <p>Failed to load stats.</p>;

  const transferred = stats.byLocation["Shipping Container"] || 0;
  const totalItems = stats.total || 1;
  const progress = Math.round((transferred / totalItems) * 100);
  const isEmpty = stats.total === 0;

  return (
    <div className="space-y-6 mt-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">Overview of Deb&apos;s estate inventory</p>
        </div>
        <Link href="/items/new" className="btn-primary">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Item
        </Link>
      </div>

      {isEmpty ? (
        /* Onboarding empty state */
        <div className="card text-center py-12">
          <svg className="w-20 h-20 text-attic-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Welcome to Deb&apos;s Attic</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Start cataloging your estate inventory. Add items, assign them to locations, and track everything as it moves from pods to the shipping container.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/items/new" className="btn-primary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Your First Item
            </Link>
            <Link href="/print-barcodes" className="btn-secondary">
              Print Barcode Labels
            </Link>
            <Link href="/scanner" className="btn-secondary">
              Scan a Barcode
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto text-left">
            <div className="p-3 rounded-lg bg-attic-50">
              <p className="text-sm font-medium text-attic-700">Step 1</p>
              <p className="text-xs text-gray-600 mt-1">Print barcode labels and stick them on items</p>
            </div>
            <div className="p-3 rounded-lg bg-attic-50">
              <p className="text-sm font-medium text-attic-700">Step 2</p>
              <p className="text-xs text-gray-600 mt-1">Scan or add items to catalog them</p>
            </div>
            <div className="p-3 rounded-lg bg-attic-50">
              <p className="text-sm font-medium text-attic-700">Step 3</p>
              <p className="text-xs text-gray-600 mt-1">Transfer items as they move locations</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(stats.byLocation).map(([loc, count]) => (
              <Link key={loc} href={`/inventory?location=${encodeURIComponent(loc)}`} className="card text-center hover:shadow-md transition-shadow">
                <p className="text-2xl font-bold text-attic-700">{count}</p>
                <p className="text-xs text-gray-500 mt-1">{loc}</p>
              </Link>
            ))}
          </div>

          {/* Transfer progress */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-gray-700">Transfer Progress</h2>
              <span className="text-sm text-gray-500">{transferred} / {stats.total} items</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-attic-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${stats.total === 0 ? 0 : progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{stats.total === 0 ? 0 : progress}% transferred to shipping container</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Categories breakdown */}
            <div className="card">
              <h2 className="font-semibold text-gray-700 mb-3">Items by Category</h2>
              {stats.byCategory.length === 0 ? (
                <p className="text-sm text-gray-400">No items yet. Start adding inventory!</p>
              ) : (
                <div className="space-y-2">
                  {stats.byCategory.map((c) => (
                    <Link
                      key={c.category}
                      href={`/inventory?category=${encodeURIComponent(c.category)}`}
                      className="flex items-center justify-between hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg transition-colors"
                    >
                      <span className="text-sm text-gray-600">{c.category}</span>
                      <span className="text-sm font-medium text-attic-700">{c.count}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent items */}
            <div className="card">
              <h2 className="font-semibold text-gray-700 mb-3">Recently Updated</h2>
              {stats.recentItems.length === 0 ? (
                <p className="text-sm text-gray-400">No items yet.</p>
              ) : (
                <div className="space-y-2">
                  {stats.recentItems.map((item) => (
                    <Link
                      key={item.id}
                      href={`/items/${item.id}`}
                      className="flex items-center justify-between hover:bg-gray-50 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.category}</p>
                      </div>
                      <LocationBadge location={item.location} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="text-center">
        <p className="text-xs text-gray-400">
          Press <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">Ctrl+K</kbd> to quick search
        </p>
      </div>
    </div>
  );
}
