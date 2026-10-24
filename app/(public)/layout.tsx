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
      <ScrollProgress />
      <RouteAnalytics />
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
      <BackToTop />
    </div>
  )
}
