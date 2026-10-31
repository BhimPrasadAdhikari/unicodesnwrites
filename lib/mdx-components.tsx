/**
 * Shared MDX component map.
 *
 * Single source of truth for how every Markdown / MDX element is rendered.
 * Used by both:
 *   - components/cms/MDXPreview   (editor live-preview, client-side)
 *   - components/public/BlogContent  (published blog post page)
 *
 * Rules:
 * - Each component uses explicit Tailwind utility classes so that styles are
 *   self-contained and never depend on a parent `.prose` cascade.
 * - Inline code vs block code is detected by the presence of a `language-*`
 *   className (set by remark-gfm for fenced code blocks) or by the string
 *   containing a newline.  The deprecated `inline` prop (removed in
 *   react-markdown v8) is intentionally NOT used.
 * - The `pre` override adds scrolling and background so code blocks are
 *   always readable without overflow.
 */

'use client';

import CodeWalkthrough from '@/components/ui/CodeWalkthrough';
import MermaidDiagram from '@/components/ui/MermaidDiagram';
import { CopyCodeButton } from '@/components/public/CopyCodeButton';
import { RunnablePythonBlock } from '@/components/public/RunPythonButton';
import { canRunInBrowser, isPythonCodeClass } from '@/lib/utils/python-run';
import type { Components } from 'react-markdown';
import React from 'react';

// ---------------------------------------------------------------------------
// Headings
// ---------------------------------------------------------------------------

const h1: Components['h1'] = ({ children, ...props }) => (
  <h1
    className="font-serif text-[2rem] font-medium tracking-[-0.02em] mt-12 mb-5 text-foreground leading-[1.1] sm:text-[2.5rem]"
    {...props}
  >
    {children}
  </h1>
);

const h2: Components['h2'] = ({ children, ...props }) => (
  <h2
    className="font-serif text-[1.75rem] font-medium tracking-[-0.015em] mt-14 mb-4 text-foreground leading-[1.15] sm:text-[2rem]"
    {...props}
  >
    {children}
  </h2>
);

const h3: Components['h3'] = ({ children, ...props }) => (
  <h3
    className="font-serif text-[1.375rem] font-medium tracking-[-0.01em] mt-10 mb-3 text-foreground leading-snug sm:text-2xl"
    {...props}
  >
    {children}
  </h3>
);

const h4: Components['h4'] = ({ children, ...props }) => (
  <h4
    className="text-lg font-semibold mt-8 mb-2 text-foreground leading-snug"
    {...props}
  >
    {children}
  </h4>
);

const h5: Components['h5'] = ({ children, ...props }) => (
  <h5
    className="font-mono text-[13px] font-medium uppercase tracking-[0.08em] mt-6 mb-2 text-muted-foreground"
    {...props}
  >
    {children}
  </h5>
);

const h6: Components['h6'] = ({ children, ...props }) => (
  <h6
    className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] mt-5 mb-2 text-muted-foreground"
    {...props}
  >
    {children}
  </h6>
);

// ---------------------------------------------------------------------------
// Paragraph
// ---------------------------------------------------------------------------

const p: Components['p'] = ({ children, ...props }) => (
  <p className="my-5 font-serif text-[18px] leading-[1.65] text-foreground sm:text-[20px]" {...props}>
    {children}
  </p>
);

// ---------------------------------------------------------------------------
// Lists  —  explicit list-style + padding so Tailwind preflight reset is
// overridden regardless of whether the typography plugin is active.
// ---------------------------------------------------------------------------

const ol: Components['ol'] = ({ children, ...props }) => (
  <ol
    className="list-decimal pl-7 my-5 space-y-2 font-serif text-[18px] text-foreground marker:font-sans marker:text-muted-foreground sm:text-[20px]"
    {...props}
  >
    {children}
  </ol>
);

const ul: Components['ul'] = ({ children, ...props }) => (
  <ul
    className="list-disc pl-7 my-5 space-y-2 font-serif text-[18px] text-foreground marker:text-primary sm:text-[20px]"
    {...props}
  >
    {children}
  </ul>
);

const li: Components['li'] = ({ children, ...props }) => (
  <li className="leading-[1.65] text-foreground pl-1" {...props}>
    {children}
  </li>
);

type WalkthroughConfig = {
  files?: Record<string, string>;
  steps?: Array<{
    title: string;
    description?: string;
    markdown?: string;
    file: string;
    startLine?: number;
    endLine?: number;
    highlight?: [number, number];
  }>;
};



const getNodeText = (node: React.ReactNode): string =>
  React.Children.toArray(node)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return String(child);
      }

      if (React.isValidElement(child)) {
        const childProps = child.props as { children?: React.ReactNode };

        if (childProps.children) {
          return getNodeText(childProps.children);
        }
      }

      return '';
    })
    .join('');

const parseWalkthroughConfig = (rawConfig: string): WalkthroughConfig | null => {
  try {
    const parsed = JSON.parse(rawConfig) as WalkthroughConfig;

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};



// ---------------------------------------------------------------------------
// Code  —  handles three cases:
//   1. Mermaid diagram  (language-mermaid)
//   2. Block code block (fenced, language-* or multi-line)
//   3. Inline code       (no language class, single line)
// ---------------------------------------------------------------------------

const code: Components['code'] = ({ node, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : null;
  const codeString = String(children).replace(/\n$/, '');
  const isBlock = Boolean(className) || codeString.includes('\n');

  // Mermaid — render diagram instead of code
  if (language === 'mermaid') {
    return <MermaidDiagram code={codeString} />;
  }

  if (isBlock) {
    // Block code: the parent <pre> provides the container; we just pass the
    // language class through for rehype-highlight to pick up.
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }

  // Inline code: NOT wrapped in a <pre> — give it its own background pill.
  // text-[0.875em] keeps the font proportional to surrounding text without
  // the "shrinking" effect caused by cascading `font-size` on nested <code>.
  return (
    <code
      className="inline-code font-mono text-[0.875em] leading-normal px-1.5 py-0.5 rounded-md bg-muted text-foreground border border-border"
      {...props}
    >
      {children}
    </code>
  );
};

// ---------------------------------------------------------------------------
// Pre  —  wraps block code blocks
// ---------------------------------------------------------------------------

const pre: Components['pre'] = ({ children, ...props }) => {
  const childArray = React.Children.toArray(children);
  const codeChild = childArray.find(React.isValidElement) as
    | React.ReactElement<{ className?: string; children?: React.ReactNode }>
    | undefined;

  const className = codeChild?.props?.className ?? '';
  const rawCodeText = codeChild ? getNodeText(codeChild.props.children).replace(/\n$/, '') : '';

  if (className.includes('language-code-walkthrough')) {
    const walkthroughConfig = parseWalkthroughConfig(rawCodeText);

    if (walkthroughConfig?.files && walkthroughConfig?.steps) {
      return (
        <CodeWalkthrough
          files={walkthroughConfig.files}
          steps={walkthroughConfig.steps}
        />
      );
    }
  }



  // Extract text content from children for the copy button
  let codeText = '';
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.props) {
      const childProps = child.props as { children?: React.ReactNode };
      if (childProps.children) {
        codeText = String(childProps.children).replace(/\n$/, '');
      }
    }
  });

  // Python blocks get a "Run this code" button and output panel underneath.
  // The wrapper takes over the outer margin so the spacing stays the same.
  const runnable = isPythonCodeClass(className) && rawCodeText.trim() !== '' && canRunInBrowser(rawCodeText);

  const preElement = (
    <pre
      className={`group relative ${runnable ? 'my-0' : 'my-7'} overflow-x-auto rounded-xl border border-border bg-card p-4 pr-12 font-mono text-[14px] leading-[1.7] sm:text-[15px]`}
      {...props}
    >
      {codeText && <CopyCodeButton code={rawCodeText || codeText} />}
      {children}
    </pre>
  );

  if (runnable) {
    return <RunnablePythonBlock code={rawCodeText}>{preElement}</RunnablePythonBlock>;
  }

  return preElement;
};

// ---------------------------------------------------------------------------
// Blockquote
// ---------------------------------------------------------------------------

const blockquote: Components['blockquote'] = ({ children, ...props }) => (
  <blockquote
    className="border-l-2 border-primary pl-5 my-8 font-serif italic text-primary [&>p]:my-0 [&>p]:text-primary"
    {...props}
  >
    {children}
  </blockquote>
);

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

const a: Components['a'] = ({ children, href, ...props }) => (
  <a
    href={href}
    className="text-foreground underline underline-offset-4 decoration-primary decoration-[1.5px] hover:text-primary transition-colors"
    target={href?.startsWith('http') ? '_blank' : undefined}
    rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
    {...props}
  >
    {children}
  </a>
);

// ---------------------------------------------------------------------------
// Images  —  use native <img> (no fixed dimension constraint from next/image)
// ---------------------------------------------------------------------------

const img: Components['img'] = ({ src, alt }) => {
  if (!src) return null;
  return (
    <span className="block my-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? ''}
        className="rounded-xl border border-border max-w-full h-auto mx-auto"
        loading="lazy"
      />
      {alt && (
        <span className="block text-center font-mono text-[12px] tracking-[0.04em] text-muted-foreground mt-3">
          {alt}
        </span>
      )}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

const table: Components['table'] = ({ children, ...props }) => (
  <div className="overflow-x-auto my-7 rounded-xl border border-border bg-card">
    <table className="min-w-full divide-y divide-border" {...props}>
      {children}
    </table>
  </div>
);

const thead: Components['thead'] = ({ children, ...props }) => (
  <thead className="bg-secondary/60" {...props}>
    {children}
  </thead>
);

const th: Components['th'] = ({ children, ...props }) => (
  <th
    className="px-4 py-3 text-left font-mono text-[12px] font-medium uppercase tracking-[0.06em] text-muted-foreground"
    {...props}
  >
    {children}
  </th>
);

const td: Components['td'] = ({ children, ...props }) => (
  <td
    className="px-4 py-3 text-sm text-foreground border-t border-border"
    {...props}
  >
    {children}
  </td>
);

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

const hr: Components['hr'] = (props) => (
  <hr className="my-8 border-border" {...props} />
);

const strong: Components['strong'] = ({ children, ...props }) => (
  <strong className="font-semibold text-foreground" {...props}>
    {children}
  </strong>
);

const em: Components['em'] = ({ children, ...props }) => (
  <em className="italic text-foreground/90" {...props}>
    {children}
  </em>
);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const mdxComponents: Components = {
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  p,
  ol,
  ul,
  li,
  code,
  pre,
  blockquote,
  a,
  img,
  table,
  thead,
  th,
  td,
  hr,
  strong,
  em,
};
