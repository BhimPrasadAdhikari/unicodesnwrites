'use client';

import { useForm, Resolver, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { postSchema, PostFormData } from '@/lib/utils/validations/post';
import { generateSlug } from '@/lib/utils/slug';
import { useState, useEffect } from 'react';
import ImageUploader from './ImageUploader';
import MDXPreview from './MDXPreview';
import { useRouter } from 'next/navigation';
import { useLocalDraft } from '@/hooks/useLocalDraft';
import { Image as ImageIcon, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { useRef, useCallback } from 'react';
import NotionLikeEditor from './NotionLikeEditor';
import { Alert } from '@/components/ui/Alert';

interface SeriesOption {
  _id: string;
  title: string;
  slug: string;
}

interface BlogPostEditorProps {
  postId?: string;
  initialData?: Partial<PostFormData> & { seriesId?: string; seriesPart?: number };
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  slug: 'Slug',
  content: 'Content',
  excerpt: 'Excerpt',
  coverImage: 'Cover image',
  category: 'Category',
  tags: 'Tags',
  publishedAt: 'Publish date',
  seoTitle: 'SEO title',
  seoDescription: 'SEO description',
  seoKeywords: 'SEO keywords',
  seriesId: 'Series',
  seriesPart: 'Series part',
};

function CharacterCount({ value, max }: { value?: string; max: number }) {
  const length = value?.trim().length || 0;
  return (
    <p className={`mt-1 text-right text-xs ${length > max ? 'font-semibold text-destructive' : 'text-muted-foreground'}`} aria-live="polite">
      {length}/{max}
    </p>
  );
}

export default function BlogPostEditor({ postId, initialData }: BlogPostEditorProps) {
  const router = useRouter();
  const [showPreview, setShowPreview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [seriesList, setSeriesList] = useState<SeriesOption[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>(initialData?.seriesId ?? '');
  const [seriesPart, setSeriesPartState] = useState<number | ''>(initialData?.seriesPart ?? '');
  const [creatingNewSeries, setCreatingNewSeries] = useState(false);
  const [newSeriesTitle, setNewSeriesTitle] = useState('');
  const [newSeriesSlug, setNewSeriesSlug] = useState('');
  const [newSeriesDesc, setNewSeriesDesc] = useState('');
  const [newSeriesCoverImage, setNewSeriesCoverImage] = useState('');
  const [newSeriesLoading, setNewSeriesLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    reset: resetForm,
    formState: { errors, isDirty },
  } = useForm<PostFormData>({
    resolver: zodResolver(postSchema) as Resolver<PostFormData>,
    defaultValues: {
      title: initialData?.title || '',
      slug: initialData?.slug || '',
      content: initialData?.content || '',
      excerpt: initialData?.excerpt || '',
      coverImage: initialData?.coverImage || '',
      category: initialData?.category || '',
      tags: initialData?.tags || [],
      published: initialData?.published || false,
      seoTitle: initialData?.seoTitle || '',
      seoDescription: initialData?.seoDescription || '',
      // Must be seeded, otherwise every save would overwrite stored keywords with [].
      seoKeywords: initialData?.seoKeywords || [],
      publishedAt: initialData?.publishedAt || '',
      seriesId: initialData?.seriesId || '',
      seriesPart: initialData?.seriesPart,
    },
  });

  // Create a minimal form object for the hook
  const formMethods = {
    watch,
    reset: (values: any) => {
      if (!values) return;
      Object.entries(values).forEach(([key, value]) => {
        setValue(key as any, value);
      });
    },
    getValues: () => ({}) // Not used by hook for restoration, only mostly for saving which uses watch
  };

  const { clearDraft } = useLocalDraft(
    `blog-post-draft-${postId || 'new'}`,
    formMethods as any
  );

  const title = watch('title');
  const published = watch('published');
  const publishedAt = watch('publishedAt');
  const publishedAtLocal = (() => {
    if (!publishedAt) return '';
    const parsed = new Date(publishedAt);
    if (Number.isNaN(parsed.getTime())) return '';
    return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  })();
  const isScheduled = Boolean(published && publishedAt && new Date(publishedAt).getTime() > Date.now());
  const content = watch('content');
  const coverImage = watch('coverImage');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch published series for the dropdown
  useEffect(() => {
    fetch('/api/series')
      .then((r) => r.json())
      .then((data) => setSeriesList(data.series ?? []))
      .catch(() => setFeedback('Series list could not be loaded; series assignment is unavailable until you reload.'));
  }, []);

  // Auto-generate new series slug from title
  useEffect(() => {
    if (newSeriesTitle) {
      setNewSeriesSlug(generateSlug(newSeriesTitle));
    }
  }, [newSeriesTitle]);

  const handleCreateSeries = async () => {
    const title = newSeriesTitle.trim();
    const slug = generateSlug(newSeriesSlug);
    if (title.length < 2 || title.length > 120 || !slug) {
      setFeedback('Enter a series title between 2 and 120 characters.');
      return;
    }
    setFeedback('');
    setNewSeriesLoading(true);
    try {
      const res = await fetch('/api/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          description: newSeriesDesc.trim().slice(0, 10000),
          coverImage: newSeriesCoverImage.trim(),
          published: true,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to create series.');
      }
      const created = await res.json();
      setSeriesList((prev) => [...prev, created]);
      setSelectedSeriesId(created._id);
      setCreatingNewSeries(false);
      setNewSeriesTitle('');
      setNewSeriesSlug('');
      setNewSeriesDesc('');
      setNewSeriesCoverImage('');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Failed to create series.');
    } finally {
      setNewSeriesLoading(false);
    }
  };

  /**
   * Shared image-paste handler — extracts image files from a ClipboardEvent
   * and uploads them, then inserts the resulting markdown image at the cursor.
   */
  const handleImagePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (!file) continue;
          if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
            setFeedback('Pasted images must be valid image files no larger than 5 MB.');
            continue;
          }
          try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch('/api/upload/image', {
              method: 'POST',
              body: formData,
            });
            if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'Upload failed');
            const data = await response.json();
            handleInsertImage(data.url);
          } catch (error) {
            console.error('Paste upload error:', error);
            setFeedback(error instanceof Error ? error.message : 'Failed to upload pasted image.');
          }
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleInsertImage = (url: string) => {
    const textArea = textAreaRef.current;
    if (!textArea) return;

    const start = textArea.selectionStart;
    const end = textArea.selectionEnd;
    const text = textArea.value;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const imageMarkdown = `\n![Image description](${url})\n`;

    const newText = before + imageMarkdown + after;
    setValue('content', newText, { shouldDirty: true, shouldValidate: true });
    
    setTimeout(() => {
      textArea.focus();
      const newCursorPos = start + imageMarkdown.length;
      textArea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleContentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFeedback('');
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      setFeedback('Choose an image no larger than 5 MB.');
      e.target.value = '';
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Use the existing image upload endpoint
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'Upload failed');

      const data = await response.json();
      handleInsertImage(data.url);
    } catch (error) {
      console.error('Upload error:', error);
      setFeedback(error instanceof Error ? error.message : 'Failed to upload image.');
    } finally {
      e.target.value = '';
    }
  };

  // Auto-generate slug from title
  useEffect(() => {
    if (title && !postId && !initialData?.slug) {
      const slug = generateSlug(title);
      setValue('slug', slug);
    }
  }, [title, postId, initialData, setValue]);

  // Warn before closing the tab with unsaved edits (a local draft is also kept).
  useEffect(() => {
    if (!isDirty || saving) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty, saving]);

  const onSubmit = async (data: PostFormData) => {
    setSaving(true);
    setFeedback('');
    setSavedMessage('');
    try {
      const url = postId ? `/api/posts/${encodeURIComponent(postId)}` : '/api/posts';
      const method = postId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          seriesId: selectedSeriesId || '',
          seriesPart: seriesPart !== '' ? Number(seriesPart) : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save post');
      }

      clearDraft(); // Clear draft on successful save
      const saved = await response.json().catch(() => null);
      if (!postId && saved?._id) {
        // Keep the author in the editor for the post they just created.
        router.replace(`/dashboard/posts/${saved._id}/edit`);
        return;
      }
      resetForm(data); // the saved values become the new clean baseline
      setSavedMessage(`Saved ${new Date().toLocaleTimeString()}.`);
      router.refresh();
    } catch (error: unknown) {
      console.error('Save error:', error);
      setFeedback(error instanceof Error ? error.message : 'Failed to save post.');
    } finally {
      setSaving(false);
    }
  };

  const onInvalid = (formErrors: FieldErrors<PostFormData>) => {
    setCurrentStep(formErrors.title || formErrors.content ? 1 : 2);
    // Name each problem: some fields (SEO, series) sit on another step, so a
    // generic "highlighted fields" message can point at nothing on screen.
    const problems = Object.entries(formErrors)
      .map(([field, error]) => `${FIELD_LABELS[field] || field}: ${(error as { message?: string })?.message || 'invalid value'}`);
    setFeedback(`Fix before saving: ${problems.join('; ')}.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToSettings = async () => {
    const valid = await trigger(['title', 'content']);
    if (!valid) {
      setFeedback('Complete the highlighted content fields before continuing.');
      return;
    }
    setFeedback('');
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="w-full space-y-6">
      {savedMessage && !feedback && <Alert variant="success">{savedMessage}</Alert>}
      {feedback && <Alert variant="destructive">{feedback}</Alert>}
      {/* ── STEPS NAVIGATION (Sticky) ── */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b bg-background/95 py-4 mb-6">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
              currentStep === 1
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            1. Write Content
          </button>
          <button
            type="button"
            onClick={goToSettings}
            className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
              currentStep === 2
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            2. Publish Settings
          </button>
        </div>
        <div className="flex items-center gap-3">
          {currentStep === 1 && (
            <button
              type="button"
              onClick={goToSettings}
              className="inline-flex h-11 items-center rounded-lg bg-foreground px-5 text-[15px] font-medium text-background transition hover:bg-foreground/90"
            >
              Continue to Settings
            </button>
          )}
          {currentStep === 2 && (
             <button
             type="submit"
             disabled={saving}
             className="flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-[15px] font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
           >
             {saving && <Loader2 size={16} className="animate-spin" />}
             {postId ? 'Update Post' : 'Publish Post'}
           </button>
          )}
        </div>
      </div>

      {/* ── STEP 1: WRITING ── */}
      <div className={currentStep === 1 ? 'block space-y-8' : 'hidden'}>
        {/* Title (Big & Borderless) */}
        <div>
          <input
            {...register('title')}
            className="w-full text-4xl font-serif font-medium bg-transparent border-none focus:ring-0 placeholder:text-muted-foreground/50 p-0"
            placeholder="Post Title..."
          />
          {errors.title && (
            <p className="text-destructive text-sm mt-1">{errors.title.message}</p>
          )}
        </div>

        {/* Content Editor */}
        <div className="mt-4">
          <NotionLikeEditor
            value={content || ''}
            onChange={(md) => setValue('content', md, { shouldDirty: true, shouldValidate: true })}
          />
          <input type="hidden" {...register('content')} />
          {errors.content && (
            <p className="text-destructive text-sm mt-1">{errors.content.message}</p>
          )}
        </div>

        {/* Bottom Spacing */}
        <div className="pb-20" />

        {/* Floating Bottom Action Bar (Mobile & Long Desktop) */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 rounded-xl bg-card border border-border shadow-overlay animate-in fade-in slide-in-from-bottom-4 duration-500">
           <p className="text-sm font-medium text-muted-foreground border-r pr-4 hidden md:block">
             Step 1: Content
           </p>
           <button
             type="button"
             onClick={goToSettings}
             className="inline-flex h-11 items-center rounded-lg bg-foreground px-5 text-[15px] font-medium text-background transition hover:bg-foreground/90"
           >
             Continue to Settings
           </button>
        </div>
      </div>

      {/* ── STEP 2: PUBLISH SETTINGS ── */}
      <div className={currentStep === 2 ? 'block space-y-6' : 'hidden'}>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            {/* Slug */}
            <div>
              <label className="block text-sm font-medium mb-2">Slug *</label>
              <input
                {...register('slug')}
                className="w-full px-4 py-2 bg-transparent border-none focus:ring-0"
                placeholder="post-url-slug"
              />
              {errors.slug && (
                <p className="text-destructive text-sm mt-1">{errors.slug.message}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                URL: /blog/{watch('slug') || 'your-slug'}
              </p>
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-sm font-medium mb-2">Excerpt *</label>
              <textarea
                {...register('excerpt')}
                aria-invalid={Boolean(errors.excerpt)}
                rows={4}
                className="w-full px-4 py-2 bg-transparent border-none focus:ring-0"
                placeholder="Brief description for listing pages"
              />
              <CharacterCount value={watch('excerpt')} max={300} />
              {errors.excerpt && (
                <p className="text-destructive text-sm mt-1">{errors.excerpt.message}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-2">Category *</label>
              <select
                {...register('category')}
                className="w-full px-4 py-2 bg-transparent border-none focus:ring-0"
              >
                <option value="">Select category</option>
                <option value="AI & Machine Learning">AI & Machine Learning</option>
                <option value="Full-Stack Development">Full-Stack Development</option>
                <option value="Tutorials">Tutorials</option>
                <option value="Career & Growth">Career & Growth</option>
                <option value="Tools & Resources">Tools & Resources</option>
              </select>
              {errors.category && (
                <p className="text-destructive text-sm mt-1">{errors.category.message}</p>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
              <input
                type="text"
                onChange={(e) => {
                  const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                  setValue('tags', tags);
                }}
                defaultValue={initialData?.tags?.join(', ')}
                className="w-full px-4 py-2 bg-transparent border-none focus:ring-0"
                placeholder="nextjs, typescript, react"
              />
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Cover Image */}
            <div>
              <label className="block text-sm font-medium mb-2">Cover Image</label>
              <ImageUploader
                value={coverImage}
                onChange={(url) => setValue('coverImage', url)}
              />
            </div>

            {/* Series Section */}
            <div className="pt-4 border-t">
              <h3 className="text-lg font-semibold mb-1">Series</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Group this post into a multi-part series. It will appear as a single card on the blog listing.
              </p>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Select Series</label>
                    <select
                      value={selectedSeriesId}
                      onChange={(e) => setSelectedSeriesId(e.target.value)}
                      className="w-full px-4 py-2 bg-transparent border-none focus:ring-0"
                    >
                      <option value="">None</option>
                      {seriesList.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Part Number</label>
                    <input
                      type="number"
                      min={1}
                      value={seriesPart}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setSeriesPartState(e.target.value ? Number(e.target.value.replace(/^0+(?=\d)/, '')) : '')}
                      placeholder="e.g. 1"
                      className="w-full px-4 py-2 bg-transparent border-none focus:ring-0"
                    />
                  </div>
                </div>

                {!creatingNewSeries ? (
                  <button
                    type="button"
                    onClick={() => setCreatingNewSeries(true)}
                          className="text-sm text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
                  >
                    + Create new series
                  </button>
                ) : (
                  <div className="p-4 bg-transparent rounded-lg space-y-4 border">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-sm">New Series</h4>
                      <button
                        type="button"
                        onClick={() => setCreatingNewSeries(false)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Title</label>
                      <input
                        className="w-full px-3 py-1.5 bg-transparent border-none focus:ring-0 text-sm"
                        value={newSeriesTitle}
                        onChange={(e) => setNewSeriesTitle(e.target.value)}
                        placeholder="e.g. Mastering Next.js 14"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Slug</label>
                      <input
                        className="w-full px-3 py-1.5 bg-transparent border-none focus:ring-0 text-sm"
                        value={newSeriesSlug}
                        onChange={(e) => setNewSeriesSlug(e.target.value)}
                        placeholder="mastering-nextjs-14"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Description</label>
                      <textarea
                        className="w-full px-3 py-1.5 bg-transparent border-none focus:ring-0 text-sm"
                        rows={2}
                        value={newSeriesDesc}
                        onChange={(e) => setNewSeriesDesc(e.target.value)}
                        placeholder="Brief overview of the series..."
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateSeries}
                      disabled={newSeriesLoading || !newSeriesTitle}
                      className="px-3 py-1.5 bg-foreground text-background rounded text-sm disabled:opacity-50"
                    >
                      {newSeriesLoading ? 'Creating...' : 'Create & Select'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Visibility / SEO */}
        <div className="pt-6 border-t mt-6 grid md:grid-cols-2 gap-8">
           <div className="space-y-6">
              <h3 className="text-lg font-semibold border-b pb-2">Visibility & Status</h3>
              <label className="flex items-center gap-3 bg-transparent p-4 rounded-lg border">
                <input
                  type="checkbox"
                  {...register('published')}
                    className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
                />
                <div>
                  <span className="font-medium block">Publish this post</span>
                  <span className="text-sm text-muted-foreground">Uncheck to save as a draft</span>
                </div>
              </label>
              <div>
                <label htmlFor="publishedAt" className="block text-sm font-medium mb-2">Publish date</label>
                <input
                  id="publishedAt"
                  type="datetime-local"
                  value={publishedAtLocal}
                  onChange={(e) => {
                    const parsed = e.target.value ? new Date(e.target.value) : null;
                    setValue('publishedAt', parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : '');
                  }}
                  className="w-full px-4 py-2 bg-transparent border rounded-lg"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {isScheduled
                    ? `Scheduled: goes live on ${new Date(publishedAt!).toLocaleString()}.`
                    : 'Leave empty to publish immediately. A future date schedules the post.'}
                </p>
              </div>
           </div>
           
           <div className="space-y-6">
              <h3 className="text-lg font-semibold border-b pb-2">SEO Meta (Optional)</h3>
              <div>
                <label className="block text-sm font-medium mb-2">SEO Title</label>
                <input
                  {...register('seoTitle')}
                  aria-invalid={Boolean(errors.seoTitle)}
                  className={`w-full px-4 py-2 bg-transparent focus:ring-0 ${errors.seoTitle ? 'rounded-lg border border-destructive' : 'border-none'}`}
                />
                <CharacterCount value={watch('seoTitle')} max={60} />
                {errors.seoTitle && <p className="text-destructive text-sm mt-1">{errors.seoTitle.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">SEO Keywords (comma-separated)</label>
                <input
                  type="text"
                  onChange={(e) => {
                    const keywords = e.target.value.split(',').map(k => k.trim()).filter(Boolean);
                    setValue('seoKeywords', keywords);
                  }}
                  defaultValue={initialData?.seoKeywords?.join(', ')}
                  className="w-full px-4 py-2 bg-transparent border-none focus:ring-0"
                  placeholder="machine learning, transformers"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">SEO Description</label>
                <textarea
                  {...register('seoDescription')}
                  rows={2}
                  aria-invalid={Boolean(errors.seoDescription)}
                  className={`w-full px-4 py-2 bg-transparent focus:ring-0 ${errors.seoDescription ? 'rounded-lg border border-destructive' : 'border-none'}`}
                />
                <CharacterCount value={watch('seoDescription')} max={160} />
                {errors.seoDescription && <p className="text-destructive text-sm mt-1">{errors.seoDescription.message}</p>}
              </div>
           </div>
        </div>
      </div>
    </form>
  );
}
