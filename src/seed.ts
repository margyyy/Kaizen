import { loadData, saveData } from "./storage";
import { createEmptyData } from "./storage/types";

export async function seedMockData() {
  let data = loadData();
  if (!data) {
    data = createEmptyData("default");
  }

  const userId = 0;

  // Clear existing for a clean slate
  data.subjects = data.subjects.filter((s) => s.userId !== userId);
  data.tasks = data.tasks.filter((t) => t.userId !== userId);
  data.studySessions = data.studySessions.filter((s) => s.userId !== userId);

  // Create subjects
  const subjectNames = [
    "Mathematics",
    "Computer Science",
    "Physics",
    "Literature",
    "History",
    "English",
    "Biology",
  ];

  const subjectIds: number[] = [];
  for (const name of subjectNames) {
    const id = data.nextId;
    data.nextId += 1;
    data.subjects.push({ id, userId, name });
    subjectIds.push(id);
  }

  // Generate tasks (mix of pending and completed)
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < 40; i++) {
    const subjectId = subjectIds[Math.floor(Math.random() * subjectIds.length)];
    const isCompleted = Math.random() > 0.4; // 60% completed
    const daysAgo = Math.floor(Math.random() * 30); // up to 30 days old

    const taskDate = new Date(now - daysAgo * dayMs).toISOString().slice(0, 10);
    let completedAt: string | undefined = undefined;

    if (isCompleted) {
      // Completed some time after creation
      const compTime = now - (daysAgo * dayMs) + (Math.random() * dayMs);
      completedAt = new Date(Math.min(compTime, now)).toISOString();
    }

    const id = data.nextId;
    data.nextId += 1;
    data.tasks.push({
      id,
      userId,
      subjectId,
      title: `Task ${i + 1} - ${isCompleted ? "Review" : "Study"}`,
      date: taskDate,
      completedAt,
    });
  }

  // Generate study sessions (past 30 days)
  for (let i = 0; i < 150; i++) {
    const subjectId = subjectIds[Math.floor(Math.random() * subjectIds.length)];
    const daysAgo = Math.floor(Math.random() * 30);
    // Random length 15-120 mins
    const minutes = Math.floor(Math.random() * 105) + 15;

    const endMs = now - (daysAgo * dayMs) - (Math.random() * 8 * 60 * 60 * 1000);
    const startMs = endMs - (minutes * 60 * 1000);

    const id = data.nextId;
    data.nextId += 1;
    data.studySessions.push({
      id,
      userId,
      subjectId,
      minutes,
      startedAt: new Date(startMs).toISOString(),
      endedAt: new Date(endMs).toISOString(),
    });
  }

  saveData(data);
}
