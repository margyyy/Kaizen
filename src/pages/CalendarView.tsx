import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, dateFnsLocalizer, type SlotInfo } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import type { StudyTask, Subject } from "../db";
import { useData } from "../DataContext";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

interface CalendarEvent {
  id?: number;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  taskData: StudyTask;
  color: string;
}

// Stable color per subjectId
const SUBJECT_COLORS = [
  "#c9a227", "#7c6fcd", "#e05d5d", "#3b9e77", "#e07b39",
  "#5b8dd9", "#c46db0", "#5dbe8a", "#d4896b", "#6abbcc",
];

export default function CalendarView() {
  const navigate = useNavigate();
  const { data, setData } = useData();
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [taskSubjectId, setTaskSubjectId] = useState<number | "">("");

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    setTasks((data.tasks.filter((t) => !t.completedAt) ?? []) as StudyTask[]);
    setSubjects((data.subjects ?? []) as Subject[]);
  }, [data]);

  // Map subjectId → color
  const subjectColorMap = useMemo(() => {
    const map = new Map<number, string>();
    subjects.forEach((s, i) => {
      if (s.id !== undefined) map.set(s.id, s.color ?? SUBJECT_COLORS[i % SUBJECT_COLORS.length]);
    });
    return map;
  }, [subjects]);

  const events = useMemo<CalendarEvent[]>(() => {
    return tasks.map((task) => {
      const date = new Date(`${task.date}T00:00:00`);
      const subject = subjects.find((s) => s.id === task.subjectId);
      const color = task.subjectId
        ? (subjectColorMap.get(task.subjectId) ?? "#6b7280")
        : "#6b7280";
      return {
        id: task.id,
        title: subject ? `${task.title} · ${subject.name}` : task.title,
        start: date,
        end: date,
        allDay: true,
        taskData: task,
        color,
      };
    });
  }, [subjects, subjectColorMap, tasks]);

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    setTaskDate(format(slotInfo.start as Date, "yyyy-MM-dd"));
    setTaskTitle("");
    setTaskSubjectId("");
    setIsCreateOpen(true);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
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
          date: taskDate,
          subjectId: taskSubjectId === "" ? undefined : Number(taskSubjectId),
        } as StudyTask,
      ],
    }));
    setIsCreateOpen(false);
  };

  const handleDeleteTask = (taskId: number) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
    }));
    setSelectedEvent(null);
  };

  const handleStartTask = (task: StudyTask) => {
    sessionStorage.setItem(
      "pendingTask",
      JSON.stringify({ taskId: task.id, subjectId: task.subjectId ?? "" }),
    );
    navigate("/");
  };

  return (
    <div className="space-y-4 w-full">
      <h2 className="text-2xl font-semibold tracking-tight">Calendar</h2>

      <div className="card bg-base-100 shadow-sm w-full">
        <div className="card-body p-4">
          <div className="calendar-wrapper" style={{ height: 620 }}>
            <Calendar
              localizer={localizer}
              events={events}
              views={["month"]}
              defaultView="month"
              selectable
              startAccessor="start"
              endAccessor="end"
              onSelectSlot={handleSelectSlot}
              onSelectEvent={(e) => setSelectedEvent(e as CalendarEvent)}
              eventPropGetter={(event) => ({
                style: {
                  backgroundColor: (event as CalendarEvent).color,
                  borderColor: "transparent",
                  color: "#fff",
                  fontSize: "0.75rem",
                  borderRadius: "4px",
                  padding: "1px 6px",
                },
              })}
              dayPropGetter={(date) => {
                const isToday = date.toDateString() === new Date().toDateString();
                return { style: isToday ? { backgroundColor: "var(--today-bg)" } : {} };
              }}
              formats={{
                monthHeaderFormat: (date) => format(date, "MMMM yyyy"),
                weekdayFormat: (date) => format(date, "EEE"),
              }}
            />
          </div>
        </div>
      </div>

      {/* Create modal */}
      {isCreateOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-semibold">New task</h3>
            <p className="text-sm text-base-content/50 mt-0.5">{taskDate}</p>
            <form className="mt-4 space-y-3" onSubmit={handleCreateTask}>
              <label className="form-control">
                <span className="label-text">Title</span>
                <input
                  className="input input-bordered"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Task name"
                  required
                  autoFocus
                />
              </label>

              <div className="form-control">
                <span className="label-text mb-1">Subject</span>
                <div className="dropdown w-full">
                  <div tabIndex={0} role="button" className="btn btn-outline w-full justify-between font-normal">
                    <span>
                      {taskSubjectId === ""
                        ? "No subject"
                        : subjects.find((s) => s.id === taskSubjectId)?.name ?? "No subject"}
                    </span>
                    <span className="text-xs opacity-50">&#x25BE;</span>
                  </div>
                  <ul tabIndex={0} className="dropdown-content menu z-[1] w-full rounded-box bg-base-100 p-2 shadow mt-1">
                    <li>
                      <button
                        type="button"
                        onClick={(e) => {
                          setTaskSubjectId("");
                          (e.target as HTMLElement).blur();
                        }}
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
                        >
                          {s.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" type="submit">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event detail modal */}
      {selectedEvent && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-semibold">{selectedEvent.taskData.title}</h3>
            <div className="mt-2 space-y-1 text-sm text-base-content/60">
              {selectedEvent.taskData.subjectId && (
                <p>{subjects.find((s) => s.id === selectedEvent.taskData.subjectId)?.name}</p>
              )}
              <p>{selectedEvent.taskData.date}</p>
            </div>
            <div className="modal-action flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-error btn-outline"
                onClick={() => handleDeleteTask(selectedEvent.taskData.id!)}
              >
                Delete
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleStartTask(selectedEvent.taskData)}
              >
                Start task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
