"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ItemForm from "@/components/ItemForm";

export default function EditItemPage() {
  const params = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/items/${params.id}`)
      .then((r) => r.json())
      .then((data) => setItem({ ...data, description: data.description || "", condition: data.condition || "Good", photoUrl: data.photoUrl || "", notes: data.notes || "", boxNumber: data.boxNumber || "" }))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-attic-600" />
      </div>
    );
  }

  if (!item) return <p>Item not found.</p>;

  return (
    <div className="space-y-4 mt-2">
      <h1 className="text-2xl font-bold text-gray-900">Edit Item</h1>
      <ItemForm item={item} isEdit />
    </div>
  );
}
