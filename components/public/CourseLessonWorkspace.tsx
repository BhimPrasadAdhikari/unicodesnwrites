"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Cloud,
  CloudOff,
  FileText,
  HelpCircle,
  ListChecks,
  Loader2,
  Menu,
  MessageSquareText,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  X,
} from "lucide-react";

import { AiNotesGenerator } from "@/components/public/AiNotesGenerator";
import { LessonVideoPlayer } from "@/components/public/LessonVideoPlayer";
import type { LessonWorkspaceDTO } from "@/lib/services/course-platform";
import { cn } from "@/lib/utils";
import { useAnalytics } from "@/hooks/useAnalytics";

type Tab = "transcript" | "notes" | "quiz";
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

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function CourseLessonWorkspace({
  workspace,
  initialCompletedLessons,
  initialPersistence,
}: {
  workspace: LessonWorkspaceDTO;
  initialCompletedLessons: string[];
  initialPersistence: LessonPersistence;
}) {
  const router = useRouter();
  const { trackEvent } = useAnalytics();
  const notesKey = `course-notes:${workspace.course.slug}:${workspace.lesson.slug}`;
  const latestAttempt = initialPersistence.quizAttempts[0];
  const [tab, setTab] = useState<Tab>(initialPersistence.activeTab);
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [studyPanelOpen, setStudyPanelOpen] = useState(false);
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
    if (!persistenceReady) return;
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

  const markComplete = async ({ advance = true }: { advance?: boolean } = {}) => {
    const willBeComplete = !isComplete;
    const next = willBeComplete
      ? [...new Set([...completedLessons, workspace.lesson.slug])]
      : completedLessons.filter((slug) => slug !== workspace.lesson.slug);
    setCompletedLessons(next);
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
          router.push(
            `/courses/${workspace.course.slug}/learn/${workspace.navigation.next.slug}`,
          );
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
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to grade quiz");
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
      <div className="border-b border-border p-5">
        <Link
          href={`/courses/${workspace.course.slug}`}
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
              Module {moduleIndex + 1} · {module.title}
            </p>
            <div className="space-y-1">
              {module.lessons.map((lesson, lessonIndex) => {
                const active = lesson.slug === workspace.lesson.slug;
                const complete = completedLessons.includes(lesson.slug);
                return (
                  <Link
                    key={lesson.key}
                    href={`/courses/${workspace.course.slug}/learn/${lesson.slug}`}
                    onClick={() => setCurriculumOpen(false)}
                    className={cn(
                      "flex min-h-11 gap-3 rounded-lg px-3 py-3 transition",
                      active
                        ? "bg-secondary text-foreground shadow-[inset_2px_0_0_hsl(var(--primary))]"
                        : "hover:bg-secondary/60",
                    )}
                  >
                    <span className="mt-0.5">
                      {complete ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <Circle className="h-4 w-4 opacity-50" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold leading-5">
                        {lessonIndex + 1}. {lesson.title}
                      </span>
                      <span
                        className={cn(
                          "mt-1 flex items-center gap-1 text-2xs",
                          "font-mono text-muted-foreground",
                        )}
                      >
                        <Clock3 className="h-3 w-3" /> {lesson.durationMinutes}{" "}
                        min
                      </span>
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

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background lg:grid lg:grid-cols-[280px_minmax(0,1fr)_390px]">
      <aside className="hidden border-r border-border bg-card lg:block">
        {curriculum}
      </aside>

      <main className="min-w-0 pb-20 lg:pb-0">
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setCurriculumOpen(true)}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
          >
            <Menu className="h-4 w-4" /> Curriculum
          </button>
          <span className="font-mono text-[12px] text-muted-foreground">
            {workspace.lessonNumber}/{workspace.lessonCount}
          </span>
        </div>
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-7 sm:py-8">
          <div className="mb-5">
            <p className="text-eyebrow text-primary">
              {workspace.lesson.moduleTitle} · Lesson {workspace.lessonNumber}
            </p>
            <h1 className="mt-2 font-serif text-[30px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[42px]">
              {workspace.lesson.title}
            </h1>
            <p className="mt-3 max-w-3xl font-serif text-[18px] leading-[1.55] text-muted-foreground">
              {workspace.lesson.summary}
            </p>
          </div>

          {Boolean(workspace.lesson.embedUrl) && (
            <LessonVideoPlayer
              embedUrl={workspace.lesson.embedUrl}
              title={workspace.lesson.title}
              initialPositionSeconds={initialPersistence.videoPositionSeconds}
              seekToSeconds={videoSeek}
              onPositionChange={handleVideoPosition}
            />
          )}



          <div className="mt-6 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-start">
            <div>
              <p className="text-eyebrow text-muted-foreground">
                Learning objectives
              </p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {workspace.lesson.learningObjectives.map((objective) => (
                  <li key={objective} className="flex gap-2 text-sm leading-6">
                    <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-success" />
                    {objective}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => markComplete()}
              className={cn(
                "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-[15px] font-medium transition",
                isComplete
                  ? "border border-success/30 bg-success/10 text-success"
                  : "bg-foreground text-background hover:bg-foreground/90",
              )}
            >
              <CheckCircle2 className="h-4 w-4" />
              {isComplete ? "Completed" : "Mark complete"}
            </button>
          </div>

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6">
            {workspace.navigation.previous ? (
              <Link
                href={`/courses/${workspace.course.slug}/learn/${workspace.navigation.previous.slug}`}
                className="inline-flex min-h-11 min-w-0 items-center gap-2 text-sm font-semibold"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {workspace.navigation.previous.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {workspace.navigation.next ? (
              <Link
                href={`/courses/${workspace.course.slug}/learn/${workspace.navigation.next.slug}`}
                className="inline-flex min-h-11 min-w-0 items-center gap-2 text-sm font-semibold"
              >
                <span className="truncate">
                  {workspace.navigation.next.title}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            ) : (
              <Link
                href={`/courses/${workspace.course.slug}/complete`}
                className="inline-flex min-h-11 items-center text-sm font-semibold underline decoration-primary decoration-2 underline-offset-4"
              >
                Finish course
              </Link>
            )}
          </div>
        </div>
      </main>

      {studyPanelOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[75] bg-foreground/40 backdrop-blur-sm lg:hidden"
          aria-label="Close study tools"
          onClick={() => setStudyPanelOpen(false)}
        />
      )}
      <aside
        aria-label="Lesson study tools"
        role={studyPanelOpen ? "dialog" : undefined}
        aria-modal={studyPanelOpen ? true : undefined}
        className={cn(
          "border-t border-border bg-card",
          studyPanelOpen
            ? "fixed inset-x-0 bottom-0 z-[80] block max-h-[82dvh] rounded-t-3xl shadow-overlay"
            : "hidden",
          "lg:static lg:block lg:max-h-none lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none",
        )}
      >
        <div className="flex max-h-[82dvh] flex-col lg:sticky lg:top-16 lg:max-h-[calc(100vh-4rem)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-3 lg:hidden">
            <p className="text-eyebrow text-muted-foreground">Study tools</p>
            <button
              type="button"
              onClick={() => setStudyPanelOpen(false)}
              aria-label="Close study tools"
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 border-b border-border p-2">
            {(
              [
                ["transcript", FileText, "Transcript"],
                ["notes", Sparkles, "AI Notes"],
                ["quiz", ListChecks, "Quiz"],
              ] as const
            ).map(([value, Icon, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-semibold",
                  tab === value
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {tab === "transcript" && (
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
                        className="min-w-0 flex-1 bg-transparent text-xs outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      {filteredTranscript.map((cue) => (
                        <button
                          key={`${cue.startSeconds}-${cue.text.slice(0, 20)}`}
                          type="button"
                          onClick={() => setVideoSeek(cue.startSeconds)}
                          className="group flex w-full gap-3 rounded-xl p-3 text-left hover:bg-muted"
                        >
                          <span className="mt-0.5 font-mono text-2xs text-muted-foreground">
                            {formatTime(cue.startSeconds)}
                          </span>
                          <span className="text-xs leading-5 text-muted-foreground group-hover:text-foreground">
                            {cue.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === "notes" && (
              <div className="space-y-6">
                {workspace.lesson.studyGuide?.mentalModel ? (
                  <section>
                    <p className="flex items-center gap-2 text-eyebrow text-primary">
                      <BrainCircuit className="h-4 w-4" /> Grounded study guide
                    </p>
                    <h3 className="mt-3 text-lg font-medium">The mental model</h3>
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
                      Misconception check
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
                      <HelpCircle className="h-4 w-4" /> Active recall prompts
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
                      Core Concepts
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
                      <Target className="h-4 w-4 text-muted-foreground" /> Learning Objectives
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
                <AiNotesGenerator
                  courseSlug={workspace.course.slug}
                  lessonSlug={workspace.lesson.slug}
                />
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

            {tab === "quiz" && (
              <div>
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
                        Can you reason with the concept?
                      </h3>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        Answers are graded on the server. A score of 70% completes
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
                        onClick={() => router.push(`/courses/${workspace.course.slug}/learn/${workspace.navigation.next!.slug}`)}
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
                                "flex cursor-pointer gap-3 rounded-xl border p-3 text-xs leading-5 transition",
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
          </div>
        </div>
      </aside>

      <nav
        aria-label="Mobile lesson tools"
        className="fixed inset-x-3 bottom-3 z-[65] grid grid-cols-3 rounded-xl border border-border bg-card p-1.5 shadow-overlay lg:hidden"
      >
        {(
          [
            ["transcript", FileText, "Transcript"],
            ["notes", Sparkles, "Notes"],
            ["quiz", ListChecks, "Quiz"],
          ] as const
        ).map(([value, Icon, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setTab(value);
              setStudyPanelOpen(true);
            }}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-2xs font-semibold",
              tab === value && studyPanelOpen
                ? "bg-foreground text-background"
                : "text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </nav>

      {curriculumOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            aria-label="Close curriculum"
            onClick={() => setCurriculumOpen(false)}
          />
          <aside
            role="dialog"
            aria-label="Course curriculum"
            className="absolute inset-y-0 left-0 w-[min(90vw,360px)] bg-card shadow-overlay"
          >
            <button
              type="button"
              onClick={() => setCurriculumOpen(false)}
              aria-label="Close curriculum"
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
