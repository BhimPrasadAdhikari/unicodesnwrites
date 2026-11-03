import { Navbar } from "@/components/public/Navbar"
import { RouteAnalytics } from "@/components/analytics/RouteAnalytics"

/** Lesson pages are a full-height workspace: the site header stays, but no footer or page-level scroll helpers. */
export default function LearnLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="publication flex min-h-screen flex-col">
      <RouteAnalytics />
      <Navbar />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
    </div>
  )
}
