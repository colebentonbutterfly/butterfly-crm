"use client";

import { useState, useRef, useEffect } from "react";
import { useToast } from "@/components/Toast";

interface EbayItem {
  title: string;
  price: { value: string; currency: string };
  condition: string;
  image: string | null;
  url: string;
  seller: string | null;
}

interface EbayResult {
  configured: boolean;
  query: string;
  priceStats: {
    low: number;
    high: number;
    average: number;
    count: number;
    currency: string;
  } | null;
  items: EbayItem[];
  total: number;
}

export default function PriceLookupPage() {
  const { toast } = useToast();
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [ebayResult, setEbayResult] = useState<EbayResult | null>(null);
  const [ebayConfigured, setEbayConfigured] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function lookup(code: string) {
    const trimmed = code.trim();
    if (!trimmed) return;

    setLoading(true);
    setEbayResult(null);

    try {
      const res = await fetch(`/api/price-lookup?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();

      if (res.status === 503) {
        setEbayConfigured(false);
      } else if (res.ok) {
        setEbayConfigured(true);
        setEbayResult(data);
        toast(`Found ${data.total} eBay listings`);
      } else {
        toast("eBay lookup failed", "error");
      }
    } catch {
      toast("Lookup failed", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    lookup(barcode);
  }

  async function startCamera() {
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      toast("Could not access camera", "error");
      setScanning(false);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }

  useEffect(() => {
    if (!scanning) return;
    let active = true;
    const detect = async () => {
      if (!active || !videoRef.current || !("BarcodeDetector" in window)) return;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"],
        });
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0 && active) {
          const value = barcodes[0].rawValue;
          if (!value.startsWith("DA-")) {
            stopCamera();
            setBarcode(value);
            lookup(value);
            return;
          }
        }
      } catch {
        // BarcodeDetector not available
      }
      if (active) requestAnimationFrame(detect);
    };
    const timer = setTimeout(detect, 500);
    return () => { active = false; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const amazonLink = barcode.trim()
    ? `https://www.amazon.com/s?k=${encodeURIComponent(barcode.trim())}`
    : null;

  return (
    <div className="space-y-6 mt-2">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Price Lookup</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Scan a manufacturer barcode (UPC/EAN) to check eBay prices and search Amazon</p>
      </div>

      {/* Camera scanner */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200">Scan Manufacturer Barcode</h2>
        {scanning ? (
          <div className="space-y-3">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video ref={videoRef} className="w-full max-h-80 object-cover" playsInline muted />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-32 border-2 border-green-400 rounded-lg" />
              </div>
              <div className="absolute bottom-2 left-2 right-2 text-center">
                <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">
                  Scan any UPC/EAN barcode (ignores DA-format barcodes)
                </span>
              </div>
            </div>
            <button onClick={stopCamera} className="btn-secondary">Stop Scanner</button>
          </div>
        ) : (
          <button onClick={startCamera} className="btn-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Scan Product Barcode
          </button>
        )}
      </div>

      {/* Manual entry */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200">Manual Entry</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">Enter a UPC/EAN barcode number or product name</p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Enter UPC, EAN, or product name..."
            className="input-field flex-1"
          />
          <button type="submit" disabled={loading} className="btn-primary shrink-0">
            {loading ? "Searching..." : "Look Up"}
          </button>
        </form>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      )}

      {/* eBay not configured - show fallback links */}
      {ebayConfigured === false && barcode.trim() && (
        <div className="card space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg px-4 py-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              eBay API is not configured yet. Add <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">EBAY_APP_ID</code> and <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">EBAY_CERT_ID</code> to your .env file.
            </p>
          </div>

          <h2 className="font-semibold text-gray-700 dark:text-gray-200">Search Manually</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(barcode.trim())}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-red-300 hover:bg-red-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-red-600 dark:text-red-300">e</span>
              </div>
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-100">eBay</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Search listings manually</p>
              </div>
            </a>

            <a
              href={amazonLink!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-yellow-300 hover:bg-yellow-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-yellow-700 dark:text-yellow-300">A</span>
              </div>
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-100">Amazon</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Check retail price</p>
              </div>
            </a>
          </div>
        </div>
      )}

      {/* eBay results */}
      {ebayResult && (
        <div className="space-y-4">
          {/* Price summary */}
          {ebayResult.priceStats && (
            <div className="card">
              <h2 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">eBay Price Summary</h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">${ebayResult.priceStats.low.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Lowest</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-attic-600 dark:text-attic-400">${ebayResult.priceStats.average.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Average</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">${ebayResult.priceStats.high.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Highest</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                Based on {ebayResult.priceStats.count} active listing{ebayResult.priceStats.count !== 1 ? "s" : ""} ({ebayResult.total} total found)
              </p>
            </div>
          )}

          {/* Listings */}
          {ebayResult.items.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">eBay Listings</h2>
              <div className="space-y-3">
                {ebayResult.items.map((item, i) => (
                  <a
                    key={i}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {item.image ? (
                      <img src={item.image} alt="" className="w-16 h-16 object-cover rounded shrink-0" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center shrink-0">
                        <span className="text-gray-400 text-xs">No img</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{item.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.condition}{item.seller ? ` · ${item.seller}` : ""}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-attic-700 dark:text-attic-300 shrink-0">
                      ${parseFloat(item.price.value).toFixed(2)}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          )}

          {ebayResult.items.length === 0 && (
            <div className="card text-center py-8">
              <p className="text-gray-400 dark:text-gray-500">No eBay listings found for this item</p>
            </div>
          )}

          {/* Amazon link */}
          {amazonLink && (
            <div className="card">
              <h2 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Also Check</h2>
              <a
                href={amazonLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-yellow-300 hover:bg-yellow-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                  <span className="text-lg font-bold text-yellow-700 dark:text-yellow-300">A</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-100">Amazon</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Check retail price on Amazon</p>
                </div>
                <svg className="w-5 h-5 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}

          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Tip: On eBay, check &quot;Sold Items&quot; to see what similar items actually sold for.
          </p>
        </div>
      )}
    </div>
  );
}
