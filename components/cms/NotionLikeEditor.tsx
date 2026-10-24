'use client';

import { useState, type ComponentType } from 'react';
import { useEditor, EditorContent, TiptapBubbleMenu as BubbleMenu, TiptapFloatingMenu as FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Markdown } from 'tiptap-markdown';
import '@/lib/editor/markdown-serializer-patch.mjs';
import { 
    Bold, Italic, List, ListOrdered, Quote, 
    Link as LinkIcon, Image as ImageIcon, Heading2, Heading3, Code, Plus,
    Table as TableIcon, FlaskConical
} from 'lucide-react';
import {Table} from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import CodeWalkthroughModal, { type WalkthroughDraft } from '@/components/cms/CodeWalkthroughModal';
import { Alert } from '@/components/ui/Alert';

interface NotionLikeEditorProps {
    value: string;
    onChange: (markdown: string) => void;
}

export default function NotionLikeEditor({ value, onChange }: NotionLikeEditorProps) {
    const [walkthroughOpen, setWalkthroughOpen] = useState(false);
    const [feedback, setFeedback] = useState('');
    const BubbleMenuView = BubbleMenu as ComponentType<any>;
    const FloatingMenuView = FloatingMenu as ComponentType<any>;

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                horizontalRule: {
                    HTMLAttributes: {
                        class: 'my-8 border-t border-border',
                    },
                },
            }),
            Link.configure({
                openOnClick: false,
            }),
            Image.configure({
                allowBase64: true,
                HTMLAttributes: {
                    class: 'rounded-lg max-w-full my-4 cursor-pointer transition-all hover:ring-2 hover:ring-primary/50',
                },
            }),
            Markdown.configure({
                html: true,
                tightLists: true,
                bulletListMarker: '-',
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
        ],
        content: value,
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[500px] py-8 px-8 text-base font-sans tiptap-editor',
            },
            handlePaste: (view, event) => {
                const items = event.clipboardData?.items;
                if (!items) return false;

                let handled = false;
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        const file = items[i].getAsFile();
                        if (file) {
                            event.preventDefault();
                            uploadAndInsertImage(file);
                            handled = true;
                        }
                    }
                }
                return handled;
            },
        },
        onUpdate: ({ editor }) => {
            const markdown = (editor.storage as { markdown?: { getMarkdown: () => string } }).markdown?.getMarkdown() ?? editor.getText();
            onChange(markdown);
        },
    });

    if (!editor) {
        return null;
    }

    const uploadAndInsertImage = async (file: File) => {
        setFeedback('');
        if (!file.type.startsWith('image/')) {
            setFeedback('Choose a valid image file.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setFeedback('Images must be 5 MB or smaller.');
            return;
        }
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch('/api/upload/image', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) throw new Error('Upload failed');
            const data = await response.json();
            editor.chain().focus().setImage({ src: data.url }).run();
        } catch (error) {
            console.error('Upload error:', error);
            setFeedback(error instanceof Error ? error.message : 'Failed to upload image.');
        }
    };

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);

        if (url === null) {
            return;
        }

        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        try {
            const parsed = new URL(url, window.location.origin);
            if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
                setFeedback('Links must use http, https, or mailto.');
                return;
            }
        } catch {
            setFeedback('Enter a valid link.');
            return;
        }

        setFeedback('');
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    const addImage = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
            if (input.files?.length) {
                uploadAndInsertImage(input.files[0]);
            }
        };
        input.click();
    };

    const insertTable = () => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    };



    const insertWalkthrough = (draft: WalkthroughDraft) => {
        const files = draft.files
            .map((file) => ({
                path: file.path.trim(),
                content: file.content,
            }))
            .filter((file) => file.path.length > 0)
            .reduce<Record<string, string>>((accumulator, file) => {
                accumulator[file.path] = file.content;
                return accumulator;
            }, {});

        const normalizedSteps = draft.steps
            .map((step) => ({
                title: step.title.trim(),
                description: step.description,
                file: step.file.trim(),
                startLine: Number(step.startLine),
                endLine: Number(step.endLine),
            }))
            .filter((step) => step.title.length > 0 && step.file.length > 0)
            .map((step) => ({
                title: step.title,
                description: step.description,
                file: step.file,
                startLine: Number.isNaN(step.startLine) ? 1 : step.startLine,
                endLine: Number.isNaN(step.endLine) ? (Number.isNaN(step.startLine) ? 1 : step.startLine) : step.endLine,
            }));

        const payload = {
            files,
            steps: normalizedSteps,
        };

        editor
            .chain()
            .focus()
            .insertContent({
                type: 'codeBlock',
                attrs: { language: 'code-walkthrough' },
                content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
            })
            .run();

        setWalkthroughOpen(false);
    };

    return (
        <div className="relative w-full rounded-xl border border-border bg-card">
            {feedback && <Alert variant="destructive" className="rounded-none border-x-0 border-t-0 py-2">{feedback}</Alert>}
            {/* Editor Ribbon Header - Sticky with offset for main nav */}
            {editor && (
                <div className="sticky top-[72px] z-30 flex flex-wrap items-center gap-1 border-b border-border bg-muted/90 p-2 transition-all">
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={`touch-target-coarse rounded-md p-1.5 transition-colors hover:bg-background ${editor.isActive('bold') ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                        title="Bold"
                    >
                        <Bold className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={`touch-target-coarse rounded-md p-1.5 transition-colors hover:bg-background ${editor.isActive('italic') ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                        title="Italic"
                    >
                        <Italic className="w-4 h-4" />
                    </button>
                    <div className="mx-1 h-5 w-px bg-border" />
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={`touch-target-coarse rounded-md p-1.5 transition-colors hover:bg-background ${editor.isActive('heading', { level: 2 }) ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                        title="Heading 2"
                    >
                        <Heading2 className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        className={`touch-target-coarse rounded-md p-1.5 transition-colors hover:bg-background ${editor.isActive('heading', { level: 3 }) ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                        title="Heading 3"
                    >
                        <Heading3 className="w-4 h-4" />
                    </button>
                    <div className="mx-1 h-5 w-px bg-border" />
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={`touch-target-coarse rounded-md p-1.5 transition-colors hover:bg-background ${editor.isActive('bulletList') ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                        title="Bullet List"
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        className={`touch-target-coarse rounded-md p-1.5 transition-colors hover:bg-background ${editor.isActive('orderedList') ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                        title="Numbered List"
                    >
                        <ListOrdered className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        className={`touch-target-coarse rounded-md p-1.5 transition-colors hover:bg-background ${editor.isActive('blockquote') ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                        title="Quote"
                    >
                        <Quote className="w-4 h-4" />
                    </button>
                    <div className="mx-1 h-5 w-px bg-border" />
                    <button
                        type="button"
                        onClick={setLink}
                        className={`touch-target-coarse rounded-md p-1.5 transition-colors hover:bg-background ${editor.isActive('link') ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                        title="Link"
                    >
                        <LinkIcon className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={addImage}
                        className="touch-target-coarse rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                        title="Image"
                    >
                        <ImageIcon className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={insertTable}
                        className={`touch-target-coarse rounded-md p-1.5 transition-colors hover:bg-background ${editor.isActive('table') ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                        title="Insert Table"
                    >
                        <TableIcon className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleCode().run()}
                        className={`touch-target-coarse rounded-md p-1.5 transition-colors hover:bg-background ${editor.isActive('code') ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                        title="Code"
                    >
                        <Code className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().setHorizontalRule().run()}
                        className="touch-target-coarse rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground text-xs font-bold"
                        title="Divider"
                    >
                        ---
                    </button>
                    <div className="flex-1" />

                    <button
                        onClick={() => setWalkthroughOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        title="Add Walkthrough"
                        type="button"
                    >
                        <Plus className="w-4 h-4" />
                        Walkthrough
                    </button>
                </div>
            )}

            {editor && (
                <BubbleMenuView editor={editor} tippyOptions={{ duration: 100 }} className="flex overflow-hidden rounded-md border border-border bg-card shadow-overlay divide-x divide-border">
                    <button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={`p-2 transition-colors hover:bg-muted ${editor.isActive('bold') ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
                        title="Bold"
                    >
                        <Bold className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={`p-2 transition-colors hover:bg-muted ${editor.isActive('italic') ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
                        title="Italic"
                    >
                        <Italic className="w-4 h-4" />
                    </button>
                    <button
                        onClick={setLink}
                        className={`p-2 transition-colors hover:bg-muted ${editor.isActive('link') ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
                        title="Link"
                    >
                        <LinkIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleCode().run()}
                        className={`p-2 transition-colors hover:bg-muted ${editor.isActive('code') ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
                        title="Code"
                    >
                        <Code className="w-4 h-4" />
                    </button>
                    {editor.isActive('image') && (
                        <button
                            onClick={() => editor.chain().focus().deleteSelection().run()}
                            className="p-2 transition-colors hover:bg-destructive/10 text-destructive"
                            title="Remove Image"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                        </button>
                    )}
                </BubbleMenuView>
            )}

            {editor && (
                <FloatingMenuView editor={editor} tippyOptions={{ duration: 100 }} className="flex items-center gap-1.5 rounded-xl border border-border bg-background p-1.5 shadow-overlay">
                    
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className="touch-target-coarse rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted hover:text-primary active:scale-90"
                        title="Heading 2"
                    >
                        <Heading2 className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        className="touch-target-coarse rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted hover:text-primary active:scale-90"
                        title="Heading 3"
                    >
                        <Heading3 className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-border mx-1" />
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className="touch-target-coarse rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted hover:text-primary active:scale-90"
                        title="Bullet List"
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        className="touch-target-coarse rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted hover:text-primary active:scale-90"
                        title="Quote"
                    >
                        <Quote className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-border mx-1" />
                    <button
                        type="button"
                        onClick={addImage}
                        className="touch-target-coarse rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted hover:text-primary active:scale-90"
                        title="Image"
                    >
                        <ImageIcon className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={insertTable}
                        className="touch-target-coarse rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted hover:text-primary active:scale-90"
                        title="Insert Table"
                    >
                        <TableIcon className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setWalkthroughOpen(true)}
                        className="touch-target-coarse rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted hover:text-primary active:scale-90"
                        title="Walkthrough"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </FloatingMenuView>
            )}

            <CodeWalkthroughModal
                key={walkthroughOpen ? 'walkthrough-open' : 'walkthrough-closed'}
                open={walkthroughOpen}
                onClose={() => setWalkthroughOpen(false)}
                onInsert={insertWalkthrough}
            />


            <div className="min-h-[500px]">
                <EditorContent editor={editor} />
            </div>

            <style jsx global>{`
                .tiptap-editor {
                    outline: none !important;
                }
                .tiptap-editor p {
                    margin-top: 1.25rem !important;
                    margin-bottom: 1.25rem !important;
                    line-height: 1.8 !important;
                }
                .tiptap-editor h2 {
                    font-size: 1.5rem !important;
                    font-weight: 600 !important;
                    margin-top: 3rem !important;
                    margin-bottom: 1rem !important;
                    line-height: 1.25 !important;
                }
                .tiptap-editor h3 {
                    font-size: 1.5rem !important;
                    font-weight: 600 !important;
                    margin-top: 2rem !important;
                    margin-bottom: 0.75rem !important;
                    line-height: 1.375 !important;
                }
                .tiptap-editor ul {
                    list-style-type: disc !important;
                    padding-left: 1.75rem !important;
                    margin-top: 1rem !important;
                    margin-bottom: 1rem !important;
                }
                .tiptap-editor ol {
                    list-style-type: decimal !important;
                    padding-left: 1.75rem !important;
                    margin-top: 1rem !important;
                    margin-bottom: 1rem !important;
                }
                .tiptap-editor li {
                    margin-top: 0.375rem !important;
                    margin-bottom: 0.375rem !important;
                    line-height: 1.8 !important;
                }
                .tiptap-editor blockquote {
                    border-left: 2px solid hsl(var(--foreground) / 0.2) !important;
                    padding-left: 1.25rem !important;
                    font-style: italic !important;
                    margin-top: 2rem !important;
                    margin-bottom: 2rem !important;
                    color: hsl(var(--foreground) / 0.7) !important;
                }
                .tiptap-editor blockquote p {
                    margin: 0 !important;
                }
                .tiptap-editor hr {
                    border: none !important;
                    border-top: 1px solid hsl(var(--border)) !important;
                    margin-top: 2rem !important;
                    margin-bottom: 2rem !important;
                }
                .tiptap-editor table {
                    border-collapse: collapse !important;
                    table-layout: fixed !important;
                    width: 100% !important;
                    margin-top: 1.5rem !important;
                    margin-bottom: 1.5rem !important;
                    overflow: hidden !important;
                    border: 1px solid hsl(var(--border)) !important;
                    border-radius: 0.5rem !important;
                }
                .tiptap-editor td, .tiptap-editor th {
                    border: 1px solid hsl(var(--border)) !important;
                    box-sizing: border-box !important;
                    min-width: 1em !important;
                    padding: 0.75rem 1rem !important;
                    position: relative !important;
                    vertical-align: top !important;
                }
                .tiptap-editor th {
                    background-color: hsl(var(--muted) / 0.5) !important;
                    font-weight: 600 !important;
                    text-align: left !important;
                }
                .tiptap-editor .selectedCell:after {
                    background: rgba(200, 200, 255, 0.4) !important;
                    content: "" !important;
                    left: 0 !important;
                    right: 0 !important;
                    top: 0 !important;
                    bottom: 0 !important;
                    pointer-events: none !important;
                    position: absolute !important;
                    z-index: 2 !important;
                }
                .tiptap-editor .column-resize-handle {
                    background-color: hsl(var(--primary)) !important;
                    bottom: -2px !important;
                    position: absolute !important;
                    right: -2px !important;
                    top: 0 !important;
                    width: 4px !important;
                    z-index: 20 !important;
                    pointer-events: none !important;
                }
                .tiptap-editor img.ProseMirror-selectednode {
                    outline: 3px solid hsl(var(--primary)) !important;
                    box-shadow: 0 0 15px hsl(var(--primary) / 0.3) !important;
                }
            `}</style>
        </div>
    );
}
