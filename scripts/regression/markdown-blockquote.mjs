// Round-trips markdown through the post editor's tiptap + tiptap-markdown setup
// (serialization only; no DOM) and checks blockquotes with bold lead-ins survive.
import assert from 'node:assert/strict';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import '../../lib/editor/markdown-serializer-patch.mjs';

const text = (value, bold) => (bold ? { type: 'text', text: value, marks: [{ type: 'bold' }] } : { type: 'text', text: value });
const paragraph = (...content) => ({ type: 'paragraph', content });
const doc = {
  type: 'doc',
  content: [
    {
      type: 'blockquote',
      content: [
        paragraph(text('Upper bound:', true), text(' first claim.')),
        paragraph(text('Lower bound:', true), text(' second claim.')),
      ],
    },
  ],
};

// JSON content skips tiptap-markdown's DOM-based parser, so this runs in plain Node.
const editor = new Editor({
  element: null,
  content: doc,
  extensions: [StarterKit, Markdown.configure({ html: true, tightLists: true, bulletListMarker: '-' })],
});
const node = editor.schema.nodeFromJSON(doc);
const markdown = editor.storage.markdown.serializer.serialize(node);
console.log(JSON.stringify(markdown));
assert.equal(markdown, '> **Upper bound:** first claim.\n>\n> **Lower bound:** second claim.');
console.log('ok');
