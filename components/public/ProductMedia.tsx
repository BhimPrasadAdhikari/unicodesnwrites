'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, FileText, Maximize2, Play, X } from 'lucide-react';

import { SiteIconCell, siteIconFor } from '@/components/ui/SiteIcon';
import { buttonVariants } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { isAnimatableImage } from '@/lib/utils/media';

export interface ProductPreviewFile {
  type: 'pdf' | 'video' | 'image';
  url: string;
  title?: string;
}

interface ProductMediaProps {
  title: string;
  productType: string;
  thumbnailImage?: string;
  galleryImages?: string[];
  previewFiles?: ProductPreviewFile[];
}

interface MediaItem {
  kind: 'image' | 'video';
  src: string;
  /** Caption the owner wrote (previewFiles[].title). */
  caption?: string;
  /** Text for screen readers and the fallback caption. */
  label: string;
}

const SWIPE_THRESHOLD_PX = 50;

function buildItems({ title, thumbnailImage, galleryImages = [], previewFiles = [] }: ProductMediaProps): MediaItem[] {
  const items: MediaItem[] = [];

  if (thumbnailImage) {
    items.push({ kind: 'image', src: thumbnailImage, label: title });
  }

  galleryImages.filter(Boolean).forEach((src, idx) => {
    items.push({ kind: 'image', src, label: `${title} preview ${idx + 1}` });
  });

  previewFiles
    .filter((file) => file.type === 'video' && file.url)
    .forEach((file, idx) => {
      items.push({ kind: 'video', src: file.url, caption: file.title || undefined, label: file.title || `${title} video ${idx + 1}` });
    });

  previewFiles
    .filter((file) => file.type === 'image' && file.url)
    .forEach((file, idx) => {
      items.push({ kind: 'image', src: file.url, caption: file.title || undefined, label: file.title || `${title} sample ${idx + 1}` });
    });

  return items;
}

export default function ProductMedia(props: ProductMediaProps) {
  const { title, productType, thumbnailImage, previewFiles = [] } = props;
  const items = buildItems(props);
  const pdfs = previewFiles.filter((file) => file.type === 'pdf' && file.url);

  // The hero shows the first proof video when there is one, otherwise the thumbnail.
  const heroVideoIndex = items.findIndex((item) => item.kind === 'video');
  const heroIndex = heroVideoIndex >= 0 ? heroVideoIndex : items.length > 0 ? 0 : -1;
  const hero = heroIndex >= 0 ? items[heroIndex] : null;

  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);

  // Respect reduced-motion settings: keep the poster instead of autoplaying.
  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      video.pause();
      return;
    }
    // React does not always serialize `muted` into server HTML, which can block
    // the first autoplay attempt. Set it on the element and retry.
    video.muted = true;
    video.play().catch(() => {});
  }, [hero?.src]);

  const open = (index: number, opener: HTMLElement | null) => {
    openerRef.current = opener;
    heroVideoRef.current?.pause();
    setOpenIndex(index);
  };

  const close = () => {
    setOpenIndex(null);
    const opener = openerRef.current;
    // Wait for the dialog to unmount before moving focus back.
    requestAnimationFrame(() => opener?.focus());
  };

  return (
    <div className="min-w-0 space-y-4">
      <figure className="space-y-3">
        <div className="relative aspect-[16/10] overflow-hidden rounded-3xl border border-border bg-muted">
          {hero?.kind === 'video' ? (
            <>
              <video
                ref={heroVideoRef}
                src={hero.src}
                poster={thumbnailImage || undefined}
                autoPlay
                muted
                loop
                playsInline
                controls
                preload="metadata"
                aria-label={hero.label}
                className="absolute inset-0 h-full w-full bg-black object-contain"
              />
              <button
                type="button"
                onClick={(e) => open(heroIndex, e.currentTarget)}
                aria-label={`Open ${hero.label} in the media viewer`}
                className="touch-target absolute right-3 top-3 rounded-lg bg-black/60 text-white transition-colors hover:bg-black/80"
              >
                <Maximize2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          ) : hero ? (
            <button
              type="button"
              onClick={(e) => open(heroIndex, e.currentTarget)}
              aria-label={`Open ${hero.label} in the media viewer`}
              className="group absolute inset-0 block h-full w-full cursor-zoom-in"
            >
              <Image
                src={hero.src}
                alt={hero.label}
                fill
                priority
                sizes="(min-width: 1024px) 55vw, 100vw"
                unoptimized={isAnimatableImage(hero.src)}
                className="object-cover"
              />
              <span className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-black/60 text-white opacity-90 transition-opacity group-hover:opacity-100">
                <Maximize2 className="h-4 w-4" aria-hidden="true" />
              </span>
            </button>
          ) : (
            <SiteIconCell kind={siteIconFor(productType)} label={productType.toUpperCase()} iconSize={120} className="absolute inset-0" />
          )}
        </div>
        {hero?.caption && (
          <figcaption className="font-mono text-[12px] tracking-[0.06em] text-muted-foreground">{hero.caption}</figcaption>
        )}
      </figure>

      {items.length > 1 && (
        <ul className="grid grid-cols-4 gap-3 sm:grid-cols-5 sm:gap-4" aria-label={`${title} media`}>
          {items.map((item, idx) => (
            <li key={`${item.kind}-${item.src}-${idx}`}>
              <button
                type="button"
                onClick={(e) => open(idx, e.currentTarget)}
                aria-label={`Open ${item.kind === 'video' ? 'video' : 'image'} ${idx + 1} of ${items.length}: ${item.label}`}
                className={cn(
                  'relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-xl border bg-muted transition-colors hover:border-foreground/40',
                  idx === heroIndex ? 'border-foreground' : 'border-border'
                )}
              >
                {item.kind === 'video' ? (
                  <>
                    {/* First frame as the tile; #t skips a black opening frame on most encoders */}
                    <video
                      src={`${item.src}#t=0.1`}
                      muted
                      playsInline
                      preload="metadata"
                      tabIndex={-1}
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/65 text-white">
                        <Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden="true" />
                      </span>
                    </span>
                  </>
                ) : (
                  <Image
                    src={item.src}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 120px, 25vw"
                    unoptimized={isAnimatableImage(item.src)}
                    className="object-cover"
                  />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {pdfs.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {pdfs.map((pdf, idx) => (
            <a
              key={`${pdf.url}-${idx}`}
              href={pdf.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: 'outline' }), 'h-auto min-h-11 gap-2 whitespace-normal text-left')}
            >
              <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Read a free sample (PDF)
                {pdfs.length > 1 && pdf.title ? <span className="text-muted-foreground"> · {pdf.title}</span> : null}
              </span>
            </a>
          ))}
        </div>
      )}

      {openIndex !== null && items[openIndex] && (
        <Lightbox
          items={items}
          index={openIndex}
          productTitle={title}
          onIndexChange={setOpenIndex}
          onClose={close}
        />
      )}
    </div>
  );
}

interface LightboxProps {
  items: MediaItem[];
  index: number;
  productTitle: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

function Lightbox({ items, index, productTitle, onIndexChange, onClose }: LightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const item = items[index];
  const count = items.length;
  const hasMany = count > 1;
  const caption = item.caption || item.label;

  const go = useCallback(
    (delta: number) => {
      if (count < 2) return;
      onIndexChange((index + delta + count) % count);
    },
    [count, index, onIndexChange]
  );

  // Focus the close button on open and lock page scroll while the dialog is up.
  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // A focused video uses the arrow keys to seek, so leave those to it.
      const target = e.target as HTMLElement | null;
      const inMediaControl = target?.tagName === 'VIDEO' || target?.tagName === 'INPUT';

      if (e.key === 'ArrowRight' && !inMediaControl) {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft' && !inMediaControl) {
        e.preventDefault();
        go(-1);
      } else if (e.key === 'Tab' && dialogRef.current) {
        // Keep focus inside the dialog.
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>('button, [href], video[controls], [tabindex]:not([tabindex="-1"])')
        ).filter((el) => !el.hasAttribute('disabled'));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (!dialogRef.current.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [go, onClose]);

  const onTouchStart = (e: React.TouchEvent) => {
    // Swipes that start on a video belong to its scrubber.
    if ((e.target as HTMLElement).tagName === 'VIDEO') {
      touchStartX.current = null;
      return;
    }
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start === null) return;
    const delta = (e.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(delta) > SWIPE_THRESHOLD_PX) go(delta < 0 ? 1 : -1);
  };

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${productTitle} media viewer`}
      className="fixed inset-0 z-[100] flex h-[100dvh] w-full flex-col overflow-hidden bg-black/95 text-white"
      onClick={(e) => {
        // Clicking the dark backdrop (not the media or controls) closes the viewer.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <p className="font-mono text-[12px] tracking-[0.06em] text-white/70" aria-live="polite">
          {index + 1} / {count}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close media viewer"
          className="touch-target rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <figure
        className="relative m-0 flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 pb-4 sm:px-16"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {item.kind === 'video' ? (
          <video
            key={item.src}
            src={item.src}
            controls
            autoPlay
            playsInline
            preload="metadata"
            aria-label={item.label}
            className="block max-h-[calc(100dvh-8.5rem)] w-auto max-w-full bg-black"
          />
        ) : (
          // Full-resolution original, fitted to the screen. next/image would resize it.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={item.src}
            src={item.src}
            alt={item.label}
            className="block h-auto max-h-[calc(100dvh-8.5rem)] w-auto max-w-full object-contain"
          />
        )}
        <figcaption className="max-w-2xl break-words text-center text-[14px] leading-[1.5] text-white/85">
          {caption}
        </figcaption>

        {hasMany && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous item"
              className="touch-target absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white transition-colors hover:bg-white/15 sm:left-3"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next item"
              className="touch-target absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white transition-colors hover:bg-white/15 sm:right-3"
            >
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </button>
          </>
        )}
      </figure>
    </div>,
    document.body
  );
}
