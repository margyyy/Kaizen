import { useEffect, useMemo, useState, Fragment } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useData } from "../DataContext";
import type {
  RoadmapMacro,
  RoadmapMicro,
} from "../db";

interface MacroWithMicros extends RoadmapMacro {
  micros: RoadmapMicro[];
}

function isMacroCompleted(macro: MacroWithMicros): boolean {
  if (macro.micros.length === 0) return !!macro.completed;
  return macro.micros.every((m) => m.completed);
}

export default function RoadmapPage() {
  const { data, setData } = useData();
  const { subjectId: subjectIdParam } = useParams<{ subjectId: string }>();
  const subjectId = Number(subjectIdParam);
  const navigate = useNavigate();

  const subject = useMemo(
    () => data.subjects.find((s) => s.id === subjectId) ?? null,
    [data.subjects, subjectId],
  );

  const roadmap = useMemo(
    () =>
      data.roadmaps.find(
        (r) => r.subjectId === subjectId && r.userId === 0,
      ) ?? null,
    [data.roadmaps, subjectId],
  );

  const macros = useMemo(() => {
    if (!roadmap?.id) return [];
    const macroRows = data.roadmapMacros
      .filter((m) => m.roadmapId === roadmap.id)
      .sort((a, b) => a.order - b.order);
    return macroRows.map((m) => ({
      ...m,
      micros: data.roadmapMicros
        .filter((mi) => mi.macroId === m.id)
        .sort((a, b) => a.order - b.order),
    }));
  }, [data.roadmapMacros, data.roadmapMicros, roadmap?.id]);

  const [loading] = useState(false);

  // editing state
  const [editingMacroId, setEditingMacroId] = useState<number | null>(null);
  const [newMacroTitle, setNewMacroTitle] = useState("");
  const [newMicroTitles, setNewMicroTitles] = useState<Record<number, string>>(
    {},
  );

  const createRoadmap = () => {
    setData((prev) => ({
      ...prev,
      nextId: prev.nextId + 1,
      roadmaps: [
        ...prev.roadmaps,
        {
          id: prev.nextId,
          userId: 0,
          subjectId,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  };

  const deleteRoadmap = () => {
    if (!roadmap?.id) return;
    if (
      !confirm("Delete this roadmap? All macro and micro topics will be lost.")
    )
      return;
    setData((prev) => {
      const macroIds = prev.roadmapMacros
        .filter((m) => m.roadmapId === roadmap.id)
        .map((m) => m.id);
      return {
        ...prev,
        roadmapMicros: prev.roadmapMicros.filter(
          (mi) => !macroIds.includes(mi.macroId),
        ),
        roadmapMacros: prev.roadmapMacros.filter(
          (m) => m.roadmapId !== roadmap.id,
        ),
        roadmaps: prev.roadmaps.filter((r) => r.id !== roadmap.id),
      };
    });
  };

  const addMacro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roadmap?.id || !newMacroTitle.trim()) return;
    const roadmapId = roadmap.id;
    const title = newMacroTitle.trim();
    setData((prev) => {
      const existingMacros = prev.roadmapMacros.filter(
        (m) => m.roadmapId === roadmapId,
      );
      return {
        ...prev,
        nextId: prev.nextId + 1,
        roadmapMacros: [
          ...prev.roadmapMacros,
          {
            id: prev.nextId,
            roadmapId,
            title,
            order: existingMacros.length,
          },
        ],
      };
    });
    setNewMacroTitle("");
  };

  const removeMacro = (macroId: number) => {
    if (!confirm("Remove this macro topic?")) return;
    setData((prev) => ({
      ...prev,
      roadmapMicros: prev.roadmapMicros.filter((mi) => mi.macroId !== macroId),
      roadmapMacros: prev.roadmapMacros.filter((m) => m.id !== macroId),
    }));
  };

  const renameMacro = (macroId: number, title: string) => {
    setData((prev) => ({
      ...prev,
      roadmapMacros: prev.roadmapMacros.map((m) =>
        m.id === macroId ? { ...m, title } : m,
      ),
    }));
  };

  const toggleMacroComplete = (macro: MacroWithMicros) => {
    setData((prev) => {
      if (macro.micros.length > 0) {
        const allDone = macro.micros.every((m) => m.completed);
        const microIds = new Set(macro.micros.map((m) => m.id));
        return {
          ...prev,
          roadmapMicros: prev.roadmapMicros.map((mi) =>
            microIds.has(mi.id) ? { ...mi, completed: !allDone } : mi,
          ),
        };
      } else {
        return {
          ...prev,
          roadmapMacros: prev.roadmapMacros.map((m) =>
            m.id === macro.id ? { ...m, completed: !macro.completed } : m,
          ),
        };
      }
    });
  };

  const addMicro = (macroId: number) => {
    const title = (newMicroTitles[macroId] ?? "").trim();
    if (!title) return;
    setData((prev) => {
      const order = prev.roadmapMicros.filter(
        (mi) => mi.macroId === macroId,
      ).length;
      return {
        ...prev,
        nextId: prev.nextId + 1,
        roadmapMicros: [
          ...prev.roadmapMicros,
          {
            id: prev.nextId,
            macroId,
            title,
            order,
            completed: false,
          },
        ],
      };
    });
    setNewMicroTitles((prev) => ({ ...prev, [macroId]: "" }));
  };

  const toggleMicro = (micro: RoadmapMicro) => {
    setData((prev) => ({
      ...prev,
      roadmapMicros: prev.roadmapMicros.map((mi) =>
        mi.id === micro.id ? { ...mi, completed: !mi.completed } : mi,
      ),
    }));
  };

  const removeMicro = (microId: number) => {
    setData((prev) => ({
      ...prev,
      roadmapMicros: prev.roadmapMicros.filter((mi) => mi.id !== microId),
    }));
  };

  const completedFlags = useMemo(
    () => macros.map((m) => isMacroCompleted(m)),
    [macros],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-ring loading-lg" />
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="text-center py-16 text-base-content/60">
        Subject not found.
        <div className="mt-4">
          <button className="btn btn-sm" onClick={() => navigate("/subjects")}>
            Back to subjects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: subject.color ?? "#94a3b8" }}
          />
          <h2 className="text-2xl font-semibold tracking-tight">
            {subject.name} — Roadmap
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate("/subjects")}
          >
            ← Subjects
          </button>
          {roadmap && (
            <button
              className="btn btn-ghost btn-sm text-error/70 hover:text-error"
              onClick={deleteRoadmap}
            >
              Delete roadmap
            </button>
          )}
        </div>
      </div>

      {!roadmap ? (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body items-center text-center py-16 gap-4">
            <p className="text-base-content/60 text-sm">
              No roadmap yet for this subject.
            </p>
            <button className="btn btn-primary" onClick={createRoadmap}>
              + Create roadmap
            </button>
          </div>
        </div>
      ) : (
        <>
          <form
            onSubmit={addMacro}
            className="card bg-base-100 shadow-sm max-w-xl mx-auto w-full mb-8"
          >
            <div className="card-body py-4 px-4 flex-row gap-2 items-center">
              <input
                className="input input-bordered input-sm flex-1"
                placeholder="New macro topic…"
                value={newMacroTitle}
                onChange={(e) => setNewMacroTitle(e.target.value)}
              />
              <button className="btn btn-primary btn-sm" type="submit">
                + Add macro
              </button>
            </div>
          </form>

          <div className="roadmap-canvas">
            {macros.length === 0 && (
              <div className="text-base-content/50 text-sm py-8">
                Add your first macro topic above to start building the roadmap.
              </div>
            )}
            {(() => {
              // Progressive unlock: a macro only becomes current if the previous
              // one has at least 1 micro completed (or has no micros at all).
              let currentIdx = 0;
              for (let i = 0; i < macros.length; i++) {
                if (completedFlags[i]) continue;
                if (i === 0) {
                  currentIdx = i;
                  break;
                }
                const prev = macros[i - 1];
                const prevStarted =
                  prev.micros.length === 0 ||
                  prev.micros.some((mi) => mi.completed);
                if (prevStarted) {
                  currentIdx = i;
                } else {
                  currentIdx = i - 1;
                }
                break;
              }
              if (completedFlags.every(Boolean) && macros.length > 0) {
                currentIdx = macros.length - 1;
              }

              return macros.map((macro, idx) => {
                const isCompleted = completedFlags[idx];
                const isCurrent = idx === currentIdx;

                // Arrow i points from macro[idx] to macro[idx+1]
                const isArrowCompleted = isCompleted;
                const isArrowActive = isCompleted && idx + 1 === currentIdx;

                return (
                  <Fragment key={macro.id}>
                    <MacroCard
                      macro={macro}
                      completed={isCompleted}
                      current={isCurrent}
                      editing={editingMacroId === macro.id}
                      onStartEdit={() => setEditingMacroId(macro.id ?? null)}
                      onStopEdit={() => setEditingMacroId(null)}
                      onToggleComplete={() => toggleMacroComplete(macro)}
                      onRename={(t) => renameMacro(macro.id!, t)}
                      onRemove={() => removeMacro(macro.id!)}
                      onAddMicro={() => addMicro(macro.id!)}
                      onToggleMicro={(mi) => toggleMicro(mi)}
                      onRemoveMicro={(id) => removeMicro(id)}
                      newMicroTitle={newMicroTitles[macro.id!] ?? ""}
                      setNewMicroTitle={(v) =>
                        setNewMicroTitles((prev) => ({
                          ...prev,
                          [macro.id!]: v,
                        }))
                      }
                    />
                    {idx < macros.length - 1 && (
                      <div
                        className={`roadmap-arrow ${isArrowCompleted ? "completed" : ""} ${isArrowActive ? "active" : ""}`}
                      />
                    )}
                  </Fragment>
                );
              });
            })()}
          </div>
        </>
      )}
    </div>
  );
}

interface MacroCardProps {
  macro: MacroWithMicros;
  completed: boolean;
  current: boolean;
  editing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onToggleComplete: () => void;
  onRename: (title: string) => void;
  onRemove: () => void;
  onAddMicro: () => void;
  onToggleMicro: (micro: RoadmapMicro) => void;
  onRemoveMicro: (microId: number) => void;
  newMicroTitle: string;
  setNewMicroTitle: (v: string) => void;
}

function MacroCard({
  macro,
  completed,
  current,
  editing,
  onStartEdit,
  onStopEdit,
  onToggleComplete,
  onRename,
  onRemove,
  onAddMicro,
  onToggleMicro,
  onRemoveMicro,
  newMicroTitle,
  setNewMicroTitle,
}: MacroCardProps) {
  const [draftTitle, setDraftTitle] = useState(macro.title);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setDraftTitle(macro.title);
  }, [macro.title]);

  return (
    <div className={`roadmap-node ${completed ? "completed" : ""} ${current ? "current" : ""}`}>
      <div className="roadmap-node-title">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <input
            type="checkbox"
            className="checkbox checkbox-sm checkbox-primary"
            checked={completed}
            onChange={onToggleComplete}
          />
          {editing ? (
            <input
              className="input input-bordered input-sm flex-1"
              value={draftTitle}
              autoFocus
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={() => {
                if (draftTitle.trim() && draftTitle !== macro.title) {
                  onRename(draftTitle.trim());
                }
                onStopEdit();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                } else if (e.key === "Escape") {
                  setDraftTitle(macro.title);
                  onStopEdit();
                }
              }}
            />
          ) : (
            <div
              className="flex items-center gap-2 flex-1 cursor-pointer min-w-0 hover:bg-base-200/50 rounded-md px-1 -ml-1 transition-colors"
              onClick={() => setIsOpen(!isOpen)}
            >
              <span
                className="truncate font-medium"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onStartEdit();
                }}
                title="Double-click to rename, click to expand"
              >
                {macro.title}
              </span>
              <span
                className={`transition-transform duration-200 opacity-50 ${isOpen ? "rotate-180" : ""}`}
              >
                ▼
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-1">
          <button
            className="btn btn-ghost btn-xs font-normal"
            onClick={onStartEdit}
            type="button"
          >
            Edit
          </button>
          <button
            className="btn btn-ghost btn-xs font-normal text-error/60 hover:text-error"
            onClick={onRemove}
            type="button"
          >
            ✕
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-4">
          {macro.micros.length > 0 && (
            <ul className="space-y-1">
              {macro.micros.map((mi) => (
                <li
                  key={mi.id}
                  className={`roadmap-micro ${mi.completed ? "completed" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs checkbox-primary"
                    checked={mi.completed}
                    onChange={() => onToggleMicro(mi)}
                  />
                  <span className="flex-1 text-sm">{mi.title}</span>
                  <button
                    className="btn btn-ghost btn-xs font-normal text-error/50 hover:text-error"
                    onClick={() => onRemoveMicro(mi.id!)}
                    type="button"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex gap-2">
            <input
              className="input input-bordered input-xs flex-1"
              placeholder="Add micro topic…"
              value={newMicroTitle}
              onChange={(e) => setNewMicroTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddMicro();
                }
              }}
            />
            <button
              className="btn btn-ghost btn-xs"
              type="button"
              onClick={onAddMicro}
            >
              + Micro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
