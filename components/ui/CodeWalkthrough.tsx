'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';

type CodeWalkthroughStep = {
  title: string;
  description?: string;
  markdown?: string;
  file: string;
  startLine?: number;
  endLine?: number;
  highlight?: [number, number];
};

interface CodeWalkthroughProps {
  files: Record<string, string>;
  steps: CodeWalkthroughStep[];
}

const clampLine = (value: number, maxLine: number) => {
  if (Number.isNaN(value) || maxLine <= 0) {
    return 1;
  }

  return Math.min(Math.max(1, value), maxLine);
};

const getStepRange = (step?: CodeWalkthroughStep) => {
  if (!step) {
    return null;
  }

  if (step.highlight && step.highlight.length === 2) {
    return {
      start: Math.min(step.highlight[0], step.highlight[1]),
      end: Math.max(step.highlight[0], step.highlight[1]),
    };
  }

  if (typeof step.startLine === 'number') {
    return {
      start: step.startLine,
      end: typeof step.endLine === 'number' ? step.endLine : step.startLine,
    };
  }

  return null;
};

const getLineRange = (step?: CodeWalkthroughStep, totalLines = 1) => {
  const range = getStepRange(step);

  if (!range) {
    return null;
  }

  return {
    start: clampLine(range.start, totalLines),
    end: clampLine(range.end, totalLines),
  };
};

export default function CodeWalkthrough({ files, steps }: CodeWalkthroughProps) {
  const fileNames = useMemo(() => Object.keys(files), [files]);
  const [activeFile, setActiveFile] = useState(fileNames[0] ?? '');
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const highlightedLineRef = useRef<HTMLDivElement>(null);

  const activeStep = steps[activeStepIndex];
  const currentFile = activeFile && files[activeFile] ? activeFile : fileNames[0] ?? '';
  const currentSource = currentFile ? files[currentFile] : '';
  const lines = currentSource.split(/\r?\n/);
  const activeRange = getLineRange(activeStep?.file === currentFile ? activeStep : undefined, lines.length);
  const activeDescription = activeStep?.description ?? activeStep?.markdown ?? '';

  // Auto-scroll to highlighted line when step or file changes
  useEffect(() => {
    if (highlightedLineRef.current && codeContainerRef.current) {
      const container = codeContainerRef.current;
      const element = highlightedLineRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      
      // Calculate position relative to container
      const relativeTop = elementRect.top - containerRect.top + container.scrollTop;
      
      // Scroll so the highlighted line is roughly 1/3 down the view
      container.scrollTo({
        top: relativeTop - (container.clientHeight / 3),
        behavior: 'smooth'
      });
    }
  }, [activeStepIndex, currentFile]);

  return (
    <section className="my-8 overflow-hidden rounded-3xl border border-border/70 bg-card text-card-foreground shadow-overlay dark:shadow-overlay flex flex-col h-[650px] md:h-[750px] lg:h-[80vh] min-h-[500px] max-h-[900px]">
      <div className="border-b border-border/70 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 px-5 py-4 sm:px-6 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-eyebrow text-primary">
              Code walkthrough
            </p>
          </div>

          <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {steps.length} steps
          </div>
        </div>
      </div>

      <div className="grid gap-0 flex-1 min-h-0 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)] overflow-hidden">
        <aside className="relative z-10 overflow-y-auto h-[280px] lg:h-full border-b border-border/70 bg-muted/35 px-4 py-4 lg:border-b-0 lg:border-r lg:border-border/70 lg:px-5 custom-scrollbar overscroll-contain min-h-0">
          <div className="mb-3 text-eyebrow text-muted-foreground">
            Steps
          </div>

          <div className="space-y-3 pb-4">
            {steps.map((step, index) => {
              const isActive = index === activeStepIndex;

              return (
                <button
                  key={`step-${index}`}
                  type="button"
                  onClick={() => {
                    setActiveStepIndex(index);
                    if (step.file && files[step.file]) {
                      setActiveFile(step.file);
                    }
                  }}
                  className={`group relative w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                    isActive
                      ? 'border-primary/20 bg-primary/8 shadow-[0_0_0_1px_hsl(var(--primary)/0.08)]'
                      : 'border-border/70 bg-background/60 hover:border-border hover:bg-background'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                        isActive
                          ? 'border-primary/20 bg-primary text-primary-foreground'
                          : 'border-border/70 bg-background text-muted-foreground'
                      }`}
                    >
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1">
                        <span className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-foreground/80'}`}>
                          {step.title}
                        </span>
                      </div>

                      {isActive && activeDescription ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                          {activeDescription}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {isActive ? (
                    <span className="absolute left-0 top-3 h-[calc(100%-1.5rem)] w-1 rounded-r-full bg-primary shadow-[0_0_18px_hsl(var(--primary)/0.35)]" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </aside>

        <div className="relative z-10 flex min-w-0 flex-col flex-1 lg:h-full bg-background px-4 py-4 sm:px-5 overflow-hidden min-h-0">
          <div className="mb-4 flex flex-wrap gap-2 border-b border-border/70 pb-4 shrink-0">
            {fileNames.map((fileName) => {
              const isActive = fileName === currentFile;

              return (
                <button
                  key={fileName}
                  type="button"
                  onClick={() => setActiveFile(fileName)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                    isActive
                      ? 'border-primary/20 bg-primary/10 text-primary'
                      : 'border-border/70 bg-muted/40 text-muted-foreground hover:border-border hover:text-foreground'
                  }`}
                >
                  {fileName}
                </button>
              );
            })}
          </div>

          {currentFile ? (
            <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-background/90">
              <div 
                ref={codeContainerRef}
                className="flex-1 overflow-auto custom-scrollbar overscroll-contain"
              >
                <pre className="p-0 text-sm leading-6 text-foreground">
                  <code className="block min-w-max">
                    {lines.map((line, index) => {
                      const lineNumber = index + 1;
                      const isHighlighted = activeRange
                        ? lineNumber >= activeRange.start && lineNumber <= activeRange.end
                        : false;
                      const isFirstHighlighted = activeRange && lineNumber === activeRange.start;

                      return (
                        <div
                          key={`${currentFile}-${lineNumber}`}
                          ref={isFirstHighlighted ? highlightedLineRef : null}
                          className={`flex min-w-max border-l-2 px-4 transition-colors duration-300 ${
                            isHighlighted
                              ? 'border-primary bg-primary/10 text-foreground'
                              : 'border-transparent'
                          }`}
                        >
                          <span className="mr-4 w-10 shrink-0 select-none text-right text-muted-foreground">
                            {lineNumber}
                          </span>
                          <span className="min-w-0 whitespace-pre">
                            {line || ' '}
                          </span>
                        </div>
                      );
                    })}
                  </code>
                </pre>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-5 py-10 text-center text-sm text-muted-foreground">
              No files were provided for this walkthrough.
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.4);
        }
        .overscroll-contain {
          overscroll-behavior: contain;
        }
      `}</style>
    </section>
  );
}
