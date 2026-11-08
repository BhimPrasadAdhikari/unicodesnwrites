'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clapperboard, Edit, ExternalLink, Plus } from 'lucide-react';

import { ConfirmDeleteButton } from '@/components/cms/ConfirmDeleteButton';
import { Alert } from '@/components/ui/Alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

export interface VideoSeriesRow {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  featured: boolean;
  partCount: number;
  releasedCount: number;
  nextRelease: string | null;
}

export default function VideoSeriesList({ rows }: { rows: VideoSeriesRow[] }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState('');

  const handleDelete = async (id: string) => {
    setFeedback('');
    const response = await fetch(`/api/video-series/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'Video series could not be deleted.');
    router.refresh();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/70">
      {feedback && <Alert variant="destructive" className="m-4">{feedback}</Alert>}
      <div className="overflow-x-auto">
        <Table className="min-w-[760px]">
          <TableHeader>
            <tr>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Parts</TableHead>
              <TableHead>Next release</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="font-medium text-foreground">{row.title}</div>
                  <div className="text-sm text-muted-foreground">/videos/{row.slug}</div>
                </TableCell>
                <TableCell className="space-x-1">
                  <span className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${row.published ? 'border-success/20 bg-success/10 text-success' : 'border-warning/20 bg-warning/10 text-warning'}`}>
                    {row.published ? 'Published' : 'Draft'}
                  </span>
                  {row.featured && <span className="rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">Featured</span>}
                </TableCell>
                <TableCell className="text-sm">
                  {row.releasedCount} of {row.partCount} out
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.nextRelease ?? 'None scheduled'}</TableCell>
                <TableCell className="space-x-1 text-right text-sm">
                  {row.published && (
                    <Link href={`/videos/${row.slug}`} target="_blank" className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-secondary">
                      <ExternalLink className="h-3.5 w-3.5" /> View
                    </Link>
                  )}
                  <Link href={`/dashboard/videos/${row.id}/edit`} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-success transition-colors hover:bg-success/10">
                    <Edit className="h-3.5 w-3.5" /> Edit
                  </Link>
                  <ConfirmDeleteButton label={row.title} onConfirm={() => handleDelete(row.id)} onError={setFeedback} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {rows.length === 0 && (
        <div className="py-16 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-secondary">
            <Clapperboard className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No video series yet.</p>
          <div className="mt-5">
            <Link href="/dashboard/videos/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-background transition-colors hover:bg-foreground/90">
              <Plus className="h-4 w-4" /> Create video series
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
