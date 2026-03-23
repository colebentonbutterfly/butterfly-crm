"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ItemForm from "@/components/ItemForm";
import { SkeletonDetail } from "@/components/Skeleton";

export default function EditItemPage() {
  const params = useParams();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/items/${params.id}`)
      .then((r) => r.json())
      .then((data) => setItem({
        ...data,
        description: data.description || "",
        condition: data.condition || "Good",
        photoUrl: data.photoUrl || "",
        photoUrls: data.photoUrls ? JSON.parse(data.photoUrls) : [],
        notes: data.notes || "",
        boxNumber: data.boxNumber || "",
        estimatedValue: data.estimatedValue ?? null,
        tags: data.tags ? JSON.parse(data.tags) : [],
      }))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <SkeletonDetail />;
  if (!item) return <p>Item not found.</p>;

  return (
    <div className="space-y-4 mt-2">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Item</h1>
      <ItemForm item={item} isEdit />
    </div>
  );
}
