"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleSave } from "@/app/products/[slug]/actions";

export function SaveButton({ productId, initialSaved }: { productId: string; initialSaved: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="inline-flex flex-col items-start">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await toggleSave(productId);
            if (res.error) setMsg(res.error);
            else {
              setSaved(Boolean(res.saved));
              setMsg(null);
            }
          })
        }
        className={[
          "inline-flex items-center gap-2 border rounded-md px-4 py-[10px] text-[13px] cursor-pointer transition-colors",
          saved ? "border-brand text-brand bg-brand-tint" : "border-line text-ink-soft hover:text-ink",
        ].join(" ")}
      >
        <Heart size={16} fill={saved ? "currentColor" : "none"} />
        {saved ? "Saved" : "Save"}
      </button>
      {msg && <span className="text-[11px] text-info mt-1">{msg}</span>}
    </div>
  );
}
