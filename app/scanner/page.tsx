"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

const ITEM_BARCODE_PATTERN = /^DA-\d{8}-\d{5}$/;
const BOX_BARCODE_PATTERN = /^BOX-\d{4,}$/;

export default function ScannerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function lookupBarcode(code: string) {
    setError("");
    setNotFound(null);
    const trimmed = code.trim();

    // Check if it's a box barcode
    if (BOX_BARCODE_PATTERN.test(trimmed)) {
      try {
        const res = await fetch(`/api/boxes/barcode/${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const box = await res.json();
          toast(`Found: Box ${box.number}${box.name ? ` - ${box.name}` : ""}`);
          router.push(`/boxes?pack=${box.id}`);
          return;
        } else {
          setNotFound(trimmed);
          return;
        }
      } catch {
        setError("Lookup failed. Please try again.");
        return;
      }
    }

    // Check if it's an item barcode
    if (!ITEM_BARCODE_PATTERN.test(trimmed)) {
      setError(`Invalid barcode format. Expected: DA-YYYYMMDD-XXXXX (item) or BOX-XXXX (box)`);
      return;
    }

    try {
      const res = await fetch(`/api/items/barcode/${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const item = await res.json();
        toast(`Found: ${item.name}`);
        router.push(`/items/${item.id}`);
      } else {
        setNotFound(trimmed);
      }
    } catch {
      setError("Lookup failed. Please try again.");
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (manualCode.trim()) lookupBarcode(manualCode);
  }

  async function startCamera() {
    setScanning(true);
    setError("");
    setNotFound(null);
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
      setError("Could not access camera. Try manual entry.");
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
        const detector = new (window as any).BarcodeDetector({ formats: ["code_128", "code_39"] });
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0 && active) {
          const value = barcodes[0].rawValue;
          // Accept DA-format item barcodes and BOX-format box barcodes
          if (ITEM_BARCODE_PATTERN.test(value) || BOX_BARCODE_PATTERN.test(value)) {
            stopCamera();
            lookupBarcode(value);
            return;
          }
        }
      } catch {
        // BarcodeDetector not supported
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Scan Barcode</h1>

      {/* Camera scanner */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200">Camera Scanner</h2>
        {scanning ? (
          <div className="space-y-3">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video ref={videoRef} className="w-full max-h-80 object-cover" playsInline muted />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-32 border-2 border-attic-400 rounded-lg" />
              </div>
              <div className="absolute bottom-2 left-2 right-2 text-center">
                <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">
                  Scans item barcodes (DA-...) and box barcodes (BOX-...)
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Point camera at a barcode. Works best in Chrome/Edge.</p>
            <button onClick={stopCamera} className="btn-secondary">Stop Scanner</button>
          </div>
        ) : (
          <button onClick={startCamera} className="btn-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Open Camera Scanner
          </button>
        )}
      </div>

      {/* Manual entry */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200">Manual Entry</h2>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Enter barcode (DA-... or BOX-...)"
            className="input-field flex-1"
          />
          <button type="submit" className="btn-primary shrink-0">Look Up</button>
        </form>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Item barcodes: DA-YYYYMMDD-XXXXX &middot; Box barcodes: BOX-XXXX
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Not found - offer to create */}
      {notFound && (
        <div className="card bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 space-y-3">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            No {notFound.startsWith("BOX-") ? "box" : "item"} found with barcode: <span className="font-mono font-medium">{notFound}</span>
          </p>
          {notFound.startsWith("DA-") && (
            <>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">Would you like to create a new item with this barcode?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/items/new?barcode=${encodeURIComponent(notFound)}`)}
                  className="btn-primary text-sm"
                >
                  Create New Item
                </button>
                <button onClick={() => setNotFound(null)} className="btn-secondary text-sm">Dismiss</button>
              </div>
            </>
          )}
          {notFound.startsWith("BOX-") && (
            <div className="flex gap-2">
              <button onClick={() => setNotFound(null)} className="btn-secondary text-sm">Dismiss</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
