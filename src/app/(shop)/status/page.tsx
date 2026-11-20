import { StatusScreen } from "@/components/status-screen";
import { isIsoDate } from "@/lib/dates";
import { requireOwnerPage } from "@/lib/http";
import type { ViewMode } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StatusPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  await requireOwnerPage();
  const params = await searchParams;
  const initialView: ViewMode = params.view === "month" ? "month" : "week";
  const initialDate = params.date && isIsoDate(params.date) ? params.date : "";
  return <StatusScreen initialView={initialView} initialDate={initialDate} />;
}
