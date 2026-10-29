import { IssuesList } from "@/components/issues/issues-list";

export const metadata = { title: "Issues" };

/** Ziki's Issues list. The same moment works here, without the hint. */
export default function IssuesPage() {
  return <IssuesList />;
}
