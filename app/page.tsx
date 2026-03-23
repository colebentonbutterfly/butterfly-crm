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
    estimatedValue: number | null;
  }[];
  totalEstimatedValue: number;
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

  // Bar chart max for scaling
  const maxCategoryCount = stats.byCategory.length > 0 ? Math.max(...stats.byCategory.map((c) => c.count)) : 1;

  // Location chart data
  const locationColors: Record<string, string> = {
    "Pod 1": "#3b82f6",
    "Pod 2": "#8b5cf6",
    "Shipping Container": "#10b981",
    "Donated": "#f59e0b",
    "Trash": "#ef4444",
  };

  return (
    <div className="space-y-6 mt-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Overview of Deb&apos;s estate inventory</p>
        </div>
        <Link href="/items/new" className="btn-primary">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Item
        </Link>
      </div>

      {isEmpty ? (
        <div className="card text-center py-12">
          <svg className="w-20 h-20 text-attic-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">Welcome to Deb&apos;s Attic</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Start cataloging your estate inventory. Add items, assign them to locations, and track everything as it moves from pods to the shipping container.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/items/new" className="btn-primary">Add Your First Item</Link>
            <Link href="/print-barcodes" className="btn-secondary">Print Barcode Labels</Link>
            <Link href="/scanner" className="btn-secondary">Scan a Barcode</Link>
          </div>
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(stats.byLocation).map(([loc, count]) => (
              <Link key={loc} href={`/inventory?location=${encodeURIComponent(loc)}`} className="card text-center hover:shadow-md transition-shadow">
                <p className="text-2xl font-bold text-attic-700 dark:text-attic-300">{count}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{loc}</p>
              </Link>
            ))}
            {/* Total value card */}
            <div className="card text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                ${stats.totalEstimatedValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Est. Total Value</p>
            </div>
          </div>

          {/* Transfer progress */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-gray-700 dark:text-gray-200">Transfer Progress</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">{transferred} / {stats.total} items</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
              <div
                className="bg-attic-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${stats.total === 0 ? 0 : progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stats.total === 0 ? 0 : progress}% transferred to shipping container</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Location chart */}
            <div className="card">
              <h2 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Items by Location</h2>
              <div className="space-y-3">
                {Object.entries(stats.byLocation).map(([loc, count]) => (
                  <div key={loc}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-300">{loc}</span>
                      <span className="font-medium text-gray-700 dark:text-gray-200">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${stats.total === 0 ? 0 : (count / stats.total) * 100}%`,
                          backgroundColor: locationColors[loc] || "#6b7280",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category chart */}
            <div className="card">
              <h2 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Items by Category</h2>
              {stats.byCategory.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">No items yet.</p>
              ) : (
                <div className="space-y-2">
                  {stats.byCategory.slice(0, 10).map((c) => (
                    <Link
                      key={c.category}
                      href={`/inventory?category=${encodeURIComponent(c.category)}`}
                      className="block hover:bg-gray-50 dark:hover:bg-gray-700 -mx-2 px-2 py-1 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between text-sm mb-0.5">
                        <span className="text-gray-600 dark:text-gray-300">{c.category}</span>
                        <span className="font-medium text-attic-700 dark:text-attic-300">{c.count}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-attic-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(c.count / maxCategoryCount) * 100}%` }}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent items */}
          <div className="card">
            <h2 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Recently Updated</h2>
            {stats.recentItems.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No items yet.</p>
            ) : (
              <div className="space-y-2">
                {stats.recentItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/items/${item.id}`}
                    className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{item.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.category}
                        {item.estimatedValue ? ` · $${item.estimatedValue}` : ""}
                      </p>
                    </div>
                    <LocationBadge location={item.location} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div className="text-center">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Press <kbd className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400">Ctrl+K</kbd> to quick search
        </p>
      </div>
    </div>
  );
}
