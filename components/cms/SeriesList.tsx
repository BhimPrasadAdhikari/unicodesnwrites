'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Edit, BookOpen, Plus } from 'lucide-react';
import { ConfirmDeleteButton } from '@/components/cms/ConfirmDeleteButton';
import { Alert } from '@/components/ui/Alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

interface Series {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  published: boolean;
  createdAt: string;
  partCount: number;
}

export default function SeriesList({ seriesList }: { seriesList: Series[] }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState('');

  const handleDelete = async (slug: string) => {
    setFeedback('');
    const response = await fetch(`/api/series/${encodeURIComponent(slug)}`, { method: 'DELETE' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error || 'Series could not be deleted.');
    }
    router.refresh();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/70">
      {feedback && <Alert variant="destructive" className="m-4">{feedback}</Alert>}
      <div className="overflow-x-auto">
      <Table className="min-w-[760px]">
        <TableHeader>
          <tr>
            <TableHead>
              Title
            </TableHead>
            <TableHead>
              Status
            </TableHead>
            <TableHead>
              Parts
            </TableHead>
            <TableHead>
              Created
            </TableHead>
            <TableHead className="text-right">
              Actions
            </TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {seriesList.map((series) => (
            <TableRow key={series._id}>
              <TableCell>
                <div>
                  <div className="font-medium text-foreground">{series.title}</div>
                  <div className="text-sm text-muted-foreground truncate max-w-md">
                    {series.description || 'No description'}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg ${
                    series.published
                      ? 'bg-success/10 text-success border border-success/20'
                      : 'bg-warning/10 text-warning border border-warning/20'
                  }`}
                >
                  {series.published ? 'Published' : 'Draft'}
                </span>
              </TableCell>
              <TableCell>
                <span className="rounded-lg border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                  {series.partCount} {series.partCount === 1 ? 'part' : 'parts'}
                </span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {series.createdAt ? formatDistanceToNow(new Date(series.createdAt), { addSuffix: true }) : ''}
              </TableCell>
              <TableCell className="text-right text-sm space-x-1">
                <Link
                  href={`/dashboard/series/${series.slug}/edit`}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-success hover:bg-success/10 transition-colors"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Link>
                <ConfirmDeleteButton label={series.title} onConfirm={() => handleDelete(series.slug)} onError={setFeedback} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>

      {seriesList.length === 0 && (
        <div className="text-center py-16">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-secondary">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No blog series yet.</p>
          <div className="mt-5">
            <Link
              href="/dashboard/series/new"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors"
            >
              <Plus className="h-4 w-4" /> Create series
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
