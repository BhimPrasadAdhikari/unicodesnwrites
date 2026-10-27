import { Navbar } from "@/components/public/Navbar"
import { Footer } from "@/components/public/Footer"
import { ScrollProgress } from "@/components/public/ScrollProgress"
import { BackToTop } from "@/components/public/BackToTop"
import { RouteAnalytics } from "@/components/analytics/RouteAnalytics"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="publication flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-foreground focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-background"
      >
        Skip to content
      </a>
      <ScrollProgress />
      <RouteAnalytics />
      <Navbar />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <Footer />
      <BackToTop />
    </div>
  )
}
