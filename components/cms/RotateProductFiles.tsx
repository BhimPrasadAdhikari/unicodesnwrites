'use client';

import { AdminRowActions } from '@/components/cms/AdminRowActions';

/** Moves every paid file to a fresh URL; for when a file URL may have leaked. */
export function RotateProductFiles() {
  return (
    <details className="rounded-xl border border-border bg-card">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-5 text-sm font-medium">
        Move product files to new URLs
        <span className="font-mono text-[12px] text-muted-foreground">security</span>
      </summary>
      <div className="space-y-4 border-t border-border p-5 text-sm text-muted-foreground">
        <p>
          Copies every paid file to a new unguessable address and deletes the old one, so any file URL that was ever exposed stops working.
          Buyers&apos; download links keep working because they look up the file when used.
        </p>
        <AdminRowActions
          actions={[
            {
              label: 'Move all files now',
              url: '/api/admin/products/rotate-files',
              method: 'POST',
              confirm: 'Confirm: move every file',
              tone: 'primary',
              successMessage: (data) => {
                const failed = Array.isArray(data.failed) ? (data.failed as string[]) : [];
                return `Moved ${String(data.moved ?? 0)} file(s).${failed.length ? ` Failed: ${failed.join(', ')}.` : ''}`;
              },
            },
          ]}
        />
      </div>
    </details>
  );
}
