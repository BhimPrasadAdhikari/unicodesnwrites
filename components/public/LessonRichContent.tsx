"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import {
  BookOpenText,
  Code2,
  Download,
  ExternalLink,
  FileCode2,
  FileText,
  FolderGit2,
  Lightbulb,
  Presentation,
  Sparkles,
  Table2,
  Target,
} from "lucide-react";

import { mdxComponents } from "@/lib/mdx-components";
import { LessonInteractive } from "@/components/course-interactives";
import type { LessonWorkspaceDTO } from "@/lib/services/course-platform";
import { cn } from "@/lib/utils";

const CodeWalkthrough = dynamic(() => import("@/components/ui/CodeWalkthrough"), {
  ssr: false,
  loading: () => <div className="h-96 animate-pulse rounded-xl bg-muted" />,
});

type Lesson = LessonWorkspaceDTO["lesson"];

const RESOURCE_ICONS = {
  notebook: FileCode2,
  cheatsheet: FileText,
  repo: FolderGit2,
  slides: Presentation,
  dataset: Table2,
  link: ExternalLink,
} as const;

const RESOURCE_LABELS = {
  notebook: "Notebook",
  cheatsheet: "Cheat sheet",
  repo: "Starter code",
  slides: "Slides",
  dataset: "Dataset",
  link: "Reading",
} as const;

export function LessonMarkdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose prose-neutral max-w-none dark:prose-invert prose-headings:font-serif prose-headings:font-medium prose-a:text-primary", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={mdxComponents}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

function SectionHeading({ icon: Icon, eyebrow, title }: { icon: typeof Sparkles; eyebrow: string; title: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-eyebrow text-primary">{eyebrow}</p>
        <h2 className="mt-1 font-serif text-2xl font-medium">{title}</h2>
      </div>
    </div>
  );
}

function Exercise({ exercise, index }: { exercise: Lesson["exercises"][number]; index: number }) {
  const [hintsShown, setHintsShown] = useState(0);
  const [solutionShown, setSolutionShown] = useState(false);

  return (
    <article className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <p className="text-eyebrow text-muted-foreground">Exercise {index + 1}</p>
      <h3 className="mt-1 text-lg font-semibold">{exercise.title}</h3>
      <LessonMarkdown className="mt-3 text-sm">{exercise.prompt}</LessonMarkdown>

      {exercise.hints.slice(0, hintsShown).map((hint, hintIndex) => (
        <div key={hintIndex} className="mt-3 flex gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <LessonMarkdown className="text-sm prose-p:my-0">{hint}</LessonMarkdown>
        </div>
      ))}

      <div className="mt-4 flex flex-wrap gap-2">
        {hintsShown < exercise.hints.length && (
          <button
            type="button"
            onClick={() => setHintsShown((count) => count + 1)}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-semibold"
          >
            <Lightbulb className="h-4 w-4" />
            {hintsShown === 0 ? "Show a hint" : "Another hint"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setSolutionShown((shown) => !shown)}
          aria-expanded={solutionShown}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-semibold text-background"
        >
          <Target className="h-4 w-4" />
          {solutionShown ? "Hide solution" : "Show solution"}
        </button>
      </div>

      {solutionShown && (
        <div className="mt-4 rounded-lg border border-success/30 bg-success/5 p-4">
          <p className="text-eyebrow text-success">Solution</p>
          <LessonMarkdown className="mt-2 text-sm">{exercise.solution}</LessonMarkdown>
        </div>
      )}
    </article>
  );
}

export function LessonRichContent({ lesson }: { lesson: Lesson }) {
  const hasAnything =
    lesson.interactive || lesson.article || lesson.codeWalkthrough || lesson.exercises.length || lesson.resources.length;
  if (!hasAnything) return null;

  return (
    <div className="mt-10 space-y-12">
      {lesson.interactive && (
        <section aria-labelledby="lesson-interactive">
          <SectionHeading icon={Sparkles} eyebrow="Try it yourself" title={lesson.interactive.title} />
          {lesson.interactive.caption && (
            <p className="mb-4 max-w-3xl text-sm leading-6 text-muted-foreground">{lesson.interactive.caption}</p>
          )}
          <div className="rounded-xl border border-border bg-card p-4 shadow-card sm:p-6">
            <LessonInteractive component={lesson.interactive.component} />
          </div>
        </section>
      )}

      {lesson.article && (
        <section aria-label="Lesson article">
          <SectionHeading icon={BookOpenText} eyebrow="Read" title="The lesson, written out" />
          <div className="rounded-xl border border-border bg-card px-5 py-6 sm:px-10 sm:py-10">
            <LessonMarkdown className="mx-auto max-w-3xl">{lesson.article}</LessonMarkdown>
          </div>
        </section>
      )}

      {lesson.codeWalkthrough && (
        <section aria-label="Code walkthrough">
          <SectionHeading icon={Code2} eyebrow="Code walkthrough" title={lesson.codeWalkthrough.title} />
          <p className="mb-4 max-w-3xl text-sm leading-6 text-muted-foreground">
            Step through the code. Each step highlights a few lines and explains what they do in plain words.
          </p>
          <CodeWalkthrough
            files={lesson.codeWalkthrough.files}
            steps={lesson.codeWalkthrough.steps}
          />
        </section>
      )}

      {lesson.exercises.length > 0 && (
        <section aria-label="Exercises">
          <SectionHeading icon={Target} eyebrow="Practice" title="Exercises" />
          <p className="mb-4 max-w-3xl text-sm leading-6 text-muted-foreground">
            Have a go before you open the solution. The hints come one at a time, so take only what you need.
          </p>
          <div className="space-y-4">
            {lesson.exercises.map((exercise, index) => (
              <Exercise key={exercise.key} exercise={exercise} index={index} />
            ))}
          </div>
        </section>
      )}

      {lesson.resources.length > 0 && (
        <section aria-label="Downloads and further reading">
          <SectionHeading icon={Download} eyebrow="Take it with you" title="Downloads and reading" />
          <div className="grid gap-3 sm:grid-cols-2">
            {lesson.resources.map((resource) => {
              const Icon = RESOURCE_ICONS[resource.kind] || ExternalLink;
              const external = /^https?:\/\//.test(resource.url);
              return (
                <a
                  key={resource.key}
                  href={resource.url}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : { download: "" })}
                  className="group flex gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/50"
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="text-eyebrow text-muted-foreground">{RESOURCE_LABELS[resource.kind]}</span>
                    <span className="mt-0.5 block font-semibold group-hover:text-primary">{resource.title}</span>
                    {resource.description && (
                      <span className="mt-1 block text-sm leading-5 text-muted-foreground">{resource.description}</span>
                    )}
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
