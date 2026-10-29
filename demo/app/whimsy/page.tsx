import { IssuesList } from "@/components/issues/issues-list";

export const metadata = { title: "Issues" };

/** The Issues list with the moment ready on one row: bots confirmed it, it needs one more upvote. */
export default function WhimsyPage() {
  return <IssuesList whimsy />;
}
