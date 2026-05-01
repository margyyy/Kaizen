import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { type Subject } from "../db";
import { useData } from "../DataContext";

type EditState = { type: "new" } | { type: "edit"; subject: Subject } | null;

export default function Subjects() {
  const navigate = useNavigate();
  const { data, setData } = useData();

  const [editState, setEditState] = useState<EditState>(null);
  const [name, setName] = useState("");

  const subjects = data.subjects;

  const openNew = () => {
    setName("");
    setEditState({ type: "new" });
  };

  const openEdit = (s: Subject) => {
    setName(s.name);
    setEditState({ type: "edit", subject: s });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !editState) return;

    if (editState.type === "new") {
      const id = data.nextId;
      setData((prev) => ({
        ...prev,
        nextId: prev.nextId + 1,
        subjects: [
          ...prev.subjects,
          { id, userId: 0, name: name.trim() },
        ],
      }));
    } else {
      setData((prev) => ({
        ...prev,
        subjects: prev.subjects.map((s) =>
          s.id === editState.subject.id
            ? { ...s, name: name.trim() }
            : s,
        ),
      }));
    }
    setEditState(null);
  };

  const handleDelete = (subjectId: number) => {
    setData((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s.id !== subjectId),
    }));
  };

  return (
    <div className="space-y-5 w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Subjects</h2>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          + New subject
        </button>
      </div>

      {subjects.length === 0 ? (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body items-center text-center py-12">
            <p className="text-base-content/50 text-sm">
              No subjects yet. Create one to get started.
            </p>
            <button className="btn btn-primary btn-sm mt-3" onClick={openNew}>
              Add your first subject
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <div
              key={s.id}
              className="card bg-base-100 shadow-sm border border-base-300 hover:bg-base-200/50 transition-colors group"
            >
              <div className="card-body p-4 flex-row items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: s.color ?? "#94a3b8" }}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-sm truncate">
                      {s.name}
                    </span>
                    <div className="flex gap-2 mt-1">
                      <button
                        className="btn btn-xs btn-ghost font-normal"
                        onClick={() => navigate(`/tasks?subjectId=${s.id}`)}
                      >
                        Tasks
                      </button>
                      <button
                        className="btn btn-xs btn-ghost font-normal"
                        onClick={() => navigate(`/roadmap/${s.id}`)}
                      >
                        Roadmap
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    className="btn btn-ghost btn-xs font-normal"
                    onClick={() => openEdit(s)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-ghost btn-xs font-normal text-error/60 hover:text-error"
                    onClick={() => handleDelete(s.id!)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editState !== null && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-semibold">
              {editState.type === "new" ? "New subject" : "Edit subject"}
            </h3>
            <form className="mt-4 space-y-3" onSubmit={handleSave}>
              <label className="form-control">
                <span className="label-text">Name</span>
                <input
                  className="input input-bordered"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Subject name"
                  required
                  autoFocus
                />
              </label>
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
