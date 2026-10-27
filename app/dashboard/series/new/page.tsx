import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/config/auth';
import SeriesEditor from '@/components/cms/SeriesEditor';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';

export const metadata = {
  title: 'Create Series | Admin Dashboard',
  description: 'Create a new blog series',
};

export default async function NewSeriesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    redirect('/login?reauth=1');
  }

  return (
    <div className="pb-16">
      <DashboardPageHeader
        eyebrow="Content Series"
        title="Create new series"
        description="Group blog posts into a cohesive, multi-part learning series and reading path."
      />
      <SeriesEditor />
    </div>
  );
}
