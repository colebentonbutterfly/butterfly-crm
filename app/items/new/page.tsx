"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ItemForm from "@/components/ItemForm";

function NewItemContent() {
  const searchParams = useSearchParams();
  const barcode = searchParams.get("barcode") || "";

  return (
    <ItemForm
      item={barcode ? {
        name: "", description: "", category: "Miscellaneous", location: "Pod 1",
        condition: "Good", quantity: 1, barcode, photoUrl: "", photoUrls: [],
        notes: "", boxNumber: "", boxId: "", estimatedValue: null, tags: [],
      } : undefined}
    />
  );
}

export default function NewItemPage() {
  return (
    <div className="space-y-4 mt-2">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Add New Item</h1>
      <Suspense fallback={<div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-attic-600" /></div>}>
        <NewItemContent />
      </Suspense>
    </div>
  );
}
