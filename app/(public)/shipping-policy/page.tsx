import { Metadata } from 'next';
import { PolicyPage } from '@/components/public/PolicyPage';

export const metadata: Metadata = {
  title: 'Shipping & Delivery Policy',
  description: 'How digital products bought on unicodesnwrites are delivered.',
};

export default function ShippingPolicyPage() {
  return (
    <PolicyPage
      path="/shipping-policy"
      event="shipping_policy_page_view"
      title="Shipping & Delivery Policy"
      updated="October 25, 2026"
      summary="Everything we sell is digital. Nothing is shipped: you download your files right after payment and get the same link by email."
      sections={[
        {
          title: 'Digital delivery only',
          paragraphs: [
            'Products on unicodesnwrites are digital files (templates, tools, e-books and course material). We do not ship physical goods, so there are no shipping charges and no delivery address is needed.',
          ],
        },
        {
          title: 'When you receive your order',
          list: [
            'Immediately after payment, the order page shows a download button.',
            'A confirmation email with the same download link is sent to the email you used at checkout, usually within a few minutes.',
            'Each download link stays valid for 24 hours and allows up to 5 downloads. Signed-in buyers can find their purchases under Account, and we can send a fresh link any time.',
          ],
        },
        {
          title: 'If your order does not arrive',
          paragraphs: [
            'If you have not received the email within 2 hours, check your spam folder, then contact us with your order ID or Razorpay payment ID. We resend the link or, if delivery is not possible, refund you under the Refund & Cancellation Policy.',
          ],
        },
        {
          title: 'Courses',
          paragraphs: [
            'Courses are delivered online on this website. Access starts as soon as you enrol and there is nothing to ship.',
          ],
        },
      ]}
    />
  );
}
