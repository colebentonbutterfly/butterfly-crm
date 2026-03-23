"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

function LocationBadge({ location }: { location: string }) {
  const cls =
    location === "Pod 1" ? "badge-pod1" :
    location === "Pod 2" ? "badge-pod2" :
    location === "Shipping Container" ? "badge-container" :
    location === "Donated" ? "badge-donated" :
    "badge-trash";
  return <span className={cls}>{location}</span>;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-attic-600" />
      </div>
    );
  }

  if (!stats) return <p>Failed to load stats.</p>;

  const transferred = stats.byLocation["Shipping Container"] || 0;
  const totalItems = stats.total || 1;
  const progress = Math.round((transferred / totalItems) * 100);

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

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(stats.byLocation).map(([loc, count]) => (
          <div key={loc} className="card text-center">
            <p className="text-2xl font-bold text-attic-700">{count}</p>
            <p className="text-xs text-gray-500 mt-1">{loc}</p>
          </div>
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
                <div key={c.category} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{c.category}</span>
                  <span className="text-sm font-medium text-attic-700">{c.count}</span>
                </div>
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
    </div>
  );
}
