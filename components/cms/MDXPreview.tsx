'use client';

/**
 * MDXPreview — live editor preview panel.
 *
 * Uses the SAME plugin stack and component map as BlogContent so that
 * "what you see in preview is exactly what readers see" is guaranteed.
 * The only preview-specific addition is a subtle inner scroll container
 * so the panel doesn't overflow the editor layout.
 */

import ReactMarkdown from 'react-markdown';
import 'katex/dist/katex.min.css';
import { rehypePlugins, remarkPlugins } from '@/lib/markdown-plugins';
import { preserveSpacing } from '@/lib/utils/markdown';
import { mdxComponents } from '@/lib/mdx-components';

interface MDXPreviewProps {
  content: string;
}

export default function MDXPreview({ content }: MDXPreviewProps) {
  const processedContent = preserveSpacing(content);

  return (
    <div className="mdx-content text-base">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={mdxComponents}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
