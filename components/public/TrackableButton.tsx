'use client';

import { ReactNode } from 'react';
import { useEventTracker } from '@/hooks/useEventTracker';

interface CTAButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void | Promise<void>;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  action: string; // e.g., 'cta_click', 'button_click'
  location?: string;
}

/**
 * Wrapper component that tracks CTA button clicks
 */
export function TrackableButton({
  children,
  className,
  onClick,
  type = 'button',
  disabled = false,
  action,
  location = 'unknown',
}: CTAButtonProps) {
  const { trackEvent } = useEventTracker();

  const handleClick = async () => {
    trackEvent('cta_button_click', {
      action,
      location,
      category: 'engagement',
    });

    if (onClick) {
      await onClick();
    }
  };

  return (
    <button
      type={type}
      className={className}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
