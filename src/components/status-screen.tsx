"use client";

import { useEffect, useState } from "react";
import { weekdayShort } from "@/lib/dates";
import type { DayCount, StatusReport, ViewMode } from "@/lib/types";
import { api } from "./api";
import { usePeriod } from "./use-period";
import { ViewBar } from "./view-bar";

function fraction(count: DayCount | undefined): string {
  if (!count || count.total === 0) return "—";
  return `${count.completed}/${count.total}`;
}

function tone(count: DayCount | undefined): string {
  if (!count || count.total === 0) return "empty";
  if (count.completed === count.total) return "complete";
  if (count.completed === 0) return "open";
  return "partial";
}

export function StatusScreen({ initialView, initialDate }: { initialView: ViewMode; initialDate: string }) {
  const period = usePeriod(initialView, initialDate, "/status");
  const [report, setReport] = useState<StatusReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const from = period.range?.from ?? "";
  const to = period.range?.to ?? "";

  useEffect(() => {
    if (!from || !to) return;
    let cancelled = false;
    setLoading(true);
    api<StatusReport>(`/api/status?from=${from}&to=${to}`)
      .then((next) => {
        if (cancelled) return;
        setReport(next);
        setError("");
      })
      .catch((caught: Error) => {
        if (!cancelled) setError(caught.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const summary =
    report && report.team.total > 0
      ? `Team ${report.team.completed}/${report.team.total} done ${period.view === "week" ? "this week" : "this month"}.`
      : "No tasks assigned in this period.";

  return (
    <div className="screen">
      <header className="page-head">
        <h1>Status</h1>
        <p className="lede">Completed tasks out of assigned tasks. Open this page again, or refresh, to see the latest check-offs.</p>
      </header>
      <ViewBar
        label={period.label}
        view={period.view}
        onView={period.setView}
        onPrev={period.prev}
        onNext={period.next}
        onToday={period.goToday}
      />
      {error ? (
        <p className="alert" role="alert">
          {error}
        </p>
      ) : null}
      {loading && !report ? <p className="hint">Loading status…</p> : null}
      {report ? <p className="summary">{summary}</p> : null}
      {report && report.teammates.length === 0 ? <p className="hint">Add teammates before status has anyone to show.</p> : null}
      {report && report.teammates.length > 0 && period.view === "week" ? (
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Completed tasks out of assigned tasks for each teammate and day</caption>
            <thead>
              <tr>
                <th scope="col">Teammate</th>
                {report.days.map((day) => (
                  <th key={day} scope="col" className={day === period.today ? "today-col" : undefined}>
                    <span className="dow">{weekdayShort(day)}</span>
                    <span className="num">{Number(day.slice(8))}</span>
                  </th>
                ))}
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {report.teammates.map((mate) => (
                <tr key={mate.id}>
                  <th scope="row">{mate.name}</th>
                  {report.days.map((day) => (
                    <td key={day} className={tone(mate.byDay[day])}>
                      {fraction(mate.byDay[day])}
                    </td>
                  ))}
                  <td className={`total ${tone(mate)}`}>{fraction(mate)}</td>
                </tr>
              ))}
              <tr className="team">
                <th scope="row">Team</th>
                {report.days.map((day) => (
                  <td key={day} className={tone(report.team.byDay[day])}>
                    {fraction(report.team.byDay[day])}
                  </td>
                ))}
                <td className={`total ${tone(report.team)}`}>{fraction(report.team)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
      {report && report.teammates.length > 0 && period.view === "month" && period.range?.weeks ? (
        <div className="status-list">
          <StatusCard
            name="Team"
            count={report.team}
            byDay={report.team.byDay}
            weeks={period.range.weeks}
            from={report.from}
            to={report.to}
            today={period.today}
            wide
          />
          {report.teammates.map((mate) => (
            <StatusCard
              key={mate.id}
              name={mate.name}
              count={mate}
              byDay={mate.byDay}
              weeks={period.range?.weeks ?? []}
              from={report.from}
              to={report.to}
              today={period.today}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StatusCard({
  name,
  count,
  byDay,
  weeks,
  from,
  to,
  today,
  wide = false,
}: {
  name: string;
  count: DayCount;
  byDay: Record<string, DayCount>;
  weeks: string[][];
  from: string;
  to: string;
  today: string;
  wide?: boolean;
}) {
  return (
    <article className={wide ? "status-card wide" : "status-card"}>
      <header>
        <h2>{name}</h2>
        <strong className={tone(count)}>{fraction(count)}</strong>
      </header>
      <div className="mini">
        {["S", "M", "T", "W", "T", "F", "S"].map((letter, index) => (
          <span key={`${letter}${index}`} className="mini-dow">
            {letter}
          </span>
        ))}
        {weeks.flat().map((day) => {
          const inside = day >= from && day <= to;
          const cell = inside ? byDay[day] : undefined;
          return (
            <div
              key={day}
              className={["mini-day", inside ? tone(cell) : "out", day === today ? "today" : ""].filter(Boolean).join(" ")}
            >
              <span>{Number(day.slice(8))}</span>
              {inside ? <strong>{fraction(cell)}</strong> : null}
            </div>
          );
        })}
      </div>
    </article>
  );
}
