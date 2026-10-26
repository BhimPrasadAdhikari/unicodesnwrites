import { siteConfig } from '@/lib/config/site.config';

// unicodesnwrites is a Lagnever product: payments, invoices and support run under
// Lagnever's merchant account. The seller name and support contacts must match that
// Razorpay account exactly (Account & Settings → Business / Customer support details):
// an Individual business, Business Name "SHAKEELA BEGUM", Brand Name "LAGNEVER".
const LAGNEVER_ADDRESS = 'Rajouri, Jammu & Kashmir, India';

export const businessConfig = {
  brand: siteConfig.name,
  website: `https://${siteConfig.domain}`,
  legalName: process.env.BUSINESS_LEGAL_NAME || 'LAGNEVER (proprietor: Shakeela Begum)',
  parentBrand: 'Lagnever AI',
  parentWebsite: 'https://www.lagnevertech.com',
  supportEmail: process.env.BUSINESS_SUPPORT_EMAIL || 'support@lagnevertech.com',
  supportPhone: process.env.BUSINESS_SUPPORT_PHONE || '+91 96226 85834',
  // The newsletter footer uses the same address, so legal pages and emails never disagree.
  postalAddress: process.env.BUSINESS_POSTAL_ADDRESS || process.env.NEWSLETTER_POSTAL_ADDRESS || LAGNEVER_ADDRESS,
  // Name + address line for email footers (CAN-SPAM wants a physical address).
  get mailingAddress() {
    return `${this.legalName}, ${this.postalAddress}`;
  },
  jurisdiction: 'the courts in Jammu & Kashmir, India',
  paymentProvider: 'Razorpay',
  currency: 'INR',
};
