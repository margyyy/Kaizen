import type { Flashcard } from "./db";

const MIN_EF = 1.3;

export function isDue(card: Flashcard): boolean {
  if (!card.nextReviewAt) return true;
  return new Date(card.nextReviewAt).getTime() <= Date.now();
}

export function computeNextReview(
  card: Flashcard,
  quality: number,
): Partial<Flashcard> {
  const now = new Date().toISOString();
  let { easeFactor, interval, repetitions } = card;

  if (quality >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < MIN_EF) easeFactor = MIN_EF;

  const nextReviewAt = new Date(Date.now() + interval * 24 * 60 * 60 * 1000).toISOString();

  return {
    easeFactor: Math.round(easeFactor * 100) / 100,
    interval,
    repetitions,
    nextReviewAt,
    lastReviewedAt: now,
    lastQuality: quality,
  };
}
