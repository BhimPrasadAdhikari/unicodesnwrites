'use client';

/**
 * BlogContent — renders a blog post's Markdown / MDX content on the public
 * facing blog post page.
 *
 * This component uses the EXACT same plugin stack and component map as
 * MDXPreview, so the published output always matches the editor preview.
 *
 * Plugin decisions
 * ─────────────────
 * • remark-gfm       — tables, strikethrough, task lists, autolinks
 * • rehype-highlight  — syntax highlighting via highlight.js
 *                       (theme CSS is loaded globally in globals.css)
 * • rehype-raw       — allows raw HTML pass-through in content authored
 *                       directly in the CMS (e.g. <details>, <video>)
 * • remark-math + rehype-katex — LaTeX between $$…$$ (see lib/markdown-plugins.ts)
 *
 * remark-breaks is intentionally omitted: it converts every single newline
 * inside a paragraph into a <br>, which conflicts with tight ordered / unordered
 * list rendering authored in the CMS.
 *
 * Newsletter injection
 * ─────────────────────
 * When readingTime > 5, a mid-article newsletter prompt is injected after
 * roughly the halfway point of the content (split on double-newlines).
 */

import ReactMarkdown from 'react-markdown';
import 'katex/dist/katex.min.css';
import { rehypePlugins, remarkPlugins } from '@/lib/markdown-plugins';
import { preserveSpacing } from '@/lib/utils/markdown';
import { mdxComponents } from '@/lib/mdx-components';
import dynamic from 'next/dynamic';
import type { Components } from 'react-markdown';
import React, { ReactNode, useMemo } from 'react';
import ReaderHighlights from './ReaderHighlights';
import { extractMarkdownHeadings, stripInlineMarkdown, createSlugger } from '@/lib/utils/toc-headings';

// Lazy-load so it only bundles when actually used
const BlogNewsletterPrompt = dynamic(
  () => import('./BlogNewsletterPrompt'),
  { ssr: false }
);

interface BlogContentProps {
  content: string;
  /** Reading time in minutes — used to decide if the mid-article prompt shows */
  readingTime?: number;
  storageKey?: string;
}

const headingClassByLevel: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
  1: 'text-4xl font-bold tracking-tight mt-10 mb-5 text-foreground leading-tight scroll-mt-24',
  2: 'text-2xl font-semibold tracking-tight mt-12 mb-4 text-foreground leading-tight scroll-mt-24',
  3: 'text-2xl font-semibold tracking-tight mt-8 mb-3 text-foreground leading-snug scroll-mt-24',
  4: 'text-xl font-semibold tracking-tight mt-6 mb-2 text-foreground leading-snug scroll-mt-24',
  5: 'text-lg font-semibold tracking-tight mt-5 mb-2 text-foreground scroll-mt-24',
  6: 'text-base font-semibold tracking-tight mt-5 mb-2 text-muted-foreground scroll-mt-24',
};

const extractTextContent = (node: ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractTextContent).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    const withProps = node as { props?: { children?: ReactNode } };
    return extractTextContent(withProps.props?.children ?? '');
  }
  return '';
};

export default function BlogContent({
  content,
  readingTime = 0,
  storageKey,
}: BlogContentProps) {
  const processedContent = preserveSpacing(content);
  const showMidPrompt = readingTime > 5;
  const extractedHeadings = useMemo(
    () => extractMarkdownHeadings(processedContent),
    [processedContent]
  );

  const slugger = useMemo(() => createSlugger(), [processedContent]);
  slugger.reset();
  const headingPointer = { current: 0 };

  const createHeadingRenderer =
    (level: 1 | 2 | 3 | 4 | 5 | 6): NonNullable<Components['h1']> => {
      const HeadingRenderer: NonNullable<Components['h1']> = ({ children, className, ...props }) => {
        const rawText = extractTextContent(children).trim();
        const cleanText = stripInlineMarkdown(rawText);

        let matchedId = '';
        if (headingPointer.current < extractedHeadings.length) {
          const nextExpected = extractedHeadings[headingPointer.current];
          if (nextExpected.text.toLowerCase() === cleanText.toLowerCase()) {
            matchedId = nextExpected.id;
            headingPointer.current += 1;
          }
        }

        const generatedId = matchedId || slugger.slug(cleanText) || `section-${level}`;
        const existingId = typeof props.id === 'string' && props.id.trim() ? props.id : undefined;
        const mergedClassName = className
          ? `${headingClassByLevel[level]} ${className}`
          : headingClassByLevel[level];
        const Tag = `h${level}` as React.ElementType;

        return React.createElement(
          Tag,
          { ...props, id: existingId ?? generatedId, className: mergedClassName },
          children
        );
      };

      HeadingRenderer.displayName = `MarkdownHeading${level}`;
      return HeadingRenderer;
    };

  const markdownComponents: Components = {
    ...mdxComponents,
    h1: createHeadingRenderer(1),
    h2: createHeadingRenderer(2),
    h3: createHeadingRenderer(3),
    h4: createHeadingRenderer(4),
    h5: createHeadingRenderer(5),
    h6: createHeadingRenderer(6),
  };

  let markdownBody = (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={markdownComponents}
    >
      {processedContent}
    </ReactMarkdown>
  );

  if (showMidPrompt) {
    const blocks = processedContent.split(/\n\n+/);
    const midpoint = Math.floor(blocks.length / 2);
    const firstHalf = blocks.slice(0, midpoint).join('\n\n');
    const secondHalf = blocks.slice(midpoint).join('\n\n');

    markdownBody = (
      <>
        <ReactMarkdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          components={markdownComponents}
        >
          {firstHalf}
        </ReactMarkdown>

        {/* Mid-article newsletter prompt — slides in when reader reaches this point */}
        <BlogNewsletterPrompt />

        <ReactMarkdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          components={markdownComponents}
        >
          {secondHalf}
        </ReactMarkdown>
      </>
    );
  }

  if (!storageKey) {
    return <div className="mdx-content text-base">{markdownBody}</div>;
  }

  return (
    <ReaderHighlights
      storageKey={storageKey}
      contentKey={processedContent}
      className="mdx-content text-base"
    >
      {markdownBody}
    </ReaderHighlights>
  );
}
