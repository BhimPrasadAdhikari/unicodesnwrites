"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
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
/** The lesson parts shown as tabs under the video. Only transcript, notes and quiz are saved as the learner's last tab. */
type View = "lesson" | "try" | "code" | "practice" | Tab;

// Desktop split between the video column and the lesson panel, as a percentage of the width.
const SPLIT_DEFAULT = 56;
const SPLIT_MIN = 35;
const SPLIT_MAX = 72;
const SPLIT_KEY = "course-workspace:split";
const RAIL_KEY = "course-workspace:rail";
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
  const [view, setView] = useState<View>("lesson");
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(true);
  const [split, setSplit] = useState(SPLIT_DEFAULT);
  const videoRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const splitRef = useRef<HTMLDivElement>(null);
  const activeLessonRef = useRef<HTMLAnchorElement>(null);

  // Layout choices are a per-viewer convenience, so they live in this browser only.
  useEffect(() => {
    try {
      const savedRail = localStorage.getItem(RAIL_KEY);
      if (savedRail) setRailOpen(savedRail === "open");
      const savedSplit = Number(localStorage.getItem(SPLIT_KEY));
      if (savedSplit >= SPLIT_MIN && savedSplit <= SPLIT_MAX) setSplit(savedSplit);
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

  const updateSplit = (value: number) => {
    const next = Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, value));
    setSplit(next);
    try {
      localStorage.setItem(SPLIT_KEY, String(Math.round(next)));
    } catch {}
  };

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const container = splitRef.current;
    if (!container) return;
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const { left, width } = container.getBoundingClientRect();
    const onMove = (move: PointerEvent) => updateSplit(((move.clientX - left) / width) * 100);
    const onUp = () => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
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
  const views = (
    [
      { value: "lesson", label: "Lesson", icon: BookOpenText, show: true },
      { value: "try", label: "Try it", icon: Sparkles, show: Boolean(lesson.interactive) },
      { value: "code", label: "Code", icon: Code2, show: Boolean(lesson.codeWalkthrough) },
      { value: "practice", label: "Practice", icon: Target, show: lesson.exercises.length > 0 },
      { value: "transcript", label: "Transcript", icon: FileText, show: Boolean(lesson.transcript?.length) },
      { value: "notes", label: "Notes", icon: NotebookPen, show: true },
      { value: "quiz", label: "Quiz", icon: ListChecks, show: lesson.quiz.length > 0 },
    ] as const
  ).filter((item) => item.show);
  const viewIndex = views.findIndex((item) => item.value === view);
  // Point to the next part of the lesson, but stop before the study tools.
  const nextPart =
    viewIndex >= 0 && views[viewIndex + 1] && !["transcript", "notes"].includes(views[viewIndex + 1].value)
      ? views[viewIndex + 1]
      : null;

  const openView = (value: View) => {
    setView(value);
    if (value === "transcript" || value === "notes" || value === "quiz") setTab(value);
    // Desktop: the panel scrolls on its own, so start the new part at its top.
    // Phone: the page scrolls, so bring the tab bar back if it has scrolled away.
    if (window.matchMedia("(min-width: 1024px)").matches) {
      panelRef.current?.scrollTo({ top: 0 });
    } else {
      const tabs = tabsRef.current;
      if (tabs && tabs.getBoundingClientRect().top < 120) tabs.scrollIntoView({ block: "start" });
    }
  };

  const seekTo = (seconds: number) => {
    setVideoSeek(seconds);
    videoRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  // Keep the current lesson visible in the lesson list.
  useEffect(() => {
    if (railOpen) activeLessonRef.current?.scrollIntoView({ block: "center" });
  }, [railOpen]);

  useEffect(() => {
    if (!curriculumOpen) return;
    activeLessonRef.current?.scrollIntoView({ block: "center" });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCurriculumOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [curriculumOpen]);

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
              {module.lessons.map((lesson) => {
                const active = lesson.slug === workspace.lesson.slug;
                const complete = completedLessons.includes(lesson.slug);
                return (
                  <Link
                    key={lesson.key}
                    href={lessonHref(lesson.slug)}
                    ref={active ? activeLessonRef : undefined}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setCurriculumOpen(false)}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 transition",
                      active
                        ? "bg-secondary text-foreground shadow-[inset_2px_0_0_hsl(var(--primary))]"
                        : "hover:bg-secondary/60",
                    )}
                  >
                    {complete ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 opacity-40" />
                    )}
                    <span className="min-w-0 flex-1 text-sm leading-5">{lesson.title}</span>
                    <span className="shrink-0 font-mono text-2xs text-muted-foreground">
                      {lesson.durationMinutes}m
                    </span>
                  </Link>
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
  const hasVideo = Boolean(workspace.lesson.embedUrl || workspace.lesson.videoUrl);

  const lessonHeader = (
    <header>
      <p className="text-eyebrow text-primary">
        {workspace.lesson.moduleTitle} · Lesson {workspace.lessonNumber}
      </p>
      <h1 className="mt-2 font-serif text-[26px] font-medium leading-[1.15] tracking-[-0.02em] sm:text-[32px]">
        {workspace.lesson.title}
      </h1>
      <p className="mt-2 max-w-3xl font-serif text-[17px] leading-[1.55] text-muted-foreground">
        {workspace.lesson.summary}
      </p>
    </header>
  );

  const objectives = workspace.lesson.learningObjectives.length > 0 && (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <p className="text-eyebrow text-muted-foreground">In this lesson you will</p>
      <ul className="mt-3 space-y-2">
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
      {isComplete ? "Completed" : compact ? "Mark complete" : nextLesson ? "Mark complete and continue" : "Mark complete"}
    </button>
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
            aria-expanded={railOpen}
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
          <span className="hidden shrink-0 font-mono text-[12px] text-muted-foreground sm:inline">
            Lesson {workspace.lessonNumber} of {workspace.lessonCount}
          </span>
          <span className="shrink-0 font-mono text-[12px] text-muted-foreground sm:hidden">
            {workspace.lessonNumber}/{workspace.lessonCount}
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
            "hidden shrink-0 overflow-hidden border-border bg-card transition-[width] duration-200 lg:block",
            railOpen ? "w-72 border-r" : "w-0",
          )}
        >
          <div className="h-full w-72">{curriculum}</div>
        </aside>

        <div
          ref={splitRef}
          className="flex min-w-0 flex-1 flex-col lg:flex-row"
          style={{ "--split": `${split}%` } as CSSProperties}
        >
          {hasVideo && (
            <section
              aria-label="Video"
              className="shrink-0 lg:h-full lg:w-[var(--split)] lg:overflow-y-auto"
            >
              <div className="space-y-5 p-4 sm:p-6">
                <div ref={videoRef} className="scroll-mt-32">
                  <LessonVideoPlayer
                    embedUrl={workspace.lesson.embedUrl}
                    videoUrl={workspace.lesson.videoUrl}
                    posterUrl={workspace.lesson.videoPosterUrl}
                    title={workspace.lesson.title}
                    initialPositionSeconds={initialPersistence.videoPositionSeconds}
                    seekToSeconds={videoSeek}
                    onPositionChange={handleVideoPosition}
                  />
                </div>
                {lessonHeader}
                <div className="hidden lg:block">{objectives}</div>
              </div>
            </section>
          )}

          {hasVideo && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize the video and lesson panels"
              aria-valuenow={Math.round(split)}
              aria-valuemin={SPLIT_MIN}
              aria-valuemax={SPLIT_MAX}
              tabIndex={0}
              onPointerDown={startResize}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") updateSplit(split - 2);
                if (event.key === "ArrowRight") updateSplit(split + 2);
              }}
              onDoubleClick={() => updateSplit(SPLIT_DEFAULT)}
              className="group relative hidden w-2 shrink-0 cursor-col-resize items-center justify-center bg-border/40 outline-none hover:bg-primary/20 focus-visible:bg-primary/30 lg:flex"
            >
              <span className="h-10 w-0.5 rounded-full bg-muted-foreground/40 group-hover:bg-primary" />
            </div>
          )}

          <section aria-label="Lesson" className="flex min-w-0 flex-1 flex-col lg:h-full">
            <div
              ref={tabsRef}
              className="sticky top-[7.125rem] z-30 shrink-0 scroll-mt-28 border-b border-border bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-4 lg:static"
            >
              <div role="tablist" aria-label="Lesson parts" className="-mb-px flex gap-0.5 overflow-x-auto [scrollbar-width:none]">
                {views.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    id={`lesson-tab-${value}`}
                    aria-selected={view === value}
                    aria-controls="lesson-panel"
                    onClick={() => openView(value)}
                    className={cn(
                      "inline-flex h-11 shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-sm font-medium transition-colors",
                      view === value
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div
              ref={panelRef}
              id="lesson-panel"
              role="tabpanel"
              aria-labelledby={`lesson-tab-${view}`}
              className="min-h-0 flex-1 lg:overflow-y-auto"
            >
              <div className={cn("p-4 pb-16 sm:p-6", !hasVideo && "mx-auto max-w-3xl")}>
                {!hasVideo && <div className="mb-8">{lessonHeader}</div>}
                {view === "lesson" && (
                  <div className="space-y-10">
                    <div className={cn(hasVideo && "lg:hidden")}>{objectives}</div>
                    <LessonArticleSection lesson={workspace.lesson} />
                    <LessonResourcesSection lesson={workspace.lesson} />
                  </div>
                )}
                {view === "try" && <LessonInteractiveSection lesson={workspace.lesson} />}
                {view === "code" && <LessonCodeSection lesson={workspace.lesson} />}
                {view === "practice" && <LessonPracticeSection lesson={workspace.lesson} />}
                {view === "transcript" && (
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

                {view === "notes" && (
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

                {view === "quiz" && (
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
                {nextPart && (
                  <button
                    type="button"
                    onClick={() => openView(nextPart.value)}
                    className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Next: {nextPart.label} <ArrowRight className="h-4 w-4" />
                  </button>
                )}

                <footer className="mt-12 grid gap-3 border-t border-border pt-6 xl:grid-cols-[1fr_auto_1fr] xl:items-center">
                  <div className="order-2 xl:order-1">
                    {previousLesson && (
                      <Link
                        href={lessonHref(previousLesson.slug)}
                        className="inline-flex min-h-11 min-w-0 max-w-full items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <ArrowLeft className="h-4 w-4 shrink-0" />
                        <span className="truncate">{previousLesson.title}</span>
                      </Link>
                    )}
                  </div>
                  <div className="order-1 xl:order-2">{completeButton(false)}</div>
                  <div className="order-3 xl:text-right">
                    {nextLesson ? (
                      <Link
                        href={lessonHref(nextLesson.slug)}
                        className="inline-flex min-h-11 min-w-0 max-w-full items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <span className="truncate">{nextLesson.title}</span>
                        <ArrowRight className="h-4 w-4 shrink-0" />
                      </Link>
                    ) : (
                      <Link
                        href={preview ? overviewHref : `/courses/${workspace.course.slug}/complete`}
                        className="inline-flex min-h-11 items-center text-sm font-semibold underline decoration-primary decoration-2 underline-offset-4"
                      >
                        Finish course
                      </Link>
                    )}
                  </div>
                </footer>
              </div>
            </div>
          </section>
        </div>
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
    </div>
  );
}
