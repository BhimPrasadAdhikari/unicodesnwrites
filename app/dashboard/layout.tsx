import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/config/auth';
import DashboardNav from '@/components/cms/DashboardNav';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.sessionValid) {
    redirect('/login');
  }

  if (session.user?.role !== 'admin') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-background font-sans lg:flex">
      <DashboardNav user={session.user} />
      <main className="min-w-0 flex-1 pt-16 text-foreground lg:pt-0">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}
