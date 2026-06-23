// Gift-card visual themes. Plain module (no server/client directive) so both the
// buy gallery and the server-rendered success page / emails can use it.

export interface GiftDesign {
  key: string;
  label: string;
  emoji: string;
  from: string; // gradient start (hex)
  to: string; // gradient end (hex)
  /** Suggested amounts (naira) that suit this occasion. */
  suggested: number[];
}

export const GIFT_DESIGNS: GiftDesign[] = [
  { key: "classic", label: "Classic", emoji: "🎁", from: "#059669", to: "#064e3b", suggested: [2000, 5000, 10000] },
  { key: "birthday", label: "Birthday", emoji: "🎂", from: "#d946ef", to: "#6b21a8", suggested: [3000, 5000, 10000] },
  { key: "thanks", label: "Thank you", emoji: "🙏", from: "#f59e0b", to: "#b45309", suggested: [1000, 2000, 5000] },
  { key: "love", label: "With love", emoji: "❤️", from: "#f43f5e", to: "#9f1239", suggested: [5000, 10000, 20000] },
  { key: "festive", label: "Festive", emoji: "🎄", from: "#dc2626", to: "#047857", suggested: [5000, 10000, 25000] },
  { key: "eid", label: "Eid Mubarak", emoji: "🌙", from: "#0d9488", to: "#155e75", suggested: [2000, 5000, 10000] },
  { key: "congrats", label: "Congrats", emoji: "🎉", from: "#6366f1", to: "#6d28d9", suggested: [5000, 10000, 20000] },
  { key: "welcome", label: "Welcome", emoji: "👋", from: "#0ea5e9", to: "#1d4ed8", suggested: [2000, 5000, 10000] },
];

export function giftDesign(key?: string | null): GiftDesign {
  return GIFT_DESIGNS.find((d) => d.key === key) ?? GIFT_DESIGNS[0];
}

/** Inline CSS gradient for a design (used in JSX style + email HTML). */
export function giftGradient(d: GiftDesign): string {
  return `linear-gradient(135deg, ${d.from}, ${d.to})`;
}
