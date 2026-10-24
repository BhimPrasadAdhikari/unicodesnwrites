import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { LearnerNotebook } from '@/components/public/LearnerNotebook';
import { Container } from '@/components/ui/Section';
import { authOptions } from '@/lib/config/auth';
import { listNotebookEntries } from '@/lib/services/learner-persistence';

export const metadata = { title: 'AI notebook', description: 'Review transcript-grounded notes saved across your AIML lessons.', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function NotebookPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.sessionValid) redirect('/login?from=%2Flearn%2Fnotebook');
  if (session.user.role !== 'admin' && !session.user.emailVerified) redirect('/verify-email?from=%2Flearn%2Fnotebook');
  const entries = await listNotebookEntries(session.user.id);

  return <div className="pb-24"><section className="border-b border-border py-12 sm:py-16"><Container className="max-w-[1200px]"><p className="text-eyebrow text-primary">Student &amp; member portal</p><div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><h1 className="text-title">Your notebook</h1><nav aria-label="Learner" className="flex gap-1 border-b border-border sm:border-0"><Link href="/learn" className="-mb-px inline-flex h-11 items-center border-b-2 border-transparent px-3.5 text-[15px] font-medium text-muted-foreground hover:text-foreground">Courses</Link><span aria-current="page" className="-mb-px inline-flex h-11 items-center border-b-2 border-primary px-3.5 text-[15px] font-semibold">Notebook</span><Link href="/account" className="-mb-px inline-flex h-11 items-center border-b-2 border-transparent px-3.5 text-[15px] font-medium text-muted-foreground hover:text-foreground">Account</Link></nav></div><p className="mt-4 max-w-2xl text-[17px] leading-[1.6] text-muted-foreground">Every lesson ends here. Each note stays grounded in its lesson transcript and takes you back to the source.</p></Container></section><Container className="max-w-[1200px] py-10 sm:py-12"><LearnerNotebook initialEntries={entries} /></Container></div>;
}
