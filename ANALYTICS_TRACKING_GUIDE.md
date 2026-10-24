# Vercel Analytics Custom Event Tracking Implementation

## Overview

This document outlines the custom event tracking system implemented with Vercel Analytics for tracking user interactions, conversions, and engagement metrics across your portfolio and CMS.

## Setup Completed

✅ Installed `@vercel/analytics` package  
✅ Added `<Analytics />` component to root layout  
✅ Created tracking hooks and utilities  
✅ Integrated event tracking into components  
✅ Added Custom Events dashboard widget  
✅ Created Events analytics table

## Event Tracking Architecture

### 1. Client-Side Tracking with `useEventTracker`

For general user interactions (clicks, views, impressions):

```typescript
'use client';
import { useEventTracker } from '@/hooks/useEventTracker';

export function MyComponent() {
  const { trackEvent } = useEventTracker();

  const handleAction = () => {
    trackEvent('button_click', {
      location: 'homepage',
      category: 'engagement',
      value: 'specific_action',
    });
  };

  return <button onClick={handleAction}>Click me</button>;
}
```

### 2. Server-Side Tracking

For critical events like signups and purchases:

```typescript
// In your API route or Server Action
import { trackNewsletterSignup, trackContactSubmit, trackProductPurchase } from '@/lib/services/event-tracking';

// Track newsletter signup
await trackNewsletterSignup(email);

// Track contact form
await trackContactSubmit(subject, email);

// Track product purchase
await trackProductPurchase(productName, price, quantity);
```

## Tracked Events

### User Engagement
- **`resume_download`** - Resume PDF download
- **`cta_button_click`** - CTA button interactions
- **`social_link_click`** - Social media link clicks
  
### Content
- **`blog_view`** - Blog post views
- **`blog_scroll_progress`** - Reading depth tracking
- **`blog_comment_submit`** - Comment submissions

### Conversions
- **`newsletter_signup`** - Newsletter form submissions
- **`contact_form_submit`** - Contact form submissions
- **`product_view`** - Product page views
- **`product_purchase`** - Purchase completions

### Features
- **`project_filter`** - Portfolio filtering
- **`code_walkthrough_open`** - Code walkthrough modal opens
- **`series_view`** - Series/course views

## Custom Data Fields

Every event includes:
- `timestamp` - Automatically added server-side
- `location` - Where the action occurred (footer, header, page-specific)
- `category` - Event category (engagement, conversion, downloads, etc.)
- `value` - Numeric or string value (price, result status, etc.)
- `source` - Referrer/source of action

Example:
```typescript
trackEvent('newsletter_signup', {
  location: 'footer',
  category: 'conversion',
  source: 'homepage',
});
```

## Components Using Tracking

### Already Updated
- ✅ `NewsletterSignupForm` - Newsletter signup form
- ✅ `ContactForm` - Contact form submissions  
- ✅ `app/api/contact` - Server-side contact tracking
- ✅ `app/api/newsletter/subscribe` - Server-side newsletter tracking

### Tracking Wrappers (Ready to Use)
- `ResumeDownloadLink` - Wrap resume links with this
- `SocialLink` - Wrap social media links with this
- `TrackableButton` - Wrap CTA buttons with this

### Dashboard Components
- `EventsMetricsCard` - Dashboard overview widget
- `EventsTable` - Detailed events analytics table

## Integration Examples

### Resume Download Button
```tsx
import { ResumeDownloadLink } from '@/components/public/ResumeDownloadLink';

export function MyComponent() {
  return (
    <ResumeDownloadLink
      url={siteConfig.author.resumeUrl}
      className="button-class"
    >
      Download Resume
    </ResumeDownloadLink>
  );
}
```

### Social Links
```tsx
import { SocialLink } from '@/components/public/SocialLink';

export function Footer() {
  return (
    <SocialLink
      href={siteConfig.social.github}
      platform="github"
      className="link-class"
    >
      GitHub
    </SocialLink>
  );
}
```

### CTA Buttons
```tsx
import { TrackableButton } from '@/components/public/TrackableButton';

export function Hero() {
  return (
    <TrackableButton
      action="hero_cta_click"
      location="hero-section"
    >
      Get Started
    </TrackableButton>
  );
}
```

## Dashboard Analytics

### Main Dashboard (`/dashboard`)
- **EventsMetricsCard** widget showing top 5 events
- Quick overview of custom event activity (last 7 days)
- Links to detailed analytics page

### Analytics Page (`/dashboard/analytics`)
- **Custom Events** section with detailed table
- All event names, counts, and trending percentages
- Organized by categories (engagement, conversion, etc.)
- Last occurred timestamp for each event

### Analytics API (`/api/analytics/events`)
Fetches event data with filters:
```
GET /api/analytics/events?range=7days&limit=10
```

Response:
```json
{
  "events": [
    {
      "name": "newsletter_signup",
      "count": 28,
      "change": 8,
      "category": "Conversion",
      "lastOccurred": "2026-05-13T10:30:00.000Z",
      "icon": "📧"
    }
  ],
  "total": 958,
  "range": "7days",
  "updated": "2026-05-13T12:00:00.000Z"
}
```

## Next Steps for Full Integration

1. **Update Resume Links** - Replace resume download links with `ResumeDownloadLink` component in:
   - `components/public/Navbar.tsx`
   - `components/public/Hero.tsx`
   - `components/public/Footer.tsx`
   - `app/(public)/about/page.tsx`
   - `app/(public)/contact/page.tsx`

2. **Update Social Links** - Replace social links with `SocialLink` component in:
   - `components/public/Footer.tsx`
   - `app/(public)/contact/page.tsx`

3. **Add Blog Tracking** - Add server-side tracking for blog views:
   ```typescript
   // In blog layout or page component
   import { trackBlogView } from '@/lib/services/event-tracking';
   await trackBlogView(post.title, post.slug, post.category);
   ```

4. **Add Product Tracking** - Track product views and purchases:
   ```typescript
   // In product page
   await trackBlogView(product.name, product.slug, 'products');
   ```

5. **Custom Events** - Add tracking for specific features:
   - Code walkthrough opens
   - Portfolio filters
   - Series views

## Production Setup

Once deployed to Vercel:

1. **Verify Deployment**
   - Visit your Vercel dashboard
   - Go to **Analytics** tab
   - Events should appear after users interact with your site

2. **Monitor Events**
   - Check `/dashboard/analytics` for event summaries
   - Monitor `EventsMetricsCard` on main dashboard
   - Use Vercel Web Analytics dashboard for deeper insights

3. **Optimize Based on Data**
   - Identify high-converting pages
   - Track user engagement patterns
   - Refine CTAs and newsletter signup placement

## Design Philosophy Maintained

- ✨ **Brand Consistency** - Uses blue primary and cyan accent colors
- 📐 **Clean UI** - Minimal shadows, subtle borders, strong hierarchy
- 🎨 **Consistent Styling** - Matches existing dashboard design
- 🔵 **Color Scheme** - Integrates with existing Tailwind theme

## Troubleshooting

### Events Not Appearing in Dashboard
1. Check browser console for errors
2. Verify `@vercel/analytics` is installed (`npm list @vercel/analytics`)
3. Ensure `<Analytics />` component is in root layout
4. Wait 5-10 minutes for initial tracking data

### Server-Side Events Not Tracking
1. Verify API route has proper imports
2. Check `VERCEL_AUTOMATION_BYPASS_SECRET` is set if using Deployment Protection
3. Review function calls match expected signatures
4. Check CloudWatch/server logs for errors

## File Structure

```
hooks/
├── useEventTracker.ts        # Client-side tracking hook
└── useAnalytics.ts           # Legacy hook (keeping for compatibility)

lib/
└── services/
    └── event-tracking.ts     # Server-side tracking utilities

components/
├── public/
│   ├── ResumeDownloadLink.tsx
│   ├── SocialLink.tsx
│   └── TrackableButton.tsx
└── cms/
    ├── EventsMetricsCard.tsx
    └── charts/
        └── EventsTable.tsx

app/
├── api/
│   └── analytics/
│       └── events/
│           └── route.ts      # Events API endpoint
└── dashboard/
    └── analytics/
        └── page.tsx          # Analytics page with EventsTable
```

## Questions & Support

For issues with event tracking:
1. Check the implementation examples above
2. Review your component's hook usage
3. Verify API responses in Network tab
4. Contact Vercel support for platform-level issues
