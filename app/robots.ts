import { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/config/site.config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/api/', '/admin/'],
    },
    sitemap: `https://${siteConfig.domain}/sitemap.xml`,
  }
}
