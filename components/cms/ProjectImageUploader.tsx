'use client';

import React, { useState, useRef } from 'react';

interface ProjectImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxFiles?: number;
}

export default function ProjectImageUploader({ images = [], onChange, maxFiles = 10 }: ProjectImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError('');
    if (images.length + files.length > maxFiles) {
      setError(`You can upload a maximum of ${maxFiles} images.`);
      e.target.value = '';
      return;
    }
    const selectedFiles = Array.from(files);
    if (selectedFiles.some((file) => !file.type.startsWith('image/'))) {
      setError('Every selected file must be an image.');
      e.target.value = '';
      return;
    }
    if (selectedFiles.some((file) => file.size > 5 * 1024 * 1024)) {
      setError('Each image must be 5 MB or smaller.');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    const formData = new FormData();

    // Append all files
    selectedFiles.forEach(file => {
        formData.append('file', file);
    });

    try {
      const res = await fetch('/api/upload/project-images', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      
      // Add new URLs to existing list
      onChange([...images, ...data.urls]);
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : 'Failed to upload images.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (urlToRemove: string) => {
    onChange(images.filter(url => url !== urlToRemove));
  };

  const handleMove = (index: number, direction: 'left' | 'right') => {
      if (index === 0 && direction === 'left') return;
      if (index === images.length - 1 && direction === 'right') return;
      
      const newImages = [...images];
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      
      [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];
      onChange(newImages);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        Project Images (First is Thumbnail)
      </label>

      {/* Grid of Images */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {images.map((url, index) => (
          <div key={url} className="relative group aspect-video bg-muted rounded-lg overflow-hidden border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Project shot ${index + 1}`} className="w-full h-full object-cover" />
            
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
               <button type="button" aria-label={`Move image ${index + 1} left`} onClick={() => handleMove(index, 'left')} disabled={index === 0} className="text-white hover:text-primary disabled:opacity-30">&larr;</button>
               <button type="button" aria-label={`Remove image ${index + 1}`} onClick={() => handleRemove(url)} className="text-destructive hover:text-destructive">Delete</button>
               <button type="button" aria-label={`Move image ${index + 1} right`} onClick={() => handleMove(index, 'right')} disabled={index === images.length - 1} className="text-white hover:text-primary disabled:opacity-30">&rarr;</button>
            </div>
            {index === 0 && <span className="absolute top-1 left-1 rounded bg-foreground px-1.5 py-0.5 font-mono text-[11px] text-background">Cover</span>}
          </div>
        ))}
        
        {/* Upload Button Placeholder */}
        {images.length < maxFiles && (
             <div 
                className="aspect-video bg-muted/30 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
             >
                <span className="text-muted-foreground text-2xl">+</span>
                <span className="text-muted-foreground text-sm">{isUploading ? 'Uploading...' : 'Add Images'}</span>
             </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
      />
      <p className="text-xs text-muted-foreground">Supported formats: .jpg, .png, .webp (Max 5MB each)</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
