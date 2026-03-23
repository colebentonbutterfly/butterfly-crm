"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, LOCATIONS, CONDITIONS } from "@/lib/categories";
import { useToast } from "@/components/Toast";

interface ItemData {
  id?: string;
  name: string;
  description: string;
  category: string;
  location: string;
  condition: string;
  quantity: number;
  barcode: string;
  photoUrl: string;
  photoUrls: string[];
  notes: string;
  boxNumber: string;
}

export default function ItemForm({ item, isEdit }: { item?: ItemData; isEdit?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<ItemData>({
    name: item?.name || "",
    description: item?.description || "",
    category: item?.category || CATEGORIES[0],
    location: item?.location || "Pod 1",
    condition: item?.condition || "Good",
    quantity: item?.quantity || 1,
    barcode: item?.barcode || "",
    photoUrl: item?.photoUrl || "",
    photoUrls: item?.photoUrls || [],
    notes: item?.notes || "",
    boxNumber: item?.boxNumber || "",
  });

  const set = (field: keyof ItemData, value: string | number | string[]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const allPhotos = [
    ...(form.photoUrl ? [form.photoUrl] : []),
    ...form.photoUrls,
  ];

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (data.url) {
          if (!form.photoUrl) {
            set("photoUrl", data.url);
          } else {
            setForm((prev) => ({ ...prev, photoUrls: [...prev.photoUrls, data.url] }));
          }
        }
      }
      toast("Photo(s) uploaded");
    } catch {
      toast("Upload failed. Please try again.", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removePhoto(url: string) {
    if (url === form.photoUrl) {
      const remaining = form.photoUrls;
      set("photoUrl", remaining[0] || "");
      set("photoUrls", remaining.slice(1));
    } else {
      set("photoUrls", form.photoUrls.filter((u) => u !== url));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast("Please enter an item name.", "error"); return; }

    setSaving(true);
    try {
      const url = isEdit ? `/api/items/${item?.id}` : "/api/items";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Save failed");

      const saved = await res.json();
      toast(isEdit ? "Item updated!" : "Item added!");
      router.push(`/items/${saved.id}`);
    } catch {
      toast("Failed to save item. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-700">Item Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="input-field"
              placeholder="e.g., Cast Iron Skillet"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} className="select-field">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className="input-field"
            rows={2}
            placeholder="Brief description of the item..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <select value={form.location} onChange={(e) => set("location", e.target.value)} className="select-field">
              {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
            <select value={form.condition} onChange={(e) => set("condition", e.target.value)} className="select-field">
              {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => set("quantity", parseInt(e.target.value) || 1)}
              className="input-field"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Box / Group Number</label>
            <input
              type="text"
              value={form.boxNumber}
              onChange={(e) => set("boxNumber", e.target.value)}
              className="input-field"
              placeholder="e.g., Box 12, Pallet A"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
            <input
              type="text"
              value={form.barcode}
              onChange={(e) => set("barcode", e.target.value)}
              className="input-field"
              placeholder="Auto-generated if left blank"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="input-field"
            rows={3}
            placeholder="Any additional notes about the item, its history, value, etc..."
          />
        </div>
      </div>

      {/* Photo upload */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-700">Photos</h2>
        <p className="text-xs text-gray-500">Add multiple photos to document the item from different angles</p>

        {allPhotos.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {allPhotos.map((url, i) => (
              <div key={i} className="relative">
                <img src={url} alt="Item" className="w-24 h-24 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        )}

        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-secondary"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500" />
                Uploading...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {allPhotos.length > 0 ? "Add More Photos" : "Take Photo / Upload"}
              </>
            )}
          </button>
          <p className="text-xs text-gray-400 mt-1">Tap to use camera or select from gallery. You can add multiple photos.</p>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving..." : isEdit ? "Update Item" : "Add Item"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
