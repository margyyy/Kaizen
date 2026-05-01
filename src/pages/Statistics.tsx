import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type Subject, type StudySession, type StudyTask } from "../db";
import { useData } from "../DataContext";

type FilterRange = "day" | "week" | "month" | "year";
type StatsTab = "sessions" | "tasks";

const PALETTE = [
  "#c9a227", "#7c6fcd", "#e05d5d", "#3b9e77", "#e07b39",
  "#5b8dd9", "#c46db0", "#5dbe8a", "#d4896b", "#6abbcc",
];

export default function Statistics() {
  const { data } = useData();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allTasks, setAllTasks] = useState<StudyTask[]>([]);
  const [filter, setFilter] = useState<FilterRange>("week");
  const [tab, setTab] = useState<StatsTab>("sessions");
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");

  useEffect(() => {
    setSessions((data.studySessions ?? []) as StudySession[]);
    setSubjects((data.subjects ?? []) as Subject[]);
    setAllTasks((data.tasks ?? []) as StudyTask[]);
  }, [data]);

  // ─── Session stats ───────────────────────────────────────
  const { sessionData, totalHours, sessionCount, topSubjectName } = useMemo(() => {
    const { start, end } = getRange(filter);
    const filtered = sessions.filter((s) => {
      const t = new Date(s.endedAt).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });

    const map = new Map<number, number>();
    filtered.forEach((s) => map.set(s.subjectId, (map.get(s.subjectId) ?? 0) + s.minutes));

    const sessionData = subjects
      .map((sub, i) => ({
        name: sub.name,
        minutes: map.get(sub.id ?? 0) ?? 0,
        hours: Number(((map.get(sub.id ?? 0) ?? 0) / 60).toFixed(2)),
        color: sub.color ?? PALETTE[i % PALETTE.length],
      }))
      .filter((d) => d.minutes > 0);

    const totalMin = sessionData.reduce((s, d) => s + d.minutes, 0);
    const sorted = [...sessionData].sort((a, b) => b.minutes - a.minutes);

    return {
      sessionData: sorted,
      totalHours: (totalMin / 60).toFixed(1),
      sessionCount: filtered.length,
      topSubjectName: sorted[0]?.name ?? "—",
    };
  }, [filter, sessions, subjects]);

  // ─── Task stats ──────────────────────────────────────────
  const { taskData, completedCount, pendingCount, completedBySubject } = useMemo(() => {
    const { start, end } = getRange(filter);

    const completed = allTasks.filter((t) => {
      if (!t.completedAt) return false;
      const ct = new Date(t.completedAt).getTime();
      return ct >= start.getTime() && ct <= end.getTime();
    });

    const pending = allTasks.filter((t) => !t.completedAt);

    // group completed by subject
    const map = new Map<number | undefined, number>();
    completed.forEach((t) => map.set(t.subjectId, (map.get(t.subjectId) ?? 0) + 1));

    const completedBySubject = subjects
      .map((sub, i) => ({
        name: sub.name,
        count: map.get(sub.id) ?? 0,
        color: sub.color ?? PALETTE[i % PALETTE.length],
      }))
      .filter((d) => d.count > 0);

    const noSubjectCount = map.get(undefined) ?? 0;
    if (noSubjectCount > 0) {
      completedBySubject.push({ name: "No subject", count: noSubjectCount, color: "#94a3b8" });
    }

    return {
      taskData: completedBySubject,
      completedCount: completed.length,
      pendingCount: pending.length,
      completedBySubject,
    };
  }, [filter, allTasks, subjects]);

  const rangeFilters: { value: FilterRange; label: string }[] = [
    { value: "day", label: "Today" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "year", label: "Year" },
  ];

  return (
    <div className="space-y-5 w-full">
      <h2 className="text-2xl font-semibold tracking-tight">Statistics</h2>

      {/* Tab + range filter row */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        {/* Tab toggle */}
        <div className="join">
          <button
            className={`btn btn-sm join-item ${tab === "sessions" ? "btn-primary" : "btn-ghost border border-base-300"}`}
            onClick={() => setTab("sessions")}
          >
            Sessions
          </button>
          <button
            className={`btn btn-sm join-item ${tab === "tasks" ? "btn-primary" : "btn-ghost border border-base-300"}`}
            onClick={() => setTab("tasks")}
          >
            Tasks
          </button>
        </div>

        <div className="flex gap-2 items-center">
          {/* Range filter */}
          <div className="join">
            {rangeFilters.map((f) => (
              <button
                key={f.value}
                className={`btn btn-sm join-item ${filter === f.value ? "btn-primary" : "btn-ghost border border-base-300"}`}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Chart type — only for sessions bar/pie */}
          {tab === "sessions" && (
            <div className="join">
              <button
                className={`btn btn-sm join-item ${chartType === "bar" ? "btn-primary" : "btn-ghost border border-base-300"}`}
                onClick={() => setChartType("bar")}
              >
                Bar
              </button>
              <button
                className={`btn btn-sm join-item ${chartType === "pie" ? "btn-primary" : "btn-ghost border border-base-300"}`}
                onClick={() => setChartType("pie")}
              >
                Pie
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── SESSIONS TAB ── */}
      {tab === "sessions" && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Study hours" value={`${totalHours}h`} />
            <StatCard label="Sessions" value={String(sessionCount)} />
            <StatCard label="Top subject" value={topSubjectName} />
          </div>

          {/* Chart */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              {sessionData.length === 0 ? (
                <EmptyChart message="No study sessions in this period." />
              ) : chartType === "bar" ? (
                <BarChartView data={sessionData.map(d => ({ ...d, value: d.hours, unit: "h" }))} />
              ) : (
                <PieChartView data={sessionData.map(d => ({ ...d, value: d.hours }))} unit="h" />
              )}
            </div>
          </div>

          {/* Breakdown */}
          {sessionData.length > 0 && (
            <BreakdownCard
              rows={sessionData.map((d) => ({
                name: d.name,
                value: `${d.hours}h`,
                pct: d.minutes / sessionData.reduce((s, x) => s + x.minutes, 0),
                color: d.color,
              }))}
            />
          )}
        </>
      )}

      {/* ── TASKS TAB ── */}
      {tab === "tasks" && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Completed" value={String(completedCount)} />
            <StatCard label="Pending" value={String(pendingCount)} />
            <StatCard label="Total" value={String(allTasks.length)} />
          </div>

          {/* Chart */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              {taskData.length === 0 ? (
                <EmptyChart message="No tasks completed in this period." />
              ) : (
                <BarChartView
                  data={taskData.map(d => ({ ...d, value: d.count, unit: "" }))}
                  yLabel="tasks"
                />
              )}
            </div>
          </div>

          {/* Task list */}
          {completedCount > 0 && (
            <BreakdownCard
              rows={completedBySubject.map((d) => ({
                name: d.name,
                value: `${d.count} task${d.count !== 1 ? "s" : ""}`,
                pct: d.count / completedCount,
                color: d.color,
              }))}
            />
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body py-4 px-5">
        <div className="text-xl font-semibold tabular-nums truncate">{value}</div>
        <div className="text-xs text-base-content/50 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-base-content/35">
      <p className="text-sm">{message}</p>
    </div>
  );
}

function BarChartView({
  data,
  yLabel,
}: {
  data: { name: string; value: number; color: string; unit?: string }[];
  yLabel?: string;
}) {
  const unit = data[0]?.unit ?? "";
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 48 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.07} vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fill: "currentColor", opacity: 0.55 }}
          tickLine={false}
          axisLine={false}
          angle={-25}
          textAnchor="end"
          interval={0}
          height={52}
        />
        <YAxis
          unit={unit}
          tick={{ fontSize: 12, fill: "currentColor", opacity: 0.55 }}
          tickLine={false}
          axisLine={false}
          width={unit ? 38 : 28}
          label={
            yLabel
              ? { value: yLabel, angle: -90, position: "insideLeft", offset: 14, style: { fontSize: 11, opacity: 0.4 } }
              : undefined
          }
        />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: "currentColor", opacity: 0.05 }} />
        <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={56}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function PieChartView({
  data,
  unit,
}: {
  data: { name: string; value: number; color: string }[];
  unit?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="46%"
          outerRadius={105}
          innerRadius={50}
          paddingAngle={2}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip unit={unit ?? ""} />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(v) => <span style={{ fontSize: 12, opacity: 0.65 }}>{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function BreakdownCard({
  rows,
}: {
  rows: { name: string; value: string; pct: number; color: string }[];
}) {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <h3 className="text-xs font-semibold text-base-content/50 uppercase tracking-widest mb-3">
          Breakdown
        </h3>
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.name}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium">{r.name}</span>
                <span className="text-base-content/55 tabular-nums">
                  {r.value} &middot; {(r.pct * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-base-200 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${r.pct * 100}%`, backgroundColor: r.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-lg bg-base-100 border border-base-300 shadow-md px-3 py-2 text-sm">
      <p className="font-medium text-base-content mb-0.5">{label ?? d.name}</p>
      <p style={{ color: d.fill ?? d.color }}>
        {d.value}{unit}
      </p>
    </div>
  );
}

function getRange(filter: FilterRange) {
  const now = new Date();
  let start: Date;
  if (filter === "day") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (filter === "week") {
    const diff = (now.getDay() + 6) % 7;
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
  } else if (filter === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    start = new Date(now.getFullYear(), 0, 1);
  }
  return { start, end: now };
}
