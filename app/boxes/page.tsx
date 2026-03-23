"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import LocationBadge from "@/components/LocationBadge";
import { SkeletonCard } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { LOCATIONS } from "@/lib/categories";

interface BoxItem {
  id: string;
  name: string;
  category: string;
  location: string;
  barcode: string;
  photoUrl: string | null;
  estimatedValue: number | null;
  condition: string | null;
}

interface Box {
  id: string;
  number: number;
  name: string | null;
  barcode: string;
  location: string;
  notes: string | null;
  count: number;
  totalValue: number;
  locations: string[];
  items: BoxItem[];
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export default function BoxesPage() {
  const { toast } = useToast();
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createLocation, setCreateLocation] = useState("Pod 1");
  const [creating, setCreating] = useState(false);

  // Packing mode state
  const [packingBoxId, setPackingBoxId] = useState<string | null>(null);
  const [scanInput, setScanInput] = useState("");
  const [scanResult, setScanResult] = useState<string | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  function fetchBoxes() {
    setLoading(true);
    fetch("/api/boxes")
      .then((r) => r.json())
      .then(setBoxes)
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchBoxes(); }, []);

  function toggleExpand(boxId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(boxId)) next.delete(boxId);
      else next.add(boxId);
      return next;
    });
  }

  async function handleCreateBox() {
    setCreating(true);
    try {
      const res = await fetch("/api/boxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName || null, location: createLocation }),
      });
      if (!res.ok) throw new Error();
      const box = await res.json();
      toast(`Box ${box.number} created (${box.barcode})`);
      setShowCreate(false);
      setCreateName("");
      fetchBoxes();
    } catch {
      toast("Failed to create box", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateBatch(count: number) {
    setCreating(true);
    try {
      for (let i = 0; i < count; i++) {
        await fetch("/api/boxes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ location: createLocation }),
        });
      }
      toast(`${count} boxes created`);
      setShowCreate(false);
      fetchBoxes();
    } catch {
      toast("Failed to create boxes", "error");
    } finally {
      setCreating(false);
    }
  }

  function startPacking(boxId: string) {
    setPackingBoxId(boxId);
    setScanResult(null);
    setScanInput("");
    setTimeout(() => scanInputRef.current?.focus(), 100);
  }

  async function handleScanItem(e: React.FormEvent) {
    e.preventDefault();
    if (!packingBoxId || !scanInput.trim()) return;

    setScanResult(null);
    try {
      const res = await fetch(`/api/boxes/${packingBoxId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: scanInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScanResult(`Error: ${data.error}`);
      } else {
        setScanResult(`Added "${data.item.name}" to ${data.box}`);
        fetchBoxes();
      }
    } catch {
      setScanResult("Scan failed. Try again.");
    }
    setScanInput("");
    scanInputRef.current?.focus();
  }

  async function handleRemoveItem(boxId: string, itemId: string) {
    try {
      await fetch(`/api/boxes/${boxId}/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      toast("Item removed from box");
      fetchBoxes();
    } catch {
      toast("Failed to remove item", "error");
    }
  }

  function handlePrintBoxLabel(box: Box) {
    const printWindow = window.open("", "_blank", "width=500,height=400");
    if (!printWindow) return;

    const boxLabel = `Box ${box.number}${box.name ? ` - ${escapeHtml(box.name)}` : ""}`;

    printWindow.document.write(`
      <html><head><title>Box Label - ${escapeHtml(boxLabel)}</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.12.3/dist/JsBarcode.all.min.js"><\/script>
      <style>
        body { font-family: sans-serif; padding: 20px; }
        .label { border: 3px solid #000; padding: 20px; max-width: 400px; margin: 0 auto; }
        .box-number { font-size: 36px; font-weight: bold; text-align: center; margin-bottom: 4px; }
        .box-name { font-size: 18px; text-align: center; color: #333; margin-bottom: 8px; }
        .box-info { font-size: 14px; color: #555; text-align: center; margin-bottom: 4px; }
        .barcode-container { text-align: center; margin: 16px 0; }
        .items-list { font-size: 11px; margin-top: 12px; border-top: 1px solid #ccc; padding-top: 8px; }
        .items-list p { margin: 2px 0; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <div class="label">
          <div class="box-number">Box ${box.number}</div>
          ${box.name ? `<div class="box-name">${escapeHtml(box.name)}</div>` : ""}
          <div class="box-info">${box.count} item${box.count !== 1 ? "s" : ""} &middot; ${escapeHtml(box.location)}</div>
          ${box.totalValue > 0 ? `<div class="box-info">Est. Value: $${box.totalValue.toFixed(2)}</div>` : ""}
          <div class="barcode-container">
            <svg id="box-barcode"></svg>
          </div>
          ${box.items.length > 0 ? `
            <div class="items-list">
              <p><strong>Contents:</strong></p>
              ${box.items.map((item) => `<p>&bull; ${escapeHtml(item.name)}${item.estimatedValue ? ` ($${item.estimatedValue})` : ""}</p>`).join("")}
            </div>
          ` : ""}
        </div>
        <script>
          JsBarcode("#box-barcode", "${escapeHtml(box.barcode)}", {
            format: "CODE128", width: 2, height: 50, displayValue: true, fontSize: 14, margin: 5
          });
          window.onload = function() { setTimeout(function() { window.print(); }, 500); };
        <\/script>
      </body></html>
    `);
    printWindow.document.close();
  }

  function handlePrintAllLabels() {
    if (boxes.length === 0) return;
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;

    const labelsHTML = boxes.map((box) => {
      const boxLabel = `Box ${box.number}${box.name ? ` - ${escapeHtml(box.name)}` : ""}`;
      return `
        <div class="label" style="page-break-inside:avoid;border:2px solid #000;padding:16px;margin-bottom:16px;">
          <div style="font-size:28px;font-weight:bold;text-align:center;">Box ${box.number}</div>
          ${box.name ? `<div style="font-size:14px;text-align:center;color:#333;">${escapeHtml(box.name)}</div>` : ""}
          <div style="font-size:12px;text-align:center;color:#555;margin:4px 0;">${box.count} items &middot; ${escapeHtml(box.location)}</div>
          <div style="text-align:center;margin:12px 0;"><svg id="bc-${box.number}"></svg></div>
        </div>`;
    }).join("");

    printWindow.document.write(`
      <html><head><title>All Box Labels</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.12.3/dist/JsBarcode.all.min.js"><\/script>
      <style>body{font-family:sans-serif;padding:20px;} .labels{columns:2;column-gap:20px;} @media print{body{padding:0;}@page{margin:0.5in;}}</style>
      </head><body>
        <div class="labels">${labelsHTML}</div>
        <script>
          ${boxes.map((box) => `JsBarcode("#bc-${box.number}", "${escapeHtml(box.barcode)}", {format:"CODE128",width:1.5,height:40,displayValue:true,fontSize:10,margin:2});`).join("\n")}
          window.onload = function() { setTimeout(function() { window.print(); }, 500); };
        <\/script>
      </body></html>
    `);
    printWindow.document.close();
  }

  return (
    <div className="space-y-6 mt-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Boxes & Groups</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Create numbered boxes, print labels, scan items into boxes</p>
        </div>
        <div className="flex items-center gap-2">
          {boxes.length > 0 && (
            <button onClick={handlePrintAllLabels} className="btn-secondary text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print All Labels
            </button>
          )}
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Box
          </button>
        </div>
      </div>

      {/* Create box form */}
      {showCreate && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200">Create New Box</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Box Name (optional)</label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="input-field"
                placeholder="e.g., Kitchen Stuff"
                maxLength={255}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Location</label>
              <select value={createLocation} onChange={(e) => setCreateLocation(e.target.value)} className="select-field">
                {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button onClick={handleCreateBox} disabled={creating} className="btn-primary">
                {creating ? "Creating..." : "Create 1 Box"}
              </button>
              <button onClick={() => handleCreateBatch(5)} disabled={creating} className="btn-secondary text-sm">
                +5
              </button>
              <button onClick={() => handleCreateBatch(10)} disabled={creating} className="btn-secondary text-sm">
                +10
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Each box gets an auto-incrementing number (Box 1, Box 2, ...) and a unique barcode (BOX-0001, BOX-0002, ...). Print the label and stick it on the box.
          </p>
        </div>
      )}

      {/* Packing mode */}
      {packingBoxId && (
        <div className="card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-green-800 dark:text-green-200">
              Packing: {boxes.find((b) => b.id === packingBoxId)?.barcode} - Box {boxes.find((b) => b.id === packingBoxId)?.number}
              {boxes.find((b) => b.id === packingBoxId)?.name ? ` (${boxes.find((b) => b.id === packingBoxId)?.name})` : ""}
            </h3>
            <button onClick={() => setPackingBoxId(null)} className="text-sm text-green-700 dark:text-green-300 hover:underline">
              Done Packing
            </button>
          </div>
          <form onSubmit={handleScanItem} className="flex gap-2">
            <input
              ref={scanInputRef}
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              className="input-field flex-1"
              placeholder="Scan or type item barcode (DA-XXXXXXXX-XXXXX)"
              autoFocus
            />
            <button type="submit" className="btn-primary shrink-0">Add Item</button>
          </form>
          {scanResult && (
            <p className={`text-sm ${scanResult.startsWith("Error") ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-300"}`}>
              {scanResult}
            </p>
          )}
          <p className="text-xs text-green-600 dark:text-green-400">
            Scan item barcodes to add them to this box. The input stays focused for rapid scanning.
          </p>
        </div>
      )}

      {/* Box list */}
      {loading ? (
        <div className="space-y-2"><SkeletonCard count={4} /></div>
      ) : boxes.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="w-16 h-16 text-attic-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-gray-400 dark:text-gray-500 text-lg mb-2">No boxes yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">Create boxes, print labels, then scan items into them</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">Create Your First Box</button>
        </div>
      ) : (
        <div className="space-y-3">
          {boxes.map((box) => (
            <div key={box.id} className={`card ${packingBoxId === box.id ? "ring-2 ring-green-400" : ""}`}>
              <div className="flex items-center justify-between">
                <button onClick={() => toggleExpand(box.id)} className="flex items-center gap-3 flex-1 text-left">
                  <div className="w-12 h-12 bg-attic-100 dark:bg-attic-900 rounded-lg flex items-center justify-center">
                    <span className="text-lg font-bold text-attic-700 dark:text-attic-300">{box.number}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      Box {box.number}{box.name ? ` - ${box.name}` : ""}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {box.barcode} &middot; {box.count} item{box.count !== 1 ? "s" : ""}
                      {box.totalValue > 0 ? ` &middot; $${box.totalValue.toFixed(0)}` : ""}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => startPacking(box.id)}
                    className={`text-xs py-1 px-2 rounded-lg border transition-colors ${
                      packingBoxId === box.id
                        ? "bg-green-100 dark:bg-green-900 border-green-300 text-green-700 dark:text-green-300"
                        : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                    title="Scan items into this box"
                  >
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    Pack
                  </button>
                  <button onClick={() => handlePrintBoxLabel(box)} className="btn-secondary text-xs py-1 px-2" title="Print box label">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Label
                  </button>
                  <LocationBadge location={box.location} />
                  <button onClick={() => toggleExpand(box.id)}>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${expanded.has(box.id) ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {expanded.has(box.id) && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  {box.items.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                      No items in this box yet. Click &quot;Pack&quot; to scan items in.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {box.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <Link href={`/items/${item.id}`} className="flex items-center gap-3 flex-1 min-w-0">
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
                                {item.category}{item.estimatedValue ? ` · $${item.estimatedValue}` : ""}
                              </p>
                            </div>
                          </Link>
                          <button
                            onClick={() => handleRemoveItem(box.id, item.id)}
                            className="text-gray-400 hover:text-red-500 shrink-0"
                            title="Remove from box"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {box.notes && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">{box.notes}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
