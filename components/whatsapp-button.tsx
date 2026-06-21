import { MessageCircle } from "lucide-react";

/**
 * WhatsApp click-to-chat / share button. With `phone` it opens a chat to that
 * number; without, it opens the share sheet. `text` is prefilled.
 */
export function WhatsAppButton({
  phone,
  text,
  label,
  className,
}: {
  phone?: string | null;
  text: string;
  label: string;
  className?: string;
}) {
  const digits = phone?.replace(/[^0-9]/g, "");
  const href = digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={
        className ??
        "inline-flex items-center gap-[6px] text-[13px] rounded-md px-3 py-2 no-underline border border-line text-ink-soft hover:border-brand hover:text-brand transition-colors"
      }
    >
      <MessageCircle size={14} aria-hidden /> {label}
    </a>
  );
}
