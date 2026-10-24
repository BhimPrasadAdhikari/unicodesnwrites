import ProductEditor from '@/components/cms/ProductEditor';
import { DashboardPageHeader } from '@/components/cms/DashboardPageHeader';

export default function NewProductPage() {
  return <div className="mx-auto max-w-5xl pb-16"><DashboardPageHeader eyebrow="Product desk" title="New product" description="Package a digital resource, configure its delivery, and choose when it becomes public." /><ProductEditor /></div>;
}
