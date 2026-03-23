"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, LOCATIONS, CONDITIONS } from "@/lib/categories";
import { useToast } from "@/components/Toast";

interface TagOption {
  id: string;
  name: string;
  color: string;
}

interface BoxOption {
  id: string;
  number: number;
  name: string | null;
  barcode: string;
}

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
  boxId: string;
  estimatedValue: number | null;
  tags: string[];
}

export default function ItemForm({ item, isEdit }: { item?: ItemData; isEdit?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [availableTags, setAvailableTags] = useState<TagOption[]>([]);
  const [availableBoxes, setAvailableBoxes] = useState<BoxOption[]>([]);
  const [duplicates, setDuplicates] = useState<{ id: string; name: string; location: string }[]>([]);
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
    boxId: item?.boxId || "",
    estimatedValue: item?.estimatedValue ?? null,
    tags: item?.tags || [],
  });

  const set = (field: keyof ItemData, value: string | number | string[] | null) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const allPhotos = [
    ...(form.photoUrl ? [form.photoUrl] : []),
    ...form.photoUrls,
  ];

  // Load available tags and boxes
  useEffect(() => {
    fetch("/api/tags").then((r) => r.json()).then(setAvailableTags).catch(() => {});
    fetch("/api/boxes").then((r) => r.json()).then((boxes: BoxOption[]) => setAvailableBoxes(boxes)).catch(() => {});
  }, []);

  // Duplicate detection (debounced)
  useEffect(() => {
    if (isEdit || !form.name || form.name.length < 3) {
      setDuplicates([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/items/duplicates?name=${encodeURIComponent(form.name)}`)
        .then((r) => r.json())
        .then((items) => setDuplicates(items))
        .catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [form.name, isEdit]);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        // Client-side size check
        if (file.size > 10 * 1024 * 1024) {
          toast("File too large (max 10MB)", "error");
          continue;
        }
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          toast(data.error || "Upload failed", "error");
          continue;
        }
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

  function toggleTag(tagName: string) {
    if (form.tags.includes(tagName)) {
      set("tags", form.tags.filter((t) => t !== tagName));
    } else {
      set("tags", [...form.tags, tagName]);
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
        body: JSON.stringify({
          ...form,
          estimatedValue: form.estimatedValue || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Save failed");
      }

      const saved = await res.json();
      toast(isEdit ? "Item updated!" : "Item added!");
      router.push(`/items/${saved.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save item.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200">Item Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Item Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="input-field"
              placeholder="e.g., Cast Iron Skillet"
              required
              maxLength={255}
            />
            {/* Duplicate warning */}
            {duplicates.length > 0 && (
              <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300">Similar items found:</p>
                {duplicates.map((d) => (
                  <p key={d.id} className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">
                    &bull; {d.name} ({d.location})
                  </p>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Category</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} className="select-field">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className="input-field"
            rows={2}
            placeholder="Brief description of the item..."
            maxLength={5000}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Location</label>
            <select value={form.location} onChange={(e) => set("location", e.target.value)} className="select-field">
              {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Condition</label>
            <select value={form.condition} onChange={(e) => set("condition", e.target.value)} className="select-field">
              {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Quantity</label>
            <input
              type="number"
              min={1}
              max={99999}
              value={form.quantity}
              onChange={(e) => set("quantity", parseInt(e.target.value) || 1)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Est. Value ($)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.estimatedValue ?? ""}
              onChange={(e) => set("estimatedValue", e.target.value ? parseFloat(e.target.value) : null)}
              className="input-field"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Box / Group</label>
            <select
              value={form.boxId}
              onChange={(e) => {
                const boxId = e.target.value;
                const box = availableBoxes.find((b) => b.id === boxId);
                set("boxId", boxId);
                set("boxNumber", box ? `Box ${box.number}${box.name ? ` - ${box.name}` : ""}` : "");
              }}
              className="select-field"
            >
              <option value="">No Box</option>
              {availableBoxes.map((box) => (
                <option key={box.id} value={box.id}>
                  Box {box.number}{box.name ? ` - ${box.name}` : ""} ({box.barcode})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Barcode</label>
            <input
              type="text"
              value={form.barcode}
              onChange={(e) => set("barcode", e.target.value)}
              className="input-field"
              placeholder="Auto-generated if left blank"
              maxLength={100}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="input-field"
            rows={3}
            placeholder="Any additional notes about the item, its history, value, etc..."
            maxLength={10000}
          />
        </div>
      </div>

      {/* Tags */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200">Tags</h2>
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.name)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                form.tags.includes(tag.name)
                  ? "text-white border-transparent"
                  : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300"
              }`}
              style={form.tags.includes(tag.name) ? { backgroundColor: tag.color } : {}}
            >
              {tag.name}
            </button>
          ))}
          {availableTags.length === 0 && (
            <p className="text-xs text-gray-400">Loading tags...</p>
          )}
        </div>
      </div>

      {/* Photo upload */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200">Photos</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">Add multiple photos to document the item from different angles (max 10MB each, JPEG/PNG/WebP/GIF)</p>

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
            accept="image/jpeg,image/png,image/webp,image/gif"
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
