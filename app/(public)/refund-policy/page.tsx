import { Metadata } from 'next';
import { PolicyPage } from '@/components/public/PolicyPage';
import { businessConfig } from '@/lib/config/business';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy',
  description: 'How refunds and cancellations work for digital products bought on unicodesnwrites.',
};

export default function RefundPolicyPage() {
  return (
    <PolicyPage
      path="/refund-policy"
      event="refund_policy_page_view"
      title="Refund & Cancellation Policy"
      updated="October 25, 2026"
      summary="Like every Lagnever product, payments on unicodesnwrites are final and non-refundable. We only refund a confirmed duplicate charge, an order we cannot deliver, or where the law requires it."
      sections={[
        {
          title: 'Final payments',
          paragraphs: [
            `All purchases on unicodesnwrites are final. This follows the payment policy of ${businessConfig.legalName} across all Lagnever products: we do not refund digital products, templates, tools, e-books or any other paid item once it has been delivered, including if you change your mind.`,
          ],
        },
        {
          title: 'When we do refund',
          paragraphs: ['We issue a full refund only when:'],
          list: [
            'you were charged more than once for the same order because of a technical issue, and we confirm the duplicate with Razorpay;',
            'the payment went through but we cannot deliver the download within 48 hours of your request;',
            'a refund is required by applicable law.',
          ],
        },
        {
          title: 'Failed or unauthorised payments',
          paragraphs: [
            'If a payment fails but money leaves your account, your bank or Razorpay reverses it automatically, usually within 5 to 7 working days. If a payment looks unauthorised, contact us with the payment details and we will investigate with Razorpay.',
          ],
        },
        {
          title: 'Cancellations',
          paragraphs: [
            'Orders are fulfilled the moment payment succeeds, so they cannot be cancelled afterwards. If you close the payment window before paying, nothing is charged and the unpaid order simply expires.',
          ],
        },
        {
          title: 'Parent or guardian approval',
          paragraphs: [
            'Buyers under the age of majority must have a parent or guardian approve a payment before making it.',
          ],
        },
        {
          title: 'How approved refunds are paid',
          paragraphs: [
            `Approved refunds go back to the original payment method (UPI, card, netbanking or wallet) through ${businessConfig.paymentProvider} and normally reach you within 5 to 7 working days, depending on your bank. Amounts are in Indian rupees (INR). Once a refund is issued, the download link for that order stops working.`,
          ],
        },
      ]}
    />
  );
}
