import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../DataContext";

const TOUR_COMPLETE_KEY = "studyflow.tourComplete";

interface TourStep {
  route: string;
  title: string;
  description: string;
  waitForSubject?: boolean;
}

export default function TourGuide({ onFinish, children }: { onFinish: () => void; children: React.ReactNode }) {
  const { data } = useData();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [initialSubjectCount] = useState(data.subjects.length);

  const steps: TourStep[] = [
    {
      route: "/subjects",
      title: "Create your first subject",
      description: "Subjects organize your study material. Click the button above to create your first one — like Mathematics, History, or any topic you're learning.",
      waitForSubject: true,
    },
    {
      route: "/tasks",
      title: "Track your tasks",
      description: "Tasks keep you on track. Create tasks linked to your subjects, set due dates, and mark them complete when done. Each completed task counts toward your achievements.",
    },
    {
      route: "/overview",
      title: "Calendar overview",
      description: "The calendar shows your study sessions and tasks by day. Click on any day to add tasks or see what you studied. Drag tasks across days to reschedule them.",
    },
    {
      route: data.subjects.length > 0 ? `/roadmap/${data.subjects[0].id}` : "/subjects",
      title: "Plan with roadmaps",
      description: "Roadmaps let you break down each subject into macro topics and micro steps. Click on a subject to plan your entire learning path from start to finish.",
    },
    {
      route: "/flashcards",
      title: "Review with flashcards",
      description: "Create flashcard decks for spaced repetition. Review cards daily — the system schedules reviews to strengthen your long-term memory.",
    },
    {
      route: "/",
      title: "Start a focus session",
      description: "The Pomodoro timer is your main tool. Select a subject, set your duration, and start focusing. All your study time is tracked automatically. You can also open the mini overlay window from here.",
    },
  ];

  const current = steps[step];

  useEffect(() => {
    navigate(current.route);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (current.waitForSubject && data.subjects.length > initialSubjectCount) {
      setStep((s) => s + 1);
    }
  }, [data.subjects.length, current.waitForSubject, initialSubjectCount]);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
    } else {
      finishTour();
    }
  };

  const handleSkip = () => {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
    } else {
      finishTour();
    }
  };

  const finishTour = () => {
    localStorage.setItem(TOUR_COMPLETE_KEY, "true");
    navigate("/");
    onFinish();
  };

  const isLast = step === steps.length - 1;

  return (
    <div className="relative min-h-screen">
      {children}

      {/* Tour tooltip at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none">
        <div className="card bg-base-100 shadow-2xl border border-primary/40 max-w-lg mx-auto pointer-events-auto">
          <div className="card-body p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-primary/70">
                {step + 1} / {steps.length}
              </span>
              {current.waitForSubject && (
                <span className="text-xs text-base-content/50 ml-auto">Auto-advances</span>
              )}
            </div>
            <h3 className="font-semibold text-lg">{current.title}</h3>
            <p className="text-sm text-base-content/70">{current.description}</p>
            <div className="flex gap-2 mt-3">
              <button className="btn btn-ghost btn-sm" onClick={handleSkip}>
                Skip
              </button>
              <button
                className="btn btn-primary btn-sm flex-1"
                onClick={handleNext}
                disabled={current.waitForSubject}
              >
                {isLast ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
