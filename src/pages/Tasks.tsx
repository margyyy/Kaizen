import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { type StudyTask, type Subject } from "../db";
import { useData } from "../DataContext";

type EditState = { type: "new" } | { type: "edit"; task: StudyTask } | null;

export default function Tasks() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSubjectId = searchParams.get("subjectId")
    ? Number(searchParams.get("subjectId"))
    : null;

  const { data, setData } = useData();

  const [editState, setEditState] = useState<EditState>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskSubjectId, setTaskSubjectId] = useState<number | "">(
    preSubjectId ?? "",
  );
  const [filterSubjectId, setFilterSubjectId] = useState<number | "">(
    preSubjectId ?? "",
  );

  const subjects = data.subjects;
  const tasks = useMemo(
    () => data.tasks.filter((t) => !t.completedAt),
    [data.tasks],
  );

  const openNew = () => {
    setTaskTitle("");
    setTaskDescription("");
    setTaskSubjectId(preSubjectId ?? "");
    setEditState({ type: "new" });
  };

  const openEdit = (task: StudyTask) => {
    setTaskTitle(task.title);
    setTaskDescription(task.description ?? "");
    setTaskSubjectId(task.subjectId ?? "");
    setEditState({ type: "edit", task });
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !editState) return;

    if (editState.type === "new") {
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
            description: taskDescription.trim() || undefined,
            date: new Date().toISOString().slice(0, 10),
            subjectId:
              taskSubjectId === "" ? undefined : Number(taskSubjectId),
          },
        ],
      }));
    } else {
      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === editState.task.id
            ? {
                ...t,
                title: taskTitle.trim(),
                description: taskDescription.trim() || undefined,
                subjectId:
                  taskSubjectId === "" ? undefined : Number(taskSubjectId),
              }
            : t,
        ),
      }));
    }

    setEditState(null);
  };

  const handleCompleteTask = (task: StudyTask) => {
    if (!task.id) return;
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === task.id
          ? { ...t, completedAt: new Date().toISOString() }
          : t,
      ),
    }));
  };

  const handleDeleteTask = (taskId: number) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
    }));
  };

  const handleStartTask = (task: StudyTask) => {
    sessionStorage.setItem(
      "pendingTask",
      JSON.stringify({ taskId: task.id, subjectId: task.subjectId ?? "" }),
    );
    navigate("/");
  };

  const filtered =
    filterSubjectId === ""
      ? tasks
      : tasks.filter((t) => t.subjectId === filterSubjectId);
  const grouped = groupBySubject(filtered, subjects);
  const activeSubject = preSubjectId
    ? subjects.find((s) => s.id === preSubjectId)
    : null;

  return (
    <div className="space-y-5 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {preSubjectId && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate("/subjects")}
            >
              Back
            </button>
          )}
          <h2 className="text-2xl font-semibold tracking-tight">
            {activeSubject ? `${activeSubject.name} — Tasks` : "Tasks"}
          </h2>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          + New task
        </button>
      </div>

      {!preSubjectId && subjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            className={`btn btn-sm ${filterSubjectId === "" ? "btn-primary" : "btn-ghost border border-base-300"}`}
            onClick={() => setFilterSubjectId("")}
          >
            All
          </button>
          {subjects.map((s) => (
            <button
              key={s.id}
              className={`btn btn-sm ${filterSubjectId === s.id ? "btn-primary" : "btn-ghost border border-base-300"}`}
              onClick={() => setFilterSubjectId(s.id ?? "")}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {grouped.length === 0 && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body items-center text-center py-12">
            <p className="text-base-content/50 text-sm">No pending tasks.</p>
            <button className="btn btn-primary btn-sm mt-3" onClick={openNew}>
              Add your first task
            </button>
          </div>
        </div>
      )}

      {grouped.map(({ subject, tasks: subjectTasks }) => (
        <div key={subject?.id ?? "none"} className="card bg-base-100 shadow-sm">
          <div className="card-body">
            {!preSubjectId && (
              <h3 className="font-semibold text-base-content/50 text-xs uppercase tracking-widest mb-3">
                {subject?.name ?? "No subject"}
              </h3>
            )}
            <div className="space-y-1.5">
              {subjectTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onComplete={() => handleCompleteTask(task)}
                  onDelete={() => handleDeleteTask(task.id!)}
                  onStart={() => handleStartTask(task)}
                  onEdit={() => openEdit(task)}
                />
              ))}
            </div>
          </div>
        </div>
      ))}

      {editState !== null && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-semibold">
              {editState.type === "new" ? "New task" : "Edit task"}
            </h3>
            <form className="mt-4 space-y-3" onSubmit={handleSaveTask}>
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

              <label className="form-control">
                <span className="label-text">
                  Description{" "}
                  <span className="text-base-content/40">(optional)</span>
                </span>
                <textarea
                  className="textarea textarea-bordered resize-none"
                  rows={3}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Notes or details..."
                />
              </label>

              {!preSubjectId && (
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
                          : subjects.find((s) => s.id === taskSubjectId)
                                ?.name ?? "No subject"}
                      </span>
                      <span className="text-xs opacity-50">▾</span>
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
                        >
                          — No subject
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
              )}

              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditState(null)}
                >
                  Cancel
                </button>
                <button className="btn btn-primary" type="submit">
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

interface TaskRowProps {
  task: StudyTask;
  onComplete: () => void;
  onDelete: () => void;
  onStart: () => void;
  onEdit: () => void;
}

function TaskRow({ task, onComplete, onDelete, onStart, onEdit }: TaskRowProps) {
  const [confirming, setConfirming] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const daysOpen = daysSince(task.date);
  const ageLabel =
    daysOpen === 0
      ? "Created today"
      : daysOpen === 1
        ? "1 day ago"
        : `${daysOpen} days ago`;
  const hasDesc = !!task.description;

  if (confirming) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-success/30 bg-success/5">
        <span className="flex-1 text-sm font-medium">{task.title}</span>
        <span className="text-xs text-base-content/50">Mark as done?</span>
        <button className="btn btn-success btn-xs" onClick={onComplete}>
          Done
        </button>
        <button
          className="btn btn-ghost btn-xs"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 px-3 py-2.5 rounded-lg hover:bg-base-200/70 transition-colors group">
      <div className="flex items-center gap-3">
        <button
          className="w-4 h-4 rounded-full border-2 flex-shrink-0 border-base-content/20 hover:border-primary transition-colors"
          onClick={() => setConfirming(true)}
          title="Mark as done"
        />

        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium truncate">{task.title}</span>
            {hasDesc && (
              <button
                className="btn btn-xs btn-ghost btn-circle opacity-50 hover:opacity-100 h-5 w-5 min-h-0"
                onClick={() => setExpanded(!expanded)}
                title="Toggle description"
              >
                {expanded ? "▾" : "▸"}
              </button>
            )}
          </div>
          <span className="text-xs text-base-content/35 tabular-nums flex-shrink-0">
            {ageLabel}
          </span>
        </div>

        <div className="hidden sm:flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="btn btn-xs btn-ghost font-normal"
            onClick={onStart}
            title="Start timer"
          >
            Start
          </button>
          <button
            className="btn btn-xs btn-ghost font-normal"
            onClick={onEdit}
            title="Edit task"
          >
            Edit
          </button>
          <button
            className="btn btn-xs btn-ghost text-error/50 hover:text-error font-normal"
            onClick={onDelete}
            title="Delete"
          >
            Delete
          </button>
        </div>
      </div>

      {expanded && task.description && (
        <div className="pl-7 pr-3 pb-1 text-xs text-base-content/60 whitespace-pre-wrap">
          {task.description}
        </div>
      )}
    </div>
  );
}

function daysSince(dateStr: string): number {
  const created = new Date(`${dateStr}T00:00:00`);
  const now = new Date();
  const diff = now.getTime() - created.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function groupBySubject(tasks: StudyTask[], subjects: Subject[]) {
  const map = new Map<number | undefined, StudyTask[]>();
  for (const task of tasks) {
    const key = task.subjectId;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(task);
  }

  const result: { subject: Subject | undefined; tasks: StudyTask[] }[] = [];
  for (const subject of subjects) {
    const t = map.get(subject.id);
    if (t && t.length > 0) result.push({ subject, tasks: t });
  }
  const noSubject = map.get(undefined);
  if (noSubject && noSubject.length > 0)
    result.push({ subject: undefined, tasks: noSubject });

  return result;
}
