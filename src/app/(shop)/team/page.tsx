import { TeamScreen } from "@/components/team-screen";
import { requireOwnerPage } from "@/lib/http";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  await requireOwnerPage();
  return <TeamScreen />;
}
