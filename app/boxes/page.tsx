"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import LocationBadge from "@/components/LocationBadge";
import { SkeletonCard } from "@/components/Skeleton";

interface BoxGroup {
  boxNumber: string;
  count: number;
  locations: string[];
  totalValue: number;
  items: {
    id: string;
    name: string;
    category: string;
    location: string;
    barcode: string;
    photoUrl: string | null;
    condition: string | null;
    estimatedValue: number | null;
  }[];
}

function BoxesContent() {
  const searchParams = useSearchParams();
  const highlightBox = searchParams.get("box");
  const [boxes, setBoxes] = useState<BoxGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(highlightBox ? [highlightBox] : []));
  const printLabelRef = useRef<SVGSVGElement>(null);

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

  function escapeHtml(text: string): string {
    const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  function handlePrintBoxLabel(box: BoxGroup) {
    const printWindow = window.open("", "_blank", "width=500,height=400");
    if (!printWindow) return;

    // Generate barcode for the box
    const boxBarcode = `BOX-${box.boxNumber.replace(/[^a-zA-Z0-9]/g, "-")}`;

    printWindow.document.write(`
      <html><head><title>Box Label - ${escapeHtml(box.boxNumber)}</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.12.3/dist/JsBarcode.all.min.js"><\/script>
      <style>
        body { font-family: sans-serif; padding: 20px; }
        .label { border: 3px solid #000; padding: 20px; max-width: 400px; margin: 0 auto; }
        .box-name { font-size: 28px; font-weight: bold; text-align: center; margin-bottom: 8px; }
        .box-info { font-size: 14px; color: #333; text-align: center; margin-bottom: 4px; }
        .barcode-container { text-align: center; margin: 16px 0; }
        .items-list { font-size: 11px; margin-top: 12px; border-top: 1px solid #ccc; padding-top: 8px; }
        .items-list p { margin: 2px 0; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <div class="label">
          <div class="box-name">${escapeHtml(box.boxNumber)}</div>
          <div class="box-info">${box.count} item${box.count !== 1 ? "s" : ""} · ${escapeHtml(box.locations.join(", "))}</div>
          ${box.totalValue > 0 ? `<div class="box-info">Est. Value: $${box.totalValue.toFixed(2)}</div>` : ""}
          <div class="barcode-container">
            <svg id="box-barcode"></svg>
          </div>
          <div class="items-list">
            <p><strong>Contents:</strong></p>
            ${box.items.map((item) => `<p>• ${escapeHtml(item.name)}${item.estimatedValue ? ` ($${item.estimatedValue})` : ""}</p>`).join("")}
          </div>
        </div>
        <script>
          JsBarcode("#box-barcode", "${escapeHtml(boxBarcode)}", {
            format: "CODE128", width: 2, height: 50, displayValue: true, fontSize: 12, margin: 5
          });
          window.onload = function() { setTimeout(function() { window.print(); }, 500); };
        <\/script>
      </body></html>
    `);
    printWindow.document.close();
  }

  if (loading) return <div className="space-y-2"><SkeletonCard count={4} /></div>;

  if (boxes.length === 0) {
    return (
      <div className="card text-center py-12">
        <svg className="w-16 h-16 text-attic-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <p className="text-gray-400 dark:text-gray-500 text-lg mb-2">No boxes or groups yet</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm">Assign a box/group number when adding items to organize them here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <svg ref={printLabelRef} className="hidden" />
      {boxes.map((box) => (
        <div key={box.boxNumber} className={`card ${highlightBox === box.boxNumber ? "ring-2 ring-attic-400" : ""}`}>
          <div className="flex items-center justify-between">
            <button
              onClick={() => toggleExpand(box.boxNumber)}
              className="flex items-center gap-3 flex-1"
            >
              <div className="w-10 h-10 bg-attic-100 dark:bg-attic-900 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-attic-600 dark:text-attic-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-gray-100">{box.boxNumber}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {box.count} item{box.count !== 1 ? "s" : ""}
                  {box.totalValue > 0 ? ` · $${box.totalValue.toFixed(0)}` : ""}
                </p>
              </div>
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePrintBoxLabel(box)}
                className="btn-secondary text-xs py-1 px-2"
                title="Print box label with barcode"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Label
              </button>
              <div className="flex gap-1">
                {box.locations.map((loc) => <LocationBadge key={loc} location={loc} />)}
              </div>
              <button onClick={() => toggleExpand(box.boxNumber)}>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${expanded.has(box.boxNumber) ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {expanded.has(box.boxNumber) && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
              {box.items.map((item) => (
                <Link
                  key={item.id}
                  href={`/items/${item.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {item.photoUrl ? (
                    <img src={item.photoUrl} alt={item.name} className="w-10 h-10 object-cover rounded" />
                  ) : (
                    <div className="w-10 h-10 bg-attic-50 dark:bg-attic-900 rounded flex items-center justify-center">
                      <svg className="w-5 h-5 text-attic-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{item.name}</p>
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
      ))}
    </div>
  );
}

export default function BoxesPage() {
  return (
    <div className="space-y-6 mt-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Boxes & Groups</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">View items grouped by box or pallet number. Print labels with barcodes for each box.</p>
        </div>
      </div>
      <Suspense fallback={<div className="space-y-2"><SkeletonCard count={4} /></div>}>
        <BoxesContent />
      </Suspense>
    </div>
  );
}
