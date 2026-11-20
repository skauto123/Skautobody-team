"use client";

import { useEffect, useMemo, useState } from "react";
import { monthRange, periodLabel, shiftAnchor, todayIso, weekRange } from "@/lib/dates";
import type { ViewMode } from "@/lib/types";

type PeriodRange = {
  from: string;
  to: string;
  days: string[];
  weeks?: string[][];
};

export function usePeriod(initialView: ViewMode, initialDate: string, path: string) {
  const [view, setView] = useState<ViewMode>(initialView);
  const [anchor, setAnchor] = useState(initialDate);
  const [today, setToday] = useState("");

  useEffect(() => {
    const current = todayIso();
    setToday(current);
    if (!initialDate) setAnchor((value) => value || current);
  }, [initialDate]);

  useEffect(() => {
    if (!anchor) return;
    window.history.replaceState(null, "", `${path}?view=${view}&date=${anchor}`);
  }, [anchor, path, view]);

  const range = useMemo<PeriodRange | null>(
    () => (anchor ? (view === "week" ? weekRange(anchor) : monthRange(anchor)) : null),
    [anchor, view],
  );

  return {
    view,
    setView,
    anchor,
    today,
    range,
    label: anchor ? periodLabel(view, anchor) : "Loading…",
    prev() {
      if (anchor) setAnchor(shiftAnchor(anchor, view, -1));
    },
    next() {
      if (anchor) setAnchor(shiftAnchor(anchor, view, 1));
    },
    goToday() {
      const current = todayIso();
      setToday(current);
      setAnchor(current);
    },
    jump(date: string) {
      setAnchor(date);
    },
  };
}
