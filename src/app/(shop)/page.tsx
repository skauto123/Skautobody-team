import { CalendarScreen } from "@/components/calendar-screen";
import { isIsoDate } from "@/lib/dates";
import { requirePageUser } from "@/lib/http";
import type { ViewMode } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const user = await requirePageUser();
  const params = await searchParams;
  const initialView: ViewMode = params.view === "month" ? "month" : "week";
  const initialDate = params.date && isIsoDate(params.date) ? params.date : "";
  return <CalendarScreen user={user} initialView={initialView} initialDate={initialDate} />;
}
