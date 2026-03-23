"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import LocationBadge from "@/components/LocationBadge";
import { SkeletonDetail } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { safeJsonParse } from "@/lib/helpers";

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
  photoUrls: string | null;
  notes: string | null;
  boxNumber: string | null;
  estimatedValue: number | null;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ActivityEntry {
  id: string;
  action: string;
  details: string;
  user: string;
  createdAt: string;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const barcodeRef = useRef<SVGSVGElement>(null);
  const printBarcodeRef = useRef<SVGSVGElement>(null);

  const allPhotos: string[] = item ? [
    ...(item.photoUrl ? [item.photoUrl] : []),
    ...safeJsonParse<string[]>(item.photoUrls, []),
  ] : [];

  const itemTags: string[] = safeJsonParse<string[]>(item?.tags, []);

  useEffect(() => {
    fetch(`/api/items/${params.id}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setItem)
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    fetch(`/api/items/activity?itemId=${params.id}&limit=10`)
      .then((r) => r.json())
      .then((data) => setActivity(data.logs || []))
      .catch(() => {});
  }, [params.id]);

  useEffect(() => {
    if (item && typeof window !== "undefined") {
      import("jsbarcode").then((JsBarcode) => {
        if (barcodeRef.current) {
          JsBarcode.default(barcodeRef.current, item.barcode, {
            format: "CODE128", width: 2, height: 60, displayValue: true, fontSize: 14, margin: 5,
          });
        }
        if (printBarcodeRef.current) {
          JsBarcode.default(printBarcodeRef.current, item.barcode, {
            format: "CODE128", width: 1.5, height: 40, displayValue: true, fontSize: 10, margin: 2,
          });
        }
      });
    }
  }, [item]);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this item?")) return;
    const res = await fetch(`/api/items/${params.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Item deleted");
      router.push("/inventory");
    } else {
      toast("Failed to delete item", "error");
    }
  }

  async function handleMove(newLocation: string) {
    const res = await fetch(`/api/items/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location: newLocation }),
    });
    if (res.ok) {
      const updated = await res.json();
      setItem(updated);
      toast(`Moved to ${newLocation}`);
      // Refresh activity
      fetch(`/api/items/activity?itemId=${params.id}&limit=10`)
        .then((r) => r.json())
        .then((data) => setActivity(data.logs || []))
        .catch(() => {});
    } else {
      toast("Failed to move item", "error");
    }
  }

  function handlePrintLabel() {
    const printWindow = window.open("", "_blank", "width=400,height=300");
    if (!printWindow || !printBarcodeRef.current) return;
    const svgHTML = printBarcodeRef.current.outerHTML;
    printWindow.document.write(`
      <html><head><title>Label - ${escapeHtml(item?.barcode || "")}</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;}
      .name{font-size:12px;font-weight:bold;margin-bottom:4px;}.loc{font-size:10px;color:#666;margin-bottom:8px;}</style></head>
      <body><div class="name">${escapeHtml(item?.name || "")}</div><div class="loc">${escapeHtml(item?.location || "")}</div>${svgHTML}
      <script>window.onload=function(){window.print();window.close();}<\/script></body></html>
    `);
    printWindow.document.close();
  }

  function handlePrintDetail() {
    window.print();
  }

  // Swipe handlers for mobile quick transfer
  function handleTouchStart(e: React.TouchEvent) {
    setTouchStart(e.touches[0].clientX);
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (touchStart === null) return;
    const diff = e.touches[0].clientX - touchStart;
    setSwipeOffset(diff);
  }
  function handleTouchEnd() {
    if (!item) { setTouchStart(null); setSwipeOffset(0); return; }
    const LOCATIONS_LIST = ["Pod 1", "Pod 2", "Shipping Container", "Donated", "Trash"];
    const currentIdx = LOCATIONS_LIST.indexOf(item.location);

    if (Math.abs(swipeOffset) > 100) {
      if (swipeOffset > 0 && currentIdx > 0) {
        handleMove(LOCATIONS_LIST[currentIdx - 1]);
      } else if (swipeOffset < 0 && currentIdx < LOCATIONS_LIST.length - 1) {
        handleMove(LOCATIONS_LIST[currentIdx + 1]);
      }
    }
    setTouchStart(null);
    setSwipeOffset(0);
  }

  if (loading) return <SkeletonDetail />;

  if (!item) {
    return (
      <div className="card text-center py-12">
        <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 2a10 10 0 110 20 10 10 0 010-20z" />
        </svg>
        <p className="text-gray-400 dark:text-gray-500 text-lg">Item not found</p>
        <Link href="/inventory" className="btn-primary mt-4 inline-flex">Back to Inventory</Link>
      </div>
    );
  }

  return (
    <>
      {/* Screen version */}
      <div
        className="space-y-6 mt-2 print:hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link href="/inventory" className="hover:text-attic-600">Inventory</Link>
            <span>/</span>
            <span className="text-gray-700 dark:text-gray-200">{item.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowQR(!showQR)} className="btn-secondary text-sm" title="QR Code">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              QR
            </button>
            <button onClick={handlePrintLabel} className="btn-secondary text-sm" title="Print barcode label">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Label
            </button>
            <button onClick={handlePrintDetail} className="btn-secondary text-sm" title="Print item detail sheet">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
          </div>
        </div>

        {/* QR Code modal */}
        {showQR && (
          <div className="card text-center">
            <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Shareable QR Code</h3>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
              alt="QR Code"
              className="mx-auto w-48 h-48"
            />
            <p className="text-xs text-gray-400 mt-2">Scan to view this item</p>
            <button onClick={() => setShowQR(false)} className="btn-secondary text-sm mt-2">Close</button>
          </div>
        )}

        {/* Swipe hint on mobile */}
        <div className="md:hidden text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">Swipe left/right to transfer between locations</p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Left column - photos and barcode */}
          <div className="md:w-1/3 space-y-4">
            {allPhotos.length > 0 ? (
              <div>
                <img src={allPhotos[activePhoto]} alt={item.name} className="w-full rounded-xl shadow-sm" />
                {allPhotos.length > 1 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                    {allPhotos.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setActivePhoto(i)}
                        className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
                          i === activePhoto ? "border-attic-500" : "border-transparent"
                        }`}
                      >
                        <img src={url} alt={`Photo ${i + 1} of ${item.name}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full aspect-square bg-attic-100 dark:bg-attic-900 rounded-xl flex items-center justify-center">
                <svg className="w-20 h-20 text-attic-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            )}

            <div className="card text-center">
              <svg ref={barcodeRef} className="mx-auto" />
            </div>
            <svg ref={printBarcodeRef} className="hidden" />
          </div>

          {/* Right column - details */}
          <div className="flex-1 space-y-4">
            <div className="card">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{item.name}</h1>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <LocationBadge location={item.location} />
                    {item.condition && <span className="badge bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{item.condition}</span>}
                    {itemTags.map((tag) => (
                      <span key={tag} className="badge bg-attic-100 dark:bg-attic-900 text-attic-700 dark:text-attic-300">{tag}</span>
                    ))}
                  </div>
                </div>
                {item.estimatedValue != null && item.estimatedValue > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Est. Value</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">${item.estimatedValue.toFixed(2)}</p>
                  </div>
                )}
              </div>

              {item.description && (
                <p className="text-gray-600 dark:text-gray-300 mt-3">{item.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Category</p>
                  <p className="font-medium">{item.category}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Quantity</p>
                  <p className="font-medium">{item.quantity}</p>
                </div>
                {item.boxNumber && (
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Box / Group</p>
                    <Link href="/boxes" className="font-medium text-attic-600 hover:underline">{item.boxNumber}</Link>
                  </div>
                )}
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Barcode</p>
                  <p className="font-medium font-mono text-xs">{item.barcode}</p>
                </div>
              </div>

              {item.notes && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Notes</p>
                  <p className="text-gray-700 dark:text-gray-200 mt-1 whitespace-pre-wrap">{item.notes}</p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
                <p>Added: {new Date(item.createdAt).toLocaleDateString()}</p>
                <p>Updated: {new Date(item.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Quick move buttons */}
            <div className="card">
              <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Quick Transfer</h3>
              <div className="flex flex-wrap gap-2">
                {["Pod 1", "Pod 2", "Shipping Container", "Donated", "Trash"].map((loc) => (
                  <button
                    key={loc}
                    onClick={() => handleMove(loc)}
                    disabled={item.location === loc}
                    className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                      item.location === loc
                        ? "bg-attic-100 dark:bg-attic-900 border-attic-300 text-attic-700 dark:text-attic-300 font-medium cursor-default"
                        : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            {/* Activity Log */}
            {activity.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Recent Activity</h3>
                <div className="space-y-2">
                  {activity.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 text-sm">
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        log.action === "created" ? "bg-green-500" :
                        log.action === "moved" ? "bg-blue-500" :
                        log.action === "deleted" ? "bg-red-500" : "bg-gray-400"
                      }`} />
                      <div>
                        <p className="text-gray-700 dark:text-gray-200">{log.details}</p>
                        <p className="text-xs text-gray-400">{log.user} &middot; {new Date(log.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Link href={`/items/${item.id}/edit`} className="btn-primary">Edit Item</Link>
              <button onClick={handleDelete} className="btn-danger">Delete</button>
            </div>
          </div>
        </div>
      </div>

      {/* Print version */}
      <div className="hidden print:block">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{item.name}</h1>
            <p className="text-gray-600 mt-1">{item.category} &middot; {item.location}</p>
            {item.estimatedValue != null && item.estimatedValue > 0 && (
              <p className="text-gray-600">Est. Value: ${item.estimatedValue.toFixed(2)}</p>
            )}
          </div>
          <div className="text-right">
            <svg ref={barcodeRef} />
          </div>
        </div>

        {allPhotos.length > 0 && (
          <div className="flex gap-2 mb-4">
            {allPhotos.slice(0, 3).map((url, i) => (
              <img key={i} src={url} alt={`Photo ${i + 1} of ${item.name}`} className="w-32 h-32 object-cover rounded border" />
            ))}
          </div>
        )}

        <table className="w-full text-sm border-collapse mb-4">
          <tbody>
            <tr className="border-b">
              <td className="py-2 font-medium text-gray-600 w-1/4">Condition</td>
              <td className="py-2">{item.condition || "N/A"}</td>
              <td className="py-2 font-medium text-gray-600 w-1/4">Quantity</td>
              <td className="py-2">{item.quantity}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 font-medium text-gray-600">Location</td>
              <td className="py-2">{item.location}</td>
              <td className="py-2 font-medium text-gray-600">Box / Group</td>
              <td className="py-2">{item.boxNumber || "N/A"}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 font-medium text-gray-600">Barcode</td>
              <td className="py-2 font-mono">{item.barcode}</td>
              <td className="py-2 font-medium text-gray-600">Added</td>
              <td className="py-2">{new Date(item.createdAt).toLocaleDateString()}</td>
            </tr>
          </tbody>
        </table>

        {item.description && (
          <div className="mb-4">
            <p className="font-medium text-gray-600 mb-1">Description</p>
            <p>{item.description}</p>
          </div>
        )}

        {item.notes && (
          <div className="mb-4">
            <p className="font-medium text-gray-600 mb-1">Notes</p>
            <p className="whitespace-pre-wrap">{item.notes}</p>
          </div>
        )}

        <div className="mt-8 border-t pt-4 text-xs text-gray-400 flex justify-between">
          <span>Deb&apos;s Attic Estate Inventory</span>
          <span>Printed {new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </>
  );
}
