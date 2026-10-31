import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { CertificateActions } from "@/components/public/CertificateActions";
import { SiteIcon } from "@/components/ui/SiteIcon";

import { authOptions } from "@/lib/config/auth";
import { listLearnerCertificates } from "@/lib/services/certificates";
import { listLearnerEnrollments } from "@/lib/services/course-enrollment";
import { Container } from "@/components/ui/Section";

export const metadata = {
  title: "My learning",
  robots: { index: false, follow: false },
  description: "Carry on with the courses you have started.",
};
export const dynamic = "force-dynamic";

export default async function MyLearningPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.sessionValid)
    redirect("/login?reauth=1&from=%2Flearn");
  if (session.user.role !== "admin" && !session.user.emailVerified)
    redirect("/verify-email");
  const [enrollments, certificates] = await Promise.all([
    listLearnerEnrollments(session.user.id),
    // A certificate problem should never hide the courses list.
    listLearnerCertificates(session.user.id).catch(() => []),
  ]);
  const certificateFor = new Map(certificates.map((certificate) => [certificate.courseSlug, certificate]));

  return (
    <div className="pb-24">
      <section className="border-b border-border py-12 sm:py-16">
        <Container className="max-w-[1200px]">
          <p className="text-eyebrow text-primary">Your account</p>
          <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="text-title">My learning</h1>
            <nav aria-label="Learner" className="flex gap-1 border-b border-border sm:border-0">
              <span aria-current="page" className="-mb-px inline-flex h-11 items-center border-b-2 border-primary px-3.5 text-[15px] font-semibold">Courses</span>
              <Link href="/learn/notebook" className="-mb-px inline-flex h-11 items-center border-b-2 border-transparent px-3.5 text-[15px] font-medium text-muted-foreground hover:text-foreground">Notes</Link>
              <Link href="/review" className="-mb-px inline-flex h-11 items-center border-b-2 border-transparent px-3.5 text-[15px] font-medium text-muted-foreground hover:text-foreground">Review</Link>
              <Link href="/account" className="-mb-px inline-flex h-11 items-center border-b-2 border-transparent px-3.5 text-[15px] font-medium text-muted-foreground hover:text-foreground">Account</Link>
            </nav>
          </div>
          <p className="mt-4 max-w-2xl text-[17px] leading-[1.6] text-muted-foreground">
            Pick up where you left off. Your progress stays in sync with your account.
          </p>
        </Container>
      </section>
      <Container className="max-w-[1200px] py-12">
        {enrollments.length ? (
          <div className="grid gap-5 md:grid-cols-2">
            {enrollments.map((item) => {
              const certificate = item.status === "completed" ? certificateFor.get(item.slug) : undefined;
              return (
                <article key={item.id} className="flex flex-col rounded-3xl border border-border bg-card p-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">
                      Course · {item.level}
                    </p>
                    {item.status === "completed" && (
                      <span className="flex items-center gap-1 font-mono text-[12px] uppercase tracking-[0.06em] text-success">
                        <CheckCircle2 className="h-4 w-4" /> Completed
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex items-start gap-4">
                    <SiteIcon kind="courses" size={40} className="mt-1 shrink-0" />
                    <h2 className="font-serif text-2xl font-medium leading-tight">{item.title}</h2>
                  </div>
                  <p className="mt-3 line-clamp-2 text-[15px] leading-6 text-muted-foreground">{item.summary}</p>
                  <div className="mt-6 h-1 overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-foreground" style={{ width: `${item.progress}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between font-mono text-[12px] text-muted-foreground">
                    <span>{item.completed} OF {item.total} LESSONS</span>
                    <span>{item.progress}%</span>
                  </div>
                  <Link
                    href={item.resumeLesson ? `/courses/${item.slug}/learn/${item.resumeLesson}` : `/courses/${item.slug}`}
                    className="mt-6 inline-flex h-11 w-fit items-center rounded-lg bg-foreground px-5 text-[15px] font-medium text-background hover:bg-foreground/90"
                  >
                    {item.status === "completed" ? "Review course" : "Continue"}
                  </Link>
                  {certificate ? (
                    <div className="mt-6 border-t border-border pt-5">
                      <h3 className="flex items-center gap-2 font-serif text-lg font-medium">
                        <SiteIcon kind="learning" size={24} /> Your certificate
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">You finished the course! Here&apos;s your certificate.</p>
                      <CertificateActions certificate={certificate} compact className="mt-4" />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-card p-8 sm:p-10">
            <SiteIcon kind="learning" size={48} />
            <h2 className="mt-4 font-serif text-[28px] font-medium">Start your first course.</h2>
            <p className="mt-3 max-w-md text-[15px] leading-6 text-muted-foreground">
              Pick a free course and learn how AI works, one short lesson at a time.
            </p>
            <Link
              href="/courses"
              className="mt-6 inline-flex h-11 items-center rounded-lg bg-foreground px-5 text-[15px] font-medium text-background hover:bg-foreground/90"
            >
              See the courses
            </Link>
          </div>
        )}
      </Container>
    </div>
  );
}
