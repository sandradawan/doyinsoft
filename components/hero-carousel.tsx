"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

function markFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Auto-advancing product slideshow for the storefront hero. Cycles featured
 * products from the database, pauses on hover/focus, and supports arrows + dots.
 * If a product gains an image_url later, swap the mark tile for an <img>.
 */
export function HeroCarousel({ products }: { products: Product[] }) {
  const slides = products.slice(0, 6);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  useEffect(() => {
    if (paused || count <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 4500);
    return () => clearInterval(t);
  }, [paused, count]);

  if (count === 0) return null;

  const go = (i: number) => setIndex((i + count) % count);

  return (
    <section
      className="relative overflow-hidden rounded-lg mb-6 select-none"
      aria-roledescription="carousel"
      aria-label="Featured software"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Track */}
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((p) => (
          <article
            key={p.id}
            className="w-full shrink-0 bg-brand text-white"
            aria-hidden={slides[index]?.id !== p.id}
          >
            <div className="grid items-center gap-4 p-6 sm:p-8 sm:grid-cols-[1.2fr_1fr] min-h-[230px]">
              {/* Copy */}
              <div>
                <p className="text-[11px] uppercase tracking-wide text-white/70 m-0 mb-2">
                  Featured · {p.category || "Software"}
                </p>
                <h2 className="text-[24px] sm:text-[28px] font-medium leading-tight m-0 mb-2">
                  {p.name}
                </h2>
                <p className="text-[13px] text-white/85 leading-[1.6] m-0 mb-4 max-w-md">
                  {p.tagline || p.description}
                </p>
                <div className="flex items-center gap-4 mb-5">
                  <span className="text-[18px] font-medium">
                    {formatPrice(p.price_minor, p.currency)}
                  </span>
                  {p.rating_count > 0 && (
                    <span className="inline-flex items-center gap-1 text-[12px] text-white/85">
                      <Star size={13} className="fill-current" aria-hidden />
                      {p.rating_avg.toFixed(1)} ({p.rating_count})
                    </span>
                  )}
                </div>
                <Link
                  href={`/products/${p.slug}`}
                  className="inline-block bg-white text-brand text-[13px] font-medium rounded-md px-4 py-2 no-underline hover:bg-white/90 transition-colors"
                >
                  View software
                </Link>
              </div>

              {/* Visual */}
              <div className="hidden sm:flex items-center justify-center">
                <div className="w-full max-w-[220px] aspect-[4/3] rounded-lg bg-white/10 border border-white/15 flex flex-col items-center justify-center gap-3 overflow-hidden">
                  {p.icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.icon_url}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover bg-white/90"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-white/90 text-brand flex items-center justify-center text-[24px] font-medium">
                      {markFor(p.name)}
                    </div>
                  )}
                  <div className="flex gap-1 flex-wrap justify-center px-3">
                    {p.os_badges.slice(0, 3).map((b) => (
                      <span
                        key={b}
                        className="text-[10px] text-white/90 bg-white/10 rounded-md px-2 py-[2px]"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-white/70 m-0">by {p.vendor.name}</p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Arrows */}
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center border-0 cursor-pointer"
          >
            <ChevronLeft size={18} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center border-0 cursor-pointer"
          >
            <ChevronRight size={18} aria-hidden />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-all cursor-pointer border-0 ${
                  i === index ? "w-5 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
