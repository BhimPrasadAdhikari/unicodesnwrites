"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Cloud,
  CloudOff,
  Code2,
  FileText,
  HelpCircle,
  ListChecks,
  Loader2,
  MessageSquareText,
  NotebookPen,
  PanelLeft,
  PanelRight,
  PlayCircle,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  X,
} from "lucide-react";

import { AiNotesGenerator } from "@/components/public/AiNotesGenerator";
import {
  LessonArticleSection,
  LessonCodeSection,
  LessonInteractiveSection,
  LessonPracticeSection,
  LessonResourcesSection,
} from "@/components/public/LessonRichContent";
import { LessonVideoPlayer } from "@/components/public/LessonVideoPlayer";
import type { LessonWorkspaceDTO } from "@/lib/services/course-platform";
import { cn } from "@/lib/utils";
import { useAnalytics } from "@/hooks/useAnalytics";

type Tab = "transcript" | "notes" | "quiz";
/** The parts of a lesson, each shown on its own like an item in a course outline. */
type Step = "video" | "read" | "try" | "code" | "practice" | "notes" | "quiz";
const STEPS: Step[] = ["video", "read", "try", "code", "practice", "notes", "quiz"];

// Which side panels are open is a per-viewer convenience, kept in this browser only.
const RAIL_KEY = "course-workspace:rail";
const SIDE_KEY = "course-workspace:side";
type QuizResult = {
  attemptId?: string;
  attemptedAt?: string;
  score: number;
  passed: boolean;
  correctCount: number;
  total: number;
  results: Array<{
    questionKey: string;
    correct: boolean;
    selectedOption: number | null;
    correctOption: number;
    explanation: string;
  }>;
};
type LessonPersistence = {
  notes: string;
  activeTab: Tab;
  videoPositionSeconds: number;
  lastSavedAt: string | null;
  quizAttemptCount: number;
  quizAttempts: Array<
    QuizResult & {
      id: string;
      answers: Array<{ questionKey: string; selectedOption: number }>;
    }
  >;
};

/** Admin preview of draft lessons: nothing is saved and the quiz is graded in the browser. */
export type LessonPreviewOptions = {
  basePath: string;
  overviewPath: string;
  answerKey: Record<string, { correctOption: number; explanation: string }>;
};

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function CourseLessonWorkspace({
  workspace,
  initialCompletedLessons,
  initialPersistence,
  preview,
}: {
  workspace: LessonWorkspaceDTO;
  initialCompletedLessons: string[];
  initialPersistence: LessonPersistence;
  preview?: LessonPreviewOptions;
}) {
  const lessonHref = (slug: string) =>
    preview
      ? `${preview.basePath}/${slug}`
      : `/courses/${workspace.course.slug}/learn/${slug}`;
  const overviewHref = preview?.overviewPath || `/courses/${workspace.course.slug}`;
  const router = useRouter();
  const { trackEvent } = useAnalytics();
  const notesKey = `course-notes:${workspace.course.slug}:${workspace.lesson.slug}`;
  const latestAttempt = initialPersistence.quizAttempts[0];
  const [tab, setTab] = useState<Tab>(initialPersistence.activeTab);
  const [step, setStep] = useState<Step>(
    workspace.lesson.embedUrl || workspace.lesson.videoUrl ? "video" : "read",
  );
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(true);
  const [sideOpen, setSideOpen] = useState(false);
  const [sideSheet, setSideSheet] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const activeLessonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const savedRail = localStorage.getItem(RAIL_KEY);
      if (savedRail) setRailOpen(savedRail === "open");
      if (localStorage.getItem(SIDE_KEY) === "open") setSideOpen(true);
    } catch {}
  }, []);

  const toggleRail = () => {
    setRailOpen((open) => {
      try {
        localStorage.setItem(RAIL_KEY, open ? "closed" : "open");
      } catch {}
      return !open;
    });
  };

  const toggleSide = () => {
    setSideOpen((open) => {
      try {
        localStorage.setItem(SIDE_KEY, open ? "closed" : "open");
      } catch {}
      return !open;
    });
  };
  const [completedLessons, setCompletedLessons] = useState<string[]>(
    initialCompletedLessons,
  );
  const [personalNotes, setPersonalNotes] = useState(initialPersistence.notes);
  const [transcriptQuery, setTranscriptQuery] = useState("");
  const [videoPosition, setVideoPosition] = useState(
    initialPersistence.videoPositionSeconds,
  );
  const [videoSeek, setVideoSeek] = useState(
    initialPersistence.videoPositionSeconds,
  );
  const [answers, setAnswers] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      (latestAttempt?.answers || []).map((answer) => [
        answer.questionKey,
        answer.selectedOption,
      ]),
    ),
  );
  const [quizResult, setQuizResult] = useState<QuizResult | null>(
    latestAttempt || null,
  );
  const [quizAttemptCount, setQuizAttemptCount] = useState(
    initialPersistence.quizAttemptCount,
  );
  const [submitting, setSubmitting] = useState(false);
  const [quizError, setQuizError] = useState("");
  const [notesFocus, setNotesFocus] = useState("");
  const [persistenceReady, setPersistenceReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | "error">(
    "saved",
  );
  const [saveRevision, setSaveRevision] = useState(0);
  const lastSavedPayload = useRef("");
  const saveQueue = useRef(Promise.resolve());

  useEffect(() => {
    try {
      const localNotes = localStorage.getItem(notesKey);
      if (!initialPersistence.notes && localNotes) setPersonalNotes(localNotes);
    } catch {
      // Server state remains authoritative when local storage is unavailable.
    }
    setPersistenceReady(true);
  }, [initialPersistence.notes, notesKey]);

  useEffect(() => {
    if (!persistenceReady || preview) return;
    const payload = {
      notes: personalNotes,
      activeTab: tab,
      videoPositionSeconds: videoPosition,
    };
    const signature = JSON.stringify(payload);
    if (signature === lastSavedPayload.current) return;
    setSaveStatus("saving");
    const timeout = window.setTimeout(() => {
      saveQueue.current = saveQueue.current
        .catch(() => undefined)
        .then(async () => {
          const response = await fetch(
            `/api/courses/${encodeURIComponent(workspace.course.slug)}/lessons/${encodeURIComponent(workspace.lesson.slug)}/state`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: signature,
            },
          );
          if (!response.ok) throw new Error("Learning state save failed");
          lastSavedPayload.current = signature;
          try {
            localStorage.removeItem(notesKey);
          } catch {}
          setSaveStatus("saved");
        })
        .catch(() => setSaveStatus("error"));
    }, 750);
    return () => window.clearTimeout(timeout);
  }, [
    notesKey,
    persistenceReady,
    personalNotes,
    preview,
    saveRevision,
    tab,
    videoPosition,
    workspace.course.slug,
    workspace.lesson.slug,
  ]);

  const handleVideoPosition = useCallback((position: number) => {
    setVideoPosition((current) =>
      Math.abs(current - position) >= 10 ? position : current,
    );
  }, []);

  const filteredTranscript = useMemo(() => {
    const query = transcriptQuery.trim().toLowerCase();
    return query
      ? (workspace.lesson.transcript || []).filter((cue) =>
          cue.text.toLowerCase().includes(query),
        )
      : workspace.lesson.transcript || [];
  }, [transcriptQuery, workspace.lesson.transcript]);

  const generatedNotes = useMemo(() => {
    const focusWords = notesFocus
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 2);
    return (workspace.lesson.transcript || [])
      .filter(
        (cue) =>
          !focusWords.length ||
          focusWords.some((word) => cue.text.toLowerCase().includes(word)),
      )
      .slice(0, 4);
  }, [notesFocus, workspace.lesson.transcript]);

  const isComplete = completedLessons.includes(workspace.lesson.slug);
  const totalLessons = workspace.curriculum.reduce(
    (total, module) => total + module.lessons.length,
    0,
  );
  const completedCount = completedLessons.filter((slug) =>
    workspace.curriculum.some((module) =>
      module.lessons.some((lesson) => lesson.slug === slug),
    ),
  ).length;
  const progress = totalLessons
    ? Math.round((completedCount / totalLessons) * 100)
    : 0;

  const lesson = workspace.lesson;
  const hasVideo = Boolean(lesson.embedUrl || lesson.videoUrl);
  const readingMinutes = lesson.article
    ? Math.max(1, Math.round(lesson.article.split(/\s+/).length / 200))
    : 0;
  const steps = (
    [
      { value: "video", label: "Video", meta: `Video · ${lesson.durationMinutes} min`, icon: PlayCircle, show: hasVideo },
      { value: "read", label: "Read the lesson", meta: readingMinutes ? `Reading · ${readingMinutes} min` : "Key points", icon: BookOpenText, show: true },
      { value: "try", label: lesson.interactive?.title || "Try it yourself", meta: "Interactive", icon: Sparkles, show: Boolean(lesson.interactive) },
      { value: "code", label: lesson.codeWalkthrough?.title || "Code walkthrough", meta: "Code walkthrough", icon: Code2, show: Boolean(lesson.codeWalkthrough) },
      { value: "practice", label: "Practice", meta: `Practice · ${lesson.exercises.length} ${lesson.exercises.length === 1 ? "exercise" : "exercises"}`, icon: Target, show: lesson.exercises.length > 0 },
      { value: "notes", label: "Study notes", meta: "Notes · key ideas and yours", icon: NotebookPen, show: true },
      { value: "quiz", label: "Quiz", meta: `Quiz · ${lesson.quiz.length} questions`, icon: ListChecks, show: lesson.quiz.length > 0 },
    ] as const
  ).filter((item) => item.show);
  const currentStep = steps.find((item) => item.value === step) || steps[0];
  const stepIndex = steps.indexOf(currentStep);
  const previousStep = stepIndex > 0 ? steps[stepIndex - 1] : null;
  const nextStep = stepIndex < steps.length - 1 ? steps[stepIndex + 1] : null;

  const openStep = (value: Step) => {
    setStep(value);
    if (value === "notes" || value === "quiz") setTab(value);
    setCurriculumOpen(false);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("part", value);
      window.history.replaceState(window.history.state, "", url);
    } catch {}
    mainRef.current?.scrollTo({ top: 0 });
    if (!window.matchMedia("(min-width: 1024px)").matches) window.scrollTo({ top: 0 });
  };

  // Open the part named in the address (?part=quiz), so a part can be linked and survives a reload.
  useEffect(() => {
    const part = new URLSearchParams(window.location.search).get("part");
    if (part && STEPS.includes(part as Step)) setStep(part as Step);
  }, []);

  const seekTo = (seconds: number) => {
    setVideoSeek(seconds);
    // On a phone the transcript sheet covers the video, so close it to show the jump.
    setSideSheet(false);
    if (hasVideo && step !== "video") openStep("video");
  };


  // Keep the current lesson visible in the lesson list.
  useEffect(() => {
    if (railOpen) activeLessonRef.current?.scrollIntoView({ block: "center" });
  }, [railOpen]);

  useEffect(() => {
    if (curriculumOpen) activeLessonRef.current?.scrollIntoView({ block: "center" });
  }, [curriculumOpen]);

  // While a phone sheet is open: Escape closes it and the page behind stays still.
  useEffect(() => {
    if (!curriculumOpen && !sideSheet) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setCurriculumOpen(false);
      setSideSheet(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [curriculumOpen, sideSheet]);

  const markComplete = async ({ advance = true }: { advance?: boolean } = {}) => {
    const willBeComplete = !isComplete;
    const next = willBeComplete
      ? [...new Set([...completedLessons, workspace.lesson.slug])]
      : completedLessons.filter((slug) => slug !== workspace.lesson.slug);
    setCompletedLessons(next);
    if (preview) {
      if (advance && willBeComplete && workspace.navigation.next) {
        router.push(lessonHref(workspace.navigation.next.slug));
      }
      return;
    }
    try {
      const response = await fetch(
        `/api/courses/${encodeURIComponent(workspace.course.slug)}/progress`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonSlug: workspace.lesson.slug,
            completed: willBeComplete,
          }),
        },
      );
      if (!response.ok) {
        setCompletedLessons(completedLessons);
      } else {
        const data = await response.json().catch(() => null);
        if (data && Array.isArray(data.completedLessonSlugs)) {
          setCompletedLessons(data.completedLessonSlugs);
        }
        trackEvent(willBeComplete ? "lesson_completed" : "lesson_reopened", {
          courseSlug: workspace.course.slug,
          lessonSlug: workspace.lesson.slug,
        });
        if (advance && willBeComplete && workspace.navigation.next) {
          router.push(lessonHref(workspace.navigation.next.slug));
        }
      }
    } catch {
      setCompletedLessons(completedLessons);
    }
  };

  const submitQuiz = async () => {
    setQuizError("");
    if (Object.keys(answers).length !== workspace.lesson.quiz.length) {
      setQuizError("Answer every question before checking your understanding.");
      return;
    }
    if (preview) {
      const results = workspace.lesson.quiz.map((question) => {
        const key = preview.answerKey[question.key];
        const selectedOption = answers[question.key] ?? null;
        return {
          questionKey: question.key,
          correct: selectedOption === key?.correctOption,
          selectedOption,
          correctOption: key?.correctOption ?? -1,
          explanation: key?.explanation || "",
        };
      });
      const correctCount = results.filter((result) => result.correct).length;
      setQuizResult({
        score: results.length ? Math.round((correctCount / results.length) * 100) : 0,
        passed: results.length > 0 && correctCount / results.length >= 0.7,
        correctCount,
        total: results.length,
        results,
      });
      setQuizAttemptCount((count) => count + 1);
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/courses/${encodeURIComponent(workspace.course.slug)}/lessons/${encodeURIComponent(workspace.lesson.slug)}/quiz`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: Object.entries(answers).map(
              ([questionKey, selectedOption]) => ({
                questionKey,
                selectedOption,
              }),
            ),
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to grade quiz. Try again.");
      setQuizResult(data);
      setQuizAttemptCount((count) => count + 1);
      if (data.passed && !isComplete) await markComplete({ advance: false });
    } catch (error) {
      setQuizError(
        error instanceof Error ? error.message : "Unable to grade quiz",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const curriculum = (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-5 pr-16">
        <Link
          href={overviewHref}
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Course overview
        </Link>
        <h2 className="mt-4 font-serif text-lg font-medium leading-6">
          {workspace.course.title}
        </h2>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-foreground transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-eyebrow text-muted-foreground">
          {completedCount} of {totalLessons} complete • {progress}%
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {workspace.curriculum.map((module, moduleIndex) => (
          <div key={module.key} className="mb-5">
            <p className="px-2 pb-2 text-eyebrow text-muted-foreground">
              Part {moduleIndex + 1} · {module.title}
            </p>
            <div className="space-y-0.5">
              {module.lessons.map((item) => {
                const active = item.slug === workspace.lesson.slug;
                const complete = completedLessons.includes(item.slug);
                if (!active) {
                  return (
                    <Link
                      key={item.key}
                      href={lessonHref(item.slug)}
                      onClick={() => setCurriculumOpen(false)}
                      className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-secondary/60"
                    >
                      {complete ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 opacity-40" />
                      )}
                      <span className="min-w-0 flex-1 text-sm leading-5">{item.title}</span>
                      <span className="shrink-0 font-mono text-2xs text-muted-foreground">
                        {item.durationMinutes}m
                      </span>
                    </Link>
                  );
                }
                return (
                  <div key={item.key} ref={activeLessonRef} className="rounded-lg bg-secondary/70 py-1">
                    <p className="flex items-start gap-3 px-3 py-2 text-sm font-semibold leading-5">
                      {complete ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      ) : (
                        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      )}
                      <span className="min-w-0 flex-1">{item.title}</span>
                    </p>
                    <ol className="space-y-0.5 pb-1 pl-5 pr-1">
                      {steps.map(({ value, label, meta, icon: Icon }) => {
                        const current = value === currentStep.value;
                        return (
                          <li key={value}>
                            <button
                              type="button"
                              onClick={() => openStep(value)}
                              aria-current={current ? "step" : undefined}
                              className={cn(
                                "flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition",
                                current
                                  ? "bg-background text-foreground shadow-[inset_2px_0_0_hsl(var(--primary))]"
                                  : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
                              )}
                            >
                              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", current && "text-primary")} />
                              <span className="min-w-0">
                                <span className="block text-[13px] leading-5">{label}</span>
                                <span className="block font-mono text-2xs text-muted-foreground">{meta}</span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const previousLesson = workspace.navigation.previous;
  const nextLesson = workspace.navigation.next;

  const stepHeader = (
    <header className="mb-8">
      <p className="text-eyebrow text-primary">
        Lesson {workspace.lessonNumber} · {currentStep.meta}
      </p>
      <h1 className="mt-2 font-serif text-[26px] font-medium leading-[1.15] tracking-[-0.02em] sm:text-[34px]">
        {workspace.lesson.title}
      </h1>
      {(currentStep.value === "video" || currentStep.value === "read") && (
        <p className="mt-2 max-w-3xl font-serif text-[17px] leading-[1.55] text-muted-foreground">
          {workspace.lesson.summary}
        </p>
      )}
    </header>
  );

  const objectives = workspace.lesson.learningObjectives.length > 0 && (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <p className="text-eyebrow text-muted-foreground">In this lesson you will</p>
      <ul className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
        {workspace.lesson.learningObjectives.map((objective) => (
          <li key={objective} className="flex gap-2 text-sm leading-6">
            <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-success" />
            {objective}
          </li>
        ))}
      </ul>
    </section>
  );

  const completeButton = (compact: boolean) => (
    <button
      type="button"
      onClick={() => markComplete()}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition",
        compact ? "h-9 px-3 text-sm" : "h-12 px-6 text-[15px]",
        isComplete
          ? "border border-success/30 bg-success/10 text-success"
          : "bg-foreground text-background hover:bg-foreground/90",
      )}
    >
      <CheckCircle2 className="h-4 w-4" />
      {isComplete ? "Completed" : compact ? "Mark complete" : nextLesson ? "Mark complete and go to the next lesson" : "Mark complete"}
    </button>
  );

  const hasTranscript = Boolean(workspace.lesson.transcript?.length);
  const studyTools = (
    <div className="flex h-full flex-col">
      <div className="flex h-[3.25rem] shrink-0 items-center gap-2 border-b border-border px-4 pr-14">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold">Transcript</p>
        <p className="font-mono text-2xs text-muted-foreground">Click a line to jump there</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {(
          <div>
            {!workspace.lesson.transcript || workspace.lesson.transcript.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                No transcript available for this lesson.
              </p>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={transcriptQuery}
                    onChange={(event) => setTranscriptQuery(event.target.value)}
                    placeholder="Search this lesson"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
                <div className="max-w-3xl space-y-0.5">
                  {filteredTranscript.map((cue) => (
                    <button
                      key={`${cue.startSeconds}-${cue.text.slice(0, 20)}`}
                      type="button"
                      onClick={() => seekTo(cue.startSeconds)}
                      className="group flex w-full gap-3 rounded-xl p-3 text-left hover:bg-muted"
                    >
                      <span className="mt-0.5 font-mono text-2xs text-muted-foreground">
                        {formatTime(cue.startSeconds)}
                      </span>
                      <span className="text-[15px] leading-6 text-muted-foreground group-hover:text-foreground">
                        {cue.text}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:h-[calc(100dvh-4rem)] lg:overflow-hidden">
      <div className="sticky top-16 z-40 shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:static">
        <div className="flex h-12 items-center gap-2 px-2 sm:px-3">
          <button
            type="button"
            onClick={() => {
              if (window.matchMedia("(min-width: 1024px)").matches) toggleRail();
              else setCurriculumOpen(true);
            }}
            aria-label="Show or hide the lesson list"
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-2.5 text-sm font-semibold hover:bg-secondary"
          >
            <PanelLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Lessons</span>
          </button>
          <Link
            href={overviewHref}
            className="min-w-0 flex-1 truncate text-sm text-muted-foreground hover:text-foreground"
          >
            {workspace.course.title}
          </Link>
          <span className="hidden shrink-0 font-mono text-[12px] text-muted-foreground md:inline">
            Lesson {workspace.lessonNumber} of {workspace.lessonCount}
          </span>
          <div className="flex shrink-0 items-center">
            {previousLesson ? (
              <Link
                href={lessonHref(previousLesson.slug)}
                aria-label={`Previous lesson: ${previousLesson.title}`}
                className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-secondary"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
            ) : (
              <span className="flex h-9 w-9 items-center justify-center text-muted-foreground/40" aria-hidden="true">
                <ChevronLeft className="h-5 w-5" />
              </span>
            )}
            {nextLesson ? (
              <Link
                href={lessonHref(nextLesson.slug)}
                aria-label={`Next lesson: ${nextLesson.title}`}
                className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-secondary"
              >
                <ChevronRight className="h-5 w-5" />
              </Link>
            ) : (
              <span className="flex h-9 w-9 items-center justify-center text-muted-foreground/40" aria-hidden="true">
                <ChevronRight className="h-5 w-5" />
              </span>
            )}
          </div>
          {hasTranscript && (
            <button
              type="button"
              onClick={() => (window.matchMedia("(min-width: 1024px)").matches ? toggleSide() : setSideSheet(true))}
              aria-label="Show or hide the transcript"
              aria-pressed={sideOpen}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-2.5 text-sm font-semibold hover:bg-secondary"
            >
              <PanelRight className="h-4 w-4" />
              <span className="hidden xl:inline">Transcript</span>
            </button>
          )}
          <div className="hidden md:block">{completeButton(true)}</div>
        </div>
        <div className="h-0.5 bg-border/60" aria-hidden="true">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside
          aria-label="Course lessons"
          className={cn(
            "relative hidden shrink-0 border-r border-border bg-card transition-[width] duration-200 lg:block",
            railOpen ? "w-80" : "w-11",
          )}
        >
          {railOpen ? (
            <>
              <div className="h-full w-80 overflow-hidden">{curriculum}</div>
              <button
                type="button"
                onClick={toggleRail}
                aria-label="Hide the lesson list"
                title="Hide the lesson list"
                className="absolute -right-3 top-1/2 z-20 flex h-12 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-card transition-colors hover:border-primary hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={toggleRail}
              aria-label="Show the lesson list"
              title="Show the lesson list"
              className="flex h-full w-full flex-col items-center gap-3 pt-4 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] [writing-mode:vertical-rl]">
                Lessons · {completedCount}/{totalLessons}
              </span>
            </button>
          )}
        </aside>

        <main ref={mainRef} className="min-w-0 flex-1 lg:h-full lg:overflow-y-auto">
          <div
            className={cn(
              "mx-auto px-4 pb-16 pt-6 sm:px-8 sm:pt-8",
              currentStep.value === "video" || currentStep.value === "code" ? "max-w-5xl" : "max-w-3xl",
            )}
          >
            {currentStep.value === "video" && (
              <div className="space-y-6">
                <LessonVideoPlayer
                  embedUrl={workspace.lesson.embedUrl}
                  videoUrl={workspace.lesson.videoUrl}
                  posterUrl={workspace.lesson.videoPosterUrl}
                  title={workspace.lesson.title}
                  initialPositionSeconds={videoPosition}
                  seekToSeconds={videoSeek}
                  onPositionChange={handleVideoPosition}
                />
                {stepHeader}
                {objectives}
              </div>
            )}
            {currentStep.value === "read" && (
              <div className="space-y-10">
                {stepHeader}
                {!hasVideo && objectives}
                <LessonArticleSection lesson={workspace.lesson} />
                <LessonResourcesSection lesson={workspace.lesson} />
              </div>
            )}
            {currentStep.value === "try" && (
              <>
                {stepHeader}
                <LessonInteractiveSection lesson={workspace.lesson} />
              </>
            )}
            {currentStep.value === "code" && (
              <>
                {stepHeader}
                <LessonCodeSection lesson={workspace.lesson} />
              </>
            )}
            {currentStep.value === "practice" && (
              <>
                {stepHeader}
                <LessonPracticeSection lesson={workspace.lesson} />
              </>
            )}
            {currentStep.value === "notes" && stepHeader}
            {currentStep.value === "notes" && (
              <div className="max-w-3xl space-y-6">
                {workspace.lesson.studyGuide?.mentalModel ? (
                  <section>
                    <p className="flex items-center gap-2 text-eyebrow text-primary">
                      <BrainCircuit className="h-4 w-4" /> Study guide
                    </p>
                    <h3 className="mt-3 text-lg font-medium">The big idea</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {workspace.lesson.studyGuide.mentalModel}
                    </p>
                  </section>
                ) : null}
                {workspace.lesson.studyGuide?.keyIdeas?.length ? (
                  <section>
                    <h3 className="text-sm font-medium">Key ideas</h3>
                    <ul className="mt-3 space-y-3">
                      {workspace.lesson.studyGuide.keyIdeas.map((idea) => (
                        <li key={idea} className="flex gap-2 text-xs leading-5">
                          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {idea}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                {workspace.lesson.studyGuide?.misconceptions?.length ? (
                  <section className="rounded-xl border border-warning/20 bg-warning/8 p-4">
                    <h3 className="text-xs font-medium text-warning">
                      Common mix-ups
                    </h3>
                    <ul className="mt-2 space-y-2 text-xs leading-5">
                      {workspace.lesson.studyGuide.misconceptions.map(
                        (item) => (
                          <li key={item}>• {item}</li>
                        ),
                      )}
                    </ul>
                  </section>
                ) : null}
                {workspace.lesson.studyGuide?.recallPrompts?.length ? (
                  <section className="rounded-xl border border-border bg-card p-4">
                    <h3 className="flex items-center gap-2 text-eyebrow text-muted-foreground">
                      <HelpCircle className="h-4 w-4" /> Test your memory
                    </h3>
                    <ul className="mt-2 space-y-2 text-xs leading-5">
                      {workspace.lesson.studyGuide.recallPrompts.map(
                        (prompt) => (
                          <li key={prompt}>? {prompt}</li>
                        ),
                      )}
                    </ul>
                  </section>
                ) : null}
                {workspace.lesson.studyGuide?.explainBackPrompt ? (
                  <section className="rounded-xl border border-border bg-card p-4">
                    <h3 className="flex items-center gap-2 text-xs font-medium">
                      <MessageSquareText className="h-4 w-4 text-muted-foreground" />{" "}
                      Explain it back
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {workspace.lesson.studyGuide.explainBackPrompt}
                    </p>
                  </section>
                ) : null}
                {workspace.lesson.concepts?.length ? (
                  <section>
                    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Key words
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {workspace.lesson.concepts.map((concept) => (
                        <span
                          key={concept}
                          className="rounded-md border border-border px-2 py-1 font-mono text-[11px] text-foreground hover:border-foreground/40"
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  </section>
                ) : null}
                {workspace.lesson.learningObjectives?.length ? (
                  <section className="rounded-xl bg-muted/40 p-4">
                    <h3 className="flex items-center gap-2 text-xs font-medium">
                      <Target className="h-4 w-4 text-muted-foreground" /> What you will learn
                    </h3>
                    <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                      {workspace.lesson.learningObjectives.map((obj) => (
                        <li key={obj} className="flex items-start gap-1.5">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                {!preview && (
                  <AiNotesGenerator
                    courseSlug={workspace.course.slug}
                    lessonSlug={workspace.lesson.slug}
                  />
                )}
                {workspace.lesson.transcript?.length ? (
                  <section>
                    <label className="text-eyebrow text-muted-foreground">
                      Search transcript evidence
                    </label>
                    <input
                      value={notesFocus}
                      onChange={(event) => setNotesFocus(event.target.value)}
                      placeholder="e.g. attention, tool use, evaluation"
                      className="mt-2 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-ring"
                    />
                    {notesFocus && (
                      <div className="mt-3 rounded-xl bg-muted/60 p-3">
                        <p className="text-eyebrow text-muted-foreground">
                          Transcript evidence
                        </p>
                        {generatedNotes.length ? (
                          generatedNotes.map((cue) => (
                            <p
                              key={cue.startSeconds}
                              className="mt-2 text-xs leading-5"
                            >
                              <span className="font-mono text-muted-foreground">
                                {formatTime(cue.startSeconds)}
                              </span>{" "}
                              {cue.text}
                            </p>
                          ))
                        ) : (
                          <p className="mt-2 text-xs text-muted-foreground">
                            No transcript evidence matched that focus yet.
                          </p>
                        )}
                      </div>
                    )}
                  </section>
                ) : null}
                <section>
                  <label htmlFor="personal-notes" className="text-eyebrow text-muted-foreground">
                    My notes
                  </label>
                  <textarea
                    id="personal-notes"
                    value={personalNotes}
                    onChange={(event) => setPersonalNotes(event.target.value)}
                    rows={7}
                    placeholder="Capture the idea in your own words…"
                    className="mt-2 w-full resize-y rounded-lg border border-input bg-card p-3 text-sm leading-6 outline-none focus:border-ring"
                  />
                  <p className="mt-1 text-2xs text-muted-foreground">
                    {saveStatus === "saving" ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" /> Saving to
                        your account...
                      </span>
                    ) : saveStatus === "error" ? (
                      <button
                        type="button"
                        onClick={() => setSaveRevision((value) => value + 1)}
                        className="inline-flex items-center gap-1.5 font-semibold text-destructive"
                      >
                        <CloudOff className="h-3 w-3" /> Not saved. Retry
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <Cloud className="h-3 w-3 text-success" /> Synced
                        across your devices
                      </span>
                    )}
                  </p>
                </section>
              </div>
            )}
            {currentStep.value === "quiz" && stepHeader}
            {currentStep.value === "quiz" && (
              <div className="max-w-3xl">
                {!workspace.lesson.quiz || workspace.lesson.quiz.length === 0 ? (
                  <div className="mb-5">
                    <p className="text-eyebrow text-primary">
                      Knowledge check
                    </p>
                    <h3 className="mt-2 text-lg font-medium">
                      No quiz for this lesson
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      This lesson does not have any quiz questions. Mark the lesson as complete when you finish.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-5">
                      <p className="text-eyebrow text-primary">
                        Knowledge check
                      </p>
                      <h3 className="mt-2 text-lg font-medium">
                        Did it make sense?
                      </h3>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        Answer a few quick questions. Get 70% or more to finish
                        the lesson.
                      </p>
                      <p className="mt-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {quizAttemptCount} saved attempt
                        {quizAttemptCount === 1 ? "" : "s"}
                      </p>
                    </div>
                {quizResult && (
                  <div
                    className={cn(
                      "mb-5 rounded-xl border p-4",
                      quizResult.passed
                        ? "border-success/25 bg-success/8"
                        : "border-warning/25 bg-warning/8",
                    )}
                  >
                    <p className="font-serif text-[32px] font-medium leading-none">{quizResult.score}%</p>
                    <p className="mt-1 text-xs">
                      {quizResult.passed
                        ? "Concept check passed."
                        : "Review the explanations and try again."}
                    </p>
                    {quizResult.passed && workspace.navigation.next ? (
                      <button
                        type="button"
                        onClick={() => router.push(lessonHref(workspace.navigation.next!.slug))}
                        className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:bg-foreground/90"
                      >
                        Next lesson →
                      </button>
                    ) : null}
                  </div>
                )}
                <div className="space-y-6">
                  {workspace.lesson.quiz.map((question, questionIndex) => {
                    const result = quizResult?.results.find(
                      (item) => item.questionKey === question.key,
                    );
                    return (
                      <fieldset key={question.key}>
                        <legend className="text-sm font-semibold leading-6">
                          {questionIndex + 1}. {question.prompt}
                        </legend>
                        <div className="mt-3 space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <label
                              key={option}
                              className={cn(
                                "flex cursor-pointer gap-3 rounded-xl border p-3.5 text-sm leading-6 transition",
                                answers[question.key] === optionIndex
                                  ? "border-foreground bg-secondary"
                                  : "border-border hover:bg-muted",
                              )}
                            >
                              <input
                                type="radio"
                                name={question.key}
                                checked={answers[question.key] === optionIndex}
                                onChange={() => {
                                  setAnswers((current) => ({
                                    ...current,
                                    [question.key]: optionIndex,
                                  }));
                                  setQuizResult(null);
                                }}
                                className="mt-0.5"
                              />
                              {option}
                            </label>
                          ))}
                        </div>
                        {result && (
                          <div
                            className={cn(
                              "mt-3 rounded-lg p-3 text-xs leading-5",
                              result.correct
                                ? "bg-success/10"
                                : "bg-warning/10",
                            )}
                          >
                            <p className="font-semibold">
                              {result.correct ? "Correct" : "Not quite"}
                            </p>
                            <p className="mt-1 text-muted-foreground">
                              {result.explanation}
                            </p>
                          </div>
                        )}
                      </fieldset>
                    );
                  })}
                </div>
                {quizError && (
                  <p
                    role="alert"
                    className="mt-4 text-xs font-medium text-destructive"
                  >
                    {quizError}
                  </p>
                )}
                <div className="mt-6 flex gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={submitQuiz}
                    className="h-11 flex-1 rounded-lg bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
                  >
                    {submitting ? "Checking…" : "Check answers"}
                  </button>
                  {quizResult && (
                    <button
                      type="button"
                      onClick={() => {
                        setAnswers({});
                        setQuizResult(null);
                      }}
                      aria-label="Reset quiz"
                      className="flex h-11 w-11 items-center justify-center rounded-lg border border-border"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
            )}
            <footer className="mt-14 border-t border-border pt-6">
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
                <div className="min-w-0">
                  {previousStep ? (
                    <button
                      type="button"
                      onClick={() => openStep(previousStep.value)}
                      className="group flex w-full min-w-0 flex-col items-start rounded-xl border border-border p-4 text-left transition hover:border-foreground/30"
                    >
                      <span className="text-eyebrow text-muted-foreground">Previous</span>
                      <span className="mt-1 flex max-w-full items-center gap-2 text-sm font-medium">
                        <ArrowLeft className="h-4 w-4 shrink-0" />
                        <span className="truncate">{previousStep.label}</span>
                      </span>
                    </button>
                  ) : previousLesson ? (
                    <Link
                      href={lessonHref(previousLesson.slug)}
                      className="group flex w-full min-w-0 flex-col items-start rounded-xl border border-border p-4 transition hover:border-foreground/30"
                    >
                      <span className="text-eyebrow text-muted-foreground">Previous lesson</span>
                      <span className="mt-1 flex max-w-full items-center gap-2 text-sm font-medium">
                        <ArrowLeft className="h-4 w-4 shrink-0" />
                        <span className="truncate">{previousLesson.title}</span>
                      </span>
                    </Link>
                  ) : null}
                </div>
                <div className="min-w-0">
                  {nextStep ? (
                    <button
                      type="button"
                      onClick={() => openStep(nextStep.value)}
                      className="group flex w-full min-w-0 flex-col items-end rounded-xl border border-foreground bg-foreground p-4 text-right text-background transition hover:bg-foreground/90"
                    >
                      <span className="text-eyebrow text-background/70">Next · {nextStep.meta}</span>
                      <span className="mt-1 flex max-w-full items-center gap-2 text-sm font-medium">
                        <span className="truncate">{nextStep.label}</span>
                        <ArrowRight className="h-4 w-4 shrink-0" />
                      </span>
                    </button>
                  ) : nextLesson ? (
                    <Link
                      href={lessonHref(nextLesson.slug)}
                      className="group flex w-full min-w-0 flex-col items-end rounded-xl border border-border p-4 text-right transition hover:border-foreground/30"
                    >
                      <span className="text-eyebrow text-muted-foreground">Next lesson</span>
                      <span className="mt-1 flex max-w-full items-center gap-2 text-sm font-medium">
                        <span className="truncate">{nextLesson.title}</span>
                        <ArrowRight className="h-4 w-4 shrink-0" />
                      </span>
                    </Link>
                  ) : (
                    <Link
                      href={preview ? overviewHref : `/courses/${workspace.course.slug}/complete`}
                      className="flex w-full flex-col items-end rounded-xl border border-border p-4 text-right text-sm font-semibold"
                    >
                      Finish course <ArrowRight className="mt-1 h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
              {!nextStep && <div className="mt-4 flex justify-center">{completeButton(false)}</div>}
            </footer>
          </div>
        </main>

        {hasTranscript && (
        <aside
          aria-label="Transcript"
          className={cn(
            "relative hidden shrink-0 border-l border-border bg-card transition-[width] duration-200 lg:block",
            sideOpen ? "w-[380px] xl:w-[420px]" : "w-11",
          )}
        >
          {sideOpen ? (
            <>
              <div className="h-full overflow-hidden">{studyTools}</div>
              <button
                type="button"
                onClick={toggleSide}
                aria-label="Hide the transcript"
                title="Hide the transcript"
                className="absolute -left-3 top-1/2 z-20 flex h-12 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-card transition-colors hover:border-primary hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={toggleSide}
              aria-label="Show the transcript"
              title="Show the transcript"
              className="flex h-full w-full flex-col items-center gap-3 pt-4 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] [writing-mode:vertical-rl]">
                Transcript
              </span>
            </button>
          )}
        </aside>
        )}
      </div>

      {curriculumOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            aria-label="Close the lesson list"
            onClick={() => setCurriculumOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Course lessons"
            className="absolute inset-y-0 left-0 w-[min(90vw,380px)] bg-card shadow-overlay"
          >
            <button
              type="button"
              onClick={() => setCurriculumOpen(false)}
              aria-label="Close the lesson list"
              className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-lg bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
            {curriculum}
          </aside>
        </div>
      )}

      {sideSheet && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            aria-label="Close the transcript"
            onClick={() => setSideSheet(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Transcript"
            className="absolute inset-y-0 right-0 w-[min(92vw,420px)] bg-card shadow-overlay"
          >
            <button
              type="button"
              onClick={() => setSideSheet(false)}
              aria-label="Close the transcript"
              className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-lg bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
            {studyTools}
          </aside>
        </div>
      )}
    </div>
  );
}
