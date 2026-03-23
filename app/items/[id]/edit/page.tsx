"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ItemForm from "@/components/ItemForm";
import { SkeletonDetail } from "@/components/Skeleton";
import { safeJsonParse } from "@/lib/helpers";

interface ItemFormData {
  id: string;
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

export default function EditItemPage() {
  const params = useParams();
  const [item, setItem] = useState<ItemFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/items/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => setItem({
        ...data,
        description: data.description || "",
        condition: data.condition || "Good",
        photoUrl: data.photoUrl || "",
        photoUrls: safeJsonParse(data.photoUrls, []),
        notes: data.notes || "",
        boxNumber: data.boxNumber || "",
        boxId: data.boxId || "",
        estimatedValue: data.estimatedValue ?? null,
        tags: safeJsonParse(data.tags, []),
      }))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <SkeletonDetail />;
  if (error || !item) return <p className="text-gray-600 dark:text-gray-400 text-center py-12">Item not found.</p>;

  return (
    <div className="space-y-4 mt-2">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Item</h1>
      <ItemForm item={item} isEdit />
    </div>
  );
}
