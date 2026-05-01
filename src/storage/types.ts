import type {
  AchievementProgress,
  Flashcard,
  FlashcardSet,
  Roadmap,
  RoadmapMacro,
  RoadmapMicro,
  StudySession,
  StudyTask,
  Subject,
} from "../db";

export interface AppData {
  username: string;
  theme: string;
  accent: string;
  nextId: number;
  subjects: Subject[];
  tasks: StudyTask[];
  flashcardSets: FlashcardSet[];
  flashcards: Flashcard[];
  studySessions: StudySession[];
  roadmaps: Roadmap[];
  roadmapMacros: RoadmapMacro[];
  roadmapMicros: RoadmapMicro[];
  achievements: AchievementProgress[];
}

export function createEmptyData(username: string, theme = "dark", accent = "slate"): AppData {
  return {
    username,
    theme,
    accent,
    nextId: 1,
    subjects: [],
    tasks: [],
    flashcardSets: [],
    flashcards: [],
    studySessions: [],
    roadmaps: [],
    roadmapMacros: [],
    roadmapMicros: [],
    achievements: [],
  };
}

export function nextId(data: AppData): number {
  return data.nextId;
}
