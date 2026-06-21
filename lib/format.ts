import type { Currency } from "./types";

const SYMBOL: Record<Currency, string> = {
  NGN: "₦",
  USD: "$",
};

/**
 * Format a minor-unit amount as a price string.
 * 0 renders as "Free". e.g. (1500000, "NGN") -> "₦15,000".
 */
export function formatPrice(minor: number, currency: Currency): string {
  if (minor === 0) return "Free";
  const major = minor / 100;
  const grouped = major.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${SYMBOL[currency]}${grouped}`;
}

/** Human-readable file size, e.g. 84934656 -> "81 MB". */
export function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Two-letter initials from a full name, e.g. "Studio Adeyemi" -> "SA". */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
