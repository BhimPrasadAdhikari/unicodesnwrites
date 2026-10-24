import type { ReactNode } from 'react';

interface DashboardPageHeaderProps {
  title: string;
  description: string;
  eyebrow?: string;
  action?: ReactNode;
}

export function DashboardPageHeader({
  title,
  description,
  eyebrow = 'Studio',
  action,
}: DashboardPageHeaderProps) {
  return (
    <header className="mb-7 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-eyebrow text-primary">{eyebrow}</p>
        <h1 className="mt-2 font-serif text-[28px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[36px]">{title}</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-6 text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="flex shrink-0">{action}</div> : null}
    </header>
  );
}
