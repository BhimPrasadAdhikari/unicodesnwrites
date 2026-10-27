'use client';

import React, { useEffect, useState } from 'react';
import { useForm, Controller, type FieldErrors, type FieldPath, type Resolver } from 'react-hook-form';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { zodResolver } from '@hookform/resolvers/zod';
import { projectSchema, ProjectFormData } from '@/lib/utils/validations/project';
import TechStackSelector from './TechStackSelector';
import TeamMemberInput from './TeamMemberInput';
import ProjectImageUploader from './ProjectImageUploader';
import GitHubRepoInput from './GitHubRepoInput';
import { useRouter } from 'next/navigation';
import NotionLikeEditor from './NotionLikeEditor';
import { Loader2 } from 'lucide-react';

interface ProjectEditorProps {
  initialData?: Partial<ProjectFormData> & { _id: string };
  isEditing?: boolean;
}

interface GitHubStats {
  description?: string;
  language?: string;
}

const CATEGORIES = [
  'Full-Stack', 'Frontend', 'Backend', 'AI/ML', 'Mobile', 
  'DevOps', 'Data Science', 'Blockchain', 'Game Dev', 'Other'
];

export default function ProjectEditor({ initialData, isEditing = false }: ProjectEditorProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const { register, handleSubmit, control, watch, setValue, trigger, formState: { errors, isDirty } } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema) as Resolver<ProjectFormData>,
    defaultValues: {
      title: initialData?.title || '',
      slug: initialData?.slug || '',
      shortDescription: initialData?.shortDescription || '',
      longDescription: initialData?.longDescription || '',
      category: initialData?.category || 'Full-Stack',
      techStack: initialData?.techStack || [],
      thumbnailImage: initialData?.thumbnailImage || '',
      images: initialData?.images || [],
      githubUrl: initialData?.githubUrl || '',
      demoUrl: initialData?.demoUrl || '',
      status: initialData?.status || 'In Progress',
      featured: initialData?.featured || false,
      published: initialData?.published || false,
      tags: initialData?.tags || [],
      challenges: initialData?.challenges || '',
      learnings: initialData?.learnings || '',
      teamMembers: initialData?.teamMembers || [],
      startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : '',
      endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : '',
    }
  });
  useUnsavedChangesWarning(isDirty, isSubmitting);

  // Auto-set thumbnail to first image if not set
  useEffect(() => {
    const images = watch('images') || [];
    if (images.length > 0 && !watch('thumbnailImage')) {
      setValue('thumbnailImage', images[0]);
    }
  }, [setValue, watch]);

  const onSubmit = async (data: ProjectFormData) => {
    setIsSubmitting(true);
    setError('');

    try {
      const url = isEditing 
        ? `/api/projects/${encodeURIComponent(initialData?._id || '')}`
        : '/api/projects';
      
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        // Flattened Zod errors: show the first real field message rather than a generic one.
        const flattened = errData?.error;
        if (flattened && typeof flattened === 'object') {
            const [field, messages] = Object.entries((flattened.fieldErrors ?? {}) as Record<string, string[] | undefined>)
                .find(([, list]) => list?.length) ?? [];
            if (field && messages) throw new Error(`${field}: ${messages[0]}`);
            throw new Error(flattened.formErrors?.[0] || 'Validation failed. Please check the form.');
        }
        throw new Error(flattened || 'Something went wrong');
      }

      router.push('/dashboard/projects');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'The project could not be saved.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGitHubStats = (stats: GitHubStats) => {
    // We can auto-fill some fields if they are empty
    if (!watch('shortDescription') && stats.description) {
        setValue('shortDescription', stats.description.substring(0, 200));
    }
    // Could also append language to tech stack if not present
    if (stats.language && !watch('techStack')?.includes(stats.language)) {
        const currentStack = watch('techStack') || [];
        setValue('techStack', [...currentStack, stats.language]);
    }
  };

  const onInvalid = (formErrors: FieldErrors<ProjectFormData>) => {
    if (formErrors.title || formErrors.longDescription || formErrors.challenges || formErrors.learnings) {
      setCurrentStep(1);
    } else if (formErrors.category || formErrors.shortDescription || formErrors.techStack || formErrors.githubUrl || formErrors.demoUrl || formErrors.images || formErrors.thumbnailImage || formErrors.teamMembers) {
      setCurrentStep(2);
    } else {
      setCurrentStep(3);
    }
    setError('Review the highlighted fields before saving this project.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const advanceStep = async () => {
    const fields: FieldPath<ProjectFormData>[] = currentStep === 1
      ? ['title', 'longDescription']
      : ['category', 'shortDescription', 'techStack', 'githubUrl', 'demoUrl', 'images', 'teamMembers'];
    const valid = await trigger(fields);
    if (!valid) {
      setError('Complete the highlighted fields before continuing.');
      return;
    }
    setError('');
    setCurrentStep((step) => Math.min(step + 1, 3));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="w-full space-y-6">
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
            2. Project Info
          </button>
          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
              currentStep === 3
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            3. Settings
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
          {currentStep < 3 && (
            <button
              type="button"
              onClick={advanceStep}
              className="inline-flex h-11 items-center rounded-lg bg-foreground px-5 text-[15px] font-medium text-background transition hover:bg-foreground/90"
            >
              Continue
            </button>
          )}
          {currentStep === 3 && (
             <button
             type="submit"
             disabled={isSubmitting}
             className="flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-[15px] font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
           >
             {isSubmitting && <Loader2 size={16} className="animate-spin" />}
             {isEditing ? 'Update Project' : 'Publish Project'}
           </button>
          )}
        </div>
      </div>

      {/* ── STEP 1: CONTENT ── */}
      <div className={currentStep === 1 ? 'block space-y-12' : 'hidden'}>
        <div>
          <input
            {...register('title')}
            maxLength={100}
            className="mb-8 w-full border-none bg-transparent p-0 text-4xl font-serif font-medium text-foreground placeholder:text-muted-foreground/50 focus:ring-0"
            placeholder="Project Title..."
          />
          {errors.title && <p className="text-destructive text-sm mt-1">{errors.title.message}</p>}
        </div>

         <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">Long Description</h3>
            <NotionLikeEditor
              value={watch('longDescription') || ''}
              onChange={(val) => setValue('longDescription', val, { shouldDirty: true, shouldValidate: true })}
            />
            {errors.longDescription && <p className="text-destructive text-sm mt-1">{errors.longDescription.message}</p>}
         </div>

         <div className="grid md:grid-cols-2 gap-8">
             <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Challenges</h3>
                <NotionLikeEditor
                  value={watch('challenges') || ''}
                  onChange={(val) => setValue('challenges', val, { shouldDirty: true })}
                />
             </div>
             <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Learnings</h3>
                <NotionLikeEditor
                  value={watch('learnings') || ''}
                  onChange={(val) => setValue('learnings', val, { shouldDirty: true })}
                />
             </div>
         </div>
      </div>

      {/* ── STEP 2: PROJECT INFO ── */}
      <div className={currentStep === 2 ? 'block space-y-10' : 'hidden'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                <select {...register('category')} className="block w-full bg-transparent border-none focus:ring-0 p-0 text-lg">
                    {CATEGORIES.map(cat => <option key={cat} value={cat} className="bg-background">{cat}</option>)}
                </select>
                 {errors.category && <p className="text-destructive text-sm mt-1">{errors.category.message}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-foreground mb-2">Short Description (Card)</label>
                <textarea {...register('shortDescription')} rows={3} className="block w-full bg-transparent border-none focus:ring-0 p-0 text-lg resize-none" placeholder="Brief elevator pitch..." maxLength={200} />
                <p className="text-xs text-muted-foreground mt-1">{watch('shortDescription')?.length || 0}/200</p>
                 {errors.shortDescription && <p className="text-destructive text-sm mt-1">{errors.shortDescription.message}</p>}
            </div>

            <div className="pt-4">
                <label className="block text-sm font-medium text-foreground mb-4 border-b pb-2">Tech Stack</label>
                <Controller
                    name="techStack"
                    control={control}
                    render={({ field }) => (
                        <TechStackSelector 
                            selectedTech={field.value || []} 
                            onChange={field.onChange} 
                        />
                    )}
                />
                {errors.techStack && <p className="text-destructive text-sm mt-1">{errors.techStack.message}</p>}
            </div>
          </div>
          
          <div className="space-y-6">
             <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2 border-b pb-2">GitHub Repository</label>
                    <Controller 
                        name="githubUrl"
                        control={control}
                        render={({ field }) => (
                            <GitHubRepoInput 
                                value={field.value || ''} 
                                onChange={field.onChange}
                                onStatsFetched={handleGitHubStats}
                            />
                        )}
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Live Demo URL</label>
                    <input {...register('demoUrl')} type="url" className="block w-full bg-transparent border-none focus:ring-0 p-0 text-lg" placeholder="https://myproject.com" />
                    {errors.demoUrl && <p className="text-destructive text-sm mt-1">{errors.demoUrl.message}</p>}
                </div>
             </div>

             <div className="pt-4">
                <label className="block text-sm font-medium text-foreground mb-4 border-b pb-2">Media (Thumbnail & Gallery)</label>
                <Controller
                    name="images"
                    control={control}
                    render={({ field }) => (
                        <ProjectImageUploader 
                            images={field.value || []} 
                            onChange={field.onChange} 
                        />
                    )}
                />
             </div>
          </div>
        </div>

        <div className="pt-8 border-t">
           <label className="block text-sm font-medium text-foreground mb-4">Team Members</label>
           <Controller
              name="teamMembers"
              control={control}
              render={({ field }) => (
                  <TeamMemberInput 
                      members={field.value || []} 
                      onChange={field.onChange} 
                  />
              )}
           />
        </div>
      </div>

      {/* ── STEP 3: SETTINGS ── */}
      <div className={currentStep === 3 ? 'block space-y-10' : 'hidden'}>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-8">
               <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Slug</label>
                  <input {...register('slug')} className="block w-full bg-transparent border-none focus:ring-0 p-0 text-lg" placeholder="my-awesome-project" />
                  <p className="text-xs text-muted-foreground mt-1">Leave empty to auto-generate from title</p>
                  {errors.slug && <p className="text-destructive text-sm mt-1">{errors.slug.message}</p>}
               </div>
               
               <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                  <select {...register('status')} className="block w-full bg-transparent border-none focus:ring-0 p-0 text-lg">
                      <option className="bg-background" value="In Progress">In Progress</option>
                      <option className="bg-background" value="Completed">Completed</option>
                      <option className="bg-background" value="Archived">Archived</option>
                      <option className="bg-background" value="Maintained">Maintained</option>
                  </select>
               </div>

               <div className="flex gap-6">
                  <div>
                       <label className="block text-sm font-medium text-foreground mb-2">Start Date</label>
                       <input type="date" {...register('startDate')} className="block w-full bg-transparent border-none focus:ring-0 p-0" />
                  </div>
                   <div>
                       <label className="block text-sm font-medium text-foreground mb-2">End Date</label>
                       <input type="date" {...register('endDate')} className="block w-full bg-transparent border-none focus:ring-0 p-0" />
                  </div>
               </div>
            </div>

            <div className="space-y-8">
               <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Tags (Comma separated)</label>
                  <input
                    type="text"
                    onChange={(e) => {
                      const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                      setValue('tags', tags);
                    }}
                    defaultValue={initialData?.tags?.join(', ')}
                    className="block w-full bg-transparent border-none focus:ring-0 p-0 text-lg"
                    placeholder="react, tailwind, etc."
                  />
               </div>

               <div className="space-y-4 pt-4 border-t">
                  <label className="flex items-center gap-3 bg-transparent p-4 rounded-lg border cursor-pointer">
                      <input type="checkbox" {...register('featured')} className="rounded border-input text-primary focus:border-primary focus:ring-primary h-5 w-5" />
                      <div>
                        <span className="font-medium block text-foreground">Featured Project</span>
                        <span className="text-sm text-muted-foreground">Highlight this on the portfolio homepage</span>
                      </div>
                  </label>
                  
                  <label className="flex items-center gap-3 bg-transparent p-4 rounded-lg border cursor-pointer">
                      <input type="checkbox" {...register('published')} className="rounded border-input text-success focus:border-success focus:ring-success h-5 w-5" />
                      <div>
                        <span className="font-medium block text-foreground">Published</span>
                        <span className="text-sm text-muted-foreground">Make this project public</span>
                      </div>
                  </label>
               </div>
            </div>
         </div>
      </div>
    </form>
  );
}
