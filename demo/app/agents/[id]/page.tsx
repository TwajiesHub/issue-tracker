import { AgentPage } from "@/components/agent-page";

const NAMES: Record<string, string> = { nova: "Nova", kite: "Kite", specialone: "SpecialOne" };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: NAMES[id] ?? "Agent" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AgentPage id={id} />;
}
