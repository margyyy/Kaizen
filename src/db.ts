export type TimerMode = "focus" | "shortBreak" | "longBreak";

export interface Subject {
  id?: number;
  userId: number;
  name: string;
  color?: string;
}

export interface StudySession {
  id?: number;
  userId: number;
  subjectId: number;
  minutes: number;
  startedAt: string;
  endedAt: string;
}

export interface StudyTask {
  id?: number;
  userId: number;
  subjectId?: number;
  title: string;
  description?: string;
  date: string;
  estimatedMinutes?: number;
  completedAt?: string;
}

export interface TimerState {
  id?: number;
  userId: number;
  mode: TimerMode;
  isRunning: boolean;
  startedAt?: number;
  durationSec: number;
  remainingSec?: number;
  subjectId?: number;
  taskId?: number;
  completedFocuses: number;
  lastTickAt?: number;
  closedWhileRunning?: boolean;
}

export interface Roadmap {
  id?: number;
  userId: number;
  subjectId: number;
  createdAt: string;
}

export interface RoadmapMacro {
  id?: number;
  roadmapId: number;
  title: string;
  order: number;
  completed?: boolean;
}

export interface RoadmapMicro {
  id?: number;
  macroId: number;
  title: string;
  order: number;
  completed: boolean;
}

export interface AchievementProgress {
  id?: number;
  userId: number;
  achievementId: string;
  tier: "bronze" | "silver" | "gold";
  count: number;
  lastUnlockedAt?: string;
  lastPeriodKey?: string;
  unlocked: boolean;
}

export interface Flashcard {
  id?: number;
  userId: number;
  subjectId: number;
  setId: number;
  front: string;
  back: string;
  createdAt: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewAt: string | null;
  lastReviewedAt: string | null;
  lastQuality: number | null;
}

export interface FlashcardSet {
  id?: number;
  userId: number;
  subjectId: number;
  name: string;
  createdAt: string;
}
