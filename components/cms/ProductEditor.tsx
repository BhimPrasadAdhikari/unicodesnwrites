'use client';

import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils/currency';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, type FieldErrors, type FieldPath } from 'react-hook-form';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema } from '@/lib/utils/validation';
import { z } from 'zod';
import { Loader2, Trash2, Upload, Save, X } from 'lucide-react';
import { useLocalDraft } from '@/hooks/useLocalDraft';
import NotionLikeEditor from './NotionLikeEditor';
import { Alert } from '@/components/ui/Alert';

type ProductFormData = z.infer<typeof productSchema>;

interface ProductEditorProps {
  initialData?: ProductFormData & { _id: string };
  isEditing?: boolean;
}

export default function ProductEditor({ initialData, isEditing = false }: ProductEditorProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [feedback, setFeedback] = useState('');

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors, isDirty },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: initialData || {
      title: '',
      slug: '',
      shortDescription: '',
      longDescription: '',
      price: 0,
      currency: 'INR',
      productType: 'E-book',
      category: 'Web Development',
      tags: [],
      thumbnailImage: '',
      galleryImages: [],
      fileUrl: '',
      fileName: '',
      fileSize: 0,
      fileSizeDisplay: '0 MB',
      previewFiles: [],
      whatsIncluded: [''],
      requirements: '',
      version: '1.0', 
      licenseType: 'Personal',
      published: false,
      featured: false,
    },
  });
  useUnsavedChangesWarning(isDirty, loading);

  // Create a minimal form object for the hook
  const formMethods = {
    watch,
    reset: (values: any) => {
      if (!values) return;
      Object.entries(values).forEach(([key, value]) => {
        setValue(key as any, value);
      });
    },
    getValues: () => ({})
  };

  const { clearDraft } = useLocalDraft(
    `product-draft-${initialData?._id || 'new'}`,
    formMethods as any
  );

  const { fields: includedFields, append: appendIncluded, remove: removeIncluded } = useFieldArray({
    control,
    name: 'whatsIncluded' as any, // Type cast for array of strings issue in hook form
  });

  // Watch title to auto-generate slug
  const title = watch('title');
  useEffect(() => {
    if (!isEditing && title) {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setValue('slug', slug);
    }
  }, [title, isEditing, setValue]);

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true);
    setFeedback('');
    try {
      const url = isEditing && initialData
        ? `/api/products/${encodeURIComponent(initialData._id)}`
        : '/api/products';
      
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to save product');
      }

      clearDraft();
      router.push('/dashboard/products');
      router.refresh();
    } catch (error) {
      console.error(error);
      setFeedback(error instanceof Error ? error.message : 'Failed to save product.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFeedback('');
    if (file.size > 100 * 1024 * 1024) {
      setFeedback('Product files must be 100 MB or smaller.');
      e.target.value = '';
      return;
    }

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload/product-file', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'File upload failed.');
      }

      const data = await res.json();
      setValue('fileUrl', data.url); // Note: server returns url, storageKey in real impl
      setValue('fileName', data.fileName);
      setValue('fileSize', data.fileSize);
      setValue('fileSizeDisplay', (data.fileSize / (1024 * 1024)).toFixed(2) + ' MB');
    } catch (error) {
      console.error(error);
      setFeedback(error instanceof Error ? error.message : 'File upload failed.');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith('image/')) throw new Error('Choose a valid image file.');
    if (file.size > 5 * 1024 * 1024) throw new Error('Images must be 5 MB or smaller.');
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload/product-image', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error?.error || 'Image upload failed');
    }

    const data = await res.json();
    return data.url as string;
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFeedback('');
    setUploadingThumbnail(true);
    try {
      const url = await uploadImage(file);
      setValue('thumbnailImage', url);
    } catch (error) {
      console.error(error);
      setFeedback(error instanceof Error ? error.message : 'Thumbnail upload failed.');
    } finally {
      setUploadingThumbnail(false);
      e.target.value = '';
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setFeedback('');
    setUploadingGallery(true);
    try {
      const uploaded = await Promise.all(files.map(uploadImage));
      const existing = watch('galleryImages') || [];
      setValue('galleryImages', [...existing, ...uploaded]);
    } catch (error) {
      console.error(error);
      setFeedback(error instanceof Error ? error.message : 'Gallery upload failed.');
    } finally {
      setUploadingGallery(false);
      e.target.value = '';
    }
  };

  const handleRemoveGalleryImage = (urlToRemove: string) => {
    const existing = watch('galleryImages') || [];
    setValue(
      'galleryImages',
      existing.filter((url: string) => url !== urlToRemove)
    );
  };

  const onInvalid = (formErrors: FieldErrors<ProductFormData>) => {
    if (formErrors.title || formErrors.longDescription || formErrors.whatsIncluded || formErrors.requirements) {
      setCurrentStep(1);
    } else if (formErrors.shortDescription || formErrors.productType || formErrors.category || formErrors.price || formErrors.currency || formErrors.licenseType || formErrors.slug) {
      setCurrentStep(2);
    } else {
      setCurrentStep(3);
    }
    setFeedback('Review the highlighted fields before saving this product.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const advanceStep = async () => {
    const fields: FieldPath<ProductFormData>[] = currentStep === 1
      ? ['title', 'longDescription']
      : ['shortDescription', 'productType', 'category', 'price', 'currency', 'licenseType', 'slug'];
    const valid = await trigger(fields);
    if (!valid) {
      setFeedback('Complete the highlighted fields before continuing.');
      return;
    }
    setFeedback('');
    setCurrentStep((step) => Math.min(step + 1, 3));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="w-full space-y-6">
      {feedback && <Alert variant="destructive">{feedback}</Alert>}
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
            2. Product Info
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
            3. Uploads
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
             disabled={loading}
             className="flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-[15px] font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
           >
             {loading && <Loader2 size={16} className="animate-spin" />}
             {isEditing ? 'Update Product' : 'Publish Product'}
           </button>
          )}
        </div>
      </div>

      {/* ── STEP 1: CONTENT ── */}
      <div className={currentStep === 1 ? 'block space-y-12' : 'hidden'}>
        <div>
          <input
            {...register('title')}
            className="w-full text-4xl font-serif font-medium bg-transparent border-none focus:ring-0 placeholder:text-muted-foreground/50 p-0 mb-8"
            placeholder="Product Title..."
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
        
        <div>
          <div className="flex justify-between items-center mb-2 border-b pb-2">
             <label className="block text-lg font-semibold text-foreground">What&apos;s Included</label>
             <button
              type="button"
              onClick={() => appendIncluded('')}
              className="text-sm text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
             >
               + Add Item
             </button>
          </div>
          <div className="space-y-3 mt-4">
            {includedFields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                 <input
                  {...register(`whatsIncluded.${index}`)}
                  className="w-full bg-transparent border-none focus:ring-0 text-lg p-0"
                  placeholder="e.g. 5x Figma templates"
                 />
                 <button
                  type="button"
                  onClick={() => removeIncluded(index)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                 >
                   <Trash2 size={18} />
                 </button>
              </div>
            ))}
          </div>
       </div>
      </div>

      {/* ── STEP 2: PRODUCT INFO ── */}
      <div className={currentStep === 2 ? 'block space-y-10' : 'hidden'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-8">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Short Description</label>
              <textarea
                {...register('shortDescription')}
                className="w-full bg-transparent border-none focus:ring-0 p-0 text-lg resize-none"
                placeholder="Brief elevator pitch..."
                rows={3}
              />
              {errors.shortDescription && <p className="text-destructive text-sm mt-1">{errors.shortDescription.message}</p>}
            </div>

             <div>
              <label className="block text-sm font-medium text-foreground mb-2">Product Type</label>
              <select
                {...register('productType')}
                className="w-full bg-transparent border-none focus:ring-0 p-0 text-lg"
              >
                <option className="bg-background" value="E-book">E-book</option>
                <option className="bg-background" value="Course">Course</option>
                <option className="bg-background" value="Template">Template</option>
                <option className="bg-background" value="Code">Code Package</option>
                <option className="bg-background" value="Assets">Asset Pack</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Category</label>
              <input
                {...register('category')}
                 className="w-full bg-transparent border-none focus:ring-0 p-0 text-lg"
                 placeholder="e.g. Web Development"
              />
               {errors.category && <p className="text-destructive text-sm mt-1">{errors.category.message}</p>}
            </div>
          </div>

          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-6">
               <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Price (paise, ₹1 = 100)</label>
                  <input
                    type="number"
                    {...register('price', { valueAsNumber: true })}
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-lg"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Value: {formatCurrency(watch('price') || 0)}{watch('price') === 0 ? ' (free, not sold through checkout)' : ''}
                  </p>
                  {errors.price && <p className="text-destructive text-sm mt-1">{errors.price.message}</p>}
               </div>
               <div>
                  <label className="block text-sm font-medium text-foreground mb-2">License</label>
                   <select
                    {...register('licenseType')}
                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-lg"
                  >
                    <option className="bg-background" value="Personal">Personal</option>
                    <option className="bg-background" value="Commercial">Commercial</option>
                    <option className="bg-background" value="Extended">Extended</option>
                  </select>
               </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Slug</label>
              <input
                {...register('slug')}
                className="w-full bg-transparent border-none focus:ring-0 p-0 text-lg"
              />
              <p className="text-xs text-muted-foreground mt-1">Leave empty to auto-generate from title</p>
              {errors.slug && <p className="text-destructive text-sm mt-1">{errors.slug.message}</p>}
            </div>

            <div className="space-y-4 pt-4 border-t">
               <label className="flex items-center gap-3 bg-transparent p-4 rounded-lg border cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('published')}
                    className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="font-medium block text-foreground">Published</span>
                    <span className="text-sm text-muted-foreground">Make this product live</span>
                  </div>
               </label>
               <label className="flex items-center gap-3 bg-transparent p-4 rounded-lg border cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('featured')}
                    className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="font-medium block text-foreground">Featured</span>
                    <span className="text-sm text-muted-foreground">Show on the main product hub</span>
                  </div>
               </label>
            </div>
          </div>
        </div>
      </div>

      {/* ── STEP 3: UPLOADS ── */}
      <div className={currentStep === 3 ? 'block space-y-10' : 'hidden'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">Product File (ZIP, PDF, etc.)</h3>
             <div className="space-y-4">
               <div className="rounded-lg border-2 border-dashed border-border p-10 text-center transition-colors hover:border-primary">
                  <input
                    type="file"
                    id="product-file"
                    accept=".pdf,.zip,.mp4,application/pdf,application/zip,video/mp4"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                  />
                  <label htmlFor="product-file" className="cursor-pointer block">
                    {uploadingFile ? (
                      <Loader2 className="mx-auto mb-2 animate-spin text-muted-foreground" size={32} />
                    ) : (
                      <Upload className="mx-auto text-muted-foreground mb-2" size={32} />
                    )}
                    <span className="text-foreground block font-medium">
                      {uploadingFile ? 'Uploading...' : 'Click to upload product file'}
                    </span>
                    <span className="text-sm text-muted-foreground block mt-1">
                      Max 100MB (ZIP, PDF, MP4, etc.)
                    </span>
                  </label>
               </div>
               
               {watch('fileName') && (
                 <div className="flex items-center justify-between bg-muted p-4 rounded-lg border border-border">
                   <div className="flex items-center gap-3 overflow-hidden">
                     <div className="rounded bg-secondary p-2 text-foreground">
                        <Save size={20} />
                     </div>
                     <div className="truncate">
                        <p className="text-sm font-medium text-foreground truncate">{watch('fileName')}</p>
                        <p className="text-xs text-muted-foreground">{watch('fileSizeDisplay')}</p>
                     </div>
                   </div>
                   <button
                    type="button"
                    onClick={() => { setValue('fileUrl', ''); setValue('fileName', ''); }}
                    className="touch-target text-muted-foreground hover:text-destructive p-2 hover:bg-destructive/10 rounded-md transition-colors"
                   >
                     <X size={18} />
                   </button>
                 </div>
               )}
               {errors.fileUrl && <p className="text-destructive text-sm mt-1">{errors.fileUrl.message}</p>}
             </div>
          </div>

          <div className="space-y-6">
             <h3 className="text-lg font-semibold text-foreground border-b pb-2">Media</h3>
             
             <div className="mb-8">
                <label className="block text-sm font-medium text-foreground mb-4">Thumbnail Image</label>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      id="thumbnail-upload"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleThumbnailUpload}
                      disabled={uploadingThumbnail}
                    />
                    <label
                      htmlFor="thumbnail-upload"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
                    >
                      {uploadingThumbnail ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                      {uploadingThumbnail ? 'Uploading...' : 'Upload Thumbnail'}
                    </label>
                    <input
                      {...register('thumbnailImage')}
                      placeholder="...or paste image URL"
                      className="flex-1 bg-transparent border-none focus:ring-0 p-0"
                    />
                  </div>
                </div>
                 {watch('thumbnailImage') && (
                    <div className="mt-4 relative aspect-video w-full max-w-sm rounded-lg overflow-hidden border border-border group">
                         {/* eslint-disable-next-line @next/next/no-img-element */}
                         <img src={watch('thumbnailImage')} alt="Thumbnail" className="w-full h-full object-cover" />
                         <button
                           type="button"
                           onClick={() => setValue('thumbnailImage', '')}
                           className="touch-target absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
                         >
                           <X size={16} />
                         </button>
                    </div>
                 )}
                 {errors.thumbnailImage && <p className="text-destructive text-sm mt-1">{errors.thumbnailImage.message}</p>}
             </div>

             <div>
               <label className="block text-sm font-medium text-foreground mb-4">Gallery Images</label>
               <div className="mb-4">
                 <input
                   type="file"
                   id="gallery-upload"
                   className="hidden"
                   accept="image/jpeg,image/png,image/webp,image/gif"
                   multiple
                   onChange={handleGalleryUpload}
                   disabled={uploadingGallery}
                 />
                 <label
                   htmlFor="gallery-upload"
                   className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
                 >
                   {uploadingGallery ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                   {uploadingGallery ? 'Uploading...' : 'Upload Gallery Images'}
                 </label>
               </div>

               {(watch('galleryImages') ?? []).length > 0 && (
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                   {(watch('galleryImages') ?? []).map((url: string) => (
                     <div key={url} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                       {/* eslint-disable-next-line @next/next/no-img-element */}
                       <img src={url} alt="Gallery item" className="w-full h-full object-cover" />
                       <button
                         type="button"
                         onClick={() => handleRemoveGalleryImage(url)}
                         className="touch-target absolute top-2 right-2 bg-black/60 hover:bg-destructive/90 text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                         title="Remove"
                       >
                         <X size={14} />
                       </button>
                     </div>
                   ))}
                 </div>
               )}
             </div>
          </div>
        </div>
      </div>
    </form>
  );
}
