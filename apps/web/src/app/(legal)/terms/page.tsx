import type { Metadata } from 'next';
import { LegalDocument } from '@/components/legal/legal-document';

export const metadata: Metadata = {
  title: 'Eckam Creation — Terms & Conditions',
  description:
    'General terms for using the Eckam Creation website, catalogue, accounts and checkout.',
};

export default function TermsPage() {
  return (
    <LegalDocument
      kicker="Legal"
      title="Terms & Conditions"
      intro="These terms describe, in general terms, how you may use the Eckam Creation website."
      draftNotice="This is a general informational draft for the website. It is not a complete commercial contract and does not set a governing jurisdiction, arbitration process, or guaranteed payment method."
      currentPath="/terms"
      sections={[
        {
          id: 'introduction',
          title: '1. Introduction',
          paragraphs: [
            'Eckam Creation operates this website so you can browse curated products, collections and brand information.',
            'By using the website you agree to follow these terms and any additional terms shown for a specific page or order.',
          ],
        },
        {
          id: 'website-use',
          title: '2. Website use',
          paragraphs: [
            'You may use the website for lawful browsing, shopping and account activity.',
            'Do not attempt to disrupt the service, misuse another person’s account, or use the website for unlawful purposes.',
          ],
        },
        {
          id: 'accounts',
          title: '3. Accounts',
          paragraphs: [
            'Some features, including profile, addresses, orders and wishlist, are available when you create an account and sign in.',
            'You are responsible for keeping your sign-in details confidential and for activity that occurs under your account.',
          ],
        },
        {
          id: 'products-catalogue',
          title: '4. Products and catalogue information',
          paragraphs: [
            'Product names, descriptions, images and prices are provided to help you browse the catalogue.',
            'Catalogue information may be updated, corrected or withdrawn. Details shown on a product page should be read before you add an item to your bag.',
          ],
        },
        {
          id: 'orders',
          title: '5. Orders',
          paragraphs: [
            'Adding items to your bag and starting checkout is a request to purchase, subject to availability and the checkout steps shown at the time.',
            'An order is confirmed only through the applicable checkout and order process. Completing a form does not, by itself, guarantee fulfilment.',
          ],
        },
        {
          id: 'pricing',
          title: '6. Pricing',
          paragraphs: [
            'Prices are shown as displayed on the product, cart and checkout pages.',
            'Any taxes, shipping amounts or other charges that apply will appear in the checkout summary when those amounts are calculated for your order.',
          ],
        },
        {
          id: 'payments',
          title: '7. Payments',
          paragraphs: [
            'Checkout can prepare an order for payment when that step is available.',
            'Online payment is not currently completed on this website. Do not assume a specific payment method is live until it is shown as available during checkout.',
          ],
        },
        {
          id: 'availability',
          title: '8. Availability',
          paragraphs: [
            'Products, collections and features may be limited, updated or temporarily unavailable.',
            'If an item cannot be fulfilled, the applicable order terms shown at purchase will apply.',
          ],
        },
        {
          id: 'intellectual-property',
          title: '9. Intellectual property',
          paragraphs: [
            'The website design, brand presentation, text and other original content belong to Eckam Creation or its licensors.',
            'You may not copy or reuse site content for commercial purposes without permission.',
          ],
        },
        {
          id: 'user-conduct',
          title: '10. User conduct',
          paragraphs: [
            'Do not submit false account or checkout information, attempt to access another customer’s data, or use the website in a way that harms other users or the service.',
          ],
        },
        {
          id: 'limitation-of-information',
          title: '11. Limitation of information',
          paragraphs: [
            'Website content is provided for browsing and shopping information. It is not legal, tax or professional advice.',
            'This draft does not create warranties beyond what is expressly stated for a specific product or order.',
          ],
        },
        {
          id: 'changes-to-terms',
          title: '12. Changes to terms',
          paragraphs: [
            'These terms may be updated as the website and commercial process develop. A fuller agreement may replace this draft before applicable purchases are processed.',
          ],
        },
        {
          id: 'contact',
          title: '13. Contact',
          paragraphs: [
            'Questions about the website can be started on the Contact page. Enquiry delivery is not available on that page yet.',
            'A public support email, phone number or registered office is not listed here because those details are not published on the website.',
          ],
        },
      ]}
    />
  );
}
