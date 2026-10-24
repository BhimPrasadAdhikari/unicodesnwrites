'use client';

import React, { useMemo, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type WalkthroughFile = {
  path: string;
  content: string;
};

type WalkthroughStep = {
  title: string;
  description: string;
  file: string;
  startLine: string;
  endLine: string;
};

type WalkthroughStepPayload = {
  title: string;
  description: string;
  file: string;
  startLine: number;
  endLine: number;
};

export type WalkthroughDraft = {
  files: WalkthroughFile[];
  steps: WalkthroughStepPayload[];
};

interface CodeWalkthroughModalProps {
  open: boolean;
  onClose: () => void;
  onInsert: (draft: WalkthroughDraft) => void;
}

const createEmptyFile = (): WalkthroughFile => ({
  path: 'example.py',
  content: '',
});

const createEmptyStep = (): WalkthroughStep => ({
  title: 'New step',
  description: '',
  file: 'example.py',
  startLine: '1',
  endLine: '1',
});

export default function CodeWalkthroughModal({ open, onClose, onInsert }: CodeWalkthroughModalProps) {
  const [activeTab, setActiveTab] = useState<'files' | 'steps'>('files');
  const [files, setFiles] = useState<WalkthroughFile[]>([createEmptyFile()]);
  const [steps, setSteps] = useState<WalkthroughStep[]>([createEmptyStep()]);

  const fileNames = useMemo(() => files.map((file) => file.path).filter(Boolean), [files]);

  if (!open) {
    return null;
  }

  const updateFile = (index: number, patch: Partial<WalkthroughFile>) => {
    setFiles((currentFiles) =>
      currentFiles.map((file, fileIndex) => (fileIndex === index ? { ...file, ...patch } : file))
    );
  };

  const updateStep = (index: number, patch: Partial<WalkthroughStep>) => {
    setSteps((currentSteps) =>
      currentSteps.map((step, stepIndex) => (stepIndex === index ? { ...step, ...patch } : step))
    );
  };

  const removeFile = (index: number) => {
    const removedPath = files[index]?.path;
    const fallbackPath = files.find((_, fileIndex) => fileIndex !== index)?.path ?? '';

    setFiles((currentFiles) => currentFiles.filter((_, fileIndex) => fileIndex !== index));

    if (removedPath) {
      setSteps((currentSteps) =>
        currentSteps.map((step) => (step.file === removedPath ? { ...step, file: fallbackPath } : step))
      );
    }
  };

  const removeStep = (index: number) => {
    setSteps((currentSteps) => currentSteps.filter((_, stepIndex) => stepIndex !== index));
  };

  const handleInsert = () => {
    const normalizedFiles = files
      .map((file) => ({
        path: file.path.trim(),
        content: file.content,
      }))
      .filter((file) => file.path.length > 0);

    const defaultFile = normalizedFiles[0]?.path ?? '';

    const normalizedSteps = steps
      .map((step) => ({
        title: step.title.trim(),
        description: step.description,
        file: step.file.trim() || defaultFile,
        startLine: Number(step.startLine),
        endLine: Number(step.endLine),
      }))
      .filter((step) => step.title.length > 0 && step.file.length > 0)
      .map((step) => ({
        ...step,
        startLine: Number.isNaN(step.startLine) ? 1 : step.startLine,
        endLine: Number.isNaN(step.endLine) ? (Number.isNaN(step.startLine) ? 1 : step.startLine) : step.endLine,
      }));

    onInsert({
      files: normalizedFiles,
      steps: normalizedSteps,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-overlay">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-eyebrow text-primary">
              Walkthrough builder
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              Add a code walkthrough
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="touch-target rounded-lg border border-border bg-background/80 p-2 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
            aria-label="Close walkthrough builder"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-2 border-b border-border px-5 py-3">
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`rounded-lg px-4 py-2 text-sm transition-colors ${activeTab === 'files' ? 'border border-border bg-secondary text-foreground' : 'border border-transparent bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          >
            Files
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('steps')}
            className={`rounded-lg px-4 py-2 text-sm transition-colors ${activeTab === 'steps' ? 'border border-border bg-secondary text-foreground' : 'border border-transparent bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          >
            Steps
          </button>
        </div>

        <div className="max-h-[calc(90vh-164px)] overflow-y-auto px-5 py-5">
          {activeTab === 'files' ? (
            <div className="space-y-4">
              {files.map((file, index) => (
                <div key={`file-${index}`} className="rounded-xl border border-border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        File path
                      </label>
                      <Input
                        value={file.path}
                        onChange={(event) => updateFile(index, { path: event.target.value })}
                        placeholder="server.py"
                        className="border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="touch-target mt-7 rounded-lg border border-border bg-background/80 p-2 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                      aria-label={`Remove file ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                      File content
                    </label>
                    <textarea
                      value={file.content}
                      onChange={(event) => updateFile(index, { content: event.target.value })}
                      rows={8}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                      placeholder="Write the file contents here"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setFiles((currentFiles) => [...currentFiles, createEmptyFile()])}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
              >
                <Plus className="h-4 w-4" />
                Add file
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={`step-${index}`} className="rounded-xl border border-border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="grid flex-1 gap-3 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                          Title
                        </label>
                        <Input
                          value={step.title}
                          onChange={(event) => updateStep(index, { title: event.target.value })}
                          placeholder="Initiating sampling"
                          className="border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                          File
                        </label>
                        <select
                          value={step.file}
                          onChange={(event) => updateStep(index, { file: event.target.value })}
                          className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                        >
                          {fileNames.length > 0 ? (
                            fileNames.map((fileName) => (
                              <option key={fileName} value={fileName}>
                                {fileName}
                              </option>
                            ))
                          ) : (
                            <option value="">Add a file first</option>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                          Line range
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            min="1"
                            value={step.startLine}
                            onFocus={(event) => event.target.select()}
                            onChange={(event) => updateStep(index, { startLine: event.target.value })}
                            placeholder="1"
                            className="border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                          />
                          <Input
                            type="number"
                            min="1"
                            value={step.endLine}
                            onFocus={(event) => event.target.select()}
                            onChange={(event) => updateStep(index, { endLine: event.target.value })}
                            placeholder="3"
                            className="border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                          Description
                        </label>
                        <textarea
                          value={step.description}
                          onChange={(event) => updateStep(index, { description: event.target.value })}
                          rows={4}
                          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                          placeholder="Explain what the reader should notice here"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeStep(index)}
                      className="touch-target self-start rounded-lg border border-border bg-background/80 p-2 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                      aria-label={`Remove step ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setSteps((currentSteps) => [...currentSteps, createEmptyStep()])}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
              >
                <Plus className="h-4 w-4" />
                Add step
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-4">
          <Button variant="outline" onClick={onClose} className="border-border bg-background text-foreground hover:bg-muted">
            Cancel
          </Button>
          <Button
            onClick={handleInsert}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={files.length === 0 || steps.length === 0}
          >
            Insert walkthrough
          </Button>
        </div>
      </div>
    </div>
  );
}