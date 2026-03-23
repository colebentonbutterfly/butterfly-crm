"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { generateBarcode } from "@/lib/barcode";

interface BarcodeLabel {
  barcode: string;
  label: string;
}

export default function PrintBarcodesPage() {
  const [count, setCount] = useState(24);
  const [prefix, setPrefix] = useState("");
  const [labels, setLabels] = useState<BarcodeLabel[]>([]);
  const [generated, setGenerated] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  function generateBatch() {
    const batch: BarcodeLabel[] = [];
    for (let i = 0; i < count; i++) {
      const code = generateBarcode();
      batch.push({
        barcode: code,
        label: prefix ? `${prefix} #${i + 1}` : "",
      });
    }
    setLabels(batch);
    setGenerated(true);
  }

  const renderBarcodes = useCallback(() => {
    if (!generated) return;
    import("jsbarcode").then((JsBarcode) => {
      labels.forEach((l, i) => {
        const el = document.getElementById(`barcode-${i}`);
        if (el) {
          JsBarcode.default(el, l.barcode, {
            format: "CODE128",
            width: 1.5,
            height: 40,
            displayValue: true,
            fontSize: 10,
            margin: 2,
            textMargin: 1,
          });
        }
      });
    });
  }, [generated, labels]);

  useEffect(() => {
    renderBarcodes();
  }, [renderBarcodes]);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6 mt-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Print Barcode Labels</h1>
          <p className="text-gray-500 text-sm">Generate and print barcode stickers for items</p>
        </div>
      </div>

      {/* Settings */}
      <div className="card print:hidden space-y-4">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200">Label Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Labels</label>
            <select value={count} onChange={(e) => setCount(parseInt(e.target.value))} className="select-field">
              <option value={12}>12 labels (2x6)</option>
              <option value={24}>24 labels (3x8)</option>
              <option value={30}>30 labels (3x10) - Avery 5160</option>
              <option value={48}>48 labels (4x12)</option>
              <option value={60}>60 labels (4x15)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Label Prefix (optional)</label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="input-field"
              placeholder="e.g., Pod 1 Box A"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={generateBatch} className="btn-primary">
            Generate Barcodes
          </button>
          {generated && (
            <button onClick={handlePrint} className="btn-secondary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Labels
            </button>
          )}
        </div>
        {generated && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tip: Print on Avery label sheets or plain paper and cut. Each barcode is unique and ready to stick on items.
          </p>
        )}
      </div>

      {/* Printable labels */}
      {generated && (
        <div ref={printRef}>
          {/* Print-only header */}
          <div className="hidden print:block text-center mb-4">
            <h2 className="text-lg font-bold">Deb&apos;s Attic - Barcode Labels</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Scan with the app to assign to items</p>
          </div>

          <div className="grid grid-cols-3 gap-0 print:gap-0" style={{ pageBreakInside: "avoid" }}>
            {labels.map((label, i) => (
              <div
                key={i}
                className="border border-gray-200 print:border-gray-300 p-2 text-center flex flex-col items-center justify-center"
                style={{ minHeight: "90px", pageBreakInside: "avoid" }}
              >
                {label.label && (
                  <p className="text-[9px] text-gray-600 font-medium mb-0.5 truncate w-full">{label.label}</p>
                )}
                <svg id={`barcode-${i}`} className="max-w-full" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          [class*="print:"] { visibility: visible; }
          ${printRef.current ? `#${printRef.current.id},` : ""}
          [data-print] { visibility: visible; }
          main, main * { visibility: visible; }
          aside, nav, .md\\:ml-64 { margin-left: 0 !important; }
          aside { display: none !important; }
          .card { box-shadow: none; border: none; padding: 0; }
          @page { margin: 0.5in; }
        }
      `}</style>
    </div>
  );
}
