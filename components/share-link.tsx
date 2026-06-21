"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";

/** Read-only referral link with copy + WhatsApp share. */
export function ShareLink({ url, message }: { url: string; message: string }) {
  const [copied, setCopied] = useState(false);
  const wa = `https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — user can still select the text
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="field flex-1 min-w-[220px]"
      />
      <button onClick={copy} className="btn-primary px-3 py-2">
        {copied ? "Copied!" : "Copy"}
      </button>
      <a
        href={wa}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-[6px] text-[13px] rounded-md px-3 py-2 no-underline border border-line text-ink-soft hover:border-brand hover:text-brand transition-colors"
      >
        <MessageCircle size={14} aria-hidden /> WhatsApp
      </a>
    </div>
  );
}
