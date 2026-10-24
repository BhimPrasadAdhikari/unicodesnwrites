import type { Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';

/**
 * One Markdown pipeline for the editor preview and every public page, so what
 * an author previews is what readers get.
 *
 * Math: `$$…$$` inside a sentence is inline, `$$` on its own lines is a display
 * block. Single `$` stays plain text because posts use it for prices.
 */
export const remarkPlugins: NonNullable<Options['remarkPlugins']> = [remarkGfm, [remarkMath, { singleDollarTextMath: false }]];
export const rehypePlugins: NonNullable<Options['rehypePlugins']> = [rehypeHighlight, rehypeRaw, [rehypeKatex, { throwOnError: false, strict: 'ignore' }]];
