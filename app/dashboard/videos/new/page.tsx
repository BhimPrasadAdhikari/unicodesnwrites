import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';
import VideoSeriesEditor from '@/components/cms/VideoSeriesEditor';

export const metadata = { title: 'New video series | Admin Dashboard' };

export default function NewVideoSeriesPage() {
  return (
    <div className="pb-16">
      <DashboardPageHeader eyebrow="Video Series" title="New video series" description="List the parts in watch order with their YouTube links and release times." />
      <VideoSeriesEditor />
    </div>
  );
}
