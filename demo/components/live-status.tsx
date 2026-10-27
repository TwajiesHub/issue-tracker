"use client";

import { useStore } from "@/lib/store";

/** One polite live region for status changes ("Restored. Nothing ran."). Nothing else is aria-live. */
export function LiveStatus() {
  const { state } = useStore();
  return (
    <div role="status" aria-live="polite" className="sr-only">
      {state.status}
    </div>
  );
}
