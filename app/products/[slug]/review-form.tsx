"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Star } from "lucide-react";
import { addReview, type ReviewState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary px-4 py-2">
      {pending ? "Posting…" : "Post review"}
    </button>
  );
}

export function ReviewForm({ productId, slug }: { productId: string; slug: string }) {
  const [state, action] = useActionState<ReviewState, FormData>(addReview, {});
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);

  return (
    <form action={action} className="max-w-md">
      {state.success && (
        <p className="text-[12px] text-success bg-success-bg rounded-md px-3 py-2 mb-3">
          {state.success}
        </p>
      )}
      {state.error && (
        <p className="text-[12px] text-info bg-info-bg rounded-md px-3 py-2 mb-3">
          {state.error}
        </p>
      )}

      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="rating" value={rating} />

      {/* Star picker */}
      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: 5 }, (_, i) => {
          const n = i + 1;
          const on = (hover || rating) >= n;
          return (
            <button
              key={n}
              type="button"
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              className="bg-transparent border-0 p-0 cursor-pointer leading-none"
            >
              <Star
                size={20}
                className={on ? "text-brand fill-current" : "text-line"}
                aria-hidden
              />
            </button>
          );
        })}
      </div>

      <div className="mb-3">
        <input
          name="author_name"
          className="field w-full"
          placeholder="Your name (optional)"
        />
      </div>
      <div className="mb-3">
        <textarea
          name="body"
          rows={3}
          className="field w-full resize-y"
          placeholder="Share what you think of this software…"
        />
      </div>
      <SubmitButton />
    </form>
  );
}
