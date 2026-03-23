"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { CATEGORIES, LOCATIONS } from "@/lib/categories";
import LocationBadge from "@/components/LocationBadge";
import { SkeletonCard, SkeletonGrid } from "@/components/Skeleton";
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
  boxNumber: string | null;
  estimatedValue: number | null;
  tags: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResponse {
  items: Item[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function InventoryPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [batchLocation, setBatchLocation] = useState("");

  const fetchItems = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (location) params.set("location", location);
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);
    params.set("page", String(page));
    params.set("limit", "50");

    fetch(`/api/items?${params}`)
      .then((r) => r.json())
      .then((data: PaginatedResponse) => {
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .finally(() => setLoading(false));
  }, [search, category, location, sortBy, sortOrder, page]);

  useEffect(() => {
    setPage(1);
  }, [search, category, location, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(fetchItems, 300);
    return () => clearTimeout(timer);
  }, [fetchItems]);

  // Read location from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loc = params.get("location");
    const cat = params.get("category");
    if (loc) setLocation(loc);
    if (cat) setCategory(cat);
  }, []);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  }

  async function handleBatchTransfer() {
    if (selected.size === 0 || !batchLocation) return;
    try {
      const res = await fetch("/api/items/batch", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), location: batchLocation }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast(`Moved ${data.updated} item${data.updated !== 1 ? "s" : ""} to ${batchLocation}`);
      setSelected(new Set());
      setBatchMode(false);
      setBatchLocation("");
      fetchItems();
    } catch {
      toast("Failed to move items", "error");
    }
  }

  async function handleExportCSV() {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (location) params.set("location", location);
      params.set("export", "true");

      const res = await fetch(`/api/items?${params}`);
      if (!res.ok) throw new Error("Export failed");
      const allItems = await res.json();

      const headers = ["Name", "Category", "Location", "Condition", "Quantity", "Barcode", "Box/Group", "Est. Value", "Description", "Notes", "Tags", "Created", "Updated"];
      const rows = allItems.map((item: Item) => [
        item.name,
        item.category,
        item.location,
        item.condition || "",
        item.quantity,
        item.barcode,
        item.boxNumber || "",
        item.estimatedValue ?? "",
        (item.description || "").replace(/"/g, '""'),
        (item.notes || "").replace(/"/g, '""'),
        item.tags ? safeJsonParse<string[]>(item.tags, []).join("; ") : "",
        new Date(item.createdAt).toLocaleDateString(),
        new Date(item.updatedAt).toLocaleDateString(),
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((r: string[]) => r.map((v: string | number) => `"${v}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `debs-attic-inventory-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast("CSV exported!");
    } catch {
      toast("Export failed", "error");
    }
  }

  function toggleSort(field: string) {
    if (sortBy === field) setSortOrder((o) => o === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortOrder("asc"); }
  }

  return (
    <div className="space-y-4 mt-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Inventory</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className="btn-secondary text-sm" title="Export as CSV">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            CSV
          </button>
          <button
            onClick={() => setBatchMode(!batchMode)}
            className={`text-sm px-3 py-2 rounded-lg border transition-colors ${batchMode ? "bg-attic-100 dark:bg-attic-900 border-attic-300 text-attic-700 dark:text-attic-300" : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
          >
            {batchMode ? "Cancel" : "Batch"}
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-lg ${viewMode === "list" ? "bg-attic-100 dark:bg-attic-900 text-attic-700 dark:text-attic-300" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-attic-100 dark:bg-attic-900 text-attic-700 dark:text-attic-300" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <Link href="/items/new" className="btn-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <input
              type="text"
              placeholder="Search items, barcodes, boxes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
              maxLength={200}
            />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="select-field">
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={location} onChange={(e) => setLocation(e.target.value)} className="select-field">
            <option value="">All Locations</option>
            {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={`${sortBy}-${sortOrder}`} onChange={(e) => { const [f, o] = e.target.value.split("-"); setSortBy(f); setSortOrder(o as "asc" | "desc"); }} className="select-field">
            <option value="updatedAt-desc">Recently Updated</option>
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="category-asc">Category A-Z</option>
            <option value="quantity-desc">Quantity High-Low</option>
            <option value="estimatedValue-desc">Value High-Low</option>
          </select>
        </div>
      </div>

      {/* Batch actions */}
      {batchMode && (
        <div className="card bg-attic-50 dark:bg-attic-900/30 border-attic-200 dark:border-attic-800 flex flex-wrap items-center gap-3">
          <button onClick={selectAll} className="text-sm text-attic-700 dark:text-attic-300 hover:underline">
            {selected.size === items.length ? "Deselect All" : "Select All"}
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">{selected.size} selected</span>
          <select value={batchLocation} onChange={(e) => setBatchLocation(e.target.value)} className="select-field w-auto">
            <option value="">Move to...</option>
            {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <button onClick={handleBatchTransfer} disabled={selected.size === 0 || !batchLocation} className="btn-primary text-sm disabled:opacity-50">
            Transfer {selected.size > 0 ? `(${selected.size})` : ""}
          </button>
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{total} item{total !== 1 ? "s" : ""} found</p>
        {totalPages > 1 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</p>
        )}
      </div>

      {loading ? (
        viewMode === "list" ? (
          <div className="space-y-2"><SkeletonCard count={5} /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"><SkeletonGrid count={8} /></div>
        )
      ) : items.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 dark:text-gray-500 text-lg mb-2">No items found</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">Try adjusting your search or filters</p>
          <Link href="/items/new" className="btn-primary">Add First Item</Link>
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-2">
          <div className="hidden sm:grid grid-cols-12 gap-4 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {batchMode && <div className="col-span-1" />}
            <div className={`${batchMode ? "col-span-4" : "col-span-5"} cursor-pointer hover:text-gray-700`} onClick={() => toggleSort("name")}>
              Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
            </div>
            <div className="col-span-2 cursor-pointer hover:text-gray-700" onClick={() => toggleSort("category")}>
              Category {sortBy === "category" && (sortOrder === "asc" ? "↑" : "↓")}
            </div>
            <div className="col-span-2">Location</div>
            <div className="col-span-1 cursor-pointer hover:text-gray-700" onClick={() => toggleSort("quantity")}>
              Qty {sortBy === "quantity" && (sortOrder === "asc" ? "↑" : "↓")}
            </div>
            <div className="col-span-2">Barcode</div>
          </div>
          {items.map((item) => {
            const tags: string[] = item.tags ? safeJsonParse<string[]>(item.tags, []) : [];
            return (
              <div key={item.id} className="card block hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  {batchMode && (
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="w-4 h-4 rounded border-gray-300 text-attic-600 focus:ring-attic-500 shrink-0"
                    />
                  )}
                  <Link href={`/items/${item.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                    {item.photoUrl ? (
                      <img src={item.photoUrl} alt={item.name} className="w-16 h-16 object-cover rounded-lg shrink-0" />
                    ) : (
                      <div className="w-16 h-16 bg-attic-100 dark:bg-attic-900 rounded-lg flex items-center justify-center shrink-0">
                        <svg className="w-8 h-8 text-attic-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</h3>
                        <LocationBadge location={item.location} />
                        {tags.map((t) => (
                          <span key={t} className="badge bg-attic-100 dark:bg-attic-900 text-attic-700 dark:text-attic-300 text-[10px]">{t}</span>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {item.category}{item.boxNumber ? ` · ${item.boxNumber}` : ""}
                        {item.estimatedValue ? ` · $${item.estimatedValue}` : ""}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{item.barcode}</p>
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Qty: {item.quantity}</p>
                      {item.condition && <p className="text-xs text-gray-400 dark:text-gray-500">{item.condition}</p>}
                    </div>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className="card hover:shadow-md transition-shadow p-3 relative">
              {batchMode && (
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  className="absolute top-2 left-2 z-10 w-4 h-4 rounded border-gray-300 text-attic-600 focus:ring-attic-500"
                />
              )}
              <Link href={`/items/${item.id}`} className="block">
                {item.photoUrl ? (
                  <img src={item.photoUrl} alt={item.name} className="w-full h-32 object-cover rounded-lg mb-2" />
                ) : (
                  <div className="w-full h-32 bg-attic-100 dark:bg-attic-900 rounded-lg flex items-center justify-center mb-2">
                    <svg className="w-12 h-12 text-attic-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
                <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{item.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {item.category}{item.estimatedValue ? ` · $${item.estimatedValue}` : ""}
                </p>
                <div className="mt-1.5">
                  <LocationBadge location={item.location} />
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            Previous
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 7) pageNum = i + 1;
            else if (page <= 4) pageNum = i + 1;
            else if (page >= totalPages - 3) pageNum = totalPages - 6 + i;
            else pageNum = page - 3 + i;
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                  page === pageNum ? "bg-attic-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      <div className="text-center pb-4">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Press <kbd className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400">Ctrl+K</kbd> for quick search
        </p>
      </div>
    </div>
  );
}
