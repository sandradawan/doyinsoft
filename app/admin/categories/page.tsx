import { X } from "lucide-react";
import { adminCategories } from "@/lib/data";
import { addCategory, deleteCategory } from "../actions";

export default async function AdminCategoriesPage() {
  const categories = await adminCategories();

  return (
    <div className="max-w-md">
      <h1 className="text-[22px] font-medium m-0 mb-1">Categories</h1>
      <p className="text-[13px] text-ink-soft m-0 mb-5">
        Used to organise products and guide vendors when listing.
      </p>

      <form action={addCategory} className="flex gap-2 mb-5">
        <input name="name" required placeholder="New category" className="field flex-1" />
        <button className="btn-primary px-4 py-2">Add</button>
      </form>

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <form
            key={c.id}
            action={deleteCategory}
            className="inline-flex items-center gap-1 border border-line rounded-md pl-3 pr-1 py-1"
          >
            <span className="text-[12px]">{c.name}</span>
            <input type="hidden" name="id" value={c.id} />
            <button
              aria-label={`Delete ${c.name}`}
              className="text-ink-faint hover:text-info bg-transparent border-0 cursor-pointer p-1 leading-none"
            >
              <X size={12} />
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
