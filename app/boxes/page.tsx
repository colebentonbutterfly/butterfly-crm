"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import LocationBadge from "@/components/LocationBadge";
import { SkeletonCard } from "@/components/Skeleton";

interface BoxGroup {
  boxNumber: string;
  count: number;
  locations: string[];
  items: {
    id: string;
    name: string;
    category: string;
    location: string;
    barcode: string;
    photoUrl: string | null;
    condition: string | null;
  }[];
}

function BoxesContent() {
  const searchParams = useSearchParams();
  const highlightBox = searchParams.get("box");
  const [boxes, setBoxes] = useState<BoxGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(highlightBox ? [highlightBox] : []));

  useEffect(() => {
    fetch("/api/items/boxes")
      .then((r) => r.json())
      .then(setBoxes)
      .finally(() => setLoading(false));
  }, []);

  function toggleExpand(boxNumber: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(boxNumber)) next.delete(boxNumber);
      else next.add(boxNumber);
      return next;
    });
  }

  if (loading) return <div className="space-y-2"><SkeletonCard count={4} /></div>;

  if (boxes.length === 0) {
    return (
      <div className="card text-center py-12">
        <svg className="w-16 h-16 text-attic-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <p className="text-gray-400 text-lg mb-2">No boxes or groups yet</p>
        <p className="text-gray-400 text-sm">Assign a box/group number when adding items to organize them here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {boxes.map((box) => (
        <div key={box.boxNumber} className={`card ${highlightBox === box.boxNumber ? "ring-2 ring-attic-400" : ""}`}>
          <button
            onClick={() => toggleExpand(box.boxNumber)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-attic-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-attic-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">{box.boxNumber}</p>
                <p className="text-sm text-gray-500">{box.count} item{box.count !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {box.locations.map((loc) => <LocationBadge key={loc} location={loc} />)}
              </div>
              <svg className={`w-5 h-5 text-gray-400 transition-transform ${expanded.has(box.boxNumber) ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {expanded.has(box.boxNumber) && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              {box.items.map((item) => (
                <Link
                  key={item.id}
                  href={`/items/${item.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {item.photoUrl ? (
                    <img src={item.photoUrl} alt={item.name} className="w-10 h-10 object-cover rounded" />
                  ) : (
                    <div className="w-10 h-10 bg-attic-50 rounded flex items-center justify-center">
                      <svg className="w-5 h-5 text-attic-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.category}</p>
                  </div>
                  <LocationBadge location={item.location} />
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function BoxesPage() {
  return (
    <div className="space-y-6 mt-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Boxes & Groups</h1>
          <p className="text-gray-500 text-sm">View items grouped by box or pallet number</p>
        </div>
      </div>
      <Suspense fallback={<div className="space-y-2"><SkeletonCard count={4} /></div>}>
        <BoxesContent />
      </Suspense>
    </div>
  );
}
