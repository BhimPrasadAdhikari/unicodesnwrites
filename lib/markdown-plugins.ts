import type { Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';

type MdNode = {
  type: string;
  value?: string;
  children?: MdNode[];
  data?: { hProperties?: Record<string, unknown> };
};

/**
 * `$$…$$` alone on a line is how authors (and MathJax) write a display equation,
 * but remark-math reads a single-line `$$…$$` as inline math. Promote a paragraph
 * that holds nothing but one math span to display mode, which rehype-katex reads
 * from the `math-display` class.
 */
function remarkDisplayMathParagraphs() {
  const walk = (node: MdNode) => {
    if (node.type === 'paragraph' && node.children?.length === 1 && node.children[0].type === 'inlineMath') {
      const math = node.children[0];
      math.data = { ...math.data, hProperties: { ...math.data?.hProperties, className: ['language-math', 'math-display'] } };
      return;
    }
    node.children?.forEach(walk);
  };
  return (tree: MdNode) => walk(tree);
}

/**
 * One Markdown pipeline for the editor preview and every public page, so what
 * an author previews is what readers get.
 *
 * Math: `$$…$$` inside a sentence is inline; on a line of its own (or fenced by
 * `$$` lines) it is a display equation. Single `$` stays plain text because
 * posts use it for prices.
 */
export const remarkPlugins: NonNullable<Options['remarkPlugins']> = [
  remarkGfm,
  [remarkMath, { singleDollarTextMath: false }],
  remarkDisplayMathParagraphs,
];
export const rehypePlugins: NonNullable<Options['rehypePlugins']> = [rehypeHighlight, rehypeRaw, [rehypeKatex, { throwOnError: false, strict: 'ignore' }]];
