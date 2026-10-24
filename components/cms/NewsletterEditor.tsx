'use client';

import { useEditor, EditorContent, TiptapBubbleMenu as BubbleMenu, TiptapFloatingMenu as FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { 
    Bold, Italic, List, ListOrdered, Quote, Undo, Redo, 
    Link as LinkIcon, Image as ImageIcon, Code, Heading2, Heading3 
} from 'lucide-react';
import { useEffect, useState, type ComponentType } from 'react';
import { Alert } from '@/components/ui/Alert';

interface NewsletterEditorProps {
    value: string;
    onChange: (html: string) => void;
}

export default function NewsletterEditor({ value, onChange }: NewsletterEditorProps) {
    const [feedback, setFeedback] = useState('');
    const BubbleMenuView = BubbleMenu as ComponentType<any>;
    const FloatingMenuView = FloatingMenu as ComponentType<any>;

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'underline decoration-primary underline-offset-2',
                },
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'max-w-full rounded-lg my-4',
                },
            }),
        ],
        content: value,
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[500px] py-4 text-base font-sans whitespace-pre-wrap prose-a:text-foreground prose-a:decoration-primary',
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    // Update content if value changes externally (e.g. from database load)
    useEffect(() => {
        if (editor && value && editor.getHTML() !== value) {
             if (editor.getText() === '') {
                 editor.commands.setContent(value);
             }
        }
    }, [editor, value]);

    if (!editor) {
        return null;
    }

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
            const parsed = new URL(url);
            if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
                setFeedback('Links must use http, https, or mailto.');
                return;
            }
        } catch {
            setFeedback('Enter a complete, valid link.');
            return;
        }

        setFeedback('');
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    const addImage = () => {
        const url = window.prompt('Image URL');

        if (!url) return;
        try {
            const parsed = new URL(url);
            if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
            setFeedback('');
            editor.chain().focus().setImage({ src: parsed.toString() }).run();
        } catch {
            setFeedback('Images must use a complete http or https URL.');
        }
    };

    return (
        <div className="relative w-full overflow-hidden rounded-xl border border-border bg-card">
            {feedback && <Alert variant="destructive" className="rounded-none border-x-0 border-t-0 py-2">{feedback}</Alert>}
            {/* Editor Ribbon Header */}
            {editor && (
                <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/80 p-2">
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={`touch-target-coarse p-1.5 rounded-md hover:bg-muted transition-colors ${editor.isActive('bold') ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
                        title="Bold"
                    >
                        <Bold className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={`touch-target-coarse p-1.5 rounded-md hover:bg-muted transition-colors ${editor.isActive('italic') ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
                        title="Italic"
                    >
                        <Italic className="w-4 h-4" />
                    </button>
                    <div className="w-px h-5 bg-border mx-1" />
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={`touch-target-coarse p-1.5 rounded-md hover:bg-muted transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
                        title="Heading 2"
                    >
                        <Heading2 className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        className={`touch-target-coarse p-1.5 rounded-md hover:bg-muted transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
                        title="Heading 3"
                    >
                        <Heading3 className="w-4 h-4" />
                    </button>
                    <div className="w-px h-5 bg-border mx-1" />
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={`touch-target-coarse p-1.5 rounded-md hover:bg-muted transition-colors ${editor.isActive('bulletList') ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
                        title="Bullet List"
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        className={`touch-target-coarse p-1.5 rounded-md hover:bg-muted transition-colors ${editor.isActive('orderedList') ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
                        title="Numbered List"
                    >
                        <ListOrdered className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        className={`touch-target-coarse p-1.5 rounded-md hover:bg-muted transition-colors ${editor.isActive('blockquote') ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
                        title="Quote"
                    >
                        <Quote className="w-4 h-4" />
                    </button>
                    <div className="w-px h-5 bg-border mx-1" />
                    <button
                        type="button"
                        onClick={setLink}
                        className={`touch-target-coarse p-1.5 rounded-md hover:bg-muted transition-colors ${editor.isActive('link') ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
                        title="Link"
                    >
                        <LinkIcon className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={addImage}
                        className="touch-target-coarse p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                        title="Image"
                    >
                        <ImageIcon className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleCode().run()}
                        className={`touch-target-coarse p-1.5 rounded-md hover:bg-muted transition-colors ${editor.isActive('code') ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
                        title="Code"
                    >
                        <Code className="w-4 h-4" />
                    </button>
                    <div className="w-px h-5 bg-border mx-1" />
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().chain().focus().undo().run()}
                        className="touch-target-coarse p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground disabled:opacity-50"
                        title="Undo"
                    >
                        <Undo className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().chain().focus().redo().run()}
                        className="touch-target-coarse p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground disabled:opacity-50"
                        title="Redo"
                    >
                        <Redo className="w-4 h-4" />
                    </button>
                </div>
            )}

            {editor && (
                <BubbleMenuView editor={editor} tippyOptions={{ duration: 100 }} className="flex overflow-hidden rounded-md border border-border bg-popover shadow-overlay divide-x">
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={`p-2 hover:bg-muted transition-colors ${editor.isActive('bold') ? 'bg-secondary text-foreground' : 'text-foreground'}`}
                        title="Bold"
                    >
                        <Bold className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={`p-2 hover:bg-muted transition-colors ${editor.isActive('italic') ? 'bg-secondary text-foreground' : 'text-foreground'}`}
                        title="Italic"
                    >
                        <Italic className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={setLink}
                        className={`p-2 hover:bg-muted transition-colors ${editor.isActive('link') ? 'bg-secondary text-foreground' : 'text-foreground'}`}
                        title="Link"
                    >
                        <LinkIcon className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleCode().run()}
                        className={`p-2 hover:bg-muted transition-colors ${editor.isActive('code') ? 'bg-secondary text-foreground' : 'text-foreground'}`}
                        title="Code"
                    >
                        <Code className="w-4 h-4" />
                    </button>
                </BubbleMenuView>
            )}

            {editor && (
                <FloatingMenuView editor={editor} tippyOptions={{ duration: 100 }} className="flex items-center gap-1 rounded-md border border-border bg-popover shadow-overlay p-1">
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className="touch-target-coarse p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="Heading 2"
                    >
                        <Heading2 className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        className="touch-target-coarse p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="Heading 3"
                    >
                        <Heading3 className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className="touch-target-coarse p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="Bullet List"
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        className="touch-target-coarse p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="Quote"
                    >
                        <Quote className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={addImage}
                        className="touch-target-coarse p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="Image"
                    >
                        <ImageIcon className="w-4 h-4" />
                    </button>
                </FloatingMenuView>
            )}

            <div className="px-4 pb-4 px-8 min-h-[500px]">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
