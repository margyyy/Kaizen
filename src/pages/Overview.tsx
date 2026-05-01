import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  format,
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import type { StudySession, StudyTask, Subject } from "../db";
import { useNavigate } from "react-router-dom";
import { useData } from "../DataContext";

type FilterRange = "day" | "week" | "month" | "year";

const CELL_SIZE = 60;
const YEAR_CELL_SIZE = 18;
const HEAT_ALPHA = [0, 0.2, 0.45, 0.7, 0.92];

export default function Overview() {
  const navigate = useNavigate();
  const { data, setData } = useData();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filter, setFilter] = useState<FilterRange>("month");
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskSubjectId, setTaskSubjectId] = useState<number | "">("");
  const isReadOnlyYear = filter === "year";
  const activeCellSize = isReadOnlyYear ? YEAR_CELL_SIZE : CELL_SIZE;

  useEffect(() => {
    setSessions((data.studySessions ?? []) as StudySession[]);
    setSubjects((data.subjects ?? []) as Subject[]);
    setTasks((data.tasks ?? []) as StudyTask[]);
  }, [data]);

  useEffect(() => {
    if (filter === "year") {
      setIsTaskModalOpen(false);
      setSelectedDate(null);
    }
  }, [filter]);

  const rangeFilters: { value: FilterRange; label: string }[] = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "year", label: "Year" },
  ];

  const { start, end } = useMemo(
    () => getDisplayRange(filter, anchorDate),
    [filter, anchorDate],
  );
  const days = useMemo(() => listDays(start, end), [start, end]);
  const todayLabel = format(new Date(), "d MMMM");
  const todayStart = startOfDay(new Date());
  const rangeLabel = useMemo(
    () => getRangeLabel(filter, anchorDate, start, end),
    [filter, anchorDate, start, end],
  );

  const {
    minutesByDay,
    maxMinutes,
    totalMinutes,
    sessionCount,
    topSubject,
    hoursBySubject,
  } = useMemo(() => {
    const map = new Map<string, number>();
    const inRange = sessions.filter((s) => {
      const t = new Date(s.endedAt).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });

    inRange.forEach((s) => {
      const key = toDateKey(new Date(s.endedAt));
      map.set(key, (map.get(key) ?? 0) + s.minutes);
    });

    const subjectMinutes = new Map<number, number>();
    inRange.forEach((s) =>
      subjectMinutes.set(
        s.subjectId,
        (subjectMinutes.get(s.subjectId) ?? 0) + s.minutes,
      ),
    );

    const hoursBySubject = subjects
      .map((sub) => {
        const minutes = subjectMinutes.get(sub.id ?? 0) ?? 0;
        return {
          name: sub.name,
          minutes,
          hours: Number((minutes / 60).toFixed(2)),
          color: sub.color ?? "#64748b",
        };
      })
      .filter((s) => s.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes);

    const totalMinutes = hoursBySubject.reduce((sum, s) => sum + s.minutes, 0);
    const maxMinutes = Math.max(0, ...Array.from(map.values()));

    return {
      minutesByDay: map,
      maxMinutes,
      totalMinutes,
      sessionCount: inRange.length,
      topSubject: hoursBySubject[0]?.name ?? "—",
      hoursBySubject,
    };
  }, [sessions, start, end, subjects]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, StudyTask[]>();
    tasks.forEach((t) => {
      const key = t.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return map;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const date = new Date(`${t.date}T00:00:00`);
      return (
        date.getTime() >= start.getTime() && date.getTime() <= end.getTime()
      );
    });
  }, [tasks, start, end]);

  const { completedTasks, pendingTasks } = useMemo(() => {
    const completed = filteredTasks.filter((t) => Boolean(t.completedAt));
    const pending = filteredTasks.filter((t) => !t.completedAt);
    return { completedTasks: completed.length, pendingTasks: pending.length };
  }, [filteredTasks]);

  const calendarCells = useMemo(() => {
    if (filter === "month" || filter === "year") {
      return withWeekPadding(days);
    }
    return days.map((d) => ({ date: d, isPadding: false }));
  }, [days, filter]);

  const yearMonths = useMemo(() => {
    if (filter !== "year") return [] as Date[];
    return getYearMonths(anchorDate);
  }, [filter, anchorDate]);

  const openTasksForDate = (date: Date, hasTasks: boolean) => {
    const key = toDateKey(date);
    const isPast = startOfDay(date).getTime() < todayStart.getTime();
    if (isPast && !hasTasks) return;
    setSelectedDate(key);
    setTaskTitle("");
    setTaskSubjectId("");
    setIsTaskModalOpen(true);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !taskTitle.trim()) return;
    const id = data.nextId;
    setData((prev) => ({
      ...prev,
      nextId: prev.nextId + 1,
      tasks: [
        ...prev.tasks,
        {
          id,
          userId: 0,
          title: taskTitle.trim(),
          date: selectedDate,
          subjectId: taskSubjectId === "" ? undefined : Number(taskSubjectId),
        } as StudyTask,
      ],
    }));
    setTaskTitle("");
  };

  const handleStartTask = (task: StudyTask) => {
    sessionStorage.setItem(
      "pendingTask",
      JSON.stringify({ taskId: task.id, subjectId: task.subjectId ?? "" }),
    );
    navigate("/");
  };

  const selectedTasks = selectedDate
    ? (tasksByDay.get(selectedDate) ?? [])
    : [];
  const canCreateForSelected = selectedDate
    ? startOfDay(new Date(`${selectedDate}T00:00:00`)).getTime() >=
      todayStart.getTime()
    : false;

  const shiftRange = (direction: -1 | 1) => {
    setAnchorDate((current) => moveAnchorDate(current, filter, direction));
  };

  const isDayOrWeek = filter === "day" || filter === "week";

  return (
    <div className="space-y-5 w-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
        <div className="card bg-base-100 shadow-sm">
          <div
            className={`card-body space-y-4 ${isDayOrWeek ? "flex flex-col justify-center min-h-[420px]" : ""} ${filter === "year" ? "h-full" : ""}`}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-xs uppercase tracking-widest text-base-content/50">
                  Study heatmap
                </div>
                <div className="text-sm text-base-content/60">
                  {rangeLabel}
                  {filter === "month" && (
                    <span className="ml-2 text-base-content/45">
                      Today &middot; {todayLabel}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="join">
                  <button
                    className="btn btn-sm join-item"
                    onClick={() => shiftRange(-1)}
                  >
                    &#9664;
                  </button>
                  <button
                    className="btn btn-sm join-item"
                    onClick={() => setAnchorDate(new Date())}
                  >
                    Today
                  </button>
                  <button
                    className="btn btn-sm join-item"
                    onClick={() => shiftRange(1)}
                  >
                    &#9654;
                  </button>
                </div>
                <HeatLegend maxMinutes={maxMinutes} />
              </div>
            </div>

            {filter === "week" ? (
              <WeekView
                days={days}
                minutesByDay={minutesByDay}
                maxMinutes={maxMinutes}
                tasksByDay={tasksByDay}
                todayStart={todayStart}
                activeCellSize={activeCellSize}
                openTasksForDate={openTasksForDate}
              />
            ) : filter !== "year" ? (
              <div
                className={
                  filter === "day" ? "overview-day-wrap" : undefined
                }
              >
                <div
                  className="grid gap-1 overview-grid"
                  style={
                    {
                      ...gridStyleForFilter(
                        filter,
                        calendarCells.length,
                        activeCellSize,
                      ),
                      "--cell-size": `${activeCellSize}px`,
                    } as any
                  }
                >
                  {calendarCells.map((cell, i) => {
                    if (cell.isPadding || !cell.date) {
                      return (
                        <div
                          key={`pad-${i}`}
                          style={{
                            width: activeCellSize,
                            height: activeCellSize,
                          }}
                        />
                      );
                    }

                    const key = toDateKey(cell.date);
                    const minutes = minutesByDay.get(key) ?? 0;
                    const intensity = getIntensity(minutes, maxMinutes);
                    const hasTasks = Boolean(tasksByDay.get(key)?.length);
                    const isPast =
                      startOfDay(cell.date).getTime() < todayStart.getTime();
                    const isDisabled = (isPast && !hasTasks) || isReadOnlyYear;
                    const isToday = key === toDateKey(new Date());

                    return (
                      <button
                        key={key}
                        type="button"
                        className={`relative rounded-[6px] border border-base-300/60 disabled:opacity-40 disabled:cursor-not-allowed ${isToday ? "overview-today-pulse" : ""}`}
                        style={{
                          width: activeCellSize,
                          height: activeCellSize,
                          backgroundColor: heatColorFor(intensity),
                        }}
                        title={`${format(cell.date, "EEE, MMM d")} · ${minutes} min`}
                        onClick={() => {
                          if (!isReadOnlyYear) {
                            openTasksForDate(cell.date!, hasTasks);
                          }
                        }}
                        disabled={isDisabled}
                      >
                        {filter === "month" && (
                          <span className="absolute left-0.5 top-0.5 text-[11px] text-base-content/70">
                            {format(cell.date, "d")}
                          </span>
                        )}
                        {hasTasks && (
                          <span className="absolute left-1/2 top-1/2 w-3 h-3 bg-base-content/70 rounded-full -translate-x-1/2 -translate-y-1/2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div
                  className="grid w-full gap-x-1 gap-y-1 overview-year-grid"
                  style={
                    {
                      "--year-cell-size": "clamp(8px, 1.2vw, 14px)",
                    } as any
                  }
                >
                  {yearMonths.map((monthDate) => {
                    const monthCells = getMonthCells(monthDate);
                    return (
                      <div
                        key={monthDate.toISOString()}
                        className="space-y-0.5"
                      >
                        <div className="text-[10px] uppercase tracking-widest text-base-content/50">
                          {format(monthDate, "MMMM")}
                        </div>
                        <div
                          className="grid gap-0"
                          style={{
                            gridTemplateRows: `repeat(7, var(--year-cell-size, ${YEAR_CELL_SIZE}px))`,
                            gridAutoFlow: "column",
                            gridAutoColumns: `var(--year-cell-size, ${YEAR_CELL_SIZE}px)`,
                            columnGap: 0,
                          }}
                        >
                          {monthCells.map((cell, idx) => {
                            if (!cell) {
                              return (
                                <div
                                  key={`m-${monthDate.getMonth()}-pad-${idx}`}
                                  style={{
                                    width: "var(--year-cell-size, 18px)",
                                    height: "var(--year-cell-size, 18px)",
                                  }}
                                />
                              );
                            }
                            const key = toDateKey(cell);
                            const minutes = minutesByDay.get(key) ?? 0;
                            const intensity = getIntensity(minutes, maxMinutes);
                            return (
                              <div
                                key={key}
                                className="rounded-[3px] border border-base-300/60"
                                style={{
                                  width: "var(--year-cell-size, 18px)",
                                  height: "var(--year-cell-size, 18px)",
                                  backgroundColor: heatColorFor(intensity),
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Total hours"
              value={`${(totalMinutes / 60).toFixed(1)}h`}
            />
            <StatCard label="Sessions" value={String(sessionCount)} />
            <StatCard label="Top subject" value={topSubject} />
            <StatCard
              label="Tasks"
              value={`${completedTasks}/${completedTasks + pendingTasks}`}
            />
          </div>

          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <div className="text-xs uppercase tracking-widest text-base-content/50">
                Hours by subject
              </div>
              {hoursBySubject.length === 0 ? (
                <div className="text-sm text-base-content/50 mt-3">
                  No sessions in this range.
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {hoursBySubject.map((row) => (
                    <div
                      key={row.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: row.color }}
                        />
                        <span className="font-medium">{row.name}</span>
                      </div>
                      <span className="tabular-nums text-base-content/60">
                        {row.hours}h
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <div className="text-xs uppercase tracking-widest text-base-content/50">
                Tasks
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-base-content/60">Completed</span>
                  <span className="tabular-nums font-medium">
                    {completedTasks}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-base-content/60">Pending</span>
                  <span className="tabular-nums font-medium">
                    {pendingTasks}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-xs uppercase tracking-widest text-base-content/50">
                Subjects histogram
              </div>
              <div className="text-sm text-base-content/60">{rangeLabel}</div>
            </div>
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
          </div>

          {hoursBySubject.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-base-content/45">
              No subjects studied in this range.
            </div>
          ) : chartType === "bar" ? (
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={hoursBySubject.map((d) => ({ ...d, value: d.hours }))}
                  margin={{ top: 8, right: 8, left: -8, bottom: 48 }}
                >
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
                    unit="h"
                    tick={{ fontSize: 12, fill: "currentColor", opacity: 0.55 }}
                    tickLine={false}
                    axisLine={false}
                    width={38}
                  />
                  <Tooltip
                    content={<OverviewChartTooltip unit="h" />}
                    cursor={{ fill: "currentColor", opacity: 0.05 }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={64}>
                    {hoursBySubject.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={hoursBySubject.map((d) => ({ ...d, value: d.hours }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="48%"
                    outerRadius={120}
                    innerRadius={60}
                    paddingAngle={2}
                  >
                    {hoursBySubject.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<OverviewChartTooltip unit="h" />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {isTaskModalOpen && selectedDate && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-semibold">Tasks</h3>
            <p className="text-sm text-base-content/50 mt-0.5">
              {selectedDate}
            </p>

            <div className="mt-4 space-y-2">
              {selectedTasks.length === 0 && (
                <div className="text-sm text-base-content/50">
                  No tasks for this day.
                </div>
              )}
              {selectedTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <div>
                    <div
                      className={`font-medium ${task.completedAt ? "line-through text-base-content/40" : ""}`}
                    >
                      {task.title}
                    </div>
                    {task.subjectId && (
                      <div className="text-xs text-base-content/50">
                        {subjects.find((s) => s.id === task.subjectId)?.name}
                      </div>
                    )}
                  </div>
                  {!task.completedAt && (
                    <button
                      className="btn btn-xs btn-outline"
                      onClick={() => handleStartTask(task)}
                    >
                      Start
                    </button>
                  )}
                </div>
              ))}
            </div>

            <form className="mt-4 space-y-3" onSubmit={handleCreateTask}>
              <label className="form-control">
                <span className="label-text">New task</span>
                <input
                  className="input input-bordered"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Task name"
                  required
                  disabled={!canCreateForSelected}
                />
              </label>

              <div className="form-control">
                <span className="label-text mb-1">Subject</span>
                <div className="dropdown w-full">
                  <div
                    tabIndex={0}
                    role="button"
                    className="btn btn-outline w-full justify-between font-normal"
                  >
                    <span>
                      {taskSubjectId === ""
                        ? "No subject"
                        : (subjects.find((s) => s.id === taskSubjectId)?.name ??
                          "No subject")}
                    </span>
                    <span className="text-xs opacity-50">&#x25BE;</span>
                  </div>
                  <ul
                    tabIndex={0}
                    className="dropdown-content menu z-[1] w-full rounded-box bg-base-100 p-2 shadow mt-1"
                  >
                    <li>
                      <button
                        type="button"
                        onClick={(e) => {
                          setTaskSubjectId("");
                          (e.target as HTMLElement).blur();
                        }}
                        disabled={!canCreateForSelected}
                      >
                        &mdash; No subject
                      </button>
                    </li>
                    {subjects.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={(e) => {
                            setTaskSubjectId(s.id!);
                            (e.target as HTMLElement).blur();
                          }}
                          disabled={!canCreateForSelected}
                        >
                          {s.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {!canCreateForSelected && (
                <div className="text-xs text-base-content/50">
                  Past days are read-only.
                </div>
              )}

              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setIsTaskModalOpen(false);
                    setSelectedDate(null);
                  }}
                >
                  Close
                </button>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={!canCreateForSelected}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

interface WeekViewProps {
  days: Date[];
  minutesByDay: Map<string, number>;
  maxMinutes: number;
  tasksByDay: Map<string, StudyTask[]>;
  todayStart: Date;
  activeCellSize: number;
  openTasksForDate: (date: Date, hasTasks: boolean) => void;
}

function WeekView({
  days,
  minutesByDay,
  maxMinutes,
  tasksByDay,
  todayStart,
  activeCellSize,
  openTasksForDate,
}: WeekViewProps) {
  // Group: col1 = Mon, col2 = Tue/Wed/Thu, col3 = Fri/Sat/Sun
  const columns = [
    [days[0]], // Monday
    [days[1], days[2], days[3]], // Tue, Wed, Thu
    [days[4], days[5], days[6]], // Fri, Sat, Sun
  ];

  const cellSize = activeCellSize;

  const renderCell = (day: Date) => {
    const key = toDateKey(day);
    const minutes = minutesByDay.get(key) ?? 0;
    const intensity = getIntensity(minutes, maxMinutes);
    const hasTasks = Boolean(tasksByDay.get(key)?.length);
    const isPast = startOfDay(day).getTime() < todayStart.getTime();
    const isDisabled = isPast && !hasTasks;
    const isToday = key === toDateKey(new Date());

    return (
      <div key={key} className="flex flex-col items-center gap-1">
        <div className="text-[11px] text-center text-base-content/50">
          {format(day, "EEE")}
        </div>
        <button
          type="button"
          className={`relative rounded-[6px] border border-base-300/60 disabled:opacity-40 disabled:cursor-not-allowed ${
            isToday ? "overview-today-pulse" : ""
          }`}
          style={{
            width: cellSize,
            height: cellSize,
            backgroundColor: heatColorFor(intensity),
          }}
          title={`${format(day, "EEE, MMM d")} · ${minutes} min`}
          onClick={() => openTasksForDate(day, hasTasks)}
          disabled={isDisabled}
        >
          {hasTasks && (
            <span className="absolute left-1/2 top-1/2 w-3 h-3 bg-base-content/70 rounded-full -translate-x-1/2 -translate-y-1/2" />
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="overview-week-wrap">
      <div className="flex items-center justify-center gap-2 sm:gap-6">
        {columns.map((colDays, colIdx) => (
          <div
            key={colIdx}
            className="flex flex-col items-center gap-1.5 sm:gap-2"
          >
            {colDays.map((day) => renderCell(day))}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body py-4 px-5">
        <div className="text-xl font-semibold tabular-nums truncate">
          {value}
        </div>
        <div className="text-xs text-base-content/50 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function HeatLegend({ maxMinutes }: { maxMinutes: number }) {
  return (
    <div className="flex items-center gap-1 text-xs text-base-content/50">
      <span>Low</span>
      <div className="flex items-center gap-1">
        {HEAT_ALPHA.map((_, i) => (
          <span
            key={i}
            className="inline-block w-3 h-3 rounded-[3px] border border-base-300/60"
            style={{ backgroundColor: heatColorFor(i) }}
            title={
              maxMinutes === 0
                ? "0 min"
                : `${Math.round((i / 4) * maxMinutes)}+ min`
            }
          />
        ))}
      </div>
      <span>High</span>
    </div>
  );
}

function OverviewChartTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-lg bg-base-100 border border-base-300 shadow-md px-3 py-2 text-sm">
      <p className="font-medium text-base-content mb-0.5">{label ?? d.name}</p>
      <p style={{ color: d.fill ?? d.color }}>
        {d.value}
        {unit}
      </p>
    </div>
  );
}

function getDisplayRange(filter: FilterRange, anchor: Date) {
  const now = anchor;
  if (filter === "day") {
    return { start: startOfDay(now), end: endOfDay(now) };
  }
  if (filter === "week") {
    return {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    };
  }
  if (filter === "month") {
    return { start: startOfMonth(now), end: endOfMonth(now) };
  }
  return { start: startOfYear(now), end: endOfYear(now) };
}

function getRangeLabel(
  filter: FilterRange,
  anchor: Date,
  start: Date,
  end: Date,
) {
  if (filter === "day") {
    return format(anchor, "EEE, MMM d, yyyy");
  }
  if (filter === "week") {
    return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
  }
  if (filter === "month") {
    return format(anchor, "MMMM yyyy");
  }
  return format(anchor, "yyyy");
}

function moveAnchorDate(anchor: Date, filter: FilterRange, direction: -1 | 1) {
  if (filter === "day") {
    return addDays(anchor, direction);
  }
  if (filter === "week") {
    return addWeeks(anchor, direction);
  }
  if (filter === "month") {
    return addMonths(anchor, direction);
  }
  return addYears(anchor, direction);
}

function listDays(start: Date, end: Date) {
  const days: Date[] = [];
  let current = start;
  while (current.getTime() <= end.getTime()) {
    days.push(current);
    current = addDays(current, 1);
  }
  return days;
}

function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function getIntensity(minutes: number, maxMinutes: number) {
  if (minutes <= 0 || maxMinutes <= 0) return 0;
  const ratio = minutes / maxMinutes;
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

function heatColorFor(intensity: number) {
  if (intensity <= 0) return "transparent";
  const alpha = HEAT_ALPHA[Math.min(intensity, HEAT_ALPHA.length - 1)];
  return `oklch(var(--a) / ${alpha})`;
}

function getYearMonths(anchor: Date) {
  const year = anchor.getFullYear();
  return Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
}

function getMonthCells(monthDate: Date) {
  const start = startOfMonth(monthDate);
  const end = endOfMonth(monthDate);
  const days = listDays(start, end);
  const padded = withWeekPadding(days);
  return padded.map((cell) => (cell.date ? cell.date : null));
}

function withWeekPadding(days: Date[]) {
  if (days.length === 0)
    return [] as { date: Date | null; isPadding: boolean }[];
  const padded: { date: Date | null; isPadding: boolean }[] = [];
  const first = days[0];
  const startIndex = (first.getDay() + 6) % 7;
  for (let i = 0; i < startIndex; i += 1) {
    padded.push({ date: null, isPadding: true });
  }
  days.forEach((d) => padded.push({ date: d, isPadding: false }));
  const remainder = padded.length % 7;
  if (remainder !== 0) {
    for (let i = remainder; i < 7; i += 1) {
      padded.push({ date: null, isPadding: true });
    }
  }
  return padded;
}

function gridStyleForFilter(
  filter: FilterRange,
  cellCount: number,
  cellSize: number,
) {
  if (filter === "day" || filter === "week") {
    return {
      gridTemplateColumns: `repeat(${cellCount}, ${cellSize}px)`,
      gridAutoFlow: "row" as const,
    };
  }
  return {
    gridTemplateRows: `repeat(7, ${cellSize}px)`,
    gridAutoFlow: "column" as const,
  };
}
