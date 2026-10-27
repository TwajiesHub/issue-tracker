import { AgentPage } from "@/components/agent-page";

export const metadata = { title: "Agent" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AgentPage id={id} />;
}
