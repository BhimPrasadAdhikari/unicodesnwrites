import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { AccountSettings } from '@/components/public/AccountSettings';
import { Container } from '@/components/ui/Section';
import { authOptions } from '@/lib/config/auth';
import { connectDB } from '@/lib/db/connection';
import CourseEnrollment from '@/lib/models/CourseEnrollment';
import LearnerNotebookEntry from '@/lib/models/LearnerNotebookEntry';
import Product from '@/lib/models/Product';
import Purchase from '@/lib/models/Purchase';
import { User } from '@/lib/models/User';

export const metadata = {
  title: 'Account and Profile settings',
  robots: { index: false, follow: false },
  description:
    'Manage your learner profile, view your learning statistics, protect your sign-in, retrieve products, and control your personal data.',
};
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.sessionValid) redirect('/login?from=%2Faccount');

  let user = null;
  let purchases: Array<{
    id: string;
    purchaseId: string;
    title: string;
    slug: string | null;
    amount: number;
    currency: string;
    status: string;
    purchasedAt: string;
    downloadsRemaining: number;
    downloadUrl: string | null;
    downloadable: boolean;
  }> = [];
  let enrolledCount = 0;
  let notebookCount = 0;

  try {
    await connectDB();
    user = await User.findById(session.user.id).select('name email bio role createdAt emailVerified').lean();
  } catch (error) {
    console.error('Failed to query user for account page:', error);
  }

  if (!user) redirect('/login?from=%2Faccount');

  try {
    const now = new Date();
    const [rawPurchases, downloadablePurchaseIds, eCount, nCount] = await Promise.all([
      Purchase.find({ customerEmail: user.email })
        .collation({ locale: 'en', strength: 2 })
        .populate({ path: 'product', model: Product, select: 'title slug' })
        .sort({ purchasedAt: -1 })
        .limit(100)
        .lean(),
      Purchase.find({
        customerEmail: user.email,
        status: 'completed',
        downloadToken: { $exists: true, $ne: '' },
        downloadTokenExpiry: { $gt: now },
      }).collation({ locale: 'en', strength: 2 }).distinct('_id'),
      CourseEnrollment.countDocuments({ user: user._id }),
      LearnerNotebookEntry.countDocuments({ user: user._id }),
    ]);

    enrolledCount = eCount || 0;
    notebookCount = nCount || 0;

    const downloadableIds = new Set(downloadablePurchaseIds.map((id) => id.toString()));
    purchases = (rawPurchases || []).map((purchase) => {
      const product = purchase.product as unknown as { title?: string; slug?: string } | null;
      const maxDownloads = typeof purchase.maxDownloads === 'number' ? purchase.maxDownloads : 5;
      const downloadCount = typeof purchase.downloadCount === 'number' ? purchase.downloadCount : 0;
      const downloadsRemaining = Math.max(0, maxDownloads - downloadCount);
      const downloadable = downloadableIds.has(purchase._id.toString()) && Boolean(purchase.downloadToken);

      const purchasedAtStr = purchase.purchasedAt
        ? new Date(purchase.purchasedAt).toISOString()
        : new Date().toISOString();

      return {
        id: purchase._id.toString(),
        purchaseId: purchase.purchaseId || purchase._id.toString(),
        title: product?.title || 'Unavailable product',
        slug: product?.slug || null,
        amount: typeof purchase.amount === 'number' ? purchase.amount : 0,
        currency: purchase.currency || 'USD',
        status: purchase.status || 'completed',
        purchasedAt: purchasedAtStr,
        downloadsRemaining,
        // The account route reuses a valid token or issues a fresh one, so owners are never locked out.
        downloadUrl: purchase.status === 'completed' ? `/api/account/purchases/${purchase._id.toString()}/download` : null,
        downloadable,
      };
    });
  } catch (error) {
    console.error('Failed to load user purchases or stats:', error);
  }

  const joinedAtStr = user.createdAt
    ? new Date(user.createdAt).toISOString()
    : new Date().toISOString();

  return (
    <div className="pb-24">
      <section className="border-b border-border py-12 sm:py-16">
        <Container className="max-w-[1200px]">
          <p className="text-eyebrow text-primary">Student &amp; member portal</p>
          <h1 className="mt-3 text-title">Account</h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-[1.6] text-muted-foreground">
            Manage your personal profile, view learning overview, protect your security, retrieve purchased digital assets, and control your personal data.
          </p>
        </Container>
      </section>
      <Container className="max-w-[1200px] py-10 sm:py-12">
        <AccountSettings
          account={{
            name: user.name || 'Learner',
            email: user.email || '',
            bio: user.bio || '',
            role: user.role || 'learner',
            joinedAt: joinedAtStr,
            emailVerified: Boolean(user.emailVerified || user.role === 'admin'),
          }}
          purchases={purchases}
          stats={{
            purchasesCount: purchases.length,
            enrolledCount,
            notebookCount,
          }}
          isAdmin={user.role === 'admin'}
        />
      </Container>
    </div>
  );
}
