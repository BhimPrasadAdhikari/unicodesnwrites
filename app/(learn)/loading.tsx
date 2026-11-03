export default function LessonLoading() {
  return (
    <div className="flex h-[calc(100dvh-4rem)] animate-pulse" aria-busy="true" aria-label="Loading lesson">
      <div className="hidden w-72 border-r border-border bg-card lg:block" />
      <div className="flex-1 p-6">
        <div className="aspect-video max-w-4xl rounded-xl bg-muted" />
        <div className="mt-6 h-6 w-1/2 rounded bg-muted" />
      </div>
    </div>
  )
}
