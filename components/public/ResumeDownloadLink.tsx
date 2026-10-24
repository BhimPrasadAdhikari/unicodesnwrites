'use client';

import { ReactNode } from 'react';
import { useEventTracker } from '@/hooks/useEventTracker';

interface ResumeDownloadLinkProps {
  children: ReactNode;
  className?: string;
  url: string;
}

/**
 * Wrapper component that tracks resume downloads
 */
export function ResumeDownloadLink({ children, className, url }: ResumeDownloadLinkProps) {
  const { trackEvent } = useEventTracker();

  const handleClick = () => {
    trackEvent('resume_download', {
      location: 'unknown',
      category: 'downloads',
      value: 'resume-pdf',
    });
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
