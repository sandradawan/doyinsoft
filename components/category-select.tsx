"use client";

import { useRouter } from "next/navigation";

/** Compact category dropdown that navigates, preserving the type & search filters. */
export function CategorySelect({
  categories,
  value,
  type,
  q,
}: {
  categories: string[];
  value: string;
  type: string;
  q: string;
}) {
  const router = useRouter();

  function go(category: string) {
    const params = new URLSearchParams();
    if (type && type !== "all") params.set("type", type);
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  return (
    <select
      aria-label="Category"
      value={value}
      onChange={(e) => go(e.target.value)}
      className="field text-[12px] py-[6px] max-w-[180px]"
    >
      <option value="">All categories</option>
      {categories.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}
