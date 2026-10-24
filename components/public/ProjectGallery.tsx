'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn } from 'lucide-react';

interface ProjectGalleryProps {
  images: string[];
}

export default function ProjectGallery({ images }: ProjectGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!images || images.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 my-8">
        {images.map((img, idx) => (
          <div 
             key={idx} 
             className={`cursor-pointer overflow-hidden rounded-xl aspect-video relative group img-hover ${idx === 0 ? 'col-span-2 row-span-2' : ''}`}
             onClick={() => setSelectedImage(img)}
          >
             {/* eslint-disable-next-line @next/next/no-img-element */}
             <img src={img} alt={`Gallery ${idx}`} className="object-cover w-full h-full" />
             <div className="absolute inset-0 bg-muted/0 group-hover:bg-muted/40 transition-colors duration-300" />
             
             {/* Zoom indicator */}
             <div className="absolute bottom-3 right-3 p-2 rounded-lg bg-card opacity-0 group-hover:opacity-100 transition-opacity duration-300">
               <ZoomIn className="h-4 w-4 text-foreground" />
             </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedImage}
              alt="Full screen view"
              className="max-w-full max-h-screen object-contain rounded-xl"
            />
            <button className="absolute right-6 top-6 flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-secondary">
                <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
