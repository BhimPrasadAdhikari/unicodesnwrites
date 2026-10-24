'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const HIGHLIGHT_STORAGE_PREFIX = 'uw:reader-highlights:v1:';

type HighlightColor = 'sun' | 'mint' | 'sky' | 'lavender';

interface HighlightEntry {
  id: string;
  start: number;
  end: number;
  color: HighlightColor;
  note?: string;
  text: string;
  createdAt: string;
}

interface PendingSelection {
  start: number;
  end: number;
  text: string;
}

interface FloatingPosition {
  top: number;
  left: number;
}

interface ReaderHighlightsProps {
  storageKey: string;
  contentKey?: string;
  className?: string;
  children: React.ReactNode;
}

const highlightPalette: Array<{ id: HighlightColor; label: string; className: string }> = [
  { id: 'sun', label: 'Sun', className: 'uw-highlight--sun' },
  { id: 'mint', label: 'Mint', className: 'uw-highlight--mint' },
  { id: 'sky', label: 'Sky', className: 'uw-highlight--sky' },
  { id: 'lavender', label: 'Lavender', className: 'uw-highlight--lavender' },
];

const createHighlightId = () =>
  `hl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const loadHighlights = (storageKey: string) => {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as HighlightEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry) =>
        entry &&
        typeof entry.start === 'number' &&
        typeof entry.end === 'number' &&
        Number.isFinite(entry.start) &&
        Number.isFinite(entry.end) &&
        entry.end > entry.start
    );
  } catch {
    return [];
  }
};

const saveHighlights = (storageKey: string, highlights: HighlightEntry[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(highlights));
};

const clearHighlights = (container: HTMLElement) => {
  const existing = container.querySelectorAll('[data-uw-highlight-id]');
  existing.forEach((node) => {
    const parent = node.parentNode;
    if (!parent) return;
    while (node.firstChild) {
      parent.insertBefore(node.firstChild, node);
    }
    parent.removeChild(node);
    parent.normalize();
  });
};

const clearPreviewHighlights = (container: HTMLElement) => {
  const existing = container.querySelectorAll('[data-uw-highlight-preview]');
  existing.forEach((node) => {
    const parent = node.parentNode;
    if (!parent) return;
    while (node.firstChild) {
      parent.insertBefore(node.firstChild, node);
    }
    parent.removeChild(node);
    parent.normalize();
  });
};

const resolveRange = (
  container: HTMLElement,
  startOffset: number,
  endOffset: number
) => {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let current: Node | null = walker.nextNode();
  let offset = 0;
  let startNode: Node | null = null;
  let startNodeOffset = 0;
  let endNode: Node | null = null;
  let endNodeOffset = 0;

  while (current) {
    const length = current.textContent?.length ?? 0;
    if (!startNode && offset + length >= startOffset) {
      startNode = current;
      startNodeOffset = Math.max(0, startOffset - offset);
    }
    if (offset + length >= endOffset) {
      endNode = current;
      endNodeOffset = Math.max(0, endOffset - offset);
      break;
    }
    offset += length;
    current = walker.nextNode();
  }

  if (!startNode || !endNode) return null;
  const range = document.createRange();
  range.setStart(startNode, startNodeOffset);
  range.setEnd(endNode, endNodeOffset);
  return range;
};

const createHighlightWrapper = (entry: HighlightEntry, isPreview = false) => {
  const wrapper = document.createElement('span');
  if (isPreview) {
    wrapper.dataset.uwHighlightPreview = 'true';
  } else {
    wrapper.dataset.uwHighlightId = entry.id;
  }
  wrapper.className = `uw-highlight uw-highlight--${entry.color}`;
  if (!isPreview && entry.note) {
    wrapper.dataset.uwHighlightNote = entry.note;
    wrapper.setAttribute('title', entry.note);
  }
  return wrapper;
};

const getTextNodesInRange = (range: Range) => {
  const root =
    range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentNode
      : range.commonAncestorContainer;
  if (!root) return [];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    if (range.intersectsNode(current)) {
      nodes.push(current as Text);
    }
    current = walker.nextNode();
  }

  return nodes;
};

const wrapRangeWithHighlight = (range: Range, entry: HighlightEntry, isPreview = false) => {
  if (range.collapsed) return;

  try {
    const wrapper = createHighlightWrapper(entry, isPreview);
    range.surroundContents(wrapper);
    return;
  } catch {
    const nodes = getTextNodesInRange(range);
    nodes.forEach((node) => {
      const nodeRange = document.createRange();
      nodeRange.selectNodeContents(node);
      if (node === range.startContainer) {
        nodeRange.setStart(node, range.startOffset);
      }
      if (node === range.endContainer) {
        nodeRange.setEnd(node, range.endOffset);
      }
      if (nodeRange.collapsed) return;

      const wrapper = createHighlightWrapper(entry, isPreview);
      const contents = nodeRange.extractContents();
      if (!contents.textContent) return;
      wrapper.appendChild(contents);
      nodeRange.insertNode(wrapper);
    });
  }
};

const getOffsetsFromSelection = (container: HTMLElement, range: Range) => {
  const preStart = range.cloneRange();
  preStart.selectNodeContents(container);
  preStart.setEnd(range.startContainer, range.startOffset);
  const start = preStart.toString().length;

  const preEnd = range.cloneRange();
  preEnd.selectNodeContents(container);
  preEnd.setEnd(range.endContainer, range.endOffset);
  const end = preEnd.toString().length;

  return { start, end };
};

export default function ReaderHighlights({
  storageKey,
  contentKey,
  className,
  children,
}: ReaderHighlightsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlights, setHighlights] = useState<HighlightEntry[]>([]);
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const [toolbarPosition, setToolbarPosition] = useState<FloatingPosition | null>(null);
  const [selectedColor, setSelectedColor] = useState<HighlightColor>('sun');
  const [note, setNote] = useState('');
  const [overlapWarning, setOverlapWarning] = useState('');
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [activeHighlightPosition, setActiveHighlightPosition] =
    useState<FloatingPosition | null>(null);
  const [activeNote, setActiveNote] = useState('');

  const storageId = useMemo(
    () => `${HIGHLIGHT_STORAGE_PREFIX}${storageKey}`,
    [storageKey]
  );

  useEffect(() => {
    setHighlights(loadHighlights(storageId));
  }, [storageId]);

  useEffect(() => {
    if (!containerRef.current) return;
    clearHighlights(containerRef.current);
    highlights
      .filter((entry) => entry.start < entry.end)
      .sort((a, b) => a.start - b.start)
      .forEach((entry) => {
        const range = resolveRange(containerRef.current!, entry.start, entry.end);
        if (!range || range.collapsed) return;
        wrapRangeWithHighlight(range, entry);
      });
  }, [highlights, contentKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    clearPreviewHighlights(container);
    if (!pendingSelection) return;

    const range = resolveRange(container, pendingSelection.start, pendingSelection.end);
    if (!range || range.collapsed) return;

    const previewEntry: HighlightEntry = {
      id: 'preview',
      start: pendingSelection.start,
      end: pendingSelection.end,
      color: selectedColor,
      note: undefined,
      text: pendingSelection.text,
      createdAt: new Date().toISOString(),
    };

    wrapRangeWithHighlight(range, previewEntry, true);
  }, [pendingSelection, selectedColor]);

  useEffect(() => {
    if (!toolbarPosition) return;
    const handleScroll = () => {
      setToolbarPosition(null);
      setPendingSelection(null);
    };
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [toolbarPosition]);

  const clearSelection = () => {
    const selection = window.getSelection();
    if (selection) selection.removeAllRanges();
  };

  const closeToolbar = () => {
    setToolbarPosition(null);
    setPendingSelection(null);
    setOverlapWarning('');
    if (containerRef.current) {
      clearPreviewHighlights(containerRef.current);
    }
  };

  const handleSelection = () => {
    const container = containerRef.current;
    if (!container) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      closeToolbar();
      return;
    }

    const range = selection.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) {
      closeToolbar();
      return;
    }

    const ancestor =
      range.commonAncestorContainer instanceof Element
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement;
    if (ancestor?.closest('input, textarea, [contenteditable="true"]')) {
      closeToolbar();
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      closeToolbar();
      return;
    }

    const { start, end } = getOffsetsFromSelection(container, range);
    if (start === end) {
      closeToolbar();
      return;
    }

    const rect = range.getBoundingClientRect();
    setToolbarPosition({
      left: Math.min(window.innerWidth - 16, Math.max(16, rect.left + rect.width / 2)),
      top: Math.max(16, rect.top - 12),
    });
    setPendingSelection({ start, end, text: selectedText });
    setNote('');
    setOverlapWarning('');
    setActiveHighlightId(null);
  };

  const stopToolbarEvent = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  const handleSaveHighlight = () => {
    if (!pendingSelection) return;
    const overlaps = highlights.some(
      (entry) => !(pendingSelection.end <= entry.start || pendingSelection.start >= entry.end)
    );

    if (overlaps) {
      setOverlapWarning('Selection overlaps an existing highlight.');
      return;
    }

    const newHighlight: HighlightEntry = {
      id: createHighlightId(),
      start: pendingSelection.start,
      end: pendingSelection.end,
      color: selectedColor,
      note: note.trim() || undefined,
      text: pendingSelection.text,
      createdAt: new Date().toISOString(),
    };

    setHighlights((prev) => {
      const updated = [...prev, newHighlight].sort((a, b) => a.start - b.start);
      saveHighlights(storageId, updated);
      return updated;
    });

    if (containerRef.current) {
      clearPreviewHighlights(containerRef.current);
    }

    clearSelection();
    closeToolbar();
  };

  const handleHighlightClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest('[data-uw-highlight-id]') as
      | HTMLElement
      | null;

    if (!target) {
      setActiveHighlightId(null);
      return;
    }

    const highlightId = target.dataset.uwHighlightId;
    if (!highlightId) return;

    const rect = target.getBoundingClientRect();
    setActiveHighlightId(highlightId);
    setActiveHighlightPosition({
      left: Math.min(window.innerWidth - 16, Math.max(16, rect.left + rect.width / 2)),
      top: Math.min(window.innerHeight - 16, rect.bottom + 8),
    });
    const entry = highlights.find((item) => item.id === highlightId);
    setActiveNote(entry?.note ?? '');
  };

  const handleUpdateNote = () => {
    if (!activeHighlightId) return;

    setHighlights((prev) => {
      const updated = prev.map((entry) =>
        entry.id === activeHighlightId
          ? { ...entry, note: activeNote.trim() || undefined }
          : entry
      );
      saveHighlights(storageId, updated);
      return updated;
    });
  };

  const handleRemoveHighlight = () => {
    if (!activeHighlightId) return;

    setHighlights((prev) => {
      const updated = prev.filter((entry) => entry.id !== activeHighlightId);
      saveHighlights(storageId, updated);
      return updated;
    });

    setActiveHighlightId(null);
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      onMouseUp={handleSelection}
      onClick={handleHighlightClick}
    >
      {children}

      {toolbarPosition && pendingSelection && (
        <div
          className="fixed z-40 w-[280px] rounded-xl border border-border bg-card p-3 shadow-overlay"
          style={{
            top: toolbarPosition.top,
            left: toolbarPosition.left,
            transform: 'translate(-50%, -100%)',
          }}
          onMouseDown={stopToolbarEvent}
          onMouseUp={stopToolbarEvent}
          onClick={stopToolbarEvent}
        >
          <div className="flex items-center justify-between">
            <div className="text-eyebrow text-muted-foreground">
              Highlight
            </div>
            <button
              type="button"
              onClick={closeToolbar}
              className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition"
            >
              Close
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            {highlightPalette.map((color) => (
              <button
                key={color.id}
                type="button"
                onClick={() => setSelectedColor(color.id)}
                data-selected={selectedColor === color.id}
                className={cn(
                  'uw-highlight-swatch cursor-pointer',
                  color.className,
                  selectedColor === color.id && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                )}
                aria-label={`${color.label} highlight`}
                aria-pressed={selectedColor === color.id}
              />
            ))}
          </div>

          <div className="mt-3">
            <label className="text-xs text-muted-foreground" htmlFor="highlight-note">
              Optional note
            </label>
            <textarea
              id="highlight-note"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background/80 px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
              placeholder="Add a quick note..."
            />
          </div>

          {overlapWarning && (
            <p className="mt-2 text-xs text-destructive">{overlapWarning}</p>
          )}

          <div className="mt-3 flex items-center justify-between">
            <div className="text-2xs text-muted-foreground line-clamp-1">
              {pendingSelection.text}
            </div>
            <button
              type="button"
              onClick={handleSaveHighlight}
              className="cursor-pointer rounded-md bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:bg-foreground/90 transition"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {activeHighlightId && activeHighlightPosition && (
        <div
          className="fixed z-40 w-[260px] rounded-xl border border-border bg-card p-3 shadow-overlay"
          style={{
            top: activeHighlightPosition.top,
            left: activeHighlightPosition.left,
            transform: 'translate(-50%, 0)',
          }}
          onMouseDown={stopToolbarEvent}
          onMouseUp={stopToolbarEvent}
          onClick={stopToolbarEvent}
        >
          <div className="flex items-center justify-between">
            <div className="text-eyebrow text-muted-foreground">
              Note
            </div>
            <button
              type="button"
              onClick={() => setActiveHighlightId(null)}
              className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition"
            >
              Close
            </button>
          </div>

          <textarea
            rows={2}
            value={activeNote}
            onChange={(event) => setActiveNote(event.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-background/80 px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
            placeholder="Add a note to this highlight..."
          />

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={handleRemoveHighlight}
              className="cursor-pointer text-xs font-semibold text-destructive hover:text-destructive/80 transition"
            >
              Remove
            </button>
            <button
              type="button"
              onClick={handleUpdateNote}
              className="cursor-pointer rounded-md bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:bg-foreground/90 transition"
            >
              Save note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
