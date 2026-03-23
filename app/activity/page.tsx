"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ActivityEntry {
  id: string;
  itemId: string;
  action: string;
  details: string;
  user: string;
  createdAt: string;
  item: { name: string; barcode: string } | null;
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/items/activity?page=${page}&limit=50`)
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.logs || []);
        setTotalPages(data.totalPages || 1);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const actionColors: Record<string, string> = {
    created: "bg-green-500",
    updated: "bg-blue-500",
    moved: "bg-purple-500",
    deleted: "bg-red-500",
  };

  const actionLabels: Record<string, string> = {
    created: "Created",
    updated: "Updated",
    moved: "Moved",
    deleted: "Deleted",
  };

  return (
    <div className="space-y-4 mt-2">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Activity Log</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">Track all changes to inventory items</p>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-16" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 dark:text-gray-500">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="card flex items-start gap-3">
              <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${actionColors[log.action] || "bg-gray-400"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {actionLabels[log.action] || log.action}
                  </span>
                  {log.item && (
                    <Link href={`/items/${log.itemId}`} className="text-sm font-medium text-attic-600 hover:underline truncate">
                      {log.item.name}
                    </Link>
                  )}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-200 mt-0.5">{log.details}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  by {log.user} &middot; {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm disabled:opacity-50">
            Previous
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm disabled:opacity-50">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
