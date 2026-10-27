"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  BrainCircuit,
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  ExternalLink,
  FileText,
  History,
  GripVertical,
  ImageIcon,
  ListChecks,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
  Video,
} from "lucide-react";

import ImageUploader from "@/components/cms/ImageUploader";
import { YouTubePreview } from "@/components/cms/YouTubePreview";
import { Button } from "@/components/ui/Button";
import { generateSlug } from "@/lib/utils/slug";
import { formatTranscriptCues, parseTranscriptText } from "@/lib/utils/transcript";
import {
  AIML_TOPICS,
  CONCEPT_LESSON_TYPES,
  courseInputSchema,
  type CourseInput,
} from "@/lib/utils/validations/course";
import { extractYouTubeVideoId } from "@/lib/utils/youtube";

type CourseFormData = Omit<CourseInput, "coverImage"> & { coverImage: string };
type CourseEditorProps = {
  initialData?: CourseFormData & { _id: string; revision?: number };
};

type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error" | "conflict";
type CourseVersion = {
  revision: number;
  reason: string;
  restoredFromRevision: number | null;
  author?: { name?: string; email?: string } | null;
  createdAt: string;
};

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";
const labelClass = "mb-2 block text-xs font-bold text-foreground";

const makeKey = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const listToText = (items: string[]) => items.join("\n");
// Slug input while typing: keep a trailing hyphen so "my-" can become "my-course";
// the final cleanup (generateSlug) runs when the form is normalized for saving.
const typingSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "");

const nonEmpty = (items: string[]) => items.map((item) => item.trim()).filter(Boolean);

const textToList = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
const secondsToTimestamp = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

function parseTranscript(value: string) {
  if (!value.trim()) return [];
  return parseTranscriptText(value).cues;
}

function emptyLesson() {
  const key = makeKey("lesson");
  return {
    key,
    slug: key,
    title: "",
    summary: "",
    type: "concept" as const,
    youtubeVideoId: "",
    durationMinutes: 10,
    learningObjectives: [""],
    concepts: [""],
    simulation: undefined,

    transcript: [] as Array<{
      startSeconds: number;
      endSeconds?: number;
      text: string;
    }>,
    studyGuide: {
      mentalModel: "",
      keyIdeas: [] as string[],
      misconceptions: [] as string[],
      recallPrompts: [] as string[],
      explainBackPrompt: "",
    },
    quiz: [] as Array<{
      key: string;
      prompt: string;
      options: string[];
      correctOption: number;
      explanation: string;
    }>,
    published: true,
  };
}

function emptyCourse(): CourseFormData {
  return {
    title: "",
    slug: "",
    eyebrow: "AIML learning path",
    summary: "",
    description: "",
    topic: "language-models",
    level: "foundation",
    coverImage: "",
    tags: ["AIML"],
    prerequisites: [],
    learningOutcomes: ["", ""],
    audience: ["AI builders"],
    instructorName: "Bhim Prasad Adhikari",
    featured: false,
    status: "draft",
    modules: [
      {
        key: makeKey("module"),
        title: "Start here",
        description: "Build the foundation for the ideas that follow.",
        lessons: [emptyLesson()],
      },
    ],
  };
}

const steps = [
  { label: "Course", icon: BookOpen },
  { label: "Curriculum", icon: GripVertical },
  { label: "Lesson tools", icon: Sparkles },
  { label: "Quiz", icon: ListChecks },
  { label: "Publish", icon: Check },
];

export function CourseEditor({ initialData }: CourseEditorProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CourseFormData>(
    initialData || emptyCourse(),
  );
  const [activeLessonKey, setActiveLessonKey] = useState(
    () => (initialData || form).modules[0]?.lessons[0]?.key || "",
  );
  const [transcriptDrafts, setTranscriptDrafts] = useState<
    Record<string, string>
  >(() => {
    const source = initialData || form;
    return Object.fromEntries(
      source.modules.flatMap((module) =>
        module.lessons.map((lesson) => [
          lesson.key,
          formatTranscriptCues(lesson.transcript),
        ]),
      ),
    );
  });
  const [saving, setSaving] = useState(false);
  // Slugs follow the title until the author edits them by hand. Saved
  // courses/lessons start "touched" so renaming doesn't silently change URLs.
  const [courseSlugTouched, setCourseSlugTouched] = useState(Boolean(initialData));
  const touchedLessonSlugs = useRef(
    new Set(
      (initialData?.modules || []).flatMap((module) =>
        module.lessons.map((lesson) => lesson.key),
      ),
    ),
  );
  // Autosave only ever writes drafts; published/archived courses (and status
  // changes) need an explicit Save so live content never changes by accident.
  const savedStatusRef = useRef(initialData?.status || "draft");
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [revision, setRevision] = useState(initialData?.revision || 1);
  const revisionRef = useRef(initialData?.revision || 1);
  const lastSavedSignature = useRef((() => {
    if (!initialData) return "";
    const parsed = courseInputSchema.safeParse({
      ...initialData,
      modules: initialData.modules.map((module) => ({
        ...module,
        lessons: module.lessons.map((lesson) => ({
          ...lesson,

        })),
      })),
    });
    return parsed.success ? JSON.stringify(parsed.data) : "";
  })());
  const saveQueue = useRef(Promise.resolve());
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<CourseVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [importingTranscript, setImportingTranscript] = useState(false);
  const [fetchingTranscriptLessonKey, setFetchingTranscriptLessonKey] = useState<string | null>(null);
  const [lessonTranscriptFeedback, setLessonTranscriptFeedback] = useState<Record<string, string>>({});
  const [transcriptFeedback, setTranscriptFeedback] = useState("");
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState("");
  const [generatingStudyGuide, setGeneratingStudyGuide] = useState(false);
  const [studyGuideFeedback, setStudyGuideFeedback] = useState("");

  const lessons = useMemo(
    () =>
      form.modules.flatMap((module) =>
        module.lessons.map((lesson) => ({
          ...lesson,
          moduleKey: module.key,
          moduleTitle: module.title,
        })),
      ),
    [form.modules],
  );
  const activeLesson =
    lessons.find((lesson) => lesson.key === activeLessonKey) || lessons[0];

  const updateLesson = (
    lessonKey: string,
    updater: (
      lesson: CourseFormData["modules"][number]["lessons"][number],
    ) => CourseFormData["modules"][number]["lessons"][number],
  ) => {
    setForm((current) => ({
      ...current,
      modules: current.modules.map((module) => ({
        ...module,
        lessons: module.lessons.map((lesson) =>
          lesson.key === lessonKey ? updater(lesson) : lesson,
        ),
      })),
    }));
  };

  const addModule = () => {
    const lesson = emptyLesson();
    setForm((current) => ({
      ...current,
      modules: [
        ...current.modules,
        {
          key: makeKey("module"),
          title: "New module",
          description: "Describe the conceptual progression in this module.",
          lessons: [lesson],
        },
      ],
    }));
    setTranscriptDrafts((current) => ({ ...current, [lesson.key]: "" }));
    setActiveLessonKey(lesson.key);
  };

  const addLesson = (moduleKey: string) => {
    const lesson = emptyLesson();
    setForm((current) => ({
      ...current,
      modules: current.modules.map((module) =>
        module.key === moduleKey
          ? { ...module, lessons: [...module.lessons, lesson] }
          : module,
      ),
    }));
    setTranscriptDrafts((current) => ({ ...current, [lesson.key]: "" }));
    setActiveLessonKey(lesson.key);
  };

  const removeLesson = (moduleKey: string, lessonKey: string) => {
    const total = form.modules.reduce(
      (count, module) => count + module.lessons.length,
      0,
    );
    if (total <= 1) {
      setError("A course must contain at least one lesson.");
      return;
    }
    setForm((current) => ({
      ...current,
      modules: current.modules
        .map((module) =>
          module.key === moduleKey
            ? {
                ...module,
                lessons: module.lessons.filter(
                  (lesson) => lesson.key !== lessonKey,
                ),
              }
            : module,
        )
        .filter((module) => module.lessons.length),
    }));
    const next = lessons.find((lesson) => lesson.key !== lessonKey);
    setActiveLessonKey(next?.key || "");
  };

  const normalizedForm = () => ({
    ...form,
    slug: generateSlug(form.slug || form.title),
    modules: form.modules.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) => ({
        ...lesson,
        slug: generateSlug(lesson.slug || lesson.title) || lesson.key,
        youtubeVideoId:
          extractYouTubeVideoId(lesson.youtubeVideoId) || lesson.youtubeVideoId,
        transcript: parseTranscript(transcriptDrafts[lesson.key] || ""),
        // Blank optional list items would fail validation and block the save.
        studyGuide: {
          ...lesson.studyGuide,
          keyIdeas: nonEmpty(lesson.studyGuide.keyIdeas),
          misconceptions: nonEmpty(lesson.studyGuide.misconceptions),
          recallPrompts: nonEmpty(lesson.studyGuide.recallPrompts),
        },

      })),
    })),
  });

  const queueExistingSave = (
    parsedCourse: CourseInput,
    reason: "autosave" | "manual" | "publish",
    redirectAfterSave: boolean,
  ) => {
    const signature = JSON.stringify(parsedCourse);
    setSaveStatus("saving");
    if (reason !== "autosave") setSaving(true);
    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(async () => {
        const response = await fetch(`/api/courses/${encodeURIComponent(initialData!._id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            course: parsedCourse,
            expectedRevision: revisionRef.current,
            reason,
          }),
        });
        const payload = await response.json().catch(() => null);
        if (response.status === 409) {
          setSaveStatus("conflict");
          throw new Error(payload?.error || "This course changed in another session.");
        }
        if (!response.ok) {
          setSaveStatus("error");
          throw new Error(payload?.details?.[0]?.message || payload?.error || "Course could not be saved.");
        }
        const nextRevision = payload?.course?.revision || revisionRef.current + 1;
        revisionRef.current = nextRevision;
        setRevision(nextRevision);
        lastSavedSignature.current = signature;
        savedStatusRef.current = parsedCourse.status;
        setSaveStatus("saved");
        setError("");
        if (redirectAfterSave) {
          router.push("/dashboard/courses");
          router.refresh();
        }
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Course could not be saved.");
      })
      .finally(() => {
        if (reason !== "autosave") setSaving(false);
      });
  };

  useEffect(() => {
    if (!initialData) return;
    const parsed = courseInputSchema.safeParse(normalizedForm());
    const signature = parsed.success ? JSON.stringify(parsed.data) : "";
    if (!parsed.success) {
      setSaveStatus("unsaved");
      return;
    }
    if (signature === lastSavedSignature.current) return;
    setSaveStatus("unsaved");
    if (parsed.data.status !== "draft" || savedStatusRef.current !== "draft") return;
    const timeout = window.setTimeout(
      () => queueExistingSave(parsed.data, "autosave", false),
      2500,
    );
    return () => window.clearTimeout(timeout);
  // Form and transcript drafts are the intentional autosave inputs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, transcriptDrafts]);

  const hasUnsavedWork =
    saveStatus === "unsaved" ||
    saveStatus === "saving" ||
    // A failed or conflicting save leaves the edits unsaved, so leaving should still warn.
    saveStatus === "conflict" ||
    saveStatus === "error" ||
    (!initialData && Boolean(form.title.trim()));

  useEffect(() => {
    if (!hasUnsavedWork) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedWork]);

  const save = async () => {
    setError("");
    const parsed = courseInputSchema.safeParse(normalizedForm());
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(`${issue.path.join(" → ") || "Course"}: ${issue.message}`);
      setSaveStatus("unsaved");
      return;
    }
    if (initialData) {
      queueExistingSave(
        parsed.data,
        parsed.data.status === "published" ? "publish" : "manual",
        true,
      );
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.details?.[0]?.message || payload?.error || "Course could not be saved.");
      router.push(`/dashboard/courses/${payload.course._id}/edit`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Course could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const loadVersions = async () => {
    if (!initialData) return;
    setShowVersions(true);
    setVersionsLoading(true);
    try {
      const response = await fetch(`/api/courses/${encodeURIComponent(initialData._id)}/versions`, { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Version history could not be loaded.");
      setVersions(payload.versions || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Version history could not be loaded.");
    } finally {
      setVersionsLoading(false);
    }
  };

  const restoreVersion = async (targetRevision: number) => {
    if (!initialData || !window.confirm(`Restore revision ${targetRevision}? Your current version will remain in history.`)) return;
    setVersionsLoading(true);
    try {
      const response = await fetch(`/api/courses/${encodeURIComponent(initialData._id)}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision: targetRevision, expectedRevision: revisionRef.current }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Version could not be restored.");
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Version could not be restored.");
      setVersionsLoading(false);
    }
  };

  const importTranscript = async (file: File) => {
    if (!activeLesson) return;
    if (file.size > 2_000_000) {
      setTranscriptFeedback("Transcript files must be smaller than 2 MB.");
      return;
    }
    setImportingTranscript(true);
    setTranscriptFeedback("");
    try {
      const response = await fetch("/api/courses/transcript/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, content: await file.text() }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Transcript could not be imported.");
      const formatted = formatTranscriptCues(payload.cues);
      setTranscriptDrafts((current) => ({ ...current, [activeLesson.key]: formatted }));
      setTranscriptFeedback(`${payload.cues.length} cues imported${payload.skippedBlocks ? ` · ${payload.skippedBlocks} invalid blocks skipped` : ""}.`);
    } catch (caught) {
      setTranscriptFeedback(caught instanceof Error ? caught.message : "Transcript could not be imported.");
    } finally {
      setImportingTranscript(false);
    }
  };

  const autoFetchYouTubeTranscript = async (
    lesson: { key: string; youtubeVideoId: string } | undefined = activeLesson,
  ) => {
    if (!lesson) return;
    const report = (message: string) => {
      setLessonTranscriptFeedback((current) => ({ ...current, [lesson.key]: message }));
      if (lesson.key === activeLesson?.key) setTranscriptFeedback(message);
    };
    const videoUrlOrId = lesson.youtubeVideoId?.trim();
    if (!videoUrlOrId) {
      report("Enter a YouTube video URL or video ID first.");
      return;
    }
    if (
      transcriptDrafts[lesson.key]?.trim() &&
      !window.confirm("This lesson already has a transcript. Replace it with the YouTube captions?")
    ) {
      return;
    }
    setFetchingTranscriptLessonKey(lesson.key);
    report("");
    try {
      const response = await fetch("/api/courses/transcript/auto-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: videoUrlOrId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "YouTube transcript could not be fetched.");
      const formatted = formatTranscriptCues(payload.cues);
      setTranscriptDrafts((current) => ({ ...current, [lesson.key]: formatted }));
      report(`Fetched ${payload.count} transcript cues from YouTube.`);
    } catch (caught) {
      report(caught instanceof Error ? caught.message : "YouTube transcript could not be fetched.");
    } finally {
      setFetchingTranscriptLessonKey(null);
    }
  };

  const autoGenerateQuiz = async () => {
    if (!activeLesson) return;
    const rawTranscript = transcriptDrafts[activeLesson.key] || "";
    const parsedCues = parseTranscript(rawTranscript);
    if (parsedCues.length === 0) {
      setQuizFeedback("Please add or fetch a timestamped transcript for this lesson first.");
      return;
    }
    setGeneratingQuiz(true);
    setQuizFeedback("");
    try {
      const response = await fetch("/api/courses/quiz/auto-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonTitle: activeLesson.title,
          transcript: parsedCues,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "AI quiz could not be generated.");

      updateLesson(activeLesson.key, (current) => ({
        ...current,
        quiz: payload.quiz.map((q: { key?: string; prompt: string; options: string[]; correctOption: number; explanation: string }) => ({
          key: q.key || makeKey("question"),
          prompt: q.prompt,
          options: q.options,
          correctOption: q.correctOption,
          explanation: q.explanation,
        })),
      }));
      setQuizFeedback(`Generated ${payload.quiz.length} transcript-grounded quiz questions.`);
    } catch (caught) {
      setQuizFeedback(caught instanceof Error ? caught.message : "AI quiz could not be generated.");
    } finally {
      setGeneratingQuiz(false);
    }
  };

  // ── Auto-generate study guide from transcript ─────────────────────
  const autoGenerateStudyGuide = async () => {
    if (!activeLesson) return;
    const rawTranscript = transcriptDrafts[activeLesson.key] || "";
    const parsedCues = parseTranscript(rawTranscript);
    if (parsedCues.length === 0) {
      setStudyGuideFeedback("Please add or fetch a timestamped transcript for this lesson first.");
      return;
    }
    setGeneratingStudyGuide(true);
    setStudyGuideFeedback("");
    try {
      const response = await fetch("/api/courses/study-guide/auto-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonTitle: activeLesson.title,
          transcript: parsedCues,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "AI study guide could not be generated.");

      if (payload.studyGuide) {
        updateLesson(activeLesson.key, (current) => ({
          ...current,
          studyGuide: {
            mentalModel: payload.studyGuide.mentalModel || "",
            keyIdeas: Array.isArray(payload.studyGuide.keyIdeas) && payload.studyGuide.keyIdeas.length > 0
              ? payload.studyGuide.keyIdeas
              : [],
            misconceptions: Array.isArray(payload.studyGuide.misconceptions)
              ? payload.studyGuide.misconceptions
              : [],
            recallPrompts: Array.isArray(payload.studyGuide.recallPrompts) && payload.studyGuide.recallPrompts.length > 0
              ? payload.studyGuide.recallPrompts
              : [],
            explainBackPrompt: payload.studyGuide.explainBackPrompt || "",
          },
        }));
        setStudyGuideFeedback("Study guide generated successfully from transcript.");
      }
    } catch (caught) {
      setStudyGuideFeedback(caught instanceof Error ? caught.message : "AI study guide could not be generated.");
    } finally {
      setGeneratingStudyGuide(false);
    }
  };

  const lessonSelector = activeLesson ? (
    <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
      {lessons.map((lesson) => (
        <button
          key={lesson.key}
          type="button"
          onClick={() => setActiveLessonKey(lesson.key)}
          className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${lesson.key === activeLesson.key ? "bg-foreground text-background" : "border border-border bg-card text-muted-foreground"}`}
        >
          {lesson.title || "Untitled lesson"}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      {initialData && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
            <span className={`h-2 w-2 rounded-full ${saveStatus === "saving" ? "animate-pulse bg-warning" : saveStatus === "saved" ? "bg-success" : saveStatus === "conflict" || saveStatus === "error" ? "bg-destructive" : saveStatus === "unsaved" ? "bg-warning" : "bg-muted-foreground/40"}`} />
            <span>{saveStatus === "saving" ? "Saving changes…" : saveStatus === "saved" ? `Autosaved · revision ${revision}` : saveStatus === "conflict" ? "Save conflict · reload required" : saveStatus === "error" ? "Autosave failed · use Save course to retry" : saveStatus === "unsaved" ? "Unsaved changes · complete required fields" : `Revision ${revision}`}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={loadVersions}><History className="mr-2 h-4 w-4" /> History</Button>
            <Link href={`/dashboard/courses/${initialData._id}/preview`} target="_blank" className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold"><ExternalLink className="h-4 w-4" /> Preview</Link>
          </div>
        </div>
      )}
      {showVersions && initialData && (
        <section className="rounded-xl border border-border bg-card p-5" aria-label="Course version history">
          <div className="flex items-start justify-between gap-4"><div><p className="text-eyebrow text-primary">Recovery timeline</p><h2 className="mt-1 text-lg font-semibold">Version history</h2><p className="mt-1 text-xs text-muted-foreground">Every successful save preserves the version it replaced.</p></div><button type="button" onClick={() => setShowVersions(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">Close</button></div>
          <div className="mt-4 space-y-2">
            {versionsLoading ? <p className="text-sm text-muted-foreground">Loading versions…</p> : versions.length ? versions.map((version) => <div key={version.revision} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"><div><p className="text-sm font-semibold">Revision {version.revision} <span className="ml-2 rounded-md bg-muted px-2 py-0.5 text-2xs uppercase text-muted-foreground">{version.reason}</span></p><p className="mt-1 text-2xs text-muted-foreground">{new Date(version.createdAt).toLocaleString()} · {version.author?.name || version.author?.email || "Admin"}{version.restoredFromRevision ? ` · restored from ${version.restoredFromRevision}` : ""}</p></div><button type="button" disabled={versionsLoading} onClick={() => restoreVersion(version.revision)} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50">Restore</button></div>) : <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No earlier versions yet. A version appears after the first successful update.</p>}
          </div>
        </section>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          {error}
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-border bg-card p-2">
        <div className="flex min-w-max gap-1">
          {steps.map(({ label, icon: Icon }, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(index)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold ${step === index ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-2xs">
                {index + 1}
              </span>
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 sm:p-7">
        {step === 0 && (
          <div className="space-y-7">
            <div>
              <p className="text-eyebrow text-primary">
                Course identity
              </p>
              <h2 className="mt-2 text-2xl font-serif font-medium">
                Frame the learning promise
              </h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className={labelClass}>Course title</span>
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                      slug: courseSlugTouched
                        ? current.slug
                        : generateSlug(event.target.value),
                    }))
                  }
                  className={inputClass}
                  placeholder="Language Models from First Principles"
                />
              </label>
              <label>
                <span className={labelClass}>URL slug</span>
                <input
                  value={form.slug}
                  onChange={(event) => {
                    setCourseSlugTouched(true);
                    setForm((current) => ({
                      ...current,
                      slug: typingSlug(event.target.value),
                    }));
                  }}
                  onBlur={() =>
                    setForm((current) => ({
                      ...current,
                      slug: generateSlug(current.slug || current.title),
                    }))
                  }
                  className={inputClass}
                />
              </label>
              <label>
                <span className={labelClass}>Eyebrow</span>
                <input
                  value={form.eyebrow}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      eyebrow: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </label>
              <label>
                <span className={labelClass}>AIML topic</span>
                <select
                  value={form.topic}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      topic: event.target.value as CourseFormData["topic"],
                    }))
                  }
                  className={inputClass}
                >
                  {AIML_TOPICS.map((topic) => (
                    <option key={topic} value={topic}>
                      {topic.replaceAll("-", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={labelClass}>Level</span>
                <select
                  value={form.level}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      level: event.target.value as CourseFormData["level"],
                    }))
                  }
                  className={inputClass}
                >
                  <option value="foundation">Foundation</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
              <label className="sm:col-span-2">
                <span className={labelClass}>Short promise</span>
                <textarea
                  value={form.summary}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      summary: event.target.value,
                    }))
                  }
                  rows={3}
                  className={inputClass}
                  placeholder="What durable understanding will the learner leave with?"
                />
              </label>
              <label className="sm:col-span-2">
                <span className={labelClass}>Course description</span>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={7}
                  className={inputClass}
                />
              </label>
              <label>
                <span className={labelClass}>Instructor</span>
                <input
                  value={form.instructorName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      instructorName: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </label>
              <label>
                <span className={labelClass}>Tags (one per line)</span>
                <textarea
                  value={listToText(form.tags)}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      tags: textToList(event.target.value),
                    }))
                  }
                  rows={3}
                  className={inputClass}
                />
              </label>
              <label>
                <span className={labelClass}>
                  Learning outcomes (one per line)
                </span>
                <textarea
                  value={listToText(form.learningOutcomes)}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      learningOutcomes: textToList(event.target.value),
                    }))
                  }
                  rows={5}
                  className={inputClass}
                />
              </label>
              <label>
                <span className={labelClass}>Audience (one per line)</span>
                <textarea
                  value={listToText(form.audience)}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      audience: textToList(event.target.value),
                    }))
                  }
                  rows={5}
                  className={inputClass}
                />
              </label>
              <label>
                <span className={labelClass}>Prerequisites (one per line)</span>
                <textarea
                  value={listToText(form.prerequisites)}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      prerequisites: textToList(event.target.value),
                    }))
                  }
                  rows={4}
                  className={inputClass}
                />
              </label>
              <div>
                <span className={labelClass}>
                  <ImageIcon className="mr-1 inline h-4 w-4" /> Cover image
                </span>
                <ImageUploader
                  value={form.coverImage}
                  onChange={(coverImage) =>
                    setForm((current) => ({ ...current, coverImage }))
                  }
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-eyebrow text-primary">
                  Curriculum map
                </p>
                <h2 className="mt-2 text-2xl font-serif font-medium">
                  Sequence the mental models
                </h2>
              </div>
              <Button type="button" variant="outline" onClick={addModule}>
                <Plus className="mr-2 h-4 w-4" /> Module
              </Button>
            </div>
            {form.modules.map((module, moduleIndex) => (
              <div
                key={module.key}
                className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5"
              >
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label>
                      <span className={labelClass}>
                        Module {moduleIndex + 1} title
                      </span>
                      <input
                        value={module.title}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            modules: current.modules.map((item) =>
                              item.key === module.key
                                ? { ...item, title: event.target.value }
                                : item,
                            ),
                          }))
                        }
                        className={inputClass}
                      />
                    </label>
                    <label>
                      <span className={labelClass}>Description</span>
                      <input
                        value={module.description}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            modules: current.modules.map((item) =>
                              item.key === module.key
                                ? { ...item, description: event.target.value }
                                : item,
                            ),
                          }))
                        }
                        className={inputClass}
                      />
                    </label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => addLesson(module.key)}
                  >
                    <CirclePlus className="mr-2 h-4 w-4" /> Lesson
                  </Button>
                </div>
                <div className="mt-4 space-y-3">
                  {module.lessons.map((lesson, lessonIndex) => (
                    <div
                      key={lesson.key}
                      className="rounded-xl border border-border bg-card p-4"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <p className="text-xs font-bold">
                          Lesson {lessonIndex + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Remove lesson ${lesson.title ? `"${lesson.title}"` : lessonIndex + 1}? This can't be undone until you restore a saved version.`)) {
                              removeLesson(module.key, lesson.key);
                            }
                          }}
                          className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label>
                          <span className={labelClass}>Lesson title</span>
                          <input
                            value={lesson.title}
                            onChange={(event) =>
                              updateLesson(lesson.key, (current) => ({
                                ...current,
                                title: event.target.value,
                                slug: touchedLessonSlugs.current.has(lesson.key)
                                  ? current.slug
                                  : generateSlug(event.target.value) || current.slug,
                              }))
                            }
                            className={inputClass}
                          />
                        </label>
                        <label>
                          <span className={labelClass}>Lesson slug</span>
                          <input
                            value={lesson.slug}
                            onChange={(event) => {
                              touchedLessonSlugs.current.add(lesson.key);
                              updateLesson(lesson.key, (current) => ({
                                ...current,
                                slug: typingSlug(event.target.value),
                              }));
                            }}
                            onBlur={() =>
                              updateLesson(lesson.key, (current) => ({
                                ...current,
                                slug: generateSlug(current.slug || current.title) || current.slug,
                              }))
                            }
                            className={inputClass}
                          />
                        </label>
                        <label>
                          <span className={labelClass}>Concept format</span>
                          <select
                            value={lesson.type}
                            onChange={(event) =>
                              updateLesson(lesson.key, (current) => ({
                                ...current,
                                type: event.target.value as typeof current.type,
                              }))
                            }
                            className={inputClass}
                          >
                            {CONCEPT_LESSON_TYPES.map((type) => (
                              <option key={type}>{type}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span className={labelClass}>Duration (minutes)</span>
                          <input
                            type="number"
                            min={1}
                            max={480}
                            value={lesson.durationMinutes}
                            onChange={(event) =>
                              updateLesson(lesson.key, (current) => ({
                                ...current,
                                durationMinutes: Number(event.target.value),
                              }))
                            }
                            className={inputClass}
                          />
                        </label>
                        <label className="sm:col-span-2">
                          <span className={labelClass}>Summary</span>
                          <textarea
                            value={lesson.summary}
                            onChange={(event) =>
                              updateLesson(lesson.key, (current) => ({
                                ...current,
                                summary: event.target.value,
                              }))
                            }
                            rows={2}
                            className={inputClass}
                          />
                        </label>
                        <label className="sm:col-span-2">
                          <span className={labelClass}>
                            <Video className="mr-1 inline h-4 w-4" /> YouTube
                            URL or video ID
                          </span>
                          <div className="flex gap-2">
                            <input
                              value={lesson.youtubeVideoId}
                              onChange={(event) =>
                                updateLesson(lesson.key, (current) => ({
                                  ...current,
                                  youtubeVideoId: event.target.value,
                                }))
                              }
                              className={inputClass}
                              placeholder="https://youtube.com/watch?v=… (optional)"
                            />
                            <button
                              type="button"
                              disabled={fetchingTranscriptLessonKey !== null || !lesson.youtubeVideoId.trim()}
                              onClick={() => void autoFetchYouTubeTranscript(lesson)}
                              className="shrink-0 inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-bold text-foreground hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {fetchingTranscriptLessonKey === lesson.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                              {fetchingTranscriptLessonKey === lesson.key ? "Fetching…" : "Fetch transcript"}
                            </button>
                          </div>
                          {lessonTranscriptFeedback[lesson.key] && (
                            <p role="status" className="mt-1.5 text-xs font-medium text-muted-foreground">
                              {lessonTranscriptFeedback[lesson.key]}
                            </p>
                          )}
                          <YouTubePreview
                            rawInput={lesson.youtubeVideoId}
                            title={lesson.title}
                            className="mt-2.5"
                          />
                        </label>
                        <label>
                          <span className={labelClass}>
                            Learning objectives
                          </span>
                          <textarea
                            value={listToText(lesson.learningObjectives)}
                            onChange={(event) =>
                              updateLesson(lesson.key, (current) => ({
                                ...current,
                                learningObjectives: textToList(
                                  event.target.value,
                                ),
                              }))
                            }
                            rows={3}
                            className={inputClass}
                          />
                        </label>
                        <label>
                          <span className={labelClass}>Concepts</span>
                          <textarea
                            value={listToText(lesson.concepts)}
                            onChange={(event) =>
                              updateLesson(lesson.key, (current) => ({
                                ...current,
                                concepts: textToList(event.target.value),
                              }))
                            }
                            rows={3}
                            className={inputClass}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 2 && activeLesson && (
          <div>
            {lessonSelector}
            <div className="mb-6">
              <p className="text-eyebrow text-primary">
                Lesson companion
              </p>
              <h2 className="mt-2 text-2xl font-serif font-medium">
                Transcript and grounded AI notes
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Everything shown to learners is authored from your lesson—not
                generated from the open web.
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <div className="mb-4 rounded-xl border border-border bg-card p-3.5">
                  <label className="block">
                    <span className={labelClass}>
                      <Video className="mr-1 inline h-4 w-4 text-muted-foreground" /> YouTube URL or Video ID for {activeLesson.title || "active lesson"}
                    </span>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        value={activeLesson.youtubeVideoId}
                        onChange={(event) =>
                          updateLesson(activeLesson.key, (current) => ({
                            ...current,
                            youtubeVideoId: event.target.value,
                          }))
                        }
                        className={inputClass}
                        placeholder="e.g. https://youtu.be/VMj-3S1tku0"
                      />
                      <button
                        type="button"
                        disabled={fetchingTranscriptLessonKey !== null}
                        onClick={() => void autoFetchYouTubeTranscript()}
                        className="shrink-0 inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-bold text-foreground hover:bg-primary/20 disabled:opacity-50"
                      >
                        {fetchingTranscriptLessonKey === activeLesson.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {fetchingTranscriptLessonKey === activeLesson.key ? "Fetching…" : "Auto-fetch CC"}
                      </button>
                    </div>
                  </label>
                </div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground"><FileText className="mr-1 inline h-4 w-4" /> Timestamped transcript</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-2xs font-bold hover:bg-muted">
                      {importingTranscript ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      {importingTranscript ? "Importing…" : "Import SRT / VTT"}
                      <input
                        type="file"
                        accept=".srt,.vtt,.txt,text/plain,text/vtt,application/x-subrip"
                        disabled={importingTranscript}
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void importTranscript(file);
                          event.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
                <textarea
                  aria-label="Timestamped transcript"
                  value={transcriptDrafts[activeLesson.key] || ""}
                  onPaste={(event) => {
                    // Normalize a full paste (e.g. YouTube's transcript panel) into MM:SS | text lines.
                    if ((transcriptDrafts[activeLesson.key] || "").trim()) return;
                    const pasted = event.clipboardData.getData("text");
                    const parsed = parseTranscriptText(pasted);
                    if (!parsed.cues.length || parsed.skippedBlocks > 0) return;
                    event.preventDefault();
                    setTranscriptDrafts((current) => ({
                      ...current,
                      [activeLesson.key]: formatTranscriptCues(parsed.cues),
                    }));
                    setTranscriptFeedback(`Pasted ${parsed.cues.length} transcript cues.`);
                  }}
                  onChange={(event) =>
                    setTranscriptDrafts((current) => ({
                      ...current,
                      [activeLesson.key]: event.target.value,
                    }))
                  }
                  rows={18}
                  className={`${inputClass} font-mono text-xs`}
                  placeholder={
                    "0:00 | Introduce the central question\n0:28 | Build the first mental model"
                  }
                />
                <span className="mt-2 block text-2xs text-muted-foreground">
                  Type MM:SS | text, import a timestamped SRT, VTT, or TXT file, or paste the text from YouTube&apos;s &quot;Show transcript&quot; panel. Imported HTML tags are removed.
                </span>
                {transcriptFeedback && <p role="status" className="mt-2 text-xs font-medium text-muted-foreground">{transcriptFeedback}</p>}
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-eyebrow text-primary">Study Guide</span>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={generatingStudyGuide}
                    onClick={autoGenerateStudyGuide}
                    className="rounded-full text-xs font-semibold"
                  >
                    {generatingStudyGuide ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4 text-muted-foreground" />}
                    {generatingStudyGuide ? "Generating…" : "Generate AI Study Guide"}
                  </Button>
                </div>
                {studyGuideFeedback && <p role="status" className="text-xs font-medium text-muted-foreground">{studyGuideFeedback}</p>}
                <label>
                  <span className={labelClass}>Mental model</span>
                  <textarea
                    value={activeLesson.studyGuide.mentalModel}
                    onChange={(event) =>
                      updateLesson(activeLesson.key, (current) => ({
                        ...current,
                        studyGuide: {
                          ...current.studyGuide,
                          mentalModel: event.target.value,
                        },
                      }))
                    }
                    rows={5}
                    className={inputClass}
                  />
                </label>
                <label>
                  <span className={labelClass}>Key ideas (one per line)</span>
                  <textarea
                    value={listToText(activeLesson.studyGuide.keyIdeas)}
                    onChange={(event) =>
                      updateLesson(activeLesson.key, (current) => ({
                        ...current,
                        studyGuide: {
                          ...current.studyGuide,
                          keyIdeas: textToList(event.target.value),
                        },
                      }))
                    }
                    rows={4}
                    className={inputClass}
                  />
                </label>
                <label>
                  <span className={labelClass}>
                    Misconceptions (one per line)
                  </span>
                  <textarea
                    value={listToText(activeLesson.studyGuide.misconceptions)}
                    onChange={(event) =>
                      updateLesson(activeLesson.key, (current) => ({
                        ...current,
                        studyGuide: {
                          ...current.studyGuide,
                          misconceptions: textToList(event.target.value),
                        },
                      }))
                    }
                    rows={4}
                    className={inputClass}
                  />
                </label>
                <label>
                  <span className={labelClass}>
                    Recall prompts (one per line)
                  </span>
                  <textarea
                    value={listToText(activeLesson.studyGuide.recallPrompts)}
                    onChange={(event) =>
                      updateLesson(activeLesson.key, (current) => ({
                        ...current,
                        studyGuide: {
                          ...current.studyGuide,
                          recallPrompts: textToList(event.target.value),
                        },
                      }))
                    }
                    rows={4}
                    className={inputClass}
                  />
                </label>
                <label>
                  <span className={labelClass}>Explain-it-back prompt</span>
                  <textarea
                    value={activeLesson.studyGuide.explainBackPrompt}
                    onChange={(event) =>
                      updateLesson(activeLesson.key, (current) => ({
                        ...current,
                        studyGuide: {
                          ...current.studyGuide,
                          explainBackPrompt: event.target.value,
                        },
                      }))
                    }
                    rows={3}
                    className={inputClass}
                  />
                </label>
              </div>
            </div>
          </div>
        )}



        {step === 3 && activeLesson && (
          <div>
            {lessonSelector}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-eyebrow text-primary">
                  Concept checks
                </p>
                <h2 className="mt-2 text-2xl font-serif font-medium">
                  Test reasoning, not memorization
                </h2>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={generatingQuiz}
                onClick={autoGenerateQuiz}
                className="rounded-full text-xs font-semibold"
              >
                {generatingQuiz ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-muted-foreground" />}
                {generatingQuiz ? "Generating quiz…" : "Generate AI Quiz from Transcript"}
              </Button>
            </div>
            {quizFeedback && <p role="status" className="mb-4 text-xs font-medium text-muted-foreground">{quizFeedback}</p>}
            <div className="space-y-5">
              {activeLesson.quiz.map((question, questionIndex) => (
                <div
                  key={question.key}
                  className="rounded-xl border border-border bg-muted/20 p-5"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-bold">
                      Question {questionIndex + 1}
                    </p>
                    {activeLesson.quiz.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          updateLesson(activeLesson.key, (lesson) => ({
                            ...lesson,
                            quiz: lesson.quiz.filter(
                              (item) => item.key !== question.key,
                            ),
                          }))
                        }
                        className="touch-target rounded-lg p-2 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <label>
                      <span className={labelClass}>Prompt</span>
                      <textarea
                        value={question.prompt}
                        onChange={(event) =>
                          updateLesson(activeLesson.key, (lesson) => ({
                            ...lesson,
                            quiz: lesson.quiz.map((item) =>
                              item.key === question.key
                                ? { ...item, prompt: event.target.value }
                                : item,
                            ),
                          }))
                        }
                        rows={2}
                        className={inputClass}
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {question.options.map((option, optionIndex) => (
                        <label key={optionIndex}>
                          <span className={labelClass}>
                            Option {optionIndex + 1}
                            {question.correctOption === optionIndex
                              ? " · Correct"
                              : ""}
                          </span>
                          <div className="flex gap-2">
                            <input
                              value={option}
                              onChange={(event) =>
                                updateLesson(activeLesson.key, (lesson) => ({
                                  ...lesson,
                                  quiz: lesson.quiz.map((item) =>
                                    item.key === question.key
                                      ? {
                                          ...item,
                                          options: item.options.map(
                                            (choice, index) =>
                                              index === optionIndex
                                                ? event.target.value
                                                : choice,
                                          ),
                                        }
                                      : item,
                                  ),
                                }))
                              }
                              className={inputClass}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateLesson(activeLesson.key, (lesson) => ({
                                  ...lesson,
                                  quiz: lesson.quiz.map((item) =>
                                    item.key === question.key
                                      ? { ...item, correctOption: optionIndex }
                                      : item,
                                  ),
                                }))
                              }
                              title="Mark correct"
                              className={`rounded-xl border px-3 ${question.correctOption === optionIndex ? "border-success bg-success/10 text-success" : "border-border"}`}
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateLesson(activeLesson.key, (lesson) => ({
                            ...lesson,
                            quiz: lesson.quiz.map((item) =>
                              item.key === question.key &&
                              item.options.length < 6
                                ? { ...item, options: [...item.options, ""] }
                                : item,
                            ),
                          }))
                        }
                        className="text-xs font-semibold underline decoration-primary underline-offset-2 hover:text-primary"
                      >
                        + Add option
                      </button>
                      {question.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            updateLesson(activeLesson.key, (lesson) => ({
                              ...lesson,
                              quiz: lesson.quiz.map((item) =>
                                item.key === question.key
                                  ? {
                                      ...item,
                                      options: item.options.slice(0, -1),
                                      correctOption: Math.min(
                                        item.correctOption,
                                        item.options.length - 2,
                                      ),
                                    }
                                  : item,
                              ),
                            }))
                          }
                          className="text-xs font-semibold text-destructive"
                        >
                          Remove last
                        </button>
                      )}
                    </div>
                    <label>
                      <span className={labelClass}>
                        Explanation shown after grading
                      </span>
                      <textarea
                        value={question.explanation}
                        onChange={(event) =>
                          updateLesson(activeLesson.key, (lesson) => ({
                            ...lesson,
                            quiz: lesson.quiz.map((item) =>
                              item.key === question.key
                                ? { ...item, explanation: event.target.value }
                                : item,
                            ),
                          }))
                        }
                        rows={3}
                        className={inputClass}
                      />
                    </label>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  updateLesson(activeLesson.key, (lesson) => ({
                    ...lesson,
                    quiz: [
                      ...lesson.quiz,
                      {
                        key: makeKey("question"),
                        prompt: "",
                        options: ["", ""],
                        correctOption: 0,
                        explanation: "",
                      },
                    ],
                  }))
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Add question
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <div>
              <p className="text-eyebrow text-primary">
                Launch gate
              </p>
              <h2 className="mt-2 text-2xl font-serif font-medium">Review and publish</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                The studio validates every module, video, transcript, study
                guide, and quiz before saving. Published courses become visible
                immediately.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Modules", value: form.modules.length },
                  { label: "Lessons", value: lessons.length },
                  {
                    label: "Transcript cues",
                    value: Object.values(transcriptDrafts).reduce(
                      (total, transcript) =>
                        total + parseTranscript(transcript).length,
                      0,
                    ),
                  },
                  {
                    label: "Quiz questions",
                    value: lessons.reduce(
                      (total, lesson) => total + lesson.quiz.length,
                      0,
                    ),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-border bg-muted/25 p-4"
                  >
                    <p className="text-2xl font-serif font-medium">{item.value}</p>
                    <p className="mt-1 font-mono text-[12px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-muted/25 p-5">
              <p className="text-xs font-bold">Publication status</p>
              <div className="mt-4 space-y-2">
                {(["draft", "published", "archived"] as const).map((status) => (
                  <label
                    key={status}
                    className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${form.status === status ? "border-primary bg-secondary" : "border-border bg-card"}`}
                  >
                    <input
                      type="radio"
                      checked={form.status === status}
                      onChange={() =>
                        setForm((current) => ({ ...current, status }))
                      }
                    />
                    <span>
                      <span className="block text-sm font-semibold capitalize">
                        {status}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {status === "published"
                          ? "Visible in the public academy."
                          : status === "draft"
                            ? "Private to the course studio."
                            : "Hidden but retained."}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <label className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      featured: event.target.checked,
                    }))
                  }
                />
                <span className="text-sm font-semibold">
                  Feature on the homepage
                </span>
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-3 z-20 flex items-center justify-between rounded-xl border border-border bg-background/92 p-3 shadow-overlay">
        <Button
          type="button"
          variant="ghost"
          disabled={step === 0}
          onClick={() => setStep((current) => Math.max(0, current - 1))}
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          {step < steps.length - 1 ? (
            <Button
              type="button"
              onClick={() =>
                setStep((current) => Math.min(steps.length - 1, current + 1))
              }
            >
              Continue <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" disabled={saving} onClick={save}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {initialData ? "Save course" : "Create course"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
