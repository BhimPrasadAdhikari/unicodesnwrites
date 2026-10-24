import { MarkdownSerializerState } from 'prosemirror-markdown';

// tiptap-markdown records where an inline mark (e.g. **bold**) starts as an offset
// into the output, then trims whitespace around it once the block is rendered. It
// records that offset before prosemirror-markdown writes the pending separator
// between blocks. At top level the separator is whitespace and gets skipped, but
// inside a blockquote it is "\n>\n> ", so the trim shifts the delimiters and a
// second bold paragraph comes out as "> ****Lower bound:**" merged into the first.
// Writing the separator (and the "> " prefix) before inline content fixes the offsets.
const PATCHED = Symbol.for('unicodesnwrites.markdownRenderInlineFlush');
const proto = MarkdownSerializerState.prototype;

if (!proto[PATCHED]) {
  const renderInline = proto.renderInline;
  proto.renderInline = function patchedRenderInline(parent, fromBlockStart = true) {
    if (parent.childCount > 0) this.write();
    return renderInline.call(this, parent, fromBlockStart);
  };
  proto[PATCHED] = true;
}
