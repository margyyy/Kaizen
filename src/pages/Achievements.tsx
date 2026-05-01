import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addYears,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import {
  ACHIEVEMENTS,
  type AchievementItem,
  type AchievementTier,
  type AchievementTierDef,
} from "../achievements";
import {
  type AchievementProgress,
  type StudySession,
  type StudyTask,
} from "../db";
import goldMedal from "../../media/usaquesto_oro.svg";
import silverMedal from "../../media/usaquesto_argento.svg";
import bronzeMedal from "../../media/usaquesto_bronze.svg";
import { useData } from "../DataContext";

interface Metrics {
  totalHours: number;
  maxSubjectHours: number;
  subjectsOver5h: number;
  subjectsOver30h: number;
  longestStreak: number;
  weeklyHours: number;
  weekendHours: number;
  monthlyActiveDays30m: number;
  monthlyHoursBySubject: Map<number, number>;
  yearlyHours: number;
  monthlyNightOwl: number;
  monthlyEarlyBird: number;
  monthlyCompletedTasks: number;
}

const TIER_ORDER: AchievementTier[] = ["bronze", "silver", "gold"];

const TIER_LABELS: Record<AchievementTier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
};

export default function Achievements() {
  const { data, setData } = useData();

  const sessions = data.studySessions;
  const tasks = data.tasks;
  const progress = data.achievements;
  const userId = 0;

  const [detailAchievementId, setDetailAchievementId] = useState<string | null>(
    null,
  );
  const [detailTier, setDetailTier] = useState<AchievementTier | null>(null);

  const metrics = useMemo(
    () => buildMetrics(sessions, tasks),
    [sessions, tasks],
  );

  useEffect(() => {
    const updates = reconcileProgress(userId, metrics, progress);
    if (!updates.length) return;
    setData((prev) => {
      let nextId = prev.nextId;
      const updated = [...prev.achievements];
      for (const update of updates) {
        if (update.id !== undefined) {
          const idx = updated.findIndex((a) => a.id === update.id);
          if (idx >= 0) {
            updated[idx] = { ...updated[idx], ...update };
          }
        } else {
          updated.push({ ...update, id: nextId });
          nextId += 1;
        }
      }
      return { ...prev, achievements: updated, nextId };
    });
  }, [metrics, progress, userId, setData]);

  const progressMap = useMemo(() => {
    const map = new Map<string, AchievementProgress[]>();
    progress.forEach((entry) => {
      const key = `${entry.achievementId}:${entry.tier}`;
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    });
    return map;
  }, [progress]);

  const allItems = useMemo(
    () => [...ACHIEVEMENTS.permanent.items, ...ACHIEVEMENTS.recurring.items],
    [],
  );

  const detailItem = useMemo(() => {
    if (!detailAchievementId) return null;
    return allItems.find((a) => a.id === detailAchievementId) ?? null;
  }, [detailAchievementId, allItems]);

  const detailRecords = useMemo(() => {
    if (!detailAchievementId || !detailTier) return [];
    return progressMap.get(`${detailAchievementId}:${detailTier}`) ?? [];
  }, [detailAchievementId, detailTier, progressMap]);

  const openDetail = (achievementId: string, tier: AchievementTier) => {
    setDetailAchievementId(achievementId);
    setDetailTier(tier);
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Achievements
          </h2>
          <p className="text-sm text-base-content/60">
            Permanent and recurring trophies with unlock history.
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Permanent</h3>
        <AchievementGrid
          items={ACHIEVEMENTS.permanent.items}
          progressMap={progressMap}
          recurring={false}
          onDetail={openDetail}
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Recurring</h3>
        <AchievementGrid
          items={ACHIEVEMENTS.recurring.items}
          progressMap={progressMap}
          recurring
          onDetail={openDetail}
        />
      </section>

      {/* Quick summary */}
      <section className="card bg-base-100 shadow-sm border border-base-300">
        <div className="card-body py-4">
          <h4 className="font-semibold">Quick Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <Stat
              label="Total hours"
              value={`${metrics.totalHours.toFixed(1)}h`}
            />
            <Stat
              label="Best streak"
              value={`${metrics.longestStreak} days`}
            />
            <Stat
              label="This week"
              value={`${metrics.weeklyHours.toFixed(1)}h`}
            />
            <Stat
              label="This year"
              value={`${metrics.yearlyHours.toFixed(1)}h`}
            />
          </div>
        </div>
      </section>

      {/* Detail modal */}
      {detailAchievementId && detailTier && (
        <div
          className="modal modal-open"
          onClick={() => {
            setDetailAchievementId(null);
            setDetailTier(null);
          }}
        >
          <div
            className="modal-box max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <TrophyIcon
                achievementId={detailAchievementId}
                tier={detailTier}
                unlocked={
                  detailRecords.length > 0 &&
                  detailRecords.some((r) => r.unlocked)
                }
              />
              <div>
                <div className="font-semibold text-lg">
                  {detailItem?.name ?? detailAchievementId}
                </div>
                <div className="text-sm capitalize text-base-content/60">
                  {TIER_LABELS[detailTier]} tier
                </div>
              </div>
            </div>

            {/* Achievement description + tier requirement */}
            {detailItem && (
              <div className="space-y-2 mb-3">
                <p className="text-sm text-base-content/80 leading-relaxed">
                  {detailItem.description}
                </p>
                <p className="text-xs text-base-content/50 italic">
                  {getTierRequirementText(detailItem, detailTier)}
                </p>
              </div>
            )}

            {detailRecords.length === 0 || (detailItem && !detailItem.stackable && !detailRecords.some(r => r.unlocked)) ? (
              <p className="text-sm text-base-content/60">
                Not yet unlocked. Keep going!
              </p>
            ) : !detailItem?.stackable ? (
              // Permanent: single record display
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-base-content/60">Status</span>
                  <span className="font-medium">
                    {detailRecords[0].unlocked ? "Unlocked" : "Not yet"}
                  </span>
                </div>
                {detailRecords[0].lastUnlockedAt && (
                  <div className="flex justify-between">
                    <span className="text-base-content/60">When</span>
                    <span className="font-medium">
                      {format(
                        new Date(detailRecords[0].lastUnlockedAt),
                        "dd MMM yyyy",
                      )}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Earned {detailRecords.length} time
                  {detailRecords.length > 1 ? "s" : ""}
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {detailRecords
                    .filter((r) => r.unlocked)
                    .sort((a, b) => {
                      const da = a.lastUnlockedAt ?? "";
                      const db = b.lastUnlockedAt ?? "";
                      return db.localeCompare(da);
                    })
                    .map((record, idx) => (
                      <div
                        key={record.id ?? idx}
                        className="flex justify-between text-sm py-1 border-b border-base-200 last:border-0"
                      >
                        <span className="text-base-content/60">
                          {record.lastPeriodKey &&
                          record.lastPeriodKey !== "_once_"
                            ? record.lastPeriodKey
                            : `#${idx + 1}`}
                        </span>
                        <span className="font-medium">
                          {record.lastUnlockedAt
                            ? format(
                                new Date(record.lastUnlockedAt),
                                "dd MMM yyyy",
                              )
                            : "—"}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="modal-action">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setDetailAchievementId(null);
                  setDetailTier(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getTierRequirementText(
  item: AchievementItem,
  tier: AchievementTier,
): string {
  const tierDef = item.tiers?.[tier];
  if (!tierDef) return "";

  if (tierDef.label) {
    return `Requires: ${tierDef.label}`;
  }
  const threshold = tierDef.threshold ?? 0;
  const unit = tierDef.unit ?? "";
  const hps = tierDef.hours_per_subject;
  let unitStr = unit;
  if (unit === "hours") unitStr = "hours";
  else if (unit === "days") unitStr = "days";
  else if (unit === "sessions") unitStr = "sessions";
  else if (unit === "subjects") {
    unitStr = hps ? `subjects (${hps}h each)` : "subjects (5h each)";
  } else if (unit === "tasks") unitStr = "tasks";
  return `Requires: ${threshold} ${unitStr}`;
}

function getNextTierHint(
  item: AchievementItem,
  progressMap: Map<string, AchievementProgress[]>,
): string {
  const tierDefs = item.tiers;
  if (!tierDefs) return "";

  for (const tier of TIER_ORDER) {
    const records = progressMap.get(`${item.id}:${tier}`) ?? [];
    const hasUnlocked = records.some((r) => r.unlocked);
    if (!hasUnlocked) {
      const tierDef = tierDefs[tier];
      return formatTierHint(item.id, tier, tierDef);
    }
  }
  return "All tiers completed!";
}

function formatTierHint(
  achievementId: string,
  tier: AchievementTier,
  tierDef: AchievementTierDef,
): string {
  if (tierDef.label) {
    return `${tierDef.label} to unlock ${TIER_LABELS[tier]}`;
  }

  const threshold = tierDef.threshold ?? 0;
  const unit = tierDef.unit ?? "";
  const hoursPerSubject = tierDef.hours_per_subject;
  const unitDisplay =
    unit === "hours"
      ? "h"
      : unit === "days"
        ? " days"
        : unit === "subjects"
          ? " subjects"
          : unit === "sessions"
            ? " sessions"
            : unit === "tasks"
              ? " tasks"
              : ` ${unit}`;

  const verbs: Record<string, string> = {
    the_sage: "Study",
    specialist: "Accumulate",
    encyclopedic: hoursPerSubject
      ? `Study ${hoursPerSubject}h+ on`
      : "Study 5h+ on",
    die_hard: "Reach a streak of",
    weekly_sprinter: "Study",
    weekend_warrior: "Study",
    monthly_consistency: "Be active on",
    annual_legend: "Study",
    night_owl: "Complete",
    early_bird: "Start",
    task_master: "Complete",
  };

  const verb = verbs[achievementId] ?? "Reach";
  const tierLabel = TIER_LABELS[tier];
  return `${verb} ${threshold}${unitDisplay} to unlock ${tierLabel}`;
}

function AchievementGrid({
  items,
  progressMap,
  recurring,
  onDetail,
}: {
  items: AchievementItem[];
  progressMap: Map<string, AchievementProgress[]>;
  recurring: boolean;
  onDetail: (achievementId: string, tier: AchievementTier) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <div key={item.id} className="flex flex-col gap-2">
          {/* Main card */}
          <div className="card bg-base-100 shadow-sm border border-base-300 hover:border-accent/40 transition-colors flex-1">
            <div className="card-body py-5 px-4 gap-4">
              <div className="text-base font-semibold leading-tight text-center">
                {item.name}
              </div>

              {/* Achievement description */}
              <p className="text-xs text-base-content/60 text-center leading-relaxed">
                {item.description}
              </p>

              {/* Three trophy tiers */}
              <div className="flex gap-2 justify-center">
                {TIER_ORDER.map((tier) => {
                  const records =
                    progressMap.get(`${item.id}:${tier}`) ?? [];
                  const totalCount = records.filter(
                    (r) => r.unlocked,
                  ).length;
                  const hasUnlocked = records.some((r) => r.unlocked);

                  return (
                    <button
                      key={tier}
                      type="button"
                      className="trophy-box flex flex-col items-center gap-1.5 cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => onDetail(item.id, tier)}
                      title={`${TIER_LABELS[tier]} — ${hasUnlocked ? "Unlocked" : "Locked"}${recurring && totalCount > 0 ? ` (x${totalCount})` : ""}`}
                    >
                      <TrophyIcon
                        achievementId={item.id}
                        tier={tier}
                        unlocked={hasUnlocked}
                      />
                      <span className="text-[11px] font-medium capitalize text-base-content/50">
                        {TIER_LABELS[tier]}
                      </span>
                      {recurring && totalCount > 0 && (
                        <span className="trophy-counter">
                          x{totalCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Incremental unlock hint */}
              <p className="text-xs text-base-content/50 text-center leading-relaxed italic">
                {getNextTierHint(item, progressMap)}
              </p>
            </div>
          </div>

          {/* Reset countdown — outside the card, recurring only */}
          {recurring && (
            <ResetCountdown period={item.reset_period!} />
          )}
        </div>
      ))}
    </div>
  );
}

function ResetCountdown({
  period,
}: {
  period: "weekly" | "monthly" | "yearly";
}) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const resetDate = getNextReset(period);
  const label = formatCountdown(resetDate);
  const periodLabel =
    period === "weekly"
      ? "Weekly"
      : period === "monthly"
        ? "Monthly"
        : "Yearly";

  return (
    <div className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-base-200/50 border border-base-300/50">
      <span className="text-base-content/50">{periodLabel} reset</span>
      <span className="font-mono font-medium text-base-content/70">
        {label}
      </span>
    </div>
  );
}

function getNextReset(period: "weekly" | "monthly" | "yearly"): Date {
  const now = new Date();
  if (period === "weekly") {
    return startOfWeek(addDays(now, 7), { weekStartsOn: 1 });
  }
  if (period === "monthly") {
    return startOfMonth(addMonths(now, 1));
  }
  return startOfYear(addYears(now, 1));
}

function formatCountdown(resetDate: Date): string {
  const now = new Date();
  const totalMs = resetDate.getTime() - now.getTime();

  if (totalMs <= 0) return "resetting...";

  const totalMinutes = Math.floor(totalMs / 60000);
  const totalHours = Math.floor(totalMs / 3600000);
  const days = Math.floor(totalMs / 86400000);

  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }
  if (totalHours < 24) {
    const mins = totalMinutes % 60;
    return `${totalHours}h ${mins}m`;
  }
  const remainingHours = totalHours % 24;
  return `${days}d ${remainingHours}h`;
}

function TrophyIcon({
  achievementId,
  tier,
  unlocked,
}: {
  achievementId: string;
  tier: AchievementTier;
  unlocked: boolean;
}) {
  const src =
    tier === "gold"
      ? goldMedal
      : tier === "silver"
        ? silverMedal
        : bronzeMedal;

  return (
    <div
      className={`achievement-trophy ${unlocked ? "achievement-trophy-on" : "achievement-locked"}`}
      aria-label={`${achievementId}-${tier}`}
    >
      <img
        src={src}
        alt={`${tier} trophy`}
        className="achievement-medal-img"
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-base-300 px-3 py-2">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-base-content/60">{label}</div>
    </div>
  );
}

function buildMetrics(
  sessions: StudySession[],
  tasks: StudyTask[],
): Metrics {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);

  let totalMinutes = 0;
  const minutesBySubject = new Map<number, number>();
  const minutesByDate = new Map<string, number>();
  const monthMinutesBySubject = new Map<number, number>();
  let weeklyMinutes = 0;
  let weekendMinutes = 0;
  let yearlyMinutes = 0;
  let monthlyNightOwl = 0;
  let monthlyEarlyBird = 0;

  for (const session of sessions) {
    const ended = new Date(session.endedAt);
    const started = new Date(session.startedAt);
    const minutes = session.minutes;

    totalMinutes += minutes;
    minutesBySubject.set(
      session.subjectId,
      (minutesBySubject.get(session.subjectId) ?? 0) + minutes,
    );

    const dayKey = format(ended, "yyyy-MM-dd");
    minutesByDate.set(dayKey, (minutesByDate.get(dayKey) ?? 0) + minutes);

    if (isWithinInterval(ended, { start: weekStart, end: weekEnd })) {
      weeklyMinutes += minutes;
      const day = ended.getDay();
      if (day === 0 || day === 6) weekendMinutes += minutes;
    }

    if (isWithinInterval(ended, { start: monthStart, end: monthEnd })) {
      monthMinutesBySubject.set(
        session.subjectId,
        (monthMinutesBySubject.get(session.subjectId) ?? 0) + minutes,
      );
      if (ended.getHours() >= 0 && ended.getHours() < 4) {
        monthlyNightOwl += 1;
      }
      if (started.getHours() < 7) {
        monthlyEarlyBird += 1;
      }
    }

    if (isWithinInterval(ended, { start: yearStart, end: yearEnd })) {
      yearlyMinutes += minutes;
    }
  }

  const subjectHours = Array.from(minutesBySubject.values()).map(
    (m) => m / 60,
  );
  const maxSubjectHours = subjectHours.length
    ? Math.max(...subjectHours)
    : 0;
  const subjectsOver5h = subjectHours.filter((h) => h >= 5).length;
  const subjectsOver30h = subjectHours.filter((h) => h >= 30).length;

  const monthlyActiveDays30m = Array.from(minutesByDate.entries())
    .filter(([dateKey, minutes]) => {
      const date = new Date(`${dateKey}T12:00:00`);
      return (
        isWithinInterval(date, { start: monthStart, end: monthEnd }) &&
        minutes >= 30
      );
    }).length;

  let monthlyCompletedTasks = 0;
  for (const task of tasks) {
    if (!task.completedAt) continue;
    const completedDate = new Date(task.completedAt);
    if (isWithinInterval(completedDate, { start: monthStart, end: monthEnd })) {
      monthlyCompletedTasks += 1;
    }
  }

  return {
    totalHours: totalMinutes / 60,
    maxSubjectHours,
    subjectsOver5h,
    subjectsOver30h,
    longestStreak: computeLongestStreak(minutesByDate),
    weeklyHours: weeklyMinutes / 60,
    weekendHours: weekendMinutes / 60,
    monthlyActiveDays30m,
    monthlyHoursBySubject: new Map(
      Array.from(monthMinutesBySubject.entries()).map(([id, minutes]) => [
        id,
        minutes / 60,
      ]),
    ),
    yearlyHours: yearlyMinutes / 60,
    monthlyNightOwl,
    monthlyEarlyBird,
    monthlyCompletedTasks,
  };
}

function computeLongestStreak(minutesByDate: Map<string, number>): number {
  const days = Array.from(minutesByDate.entries())
    .filter(([, minutes]) => minutes > 0)
    .map(([key]) => key)
    .sort();

  if (!days.length) return 0;

  let best = 1;
  let current = 1;

  for (let i = 1; i < days.length; i += 1) {
    const prev = new Date(`${days[i - 1]}T00:00:00`);
    const curr = new Date(`${days[i]}T00:00:00`);
    const diffDays = Math.round(
      (curr.getTime() - prev.getTime()) / 86400000,
    );
    if (diffDays === 1) {
      current += 1;
      if (current > best) best = current;
    } else {
      current = 1;
    }
  }

  return best;
}

function reconcileProgress(
  userId: number,
  metrics: Metrics,
  existing: AchievementProgress[],
): AchievementProgress[] {
  const existingMap = new Map<string, AchievementProgress>();
  existing.forEach((row) => {
    const periodKey = row.lastPeriodKey ?? "_once_";
    const key = `${row.achievementId}:${row.tier}:${periodKey}`;
    existingMap.set(key, row);
  });

  const updates: AchievementProgress[] = [];
  const now = new Date().toISOString();

  const upsertPermanent = (
    achievementId: string,
    tier: AchievementTier,
    unlocked: boolean,
  ) => {
    const key = `${achievementId}:${tier}:_once_`;
    const prev = existingMap.get(key);
    const nextUnlocked = unlocked || Boolean(prev?.unlocked);

    if (!prev || prev.unlocked !== nextUnlocked) {
      updates.push({
        id: prev?.id,
        userId,
        achievementId,
        tier,
        unlocked: nextUnlocked,
        count: nextUnlocked ? 1 : 0,
        lastUnlockedAt: nextUnlocked ? prev?.lastUnlockedAt ?? now : undefined,
        lastPeriodKey: "_once_",
      });
    }
  };

  const upsertRecurring = (
    achievementId: string,
    tier: AchievementTier,
    unlocked: boolean,
    periodKey: string,
  ) => {
    const key = `${achievementId}:${tier}:${periodKey}`;
    const prev = existingMap.get(key);

    if (prev && prev.unlocked) return;
    if (!unlocked && !prev) return;
    if (!unlocked && prev) return;

    if (unlocked && (!prev || !prev.unlocked)) {
      updates.push({
        id: prev?.id,
        userId,
        achievementId,
        tier,
        unlocked: true,
        count: 1,
        lastUnlockedAt: now,
        lastPeriodKey: periodKey,
      });
    }
  };

  for (const item of ACHIEVEMENTS.permanent.items) {
    for (const tier of TIER_ORDER) {
      const unlocked = isTierReached(item.id, tier, metrics);
      upsertPermanent(item.id, tier, unlocked);
    }
  }

  for (const item of ACHIEVEMENTS.recurring.items) {
    const periodKey = getPeriodKey(item.reset_period);
    for (const tier of TIER_ORDER) {
      const unlocked = isTierReached(item.id, tier, metrics);
      upsertRecurring(item.id, tier, unlocked, periodKey);
    }
  }

  return updates;
}

function isTierReached(
  achievementId: string,
  tier: AchievementTier,
  metrics: Metrics,
): boolean {
  if (achievementId === "the_sage") {
    return metrics.totalHours >= thresholdFor(achievementId, tier);
  }
  if (achievementId === "specialist") {
    return metrics.maxSubjectHours >= thresholdFor(achievementId, tier);
  }
  if (achievementId === "encyclopedic") {
    if (tier === "gold") {
      return metrics.subjectsOver30h >= 10;
    }
    return metrics.subjectsOver5h >= thresholdFor(achievementId, tier);
  }
  if (achievementId === "die_hard") {
    return metrics.longestStreak >= thresholdFor(achievementId, tier);
  }
  if (achievementId === "weekly_sprinter") {
    return metrics.weeklyHours >= thresholdFor(achievementId, tier);
  }
  if (achievementId === "weekend_warrior") {
    return metrics.weekendHours >= thresholdFor(achievementId, tier);
  }
  if (achievementId === "monthly_consistency") {
    return (
      metrics.monthlyActiveDays30m >= thresholdFor(achievementId, tier)
    );
  }
  if (achievementId === "annual_legend") {
    return metrics.yearlyHours >= thresholdFor(achievementId, tier);
  }
  if (achievementId === "monthly_balance") {
    const tierDef = ACHIEVEMENTS.recurring.items
      .find((item) => item.id === "monthly_balance")
      ?.tiers?.[tier];
    if (!tierDef?.subjects || !tierDef.hours_per_subject) return false;
    const qualifiedSubjects = Array.from(
      metrics.monthlyHoursBySubject.values(),
    ).filter((hours) => hours >= tierDef.hours_per_subject!).length;
    return qualifiedSubjects >= tierDef.subjects;
  }
  if (achievementId === "night_owl") {
    return metrics.monthlyNightOwl >= thresholdFor(achievementId, tier);
  }
  if (achievementId === "early_bird") {
    return metrics.monthlyEarlyBird >= thresholdFor(achievementId, tier);
  }
  if (achievementId === "task_master") {
    return metrics.monthlyCompletedTasks >= thresholdFor(achievementId, tier);
  }

  return false;
}

function thresholdFor(
  achievementId: string,
  tier: AchievementTier,
): number {
  const all = [
    ...ACHIEVEMENTS.permanent.items,
    ...ACHIEVEMENTS.recurring.items,
  ];
  const item = all.find((entry) => entry.id === achievementId);
  return item?.tiers?.[tier]?.threshold ?? 0;
}

function getPeriodKey(
  period: "weekly" | "monthly" | "yearly" | null,
): string {
  const now = new Date();
  if (period === "weekly") {
    return format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  }
  if (period === "monthly") return format(now, "yyyy-MM");
  if (period === "yearly") return format(now, "yyyy");
  return "_once_";
}
