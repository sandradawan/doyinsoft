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

// Deep, refined gradients (jewel tones) for a premium, professional card face.
export const GIFT_DESIGNS: GiftDesign[] = [
  { key: "classic", label: "Classic", emoji: "🎁", from: "#0b5e46", to: "#022c22", suggested: [2000, 5000, 10000] },
  { key: "birthday", label: "Birthday", emoji: "🎂", from: "#6d28d9", to: "#2e1065", suggested: [3000, 5000, 10000] },
  { key: "thanks", label: "Thank you", emoji: "🤍", from: "#a16207", to: "#422006", suggested: [1000, 2000, 5000] },
  { key: "love", label: "With love", emoji: "❤", from: "#9f1239", to: "#4c0519", suggested: [5000, 10000, 20000] },
  { key: "festive", label: "Festive", emoji: "❄", from: "#14532d", to: "#7f1d1d", suggested: [5000, 10000, 25000] },
  { key: "eid", label: "Eid Mubarak", emoji: "🌙", from: "#0f766e", to: "#042f2e", suggested: [2000, 5000, 10000] },
  { key: "congrats", label: "Congrats", emoji: "✦", from: "#3730a3", to: "#1e1b4b", suggested: [5000, 10000, 20000] },
  { key: "midnight", label: "Midnight", emoji: "◆", from: "#1e293b", to: "#020617", suggested: [5000, 10000, 50000] },
];

export function giftDesign(key?: string | null): GiftDesign {
  return GIFT_DESIGNS.find((d) => d.key === key) ?? GIFT_DESIGNS[0];
}

/** Inline CSS gradient for a design (used in JSX style + email HTML). */
export function giftGradient(d: GiftDesign): string {
  return `linear-gradient(135deg, ${d.from}, ${d.to})`;
}
