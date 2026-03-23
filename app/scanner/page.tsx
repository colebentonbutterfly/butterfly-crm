"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ScannerPage() {
  const router = useRouter();
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function lookupBarcode(code: string) {
    setError("");
    try {
      const res = await fetch(`/api/items/barcode/${encodeURIComponent(code.trim())}`);
      if (res.ok) {
        const item = await res.json();
        router.push(`/items/${item.id}`);
      } else {
        setError(`No item found with barcode: ${code}`);
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

  // Capture frame for barcode detection using BarcodeDetector API (Chrome/Edge)
  useEffect(() => {
    if (!scanning) return;

    let active = true;
    const detect = async () => {
      if (!active || !videoRef.current || !("BarcodeDetector" in window)) return;

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({ formats: ["code_128", "code_39", "ean_13", "ean_8", "upc_a", "qr_code"] });
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0 && active) {
          stopCamera();
          lookupBarcode(barcodes[0].rawValue);
          return;
        }
      } catch {
        // BarcodeDetector not supported, fall through
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
      <h1 className="text-2xl font-bold text-gray-900">Scan Barcode</h1>

      {/* Camera scanner */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-700">Camera Scanner</h2>
        {scanning ? (
          <div className="space-y-3">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video ref={videoRef} className="w-full max-h-80 object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-32 border-2 border-attic-400 rounded-lg" />
              </div>
            </div>
            <p className="text-sm text-gray-500">Point camera at barcode. Works best in Chrome/Edge.</p>
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
        <h2 className="font-semibold text-gray-700">Manual Entry</h2>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Enter barcode (e.g., DA-20260323-00001)"
            className="input-field flex-1"
          />
          <button type="submit" className="btn-primary shrink-0">Look Up</button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
