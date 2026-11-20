"use client";

import type { ViewMode } from "@/lib/types";

export function ViewBar({
  label,
  view,
  onView,
  onPrev,
  onNext,
  onToday,
}: {
  label: string;
  view: ViewMode;
  onView: (view: ViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <div className="viewbar">
      <div className="viewbar-nav">
        <button type="button" className="icon-btn" onClick={onPrev} aria-label="Previous">
          ‹
        </button>
        <h2>{label}</h2>
        <button type="button" className="icon-btn" onClick={onNext} aria-label="Next">
          ›
        </button>
      </div>
      <div className="viewbar-actions">
        <button type="button" className="btn" onClick={onToday}>
          Today
        </button>
        <div className="segmented" role="group" aria-label="Calendar view">
          <button type="button" aria-pressed={view === "week"} onClick={() => onView("week")}>
            Week
          </button>
          <button type="button" aria-pressed={view === "month"} onClick={() => onView("month")}>
            Month
          </button>
        </div>
      </div>
    </div>
  );
}
