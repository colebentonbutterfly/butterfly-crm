import ItemForm from "@/components/ItemForm";

export default function NewItemPage() {
  return (
    <div className="space-y-4 mt-2">
      <h1 className="text-2xl font-bold text-gray-900">Add New Item</h1>
      <ItemForm />
    </div>
  );
}
