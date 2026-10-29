'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils/currency';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  BookOpenCheck,
  CheckCircle2,
  Download,
  FileText,
  KeyRound,
  ListChecks,
  Loader2,
  PackageCheck,
  Save,
  ShieldAlert,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

type PurchaseItem = {
  id: string;
  purchaseId: string;
  title: string;
  slug: string | null;
  amount: number;
  currency: string;
  status: string;
  purchasedAt: string;
  downloadsRemaining: number;
  /** The current link is still valid (otherwise downloading issues a fresh one) */
  downloadable?: boolean;
  downloadUrl: string | null;
};

type AccountData = {
  name: string;
  email: string;
  bio: string;
  role: string;
  joinedAt: string;
  emailVerified: boolean;
};

type StatsData = {
  purchasesCount: number;
  enrolledCount: number;
  notebookCount: number;
  reviewDueCount: number;
};

function Feedback({ value }: { value: { type: 'success' | 'error'; text: string } | null }) {
  if (!value) return null;
  return (
    <p
      role={value.type === 'error' ? 'alert' : 'status'}
      className={`rounded-xl p-3 text-sm ${
        value.type === 'error'
          ? 'bg-destructive/10 text-destructive'
          : 'bg-success/10 text-success'
      }`}
    >
      {value.text}
    </p>
  );
}

export function AccountSettings({
  account,
  purchases,
  stats,
  isAdmin,
}: {
  account: AccountData;
  purchases: PurchaseItem[];
  stats: StatsData;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'learning' | 'purchases' | 'security' | 'privacy'>('profile');

  // Form states
  const [name, setName] = useState(account.name);
  const [bio, setBio] = useState(account.bio);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [passwords, setPasswords] = useState({ currentPassword: '', password: '', confirmation: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [deletion, setDeletion] = useState({ password: '', confirmation: '' });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [resendLoading, setResendLoading] = useState(false);
  const [resendFeedback, setResendFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initials for avatar
  const initials = account.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileLoading(true);
    setProfileFeedback(null);
    try {
      const response = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, bio }),
      });
      const data = await response.json();
      setProfileFeedback({
        type: response.ok ? 'success' : 'error',
        text: response.ok ? data.message : data.error || 'Unable to update profile.',
      });
      if (response.ok) router.refresh();
    } catch {
      setProfileFeedback({ type: 'error', text: 'Unable to reach the account service.' });
    } finally {
      setProfileLoading(false);
    }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordFeedback(null);
    if (passwords.password !== passwords.confirmation)
      return setPasswordFeedback({ type: 'error', text: 'New passwords do not match.' });
    setPasswordLoading(true);
    try {
      const response = await fetch('/api/account/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwords.currentPassword, password: passwords.password }),
      });
      const data = await response.json();
      if (!response.ok) setPasswordFeedback({ type: 'error', text: data.error || 'Unable to update password.' });
      else await signOut({ callbackUrl: '/login?changed=1' });
    } catch {
      setPasswordFeedback({ type: 'error', text: 'Unable to reach the account service.' });
      setPasswordLoading(false);
    }
  };

  const resendVerification = async () => {
    setResendLoading(true);
    setResendFeedback(null);
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: account.email }),
      });
      const data = await response.json();
      setResendFeedback({
        type: response.ok ? 'success' : 'error',
        text: response.ok ? 'Verification email sent. Please check your inbox.' : data.error || 'Unable to send email.',
      });
    } catch {
      setResendFeedback({ type: 'error', text: 'Service unavailable. Try again later.' });
    } finally {
      setResendLoading(false);
    }
  };

  const deleteAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setDeleteLoading(true);
    setDeleteFeedback(null);
    try {
      const response = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deletion),
      });
      const data = await response.json();
      if (!response.ok) setDeleteFeedback({ type: 'error', text: data.error || 'Unable to delete account.' });
      else await signOut({ callbackUrl: '/' });
    } catch {
      setDeleteFeedback({ type: 'error', text: 'Unable to reach the account service.' });
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Profile Overview Card */}
      <Card className="overflow-hidden border-border bg-card p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4 sm:items-center sm:gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-foreground font-serif text-2xl text-background">
              {initials || 'U'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="font-serif text-[28px] font-medium leading-tight">{name}</h2>
                <span className="rounded-md border border-border px-2 py-0.5 text-eyebrow text-muted-foreground">
                  {account.role}
                </span>
                {account.emailVerified && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-success/10 px-2 py-0.5 text-eyebrow text-success">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verified
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{account.email}</p>
              {bio && <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground/80">{bio}</p>}
              <p className="mt-2 text-xs text-muted-foreground">
                Member since {new Date(account.joinedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 border-t border-border pt-4 lg:border-t-0 lg:pt-0">
            <div className="rounded-xl border border-border bg-card p-3.5 text-center">
              <p className="font-serif text-[26px] font-medium leading-none text-foreground">{stats.enrolledCount}</p>
              <p className="mt-0.5 text-eyebrow text-muted-foreground">Courses</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3.5 text-center">
              <p className="font-serif text-[26px] font-medium leading-none text-foreground">{stats.purchasesCount}</p>
              <p className="mt-0.5 text-eyebrow text-muted-foreground">Orders</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3.5 text-center">
              <p className="font-serif text-[26px] font-medium leading-none text-foreground">{stats.notebookCount}</p>
              <p className="mt-0.5 text-eyebrow text-muted-foreground">AI Notes</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-border" role="tablist" aria-label="Account navigation">
        {[
          { id: 'profile', label: "Profile", icon: UserRound },
          { id: 'learning', label: "Learning", icon: BookOpenCheck },
          { id: 'purchases', label: 'Purchases', icon: PackageCheck },
          { id: 'security', label: 'Security', icon: KeyRound },
          { id: 'privacy', label: "Privacy", icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`-mb-px inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-3.5 text-[15px] transition-colors ${
                isActive
                  ? 'border-primary font-semibold text-foreground'
                  : 'border-transparent font-medium text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}

      {/* TAB 1: PROFILE */}
      {activeTab === 'profile' && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          <Card>
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
                <UserRound className="h-5 w-5" />
              </div>
              <CardTitle>Public profile & information</CardTitle>
              <CardDescription>
                Customize your display name and headline bio as seen across discussion threads, course reviews, and platform activities.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveProfile} className="space-y-5">
                <label className="block space-y-2 text-sm font-medium">
                  Display name
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    minLength={2}
                    maxLength={80}
                    required
                    placeholder="Your name or handle"
                  />
                </label>

                <label className="block space-y-2 text-sm font-medium">
                  <div className="flex items-center justify-between">
                    <span>Headline / Learner bio</span>
                    <span className="text-xs text-muted-foreground">{bio.length}/200</span>
                  </div>
                  <textarea
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    maxLength={200}
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Short summary about your background or learning focus (e.g. AI researcher, systems developer)"
                  />
                </label>

                <label className="block space-y-2 text-sm font-medium">
                  Account email
                  <Input value={account.email} readOnly disabled className="bg-muted/40" />
                  <p className="text-xs text-muted-foreground">
                    Your verified email is locked to protect your course progress and purchased product rights.
                  </p>
                </label>

                <Feedback value={profileFeedback} />

                <Button
                  disabled={profileLoading || (name.trim() === account.name && bio.trim() === account.bio)}
                >
                  {profileLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save profile
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Profile Card Live Preview */}
          <Card className="h-fit border-dashed border-border bg-muted/10">
            <CardHeader>
              <CardTitle className="text-eyebrow text-muted-foreground">Profile card preview</CardTitle>
              <CardDescription>This is how your profile appears to other learners in discussion forums and reviews.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-foreground font-serif text-lg text-background">
                    {initials || 'U'}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{name || 'Your Name'}</p>
                    <p className="text-xs text-muted-foreground">{account.role === 'admin' ? 'Author & Admin' : 'Learner'}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {bio.trim() || 'No bio added yet. Add a short bio above to introduce yourself.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: MY LEARNING */}
      {activeTab === 'learning' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
                <BookOpenCheck className="h-5 w-5" />
              </div>
              <CardTitle>My learning & coursework</CardTitle>
              <CardDescription>Overview of your registered courses, completed modules, and AI study notes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <BookOpenCheck className="h-6 w-6 text-muted-foreground" />
                    <span className="font-serif text-[28px] font-medium leading-none">{stats.enrolledCount}</span>
                  </div>
                  <h3 className="mt-3 font-serif text-lg font-medium">Enrolled courses</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Active course modules and guided learning tracks.</p>
                  <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                    <Link href="/learn">Go to My Learning</Link>
                  </Button>
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                    <span className="font-serif text-[28px] font-medium leading-none">{stats.notebookCount}</span>
                  </div>
                  <h3 className="mt-3 font-serif text-lg font-medium">AI Notebook entries</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Saved takeaways, code snippets, and study explanations.</p>
                  <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                    <Link href="/learn">Open Notebook</Link>
                  </Button>
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <ListChecks className="h-6 w-6 text-muted-foreground" />
                    <span className="font-serif text-[28px] font-medium leading-none">{stats.reviewDueCount}</span>
                  </div>
                  <h3 className="mt-3 font-serif text-lg font-medium">Review queue</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Missed quiz questions, spaced out until they stick.</p>
                  <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                    <Link href="/review">Review ({stats.reviewDueCount} due)</Link>
                  </Button>
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <PackageCheck className="h-6 w-6 text-muted-foreground" />
                    <span className="font-serif text-[28px] font-medium leading-none">{stats.purchasesCount}</span>
                  </div>
                  <h3 className="mt-3 font-serif text-lg font-medium">Digital products</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Books, templates, and downloadable resources.</p>
                  <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                    <Link href="/products">Browse Catalog</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: PURCHASES */}
      {activeTab === 'purchases' && (
        <Card>
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
              <PackageCheck className="h-5 w-5" />
            </div>
            <CardTitle>Purchase history & downloads</CardTitle>
            <CardDescription>Products bought with your account email appear here automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            {purchases.length ? (
              <div className="divide-y divide-border/70">
                {purchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{purchase.title}</p>
                        <span className="rounded-md border border-border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.06em]">
                          {purchase.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatCurrency(purchase.amount, purchase.currency)}{' '}
                        · {new Date(purchase.purchasedAt).toLocaleDateString()} · Order {purchase.purchaseId.slice(0, 8)}
                      </p>
                    </div>

                    {purchase.downloadUrl ? (
                      <Button asChild variant="outline" className="shrink-0">
                        <a href={purchase.downloadUrl}>
                          <Download className="mr-2 h-4 w-4" /> {purchase.downloadable ? `Download (${purchase.downloadsRemaining} left)` : 'Download'}
                        </a>
                      </Button>
                    ) : purchase.slug ? (
                      <Button asChild variant="outline" className="shrink-0">
                        <Link href={`/products/${purchase.slug}`}>View product</Link>
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <PackageCheck className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 font-semibold">No purchases found</p>
                <p className="mt-1 text-sm text-muted-foreground">Completed purchases matching {account.email} will appear here.</p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/products">Browse products</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: SECURITY */}
      {activeTab === 'security' && (
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Change Password Card */}
          <Card>
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
                <KeyRound className="h-5 w-5" />
              </div>
              <CardTitle>Password & Authentication</CardTitle>
              <CardDescription>Changing your password immediately signs out all active sessions.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={changePassword} className="space-y-4">
                <label className="block space-y-2 text-sm font-medium">
                  Current password
                  <Input
                    type="password"
                    autoComplete="current-password"
                    value={passwords.currentPassword}
                    onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })}
                    required
                    maxLength={72}
                  />
                </label>

                <label className="block space-y-2 text-sm font-medium">
                  New password
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={passwords.password}
                    onChange={(event) => setPasswords({ ...passwords, password: event.target.value })}
                    required
                    minLength={12}
                    maxLength={72}
                  />
                </label>

                <label className="block space-y-2 text-sm font-medium">
                  Confirm new password
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={passwords.confirmation}
                    onChange={(event) => setPasswords({ ...passwords, confirmation: event.target.value })}
                    required
                    minLength={12}
                    maxLength={72}
                  />
                </label>

                <Feedback value={passwordFeedback} />

                <Button disabled={passwordLoading}>
                  {passwordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update password
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Email Verification Status Card */}
          <Card>
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <CardTitle>Email verification status</CardTitle>
              <CardDescription>Verification ensures secure password recovery and account ownership.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {account.emailVerified ? (
                <div className="rounded-xl border border-success/20 bg-success/10 p-5 text-success">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-6 w-6 text-success" />
                    <div>
                      <p className="font-semibold">Email address verified</p>
                      <p className="text-xs text-success/80">{account.email}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 rounded-xl border border-warning/30 bg-warning/10 p-5 text-warning">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="h-6 w-6 text-warning" />
                    <div>
                      <p className="font-semibold">Email pending verification</p>
                      <p className="text-xs text-warning/80">Please verify {account.email}</p>
                    </div>
                  </div>
                  <Feedback value={resendFeedback} />
                  <Button
                    onClick={resendVerification}
                    disabled={resendLoading}
                    variant="outline"
                    className="w-full border-warning/40"
                  >
                    {resendLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Resend verification email
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 5: PRIVACY */}
      {activeTab === 'privacy' && (
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Data Export Card */}
          <Card>
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
                <Download className="h-5 w-5" />
              </div>
              <CardTitle>Export your data (GDPR)</CardTitle>
              <CardDescription>
                Download a machine-readable JSON copy of your profile, course progress, AI notes, quiz records, purchases, and newsletter subscription data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <a href="/api/account/export">
                  <Download className="mr-2 h-4 w-4" /> Export account data
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Delete Account Card */}
          <Card className="border-destructive/40">
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <CardTitle>Delete learner account</CardTitle>
              <CardDescription>
                Permanently deletes your profile, course progress, notes, quiz attempts, and newsletter record. Transaction logs are anonymized.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAdmin ? (
                <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                  Admin accounts must be managed outside learner settings.
                </p>
              ) : (
                <form onSubmit={deleteAccount} className="space-y-4">
                  <label className="block space-y-2 text-sm font-medium">
                    Password
                    <Input
                      type="password"
                      autoComplete="current-password"
                      value={deletion.password}
                      onChange={(event) => setDeletion({ ...deletion, password: event.target.value })}
                      required
                    />
                  </label>

                  <label className="block space-y-2 text-sm font-medium">
                    Type DELETE to confirm
                    <Input
                      value={deletion.confirmation}
                      onChange={(event) => setDeletion({ ...deletion, confirmation: event.target.value })}
                      required
                      placeholder="DELETE"
                    />
                  </label>

                  <Feedback value={deleteFeedback} />

                  <Button
                    variant="destructive"
                    disabled={deleteLoading || deletion.confirmation !== 'DELETE'}
                    className="w-full"
                  >
                    {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Permanently delete account
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
