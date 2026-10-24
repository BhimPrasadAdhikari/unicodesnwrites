'use client';

import { useId, useState } from 'react';
import Image from 'next/image';

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
}

export default function ImageUploader({ value, onChange, label = 'Cover Image' }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || '');
  const [error, setError] = useState('');
  const inputId = useId();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    if (!file.type.startsWith('image/')) {
      setError('Choose a valid image file.');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Images must be 5 MB or smaller.');
      e.target.value = '';
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error((await response.json().catch(() => null))?.error || 'Upload failed');
      }

      const data = await response.json();
      onChange(data.url);
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload image.');
      setPreview(value || '');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <div className="border-2 border-dashed border-border rounded-lg p-4">
        {preview ? (
          <div className="relative">
            <div className="relative h-64 w-full">
              <Image
                src={preview}
                alt="Cover preview"
                fill
                className="rounded-lg object-cover"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setPreview('');
                onChange('');
              }}
              className="absolute top-2 right-2 bg-destructive text-destructive-foreground px-3 py-1 rounded text-sm hover:bg-destructive/90"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="text-center">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
              id={inputId}
              disabled={uploading}
            />
            <label
              htmlFor={inputId}
              className="inline-flex cursor-pointer items-center rounded-lg bg-foreground px-4 py-2 text-background transition hover:bg-foreground/90"
            >
              {uploading ? 'Uploading...' : 'Choose Image'}
            </label>
            <p className="text-sm text-muted-foreground mt-2">PNG, JPG, GIF up to 5MB</p>
          </div>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
