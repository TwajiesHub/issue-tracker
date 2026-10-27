import { Suspense } from "react";
import { Inbox } from "@/components/inbox";

export const metadata = { title: "Inbox" };

export default function InboxPage() {
  return (
    <Suspense fallback={null}>
      <Inbox />
    </Suspense>
  );
}
