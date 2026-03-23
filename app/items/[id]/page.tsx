"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

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
  notes: string | null;
  boxNumber: string | null;
  createdAt: string;
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

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    fetch(`/api/items/${params.id}`)
      .then((r) => r.json())
      .then(setItem)
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    if (item && barcodeRef.current && typeof window !== "undefined") {
      import("jsbarcode").then((JsBarcode) => {
        JsBarcode.default(barcodeRef.current, item.barcode, {
          format: "CODE128",
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 14,
          margin: 5,
        });
      });
    }
  }, [item]);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this item?")) return;
    await fetch(`/api/items/${params.id}`, { method: "DELETE" });
    router.push("/inventory");
  }

  async function handleMove(newLocation: string) {
    const res = await fetch(`/api/items/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, location: newLocation }),
    });
    const updated = await res.json();
    setItem(updated);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-attic-600" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-400 text-lg">Item not found</p>
        <Link href="/inventory" className="btn-primary mt-4 inline-flex">Back to Inventory</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-2">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/inventory" className="hover:text-attic-600">Inventory</Link>
        <span>/</span>
        <span className="text-gray-700">{item.name}</span>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left column - photo and barcode */}
        <div className="md:w-1/3 space-y-4">
          {item.photoUrl ? (
            <img src={item.photoUrl} alt={item.name} className="w-full rounded-xl shadow-sm" />
          ) : (
            <div className="w-full aspect-square bg-attic-100 rounded-xl flex items-center justify-center">
              <svg className="w-20 h-20 text-attic-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          )}

          {/* Barcode */}
          <div className="card text-center">
            <svg ref={barcodeRef} className="mx-auto" />
          </div>
        </div>

        {/* Right column - details */}
        <div className="flex-1 space-y-4">
          <div className="card">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <LocationBadge location={item.location} />
                  {item.condition && <span className="badge bg-gray-100 text-gray-600">{item.condition}</span>}
                </div>
              </div>
            </div>

            {item.description && (
              <p className="text-gray-600 mt-3">{item.description}</p>
            )}

            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div>
                <p className="text-gray-500">Category</p>
                <p className="font-medium">{item.category}</p>
              </div>
              <div>
                <p className="text-gray-500">Quantity</p>
                <p className="font-medium">{item.quantity}</p>
              </div>
              {item.boxNumber && (
                <div>
                  <p className="text-gray-500">Box / Group</p>
                  <p className="font-medium">{item.boxNumber}</p>
                </div>
              )}
              <div>
                <p className="text-gray-500">Barcode</p>
                <p className="font-medium font-mono text-xs">{item.barcode}</p>
              </div>
            </div>

            {item.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-gray-500 text-sm">Notes</p>
                <p className="text-gray-700 mt-1">{item.notes}</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
              <p>Added: {new Date(item.createdAt).toLocaleDateString()}</p>
              <p>Updated: {new Date(item.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Quick move buttons */}
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-3">Quick Transfer</h3>
            <div className="flex flex-wrap gap-2">
              {["Pod 1", "Pod 2", "Shipping Container", "Donated", "Trash"].map((loc) => (
                <button
                  key={loc}
                  onClick={() => handleMove(loc)}
                  disabled={item.location === loc}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                    item.location === loc
                      ? "bg-attic-100 border-attic-300 text-attic-700 font-medium cursor-default"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link href={`/items/${item.id}/edit`} className="btn-primary">Edit Item</Link>
            <button onClick={handleDelete} className="btn-danger">Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}
