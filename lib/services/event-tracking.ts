import { track } from '@vercel/analytics/server';

type ServerEventName = 
  | 'blog_view'
  | 'newsletter_signup'
  | 'contact_form_submit'
  | 'product_purchase'
  | 'series_view'
  | 'custom_event';

interface ServerEventData {
  location?: string;
  category?: string;
  value?: number | string;
  source?: string;
  userId?: string;
  [key: string]: any;
}

/**
 * Track server-side events for analytics
 * Use this for critical tracking like purchases and signups
 */
export async function trackServerEvent(
  eventName: ServerEventName,
  data?: ServerEventData
): Promise<void> {
  try {
    await track(eventName, {
      timestamp: new Date().toISOString(),
      ...data,
    });
  } catch (error) {
    console.error(`Failed to track server event: ${eventName}`, error);
    // Don't throw - analytics failure shouldn't break functionality
  }
}

/**
 * Track blog view with metadata
 */
export async function trackBlogView(
  postTitle: string,
  slug: string,
  category?: string
): Promise<void> {
  await trackServerEvent('blog_view', {
    post_title: postTitle,
    slug,
    category,
  });
}

/**
 * Track newsletter signup
 */
export async function trackNewsletterSignup(email?: string): Promise<void> {
  await trackServerEvent('newsletter_signup', {
    email_provided: !!email,
  });
}

/**
 * Track contact form submission
 */
export async function trackContactSubmit(
  subject: string,
  email?: string
): Promise<void> {
  await trackServerEvent('contact_form_submit', {
    subject,
    email_provided: !!email,
  });
}

/**
 * Track product purchase
 */
export async function trackProductPurchase(
  productName: string,
  price: number,
  quantity: number = 1
): Promise<void> {
  await trackServerEvent('product_purchase', {
    product_name: productName,
    price,
    quantity,
    total: price * quantity,
  });
}

/**
 * Track series/course view
 */
export async function trackSeriesView(
  seriesTitle: string,
  seriesId: string
): Promise<void> {
  await trackServerEvent('series_view', {
    series_title: seriesTitle,
    series_id: seriesId,
  });
}
