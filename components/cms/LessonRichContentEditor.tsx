"use client";

import { useState } from "react";
import { BookOpenText, Code2, Download, Sparkles, Target, Video } from "lucide-react";

import { LESSON_INTERACTIVES } from "@/lib/courses/interactives";
import {
  codeWalkthroughSchema,
  lessonExerciseSchema,
  lessonResourceSchema,
  type CourseInput,
} from "@/lib/utils/validations/course";

type Lesson = CourseInput["modules"][number]["lessons"][number];

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";
const labelClass = "mb-2 block text-xs font-bold text-foreground";

/**
 * Edits a structured field as JSON. The draft text is kept locally and only
 * written back to the lesson when it parses and validates, so a half-typed
 * edit never breaks the course.
 */
function JsonField<T>({
  label,
  icon: Icon,
  value,
  validate,
  onChange,
  help,
}: {
  label: string;
  icon: typeof Code2;
  value: T;
  validate(raw: unknown): { success: true; data: T } | { success: false; message: string };
  onChange(value: T): void;
  help: string;
}) {
  const [draft, setDraft] = useState(() => (value === undefined ? "" : JSON.stringify(value, null, 2)));
  const [error, setError] = useState("");

  return (
    <label className="block">
      <span className={labelClass}>
        <Icon className="mr-1 inline h-4 w-4 text-muted-foreground" /> {label}
      </span>
      <textarea
        value={draft}
        rows={8}
        spellCheck={false}
        onChange={(event) => {
          setDraft(event.target.value);
          try {
            const raw = event.target.value.trim() ? JSON.parse(event.target.value) : undefined;
            const result = validate(raw);
            if (result.success) {
              setError("");
              onChange(result.data);
            } else {
              setError(result.message);
            }
          } catch {
            setError("Not valid JSON yet");
          }
        }}
        className={`${inputClass} font-mono text-xs`}
      />
      <span className={`mt-1 block text-xs ${error ? "text-destructive" : "text-muted-foreground"}`}>{error || help}</span>
    </label>
  );
}

const firstIssue = (issues: Array<{ path: PropertyKey[]; message: string }>) =>
  issues[0] ? `${issues[0].path.join(".") || "value"}: ${issues[0].message}` : "Invalid";

export function LessonRichContentEditor({
  lesson,
  onChange,
}: {
  lesson: Lesson;
  onChange(updater: (current: Lesson) => Lesson): void;
}) {
  const set = <K extends keyof Lesson>(key: K, value: Lesson[K]) => onChange((current) => ({ ...current, [key]: value }));

  return (
    <div className="mt-8 space-y-6 rounded-xl border border-border bg-card p-5">
      <div>
        <p className="text-eyebrow text-primary">Rich lesson content</p>
        <h3 className="mt-1 font-serif text-xl font-medium">Video file, interactive, article, code, exercises and downloads</h3>
        <p className="mt-1 text-sm text-muted-foreground">All optional. Learners see each section only when it has content.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className={labelClass}>
            <Video className="mr-1 inline h-4 w-4 text-muted-foreground" /> Self-hosted video URL (used instead of YouTube)
          </span>
          <input value={lesson.videoUrl || ""} onChange={(event) => set("videoUrl", event.target.value)} className={inputClass} placeholder="https://…/lesson.mp4 or /course-media/…" />
        </label>
        <label className="block">
          <span className={labelClass}>Poster image URL</span>
          <input value={lesson.videoPosterUrl || ""} onChange={(event) => set("videoPosterUrl", event.target.value)} className={inputClass} placeholder="https://…/poster.jpg" />
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <label className="block">
          <span className={labelClass}>
            <Sparkles className="mr-1 inline h-4 w-4 text-muted-foreground" /> Interactive visualization
          </span>
          <select
            value={lesson.interactive?.component || ""}
            onChange={(event) => {
              const component = event.target.value as NonNullable<Lesson["interactive"]>["component"] | "";
              const meta = LESSON_INTERACTIVES.find((item) => item.key === component);
              set("interactive", component ? { component, title: lesson.interactive?.title || meta?.label || "Try it yourself", caption: lesson.interactive?.caption || "" } : undefined);
            }}
            className={inputClass}
          >
            <option value="">None</option>
            {LESSON_INTERACTIVES.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        {lesson.interactive && (
          <>
            <label className="block">
              <span className={labelClass}>Interactive title</span>
              <input value={lesson.interactive.title} onChange={(event) => set("interactive", { ...lesson.interactive!, title: event.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>What to try (caption)</span>
              <input value={lesson.interactive.caption} onChange={(event) => set("interactive", { ...lesson.interactive!, caption: event.target.value })} className={inputClass} />
            </label>
          </>
        )}
      </div>

      <label className="block">
        <span className={labelClass}>
          <BookOpenText className="mr-1 inline h-4 w-4 text-muted-foreground" /> Article (Markdown)
        </span>
        <textarea value={lesson.article || ""} onChange={(event) => set("article", event.target.value)} rows={14} className={`${inputClass} font-mono text-xs`} />
      </label>

      <div className="grid gap-4 lg:grid-cols-3">
        <JsonField
          label="Code walkthrough (JSON)"
          icon={Code2}
          value={lesson.codeWalkthrough}
          help='{ "title", "files": { "name.py": "source" }, "steps": [{ "title", "markdown", "file", "startLine", "endLine" }] }'
          validate={(raw) => {
            if (raw === undefined) return { success: true, data: undefined };
            const result = codeWalkthroughSchema.safeParse(raw);
            return result.success ? { success: true, data: result.data } : { success: false, message: firstIssue(result.error.issues) };
          }}
          onChange={(value) => set("codeWalkthrough", value)}
        />
        <JsonField
          label="Exercises (JSON array)"
          icon={Target}
          value={lesson.exercises}
          help='[{ "key", "title", "prompt", "hints": [], "solution" }]'
          validate={(raw) => {
            const result = lessonExerciseSchema.array().max(12).safeParse(raw ?? []);
            return result.success ? { success: true, data: result.data } : { success: false, message: firstIssue(result.error.issues) };
          }}
          onChange={(value) => set("exercises", value)}
        />
        <JsonField
          label="Downloads and reading (JSON array)"
          icon={Download}
          value={lesson.resources}
          help='[{ "key", "title", "description", "kind": "notebook|cheatsheet|repo|slides|dataset|link", "url" }]'
          validate={(raw) => {
            const result = lessonResourceSchema.array().max(20).safeParse(raw ?? []);
            return result.success ? { success: true, data: result.data } : { success: false, message: firstIssue(result.error.issues) };
          }}
          onChange={(value) => set("resources", value)}
        />
      </div>
    </div>
  );
}
