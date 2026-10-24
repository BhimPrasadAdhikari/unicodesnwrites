'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader from './ImageUploader';
import { Loader2 } from 'lucide-react';
import { generateSlug } from '@/lib/utils/slug';
import NotionLikeEditor from './NotionLikeEditor';

interface SeriesFormData {
  title: string;
  slug: string;
  description: string;
  coverImage: string;
  published: boolean;
}

interface SeriesEditorProps {
  initialData?: Partial<SeriesFormData> & { _id?: string };
}

export default function SeriesEditor({ initialData }: SeriesEditorProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const isEditing = Boolean(initialData?._id);
  const [formData, setFormData] = useState<SeriesFormData>({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    coverImage: initialData?.coverImage || '',
    published: initialData?.published ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: keyof SeriesFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData((prev) => ({
      ...prev,
      title,
      // Auto-generate slug if title changes and user hasn't explicitly set a custom one
      slug: isEditing ? prev.slug : generateSlug(title),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalized = {
      ...formData,
      title: formData.title.trim(),
      slug: generateSlug(formData.slug),
      description: formData.description.trim(),
      coverImage: formData.coverImage.trim(),
    };
    if (normalized.title.length < 2 || normalized.title.length > 120) {
      setError('Series title must be between 2 and 120 characters.');
      return;
    }
    if (!normalized.slug) {
      setError('Please provide a valid URL slug.');
      return;
    }
    if (normalized.description.length > 10000) {
      setError('The description must be 10,000 characters or fewer.');
      return;
    }

    setSaving(true);

    try {
      const endpoint = isEditing && initialData?.slug
        ? `/api/series/${encodeURIComponent(initialData.slug)}`
        : '/api/series';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(normalized),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'create'} series`);
      }

      router.push('/dashboard/series');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      {error && (
        <div role="alert" className="bg-destructive/10 border-l-4 border-destructive p-4 mb-4">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {/* ── STEPS NAVIGATION ── */}
      <div className="flex items-center justify-between border-b pb-4 mb-6">
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
            onClick={() => setCurrentStep(2)}
            className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
              currentStep === 2
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            2. Settings
          </button>
        </div>
        <div className="flex items-center gap-3">
          {currentStep > 1 && (
             <button
              type="button"
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
             >
              Back
             </button>
          )}
          {currentStep < 2 && (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="inline-flex h-11 items-center rounded-lg bg-foreground px-5 text-[15px] font-medium text-background transition hover:bg-foreground/90"
            >
              Continue
            </button>
          )}
          {currentStep === 2 && (
             <button
             type="submit"
             disabled={saving}
             className="flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-[15px] font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
           >
             {saving && <Loader2 size={16} className="animate-spin" />}
             {isEditing ? 'Save Changes' : 'Create Series'}
           </button>
          )}
        </div>
      </div>

      {/* ── STEP 1: CONTENT ── */}
      <div className={currentStep === 1 ? 'block space-y-12' : 'hidden'}>
        <div>
          <input
            type="text"
            value={formData.title}
            onChange={handleTitleChange}
            required
            maxLength={120}
            className="w-full text-4xl font-serif font-medium bg-transparent border-none focus:ring-0 placeholder:text-muted-foreground/50 p-0 mb-8"
            placeholder="Series Title..."
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground border-b pb-2">Description</h3>
          <NotionLikeEditor
            value={formData.description}
            onChange={(val) => handleChange('description', val)}
          />
        </div>
      </div>

      {/* ── STEP 2: SETTINGS ── */}
      <div className={currentStep === 2 ? 'block space-y-10' : 'hidden'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-8">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => handleChange('slug', e.target.value)}
                required
                maxLength={120}
                className="block w-full bg-transparent border-none focus:ring-0 p-0 text-lg"
              />
            </div>

            <div className="pt-4 border-t">
               <label className="flex items-center gap-3 bg-transparent p-4 rounded-lg border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.published}
                    onChange={(e) => handleChange('published', e.target.checked)}
                    className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="font-medium block text-foreground">Published</span>
                    <span className="text-sm text-muted-foreground">Make this series visible</span>
                  </div>
               </label>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <label className="block text-sm font-medium text-foreground mb-4">Cover Image</label>
              <ImageUploader
                value={formData.coverImage}
                onChange={(url) => handleChange('coverImage', url)}
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
