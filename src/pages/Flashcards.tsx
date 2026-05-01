import { useState, useMemo } from "react";
import { useData } from "../DataContext";
import { type Flashcard, type FlashcardSet } from "../db";
import { computeNextReview, isDue } from "../spaced-repetition";
import LatexText from "../LatexText";

type EditSetState = { type: "new" } | { type: "edit"; set: FlashcardSet } | null;
type EditCardState = { type: "new" } | { type: "edit"; card: Flashcard } | null;

export default function Flashcards() {
  const { data, setData } = useData();

  const [selectedSubjectId, setSelectedSubjectId] = useState<number | "">("");
  const [selectedSetId, setSelectedSetId] = useState<number | null>(null);

  // Set form
  const [editSetState, setEditSetState] = useState<EditSetState>(null);
  const [setName, setSetName] = useState("");

  // Card form
  const [editCardState, setEditCardState] = useState<EditCardState>(null);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  // JSON import state
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Study state
  const [studyQueue, setStudyQueue] = useState<Flashcard[]>([]);
  const [studyIndex, setStudyIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [studyComplete, setStudyComplete] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [unknownCount, setUnknownCount] = useState(0);
  const [nextReviewAt, setNextReviewAt] = useState<string | null>(null);

  const selectedSubject =
    selectedSubjectId === "" ? null : data.subjects.find((s) => s.id === selectedSubjectId);

  const subjectSets = selectedSubjectId === ""
    ? []
    : data.flashcardSets.filter((s) => s.subjectId === selectedSubjectId);

  const selectedSet = selectedSetId ? data.flashcardSets.find((s) => s.id === selectedSetId) ?? null : null;

  const cardsInSet = selectedSetId
    ? data.flashcards.filter((c) => c.setId === selectedSetId)
    : [];

  // Per-set due counts and next review
  const setReviewInfo = useMemo(() => {
    const info = new Map<number, { due: number; nextReview: string | null }>();
    for (const s of subjectSets) {
      const setCardsList = data.flashcards.filter((c) => c.setId === s.id);
      let due = 0;
      let earliestNext: string | null = null;
      for (const c of setCardsList) {
        if (isDue(c)) {
          due++;
        } else if (c.nextReviewAt) {
          if (!earliestNext || c.nextReviewAt < earliestNext) {
            earliestNext = c.nextReviewAt;
          }
        }
      }
      info.set(s.id!, { due, nextReview: earliestNext });
    }
    return info;
  }, [subjectSets, data.flashcards]);

  // Review sets: due now vs upcoming
  const reviewDue = subjectSets.filter(
    (s) => (setReviewInfo.get(s.id!)?.due ?? 0) > 0,
  );
  const reviewUpcoming = subjectSets.filter(
    (s) => (setReviewInfo.get(s.id!)?.due ?? 0) === 0 && (setReviewInfo.get(s.id!)?.nextReview != null),
  );

  // ---- Set CRUD ----
  const openNewSet = () => {
    setSetName("");
    setEditSetState({ type: "new" });
  };

  const openEditSet = (set: FlashcardSet) => {
    setSetName(set.name);
    setEditSetState({ type: "edit", set });
  };

  const handleSaveSet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setName.trim() || !editSetState || selectedSubjectId === "") return;

    setData((prev) => {
      if (editSetState.type === "new") {
        const newSet: FlashcardSet = {
          id: prev.nextId,
          userId: 0,
          subjectId: Number(selectedSubjectId),
          name: setName.trim(),
          createdAt: new Date().toISOString(),
        };
        return {
          ...prev,
          nextId: prev.nextId + 1,
          flashcardSets: [...prev.flashcardSets, newSet],
        };
      } else {
        return {
          ...prev,
          flashcardSets: prev.flashcardSets.map((s) =>
            s.id === editSetState.set.id ? { ...s, name: setName.trim() } : s,
          ),
        };
      }
    });

    setEditSetState(null);
  };

  const handleDeleteSet = (setId: number) => {
    const ok = confirm("Delete this set and all its flashcards?");
    if (!ok) return;

    setData((prev) => ({
      ...prev,
      flashcards: prev.flashcards.filter((c) => c.setId !== setId),
      flashcardSets: prev.flashcardSets.filter((s) => s.id !== setId),
    }));

    if (selectedSetId === setId) setSelectedSetId(null);
  };

  // ---- Card CRUD ----
  const openNewCard = () => {
    setFront("");
    setBack("");
    setEditCardState({ type: "new" });
  };

  const openEditCard = (card: Flashcard) => {
    setFront(card.front);
    setBack(card.back);
    setEditCardState({ type: "edit", card });
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim() || !editCardState || !selectedSetId) return;

    setData((prev) => {
      if (editCardState.type === "new") {
        const newCard: Flashcard = {
          id: prev.nextId,
          userId: 0,
          subjectId: Number(selectedSubjectId),
          setId: selectedSetId,
          front: front.trim(),
          back: back.trim(),
          createdAt: new Date().toISOString(),
          easeFactor: 2.5,
          interval: 0,
          repetitions: 0,
          nextReviewAt: null,
          lastReviewedAt: null,
          lastQuality: null,
        };
        return {
          ...prev,
          nextId: prev.nextId + 1,
          flashcards: [...prev.flashcards, newCard],
        };
      } else {
        return {
          ...prev,
          flashcards: prev.flashcards.map((c) =>
            c.id === editCardState.card.id ? { ...c, front: front.trim(), back: back.trim() } : c,
          ),
        };
      }
    });

    setEditCardState(null);
  };

  const handleDeleteCard = (cardId: number) => {
    setData((prev) => ({
      ...prev,
      flashcards: prev.flashcards.filter((c) => c.id !== cardId),
    }));
  };

  // ---- JSON import ----
  const handleJsonImport = () => {
    setJsonError(null);
    if (!selectedSetId || !jsonText.trim()) return;

    let items: { question?: string; answer?: string; front?: string; back?: string }[];
    try {
      items = JSON.parse(jsonText.trim());
      if (!Array.isArray(items)) throw new Error("Must be a JSON array");
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : "Invalid JSON");
      return;
    }

    let validCount = 0;
    for (const item of items) {
      const front = item.question ?? item.front;
      const back = item.answer ?? item.back;
      if (front && back) validCount++;
    }

    if (validCount === 0) {
      setJsonError("No valid items found. Each item needs 'question'/'front' and 'answer'/'back'.");
      return;
    }

    setData((prev) => {
      let id = prev.nextId;
      const newCards: Flashcard[] = [];
      for (const item of items) {
        const front = item.question ?? item.front;
        const back = item.answer ?? item.back;
        if (!front || !back) continue;
        newCards.push({
          id: id++,
          userId: 0,
          subjectId: Number(selectedSubjectId),
          setId: selectedSetId,
          front: String(front).trim(),
          back: String(back).trim(),
          createdAt: new Date().toISOString(),
          easeFactor: 2.5,
          interval: 0,
          repetitions: 0,
          nextReviewAt: null,
          lastReviewedAt: null,
          lastQuality: null,
        });
      }
      return {
        ...prev,
        nextId: id,
        flashcards: [...prev.flashcards, ...newCards],
      };
    });

    setShowJsonImport(false);
    setJsonText("");
  };

  // ---- Study ----
  const startStudy = () => {
    const dueCards = cardsInSet.filter((c) => isDue(c));
    // Use all cards if none are due (force review)
    const pool = dueCards.length > 0 ? dueCards : cardsInSet;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    setStudyQueue(shuffled);
    setStudyIndex(0);
    setFlipped(false);
    setStudyComplete(false);
    setKnownCount(0);
    setUnknownCount(0);
    setNextReviewAt(null);
  };

  const currentCard = studyQueue[studyIndex];
  const progress = studyQueue.length > 0 ? (studyIndex / studyQueue.length) * 100 : 0;

  const handleAnswer = (quality: number) => {
    if (!currentCard) return;

    if (quality >= 3) {
      setKnownCount((n) => n + 1);
    } else if (quality >= 0) {
      setUnknownCount((n) => n + 1);
    }

    let newNextReview: string | null = null;
    if (quality >= 0) {
      const updates = computeNextReview(currentCard, quality);
      setData((prev) => ({
        ...prev,
        flashcards: prev.flashcards.map((c) =>
          c.id === currentCard.id ? { ...c, ...updates } : c,
        ),
      }));
      newNextReview = updates.nextReviewAt ?? null;
    }

    const effectiveLength = quality < 0 ? studyQueue.length + 1 : studyQueue.length;
    const nextIndex = studyIndex + 1;
    if (nextIndex >= effectiveLength) {
      // Compute next review for the summary
      if (quality >= 0 && quality < 3) {
        setNextReviewAt(newNextReview);
      }
      // Find earliest next review among all unknown cards answered this session
      if (unknownCount > 0 || (quality >= 0 && quality < 3)) {
        const now = new Date();
        const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
        setNextReviewAt((prev) => {
          if (!prev) return nextDay;
          return prev < nextDay ? prev : nextDay;
        });
      }
      setStudyComplete(true);
    } else {
      if (quality < 0) {
        setStudyQueue((prev) => [...prev, currentCard]);
      }
      setStudyIndex(nextIndex);
      setFlipped(false);
    }
  };

  const endStudy = () => {
    setStudyQueue([]);
    setStudyIndex(0);
    setFlipped(false);
    setStudyComplete(false);
  };

  // ---- Render ----
  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Flashcards</h2>
      </div>

      {/* Subject filter */}
      {data.subjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.subjects.map((s) => (
            <button
              key={s.id}
              className={`btn btn-sm ${selectedSubjectId === s.id ? "btn-primary" : "btn-ghost border border-base-300"}`}
              onClick={() => {
                setSelectedSubjectId(s.id ?? "");
                setSelectedSetId(null);
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* No subjects */}
      {data.subjects.length === 0 && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body items-center text-center py-12">
            <p className="text-base-content/50 text-sm">
              Create a subject first before adding flashcards.
            </p>
          </div>
        </div>
      )}

      {/* Global due review (no subject selected) */}
      {selectedSubjectId === "" && data.subjects.length > 0 && (
        <>
          {data.flashcards.filter((c) => isDue(c)).length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Due for review</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {data.flashcards
                  .filter((c) => isDue(c))
                  .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
                  .slice(0, 12)
                  .map((card) => {
                    const cardSubject = data.subjects.find((s) => s.id === card.subjectId);
                    const cardSet = data.flashcardSets.find((s) => s.id === card.setId);
                    return (
                      <button
                        key={card.id}
                        className="card bg-base-100 shadow-sm border border-primary/20 hover:border-primary/60 transition-colors text-left"
                        onClick={() => {
                          setSelectedSubjectId(card.subjectId ?? "");
                          setSelectedSetId(card.setId ?? null);
                        }}
                      >
                        <div className="card-body p-4">
                          <span className="text-sm font-medium line-clamp-2">
                            {stripLatex(card.front)}
                          </span>
                          <div className="flex items-center gap-2 mt-2">
                            {cardSubject && (
                              <span className="badge badge-sm gap-1">
                                <span
                                  className="w-2 h-2 rounded-full inline-block"
                                  style={{ backgroundColor: cardSubject.color ?? "#94a3b8" }}
                                />
                                {cardSubject.name}
                              </span>
                            )}
                            {cardSet && (
                              <span className="text-xs text-base-content/40 truncate">
                                {cardSet.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          ) : (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body items-center text-center py-12">
                <p className="text-sm font-medium text-base-content/60">
                  No flashcards to review
                </p>
                <p className="text-xs mt-1 text-base-content/40">
                  Select a subject above to create your first set
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== LEVEL 2: Sets grid (subject selected, no set selected) ===== */}
      {selectedSubject && !selectedSetId && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ backgroundColor: selectedSubject.color ?? "#94a3b8" }}
              />
              {selectedSubject.name}
            </h3>
            <button className="btn btn-primary btn-sm" onClick={openNewSet}>
              + New set
            </button>
          </div>

          {/* Review section */}
          {(reviewDue.length > 0 || reviewUpcoming.length > 0) && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-base-content/40 uppercase tracking-widest">
                Review
              </h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {reviewDue.map((s) => {
                  const info = setReviewInfo.get(s.id!)!;
                  return (
                    <button
                      key={s.id}
                      className="card bg-primary/5 border border-primary/30 hover:bg-primary/10 transition-colors text-left"
                      onClick={() => setSelectedSetId(s.id!)}
                    >
                      <div className="card-body p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate">{s.name}</span>
                          <span className="badge badge-primary badge-sm">{info.due} due</span>
                        </div>
                        <span className="text-xs text-base-content/50 mt-1">
                          {info.due} card{info.due !== 1 ? "s" : ""} to review now
                        </span>
                      </div>
                    </button>
                  );
                })}
                {reviewUpcoming.map((s) => {
                  const info = setReviewInfo.get(s.id!)!;
                  return (
                    <button
                      key={s.id}
                      className="card bg-base-100 shadow-sm border border-base-300 hover:bg-base-200/50 transition-colors text-left"
                      onClick={() => setSelectedSetId(s.id!)}
                    >
                      <div className="card-body p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate">{s.name}</span>
                        </div>
                        <span className="text-xs text-base-content/50 mt-1">
                          Next review {info.nextReview ? formatTimeUntil(info.nextReview) : ""}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sets grid */}
          {subjectSets.length === 0 ? (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body items-center text-center py-12">
                <p className="text-base-content/50 text-sm">
                  No sets yet. Create your first set.
                </p>
              </div>
            </div>
          ) : (
            <>
              <h4 className="text-xs font-semibold text-base-content/40 uppercase tracking-widest">
                All sets
              </h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {subjectSets.map((s) => {
                  const info = setReviewInfo.get(s.id!);
                  const due = info?.due ?? 0;
                  const cardCount = data.flashcards.filter((c) => c.setId === s.id).length;
                  return (
                    <button
                      key={s.id}
                      className="card bg-base-100 shadow-sm border border-base-300 hover:bg-base-200/50 transition-colors group"
                      onClick={() => setSelectedSetId(s.id!)}
                    >
                      <div className="card-body p-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm truncate">{s.name}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <span
                              className="btn btn-ghost btn-xs font-normal"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditSet(s);
                              }}
                            >
                              Edit
                            </span>
                            <span
                              className="btn btn-ghost btn-xs font-normal text-error/60 hover:text-error"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSet(s.id!);
                              }}
                            >
                              Delete
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-base-content/50">
                            {cardCount} card{cardCount !== 1 ? "s" : ""}
                          </span>
                          {due > 0 ? (
                            <span className="badge badge-primary badge-xs">{due} due</span>
                          ) : info?.nextReview ? (
                            <span className="text-xs text-base-content/40">
                              Next: {formatTimeUntil(info.nextReview)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ===== LEVEL 3: Flashcards in set ===== */}
      {selectedSubject && selectedSetId && selectedSet && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <button
                className="btn btn-ghost btn-sm flex-shrink-0"
                onClick={() => setSelectedSetId(null)}
              >
                Back
              </button>
              <h3 className="text-lg font-semibold flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0 inline-block"
                  style={{ backgroundColor: selectedSubject.color ?? "#94a3b8" }}
                />
                <span className="truncate">{selectedSet.name}</span>
              </h3>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button className="btn btn-primary btn-sm" onClick={openNewCard}>
                + New card
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setJsonText("");
                  setJsonError(null);
                  setShowJsonImport(true);
                }}
              >
                Import JSON
              </button>
              {cardsInSet.length > 0 && (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={startStudy}
                >
                  Study ({cardsInSet.filter((c) => isDue(c)).length})
                </button>
              )}
            </div>
          </div>

          {cardsInSet.length === 0 ? (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body items-center text-center py-12">
                <p className="text-base-content/50 text-sm">
                  No flashcards yet. Create your first one.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              {cardsInSet.map((card) => {
                const due = isDue(card);
                return (
                  <div
                    key={card.id}
                    className="card bg-base-100 shadow-sm hover:bg-base-200/50 transition-colors group min-w-0"
                  >
                    <div className="card-body flex-row items-center justify-between py-3 px-4 overflow-hidden">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${due ? "bg-success" : "bg-base-content/20"}`}
                          title={due ? "Due for review" : "Not due yet"}
                        />
                        <span className="text-sm truncate">{stripLatex(card.front)}</span>
                        {!due && card.nextReviewAt && (
                          <span className="text-xs text-base-content/40 flex-shrink-0 hidden sm:inline">
                            {formatTimeUntil(card.nextReviewAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex">
                        <button
                          className="btn btn-ghost btn-xs font-normal"
                          onClick={() => openEditCard(card)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-ghost btn-xs font-normal text-error/60 hover:text-error"
                          onClick={() => handleDeleteCard(card.id!)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ===== Modals ===== */}

      {/* JSON import modal */}
      {showJsonImport && (
        <div className="modal modal-open">
          <div className="modal-box max-w-[calc(100vw-2rem)] sm:max-w-xl">
            <h3 className="text-lg font-semibold mb-1">Import flashcards from JSON</h3>
            <p className="text-xs text-base-content/50 mb-3">
              Paste a JSON array. Each item needs <code className="text-primary">question</code> (or <code className="text-primary">front</code>) and <code className="text-primary">answer</code> (or <code className="text-primary">back</code>).
              Supports LaTeX with <code className="text-primary">$...$</code> for inline and <code className="text-primary">$$...$$</code> for block.
            </p>
            <div className="bg-base-200 rounded-lg p-3 mb-3 text-xs font-mono whitespace-pre-wrap break-all text-base-content/60">
{`[
  { "question": "What is 2+2?", "answer": "4" },
  { "question": "Area of a circle", "answer": "$A = \\\\pi r^2$" },
  { "question": "Pythagorean theorem", "answer": "$a^2 + b^2 = c^2$" }
]`}
            </div>
            <textarea
              className="textarea textarea-bordered w-full resize-none font-mono text-xs"
              rows={10}
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setJsonError(null);
              }}
              placeholder='[{"question": "...", "answer": "..."}]'
            />
            {jsonError && (
              <p className="text-error text-xs mt-2">{jsonError}</p>
            )}
            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowJsonImport(false)}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleJsonImport}>
                Import cards
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set create/edit modal */}
      {editSetState !== null && (
        <div className="modal modal-open">
          <div className="modal-box max-w-[calc(100vw-2rem)]">
            <h3 className="text-lg font-semibold">
              {editSetState.type === "new" ? "New set" : "Edit set"}
            </h3>
            <form className="mt-4 space-y-3" onSubmit={handleSaveSet}>
              <label className="form-control">
                <span className="label-text">Name</span>
                <input
                  className="input input-bordered"
                  value={setName}
                  onChange={(e) => setSetName(e.target.value)}
                  placeholder="Set name"
                  required
                  autoFocus
                />
              </label>
              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditSetState(null)}
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

      {/* Card create/edit modal */}
      {editCardState !== null && (
        <div className="modal modal-open">
          <div className="modal-box max-w-[calc(100vw-2rem)]">
            <h3 className="text-lg font-semibold">
              {editCardState.type === "new" ? "New flashcard" : "Edit flashcard"}
            </h3>
            <form className="mt-4 space-y-3" onSubmit={handleSaveCard}>
              <label className="form-control">
                <span className="label-text">Front</span>
                <textarea
                  className="textarea textarea-bordered resize-none"
                  rows={3}
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  placeholder="Question or prompt. Use $...$ for LaTeX"
                  required
                  autoFocus
                />
              </label>
              <label className="form-control">
                <span className="label-text">Back</span>
                <textarea
                  className="textarea textarea-bordered resize-none"
                  rows={3}
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  placeholder="Answer"
                  required
                />
              </label>
              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditCardState(null)}
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

      {/* Study modal */}
      {studyQueue.length > 0 && !studyComplete && currentCard && (
        <div className="modal modal-open">
          <div className="modal-box flex flex-col items-center gap-4 sm:gap-5 max-w-[calc(100vw-2rem)] sm:max-w-lg mx-auto">
            <div className="w-full flex items-center gap-3">
              <progress
                className="progress progress-primary flex-1"
                value={progress}
                max={100}
              />
              <span className="text-xs text-base-content/50 tabular-nums">
                {studyIndex + 1} / {studyQueue.length}
              </span>
            </div>

            <button
              className="w-full min-h-[200px] max-h-[50vh] overflow-auto rounded-2xl border-2 border-primary/30 bg-base-200/50 hover:border-primary/60 transition-colors p-4 sm:p-6 flex items-center justify-center text-center cursor-pointer"
              onClick={() => setFlipped(!flipped)}
            >
              <span
                className={`text-base sm:text-lg font-medium select-none transition-all duration-200 [overflow-wrap:break-word] ${flipped ? "text-primary" : ""}`}
              >
                <LatexText text={flipped ? currentCard.back : currentCard.front} />
              </span>
            </button>

            {!flipped && (
              <p className="text-xs text-base-content/40">
                Tap card to reveal answer
              </p>
            )}

            {flipped && (
              <div className="flex flex-wrap gap-2 w-full">
                <button
                  className="btn btn-ghost flex-1 min-w-fit text-xs sm:text-sm"
                  onClick={() => handleAnswer(-1)}
                >
                  Skip
                </button>
                <button
                  className="btn btn-outline flex-1 min-w-fit text-xs sm:text-sm"
                  onClick={() => handleAnswer(1)}
                >
                  I don't know
                </button>
                <button
                  className="btn btn-primary flex-1 min-w-fit text-xs sm:text-sm"
                  onClick={() => handleAnswer(4)}
                >
                  I know
                </button>
              </div>
            )}

            <button
              className="btn btn-ghost btn-xs text-base-content/30"
              onClick={endStudy}
            >
              End session
            </button>
          </div>
        </div>
      )}

      {/* Study complete */}
      {studyComplete && (
        <div className="modal modal-open">
          <div className="modal-box text-center max-w-[calc(100vw-2rem)] sm:max-w-md">
            <h3 className="text-xl font-semibold mb-2">Session complete</h3>
            <div className="flex justify-center gap-6 my-6">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-success">{knownCount}</span>
                <span className="text-xs text-base-content/50">Known</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-warning">{unknownCount}</span>
                <span className="text-xs text-base-content/50">To review</span>
              </div>
            </div>
            {unknownCount > 0 && (
              <p className="text-sm text-base-content/60 mb-4">
                Next review: {nextReviewAt ? formatTimeUntil(nextReviewAt) : "tomorrow"}
              </p>
            )}
            <button className="btn btn-primary" onClick={endStudy}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function stripLatex(text: string): string {
  return text.replace(/\$\$[\s\S]+?\$\$/g, "").replace(/\$([^$]+?)\$/g, "$1");
}

function formatTimeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "now";
  const hours = Math.round(diff / (1000 * 60 * 60));
  if (hours < 1) return `${Math.round(diff / (1000 * 60))}m`;
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "tomorrow";
  return `${days}d`;
}
