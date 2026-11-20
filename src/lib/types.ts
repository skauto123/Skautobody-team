export type Role = "owner" | "teammate";

export type User = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
};

export type Task = {
  id: string;
  title: string;
  assigneeId: string;
  assigneeName: string;
  date: string;
  completed: boolean;
};

export type DayCount = {
  completed: number;
  total: number;
};

export type PersonStatus = {
  id: string;
  name: string;
  byDay: Record<string, DayCount>;
  completed: number;
  total: number;
};

export type StatusReport = {
  from: string;
  to: string;
  days: string[];
  teammates: PersonStatus[];
  team: {
    byDay: Record<string, DayCount>;
    completed: number;
    total: number;
  };
};

export type ViewMode = "week" | "month";
