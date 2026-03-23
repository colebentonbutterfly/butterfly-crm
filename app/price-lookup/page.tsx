"use client";

import { useState, useRef, useEffect } from "react";
import { useToast } from "@/components/Toast";

interface LookupResult {
  barcode: string;
  searchLinks: {
    google: string;
    ebay: string;
    amazon: string;
  };
}

export default function PriceLookupPage() {
  const { toast } = useToast();
  const [barcode, setBarcode] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function lookup(code: string) {
    const trimmed = code.trim();
    if (!trimmed) return;

    // Generate search links for the manufacturer barcode / product name
    setResult({
      barcode: trimmed,
      searchLinks: {
        google: `https://www.google.com/search?q=${encodeURIComponent(trimmed)}+price`,
        ebay: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(trimmed)}`,
        amazon: `https://www.amazon.com/s?k=${encodeURIComponent(trimmed)}`,
      },
    });
    toast("Search links generated");
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
          // Skip our DA-format barcodes — this is for manufacturer barcodes
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

  return (
    <div className="space-y-6 mt-2">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Price Lookup</h1>
        <p className="text-gray-500 text-sm">Scan a manufacturer barcode (UPC/EAN) to check prices on eBay, Amazon, and Google</p>
      </div>

      {/* Camera scanner */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-700">Scan Manufacturer Barcode</h2>
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
        <h2 className="font-semibold text-gray-700">Manual Entry</h2>
        <p className="text-xs text-gray-500">Enter a UPC/EAN barcode number or product name</p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Enter UPC, EAN, or product name..."
            className="input-field flex-1"
          />
          <button type="submit" className="btn-primary shrink-0">Look Up</button>
        </form>
      </div>

      {/* Results */}
      {result && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700">Price Search Results</h2>
          <p className="text-sm text-gray-500">
            Barcode / Query: <span className="font-mono font-medium">{result.barcode}</span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href={result.searchLinks.google}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-blue-600">G</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">Google</p>
                <p className="text-xs text-gray-500">Search for pricing</p>
              </div>
            </a>

            <a
              href={result.searchLinks.ebay}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors"
            >
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-red-600">e</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">eBay</p>
                <p className="text-xs text-gray-500">Check listings & sold prices</p>
              </div>
            </a>

            <a
              href={result.searchLinks.amazon}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-yellow-300 hover:bg-yellow-50 transition-colors"
            >
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-yellow-700">A</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">Amazon</p>
                <p className="text-xs text-gray-500">Check retail price</p>
              </div>
            </a>
          </div>

          <p className="text-xs text-gray-400">
            Tip: On eBay, use the &quot;Sold Items&quot; filter to see what similar items actually sold for.
          </p>
        </div>
      )}
    </div>
  );
}
