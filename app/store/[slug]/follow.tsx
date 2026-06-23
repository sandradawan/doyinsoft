"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { toggleFollowAction } from "./actions";

export function FollowButton({
  vendorId,
  initialFollowing,
  initialCount,
  signedIn,
  signInHref,
}: {
  vendorId: string;
  initialFollowing: boolean;
  initialCount: number;
  signedIn: boolean;
  signInHref: string;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [pending, start] = useTransition();

  const base =
    "inline-flex items-center gap-[6px] text-[13px] rounded-md px-3 py-2 cursor-pointer transition-colors no-underline";

  if (!signedIn) {
    return (
      <Link href={signInHref} className={`${base} bg-brand text-white hover:bg-brand-hover`}>
        <Bell size={14} /> Follow{initialCount > 0 ? ` · ${initialCount}` : ""}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await toggleFollowAction(vendorId);
          setFollowing(r.following);
          setCount(r.count);
        })
      }
      className={
        following
          ? `${base} border border-line text-ink-soft bg-transparent hover:border-line-strong`
          : `${base} bg-brand text-white hover:bg-brand-hover border-0`
      }
    >
      {following ? <Check size={14} /> : <Bell size={14} />}
      {following ? "Following" : "Follow"}
      {count > 0 ? ` · ${count}` : ""}
    </button>
  );
}
