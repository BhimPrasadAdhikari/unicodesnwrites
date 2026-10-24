import { Container } from '@/components/ui/Section';
import { Skeleton } from '@/components/ui/Skeleton';

/** Shown while a public page's data loads, so a click always answers at once. */
export default function Loading() {
  return (
    <Container className="py-12 sm:py-16" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-10 w-full max-w-2xl" />
      <Skeleton className="mt-3 h-10 w-2/3 max-w-xl" />
      <Skeleton className="mt-6 h-4 w-full max-w-xl" />
      <div className="mt-12 space-y-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-5 border-t border-border pt-8">
            <Skeleton className="hidden h-24 w-24 shrink-0 rounded-xl sm:block" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
