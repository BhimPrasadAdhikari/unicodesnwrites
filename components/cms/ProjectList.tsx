'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Edit } from 'lucide-react';
import { ConfirmDeleteButton } from '@/components/cms/ConfirmDeleteButton';
import { Alert } from '@/components/ui/Alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

interface Project {
  _id: string;
  title: string;
  category: string;
  status: string;
  published: boolean;
  featured: boolean;
  views: number;
  createdAt: string;
}

interface ProjectListProps {
  projects: Project[];
}

export default function ProjectList({ projects }: ProjectListProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState('');

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'Project could not be deleted.');
    router.refresh();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/70">
      {feedback && <Alert variant="destructive" className="m-4">{feedback}</Alert>}
      <div className="overflow-x-auto">
        <Table className="min-w-[820px] divide-y divide-border/60">
          <TableHeader>
            <tr>
              <TableHead scope="col">
                Title
              </TableHead>
              <TableHead scope="col">
                Category
              </TableHead>
               <TableHead scope="col">
                Status
              </TableHead>
              <TableHead scope="col">
                Visibility
              </TableHead>
              <TableHead scope="col">
                Views
              </TableHead>
              <TableHead scope="col" className="text-right">
                Actions
              </TableHead>
            </tr>
          </TableHeader>
          <TableBody className="bg-card">
            {projects.map((project) => (
              <TableRow key={project._id}>
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-foreground">{project.title}</div>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="text-sm text-muted-foreground">{project.category}</div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${project.status === 'Completed' ? 'bg-success/10 text-success' : 
                      project.status === 'In Progress' ? 'bg-warning/10 text-warning' : 
                      'bg-muted text-muted-foreground'}`}>
                    {project.status}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground space-x-2">
                   {project.published ? 
                     <span className="text-success font-medium">Published</span> : 
                     <span className="text-muted-foreground">Draft</span>
                   }
                   {project.featured && 
                     <span className="rounded border border-border bg-secondary px-1.5 py-0.5 text-xs font-medium text-foreground">Featured</span>
                   }
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {project.views}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right text-sm font-medium">
                  <Link href={`/dashboard/projects/${project._id}/edit`} className="mr-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary">
                    <Edit className="h-3.5 w-3.5" /> Edit
                  </Link>
                  <ConfirmDeleteButton label={project.title} onConfirm={() => handleDelete(project._id)} onError={setFeedback} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {projects.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
                No projects found. Create one to get started!
            </div>
        )}
      </div>
    </div>
  );
}
