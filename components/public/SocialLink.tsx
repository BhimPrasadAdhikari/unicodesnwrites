'use client';

import { ReactNode } from 'react';
import { useEventTracker } from '@/hooks/useEventTracker';

interface SocialLinkProps {
  children: ReactNode;
  className?: string;
  href: string;
  platform: 'github' | 'linkedin' | 'twitter' | 'email' | 'other';
}

/**
 * Wrapper component that tracks social link clicks
 */
export function SocialLink({ children, className, href, platform }: SocialLinkProps) {
  const { trackEvent } = useEventTracker();

  const handleClick = () => {
    trackEvent('social_link_click', {
      location: 'unknown',
      category: 'engagement',
      value: platform,
    });
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
