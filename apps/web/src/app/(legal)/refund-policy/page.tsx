import type { Metadata } from 'next';
import { LegalDocument } from '@/components/legal/legal-document';

export const metadata: Metadata = {
  title: 'Eckam Creation — Refund Policy',
  description:
    'General information about refunds, returns and cancellations for Eckam Creation purchases.',
};

export default function RefundPolicyPage() {
  return (
    <LegalDocument
      kicker="Legal"
      title="Refund Policy"
      intro="This page explains, in general terms, how refunds, returns and cancellations are treated while commercial rules are still being published."
      draftNotice="This is a general informational draft. It does not set a refund window, free-return offer, replacement guarantee, or instant-refund promise."
      currentPath="/refund-policy"
      sections={[
        {
          id: 'scope',
          title: 'Scope',
          paragraphs: [
            'Refunds, returns and cancellations are subject to the applicable order terms communicated for the relevant purchase.',
            'This page applies to purchases made through the Eckam Creation website once an order process is available for that purchase.',
          ],
        },
        {
          id: 'when-rules-apply',
          title: 'When detailed rules apply',
          paragraphs: [
            'Detailed refund and return conditions will be published before applicable purchases are processed.',
            'Until those conditions are published, do not rely on this page for a specific number of days, a restocking fee, or a guaranteed outcome.',
          ],
        },
        {
          id: 'payments',
          title: 'Payments and refunds',
          paragraphs: [
            'Online payment is not currently completed on this website. Any refund that later applies would follow the method and timing communicated for that order.',
            'This draft does not name a payment provider or a settlement timeline.',
          ],
        },
        {
          id: 'cancellations',
          title: 'Cancellations',
          paragraphs: [
            'A cancellation request, if available, will be handled according to the order terms shown for that purchase.',
            'Orders that have not been paid, or that cannot be completed because payment is unavailable, are not treated as finished purchases under this draft.',
          ],
        },
        {
          id: 'how-to-ask',
          title: 'How to ask a question',
          paragraphs: [
            'If you have a question about an order, start from Account when you are signed in, or use the Contact page to prepare an enquiry.',
            'Enquiry delivery is not available on the Contact page yet, and this draft does not publish a support email or phone number.',
          ],
        },
      ]}
    />
  );
}
