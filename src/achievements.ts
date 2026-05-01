export type AchievementTier = "bronze" | "silver" | "gold";
export type ResetPeriod = "weekly" | "monthly" | "yearly";

export interface AchievementTierDef {
  threshold?: number;
  unit?: string;
  subjects?: number;
  hours_per_subject?: number;
  label?: string;
}

export interface AchievementItem {
  id: string;
  name: string;
  description: string;
  howToUnlock: string;
  tiers?: Record<AchievementTier, AchievementTierDef>;
  stackable: boolean;
  reset_period: ResetPeriod | null;
}

export interface SecretAchievement {
  id: string;
  name: string;
  description: string;
  howToUnlock: string;
  trigger: string;
  stackable: boolean;
}

export const ACHIEVEMENTS = {
  permanent: {
    description:
      "Achievements unlocked once. They represent your historical progression.",
    items: [
      {
        id: "the_sage",
        name: "The Sage",
        description: "Total hours accumulated since registration.",
        howToUnlock:
          "Study for 100h (Bronze), 500h (Silver), or 1000h (Gold) total since you joined.",
        tiers: {
          bronze: { threshold: 100, unit: "hours" },
          silver: { threshold: 500, unit: "hours" },
          gold: { threshold: 1000, unit: "hours" },
        },
        stackable: false,
        reset_period: null,
      },
      {
        id: "specialist",
        name: "Specialist",
        description: "Total hours dedicated to a single subject.",
        howToUnlock:
          "Accumulate 50h (Bronze), 150h (Silver), or 300h (Gold) on a single subject.",
        tiers: {
          bronze: { threshold: 50, unit: "hours" },
          silver: { threshold: 150, unit: "hours" },
          gold: { threshold: 300, unit: "hours" },
        },
        stackable: false,
        reset_period: null,
      },
      {
        id: "encyclopedic",
        name: "Encyclopedic",
        description:
          "Number of different subjects studied in depth.",
        howToUnlock:
          "Study 5h+ each on 5 subjects (Bronze), 5h+ each on 10 subjects (Silver), or 30h+ each on 10 subjects (Gold).",
        tiers: {
          bronze: { threshold: 5, unit: "subjects" },
          silver: { threshold: 10, unit: "subjects" },
          gold: { threshold: 10, unit: "subjects", hours_per_subject: 30 },
        },
        stackable: false,
        reset_period: null,
      },
      {
        id: "die_hard",
        name: "Die Hard",
        description: "All-time record of consecutive study days (streak).",
        howToUnlock:
          "Reach a streak of 15 (Bronze), 50 (Silver), or 150 (Gold) consecutive study days.",
        tiers: {
          bronze: { threshold: 15, unit: "days" },
          silver: { threshold: 50, unit: "days" },
          gold: { threshold: 150, unit: "days" },
        },
        stackable: false,
        reset_period: null,
      },
    ] as AchievementItem[],
  },
  recurring: {
    description:
      "Achievements that reset periodically. Once completed, the counter (e.g. x5) increases on your profile.",
    items: [
      {
        id: "weekly_sprinter",
        name: "Weekly Sprinter",
        description:
          "Total hours accumulated in a single week (Mon-Sun).",
        howToUnlock:
          "Study 15h (Bronze), 25h (Silver), or 40h (Gold) in a single week. Resets every Monday.",
        reset_period: "weekly",
        stackable: true,
        tiers: {
          bronze: { threshold: 15, unit: "hours" },
          silver: { threshold: 25, unit: "hours" },
          gold: { threshold: 40, unit: "hours" },
        },
      },
      {
        id: "weekend_warrior",
        name: "Weekend Warrior",
        description: "Total study hours between Saturday and Sunday.",
        howToUnlock:
          "Study 4h (Bronze), 8h (Silver), or 12h (Gold) over a single weekend. Resets every Monday.",
        reset_period: "weekly",
        stackable: true,
        tiers: {
          bronze: { threshold: 4, unit: "hours" },
          silver: { threshold: 8, unit: "hours" },
          gold: { threshold: 12, unit: "hours" },
        },
      },
      {
        id: "monthly_balance",
        name: "Monthly Balancer",
        description:
          "Even load distribution across multiple subjects in a calendar month.",
        howToUnlock:
          "Study 10h+ on 2 subjects (Bronze), 20h+ on 2 subjects (Silver), or 20h+ on 3 subjects (Gold) in a calendar month. Resets monthly.",
        reset_period: "monthly",
        stackable: true,
        tiers: {
          bronze: {
            subjects: 2,
            hours_per_subject: 10,
            label: "20h total across 2 subjects",
          },
          silver: {
            subjects: 2,
            hours_per_subject: 20,
            label: "40h total across 2 subjects",
          },
          gold: {
            subjects: 3,
            hours_per_subject: 20,
            label: "60h total across 3 subjects",
          },
        },
      },
      {
        id: "monthly_consistency",
        name: "Monthly Consistency",
        description: "Number of active days (min 30 min study) in a month.",
        howToUnlock:
          "Study at least 30min on 15 (Bronze), 22 (Silver), or 28 (Gold) days in a calendar month. Resets monthly.",
        reset_period: "monthly",
        stackable: true,
        tiers: {
          bronze: { threshold: 15, unit: "days" },
          silver: { threshold: 22, unit: "days" },
          gold: { threshold: 28, unit: "days" },
        },
      },
      {
        id: "annual_legend",
        name: "Legend of the Year",
        description: "Total study volume in the calendar year.",
        howToUnlock:
          "Study 300h (Bronze), 600h (Silver), or 1000h (Gold) in a calendar year. Resets every January 1st.",
        reset_period: "yearly",
        stackable: true,
        tiers: {
          bronze: { threshold: 300, unit: "hours" },
          silver: { threshold: 600, unit: "hours" },
          gold: { threshold: 1000, unit: "hours" },
        },
      },
      {
        id: "night_owl",
        name: "Night Owl",
        description:
          "Study sessions completed between midnight and 4:00 AM in a month.",
        howToUnlock:
          "Complete 2 (Bronze), 10 (Silver), or 20 (Gold) late-night sessions in a month. Resets monthly.",
        reset_period: "monthly",
        stackable: true,
        tiers: {
          bronze: { threshold: 2, unit: "sessions" },
          silver: { threshold: 10, unit: "sessions" },
          gold: { threshold: 20, unit: "sessions" },
        },
      },
      {
        id: "early_bird",
        name: "Early Bird",
        description:
          "Study sessions started before 7:00 AM in a month.",
        howToUnlock:
          "Start 2 (Bronze), 10 (Silver), or 20 (Gold) early-morning sessions in a month. Resets monthly.",
        reset_period: "monthly",
        stackable: true,
        tiers: {
          bronze: { threshold: 2, unit: "sessions" },
          silver: { threshold: 10, unit: "sessions" },
          gold: { threshold: 20, unit: "sessions" },
        },
      },
      {
        id: "task_master",
        name: "Task Master",
        description: "Tasks completed in a calendar month.",
        howToUnlock:
          "Complete 5 (Bronze), 15 (Silver), or 30 (Gold) tasks in a month. Resets monthly.",
        reset_period: "monthly",
        stackable: true,
        tiers: {
          bronze: { threshold: 5, unit: "tasks" },
          silver: { threshold: 15, unit: "tasks" },
          gold: { threshold: 30, unit: "tasks" },
        },
      },
    ] as AchievementItem[],
  },
};
