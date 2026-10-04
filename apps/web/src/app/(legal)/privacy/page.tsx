import type { Metadata } from 'next';
import { LegalDocument } from '@/components/legal/legal-document';

export const metadata: Metadata = {
  title: 'Eckam Creation — Privacy Policy',
  description:
    'How Eckam Creation may use information provided through the website, accounts, orders and contact enquiries.',
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      kicker="Legal"
      title="Privacy Policy"
      intro="This page explains, in general terms, the kinds of information that may be collected when you use the Eckam Creation website."
      draftNotice="This is a general informational draft. It is not a complete privacy notice and does not describe a specific data-protection registration, retention schedule, or named third-party provider."
      currentPath="/privacy"
      sections={[
        {
          id: 'information-you-may-provide',
          title: 'Information you may provide',
          paragraphs: [
            'You may choose to provide information when you create an account, save an address, place or review an order, use the shopping bag, or send a contact enquiry.',
            'Typical details can include a name, email address, account credentials, delivery or billing address, and order-related information such as selected products and quantities.',
          ],
        },
        {
          id: 'account-information',
          title: 'Account information',
          paragraphs: [
            'If you register, the website stores the account details needed to sign you in and show your profile, addresses, orders and wishlist.',
            'You can review account information from the Account area when you are signed in.',
          ],
        },
        {
          id: 'order-information',
          title: 'Order information',
          paragraphs: [
            'When you start checkout, the website may use cart and checkout details to prepare an order. Order history is shown in Account when an order exists for your session.',
            'Payment details are handled only to the extent the checkout process is available. Online payment is not currently completed on this website.',
          ],
        },
        {
          id: 'contact-enquiries',
          title: 'Contact and enquiry information',
          paragraphs: [
            'The Contact page lets you enter a name, email address, subject and message. Those fields are checked in the browser so the form can be completed.',
            'Enquiry delivery is not available on this website yet, so a submitted enquiry is not sent to an inbox or stored as a customer ticket.',
          ],
        },
        {
          id: 'how-information-is-used',
          title: 'How information is used',
          paragraphs: [
            'Information is used to operate the website and provide the shopping experience: browsing the catalogue, managing a cart, signing in, preparing checkout, and showing account pages.',
            'This draft does not describe marketing lists, advertising profiles, or automated decision-making.',
          ],
        },
        {
          id: 'cookies-and-browser-storage',
          title: 'Cookies and browser storage',
          paragraphs: [
            'The website may use cookies or similar technologies that are needed to keep a signed-in session and to operate the storefront.',
            'The shopping bag may also use session storage in your browser to keep a local presentation of items. This draft does not list every cookie name or a retention period.',
          ],
        },
        {
          id: 'security',
          title: 'Security',
          paragraphs: [
            'The website is built to limit unnecessary exposure of account and order information. No method of transmission or storage is completely secure.',
            'Do not share your password. Sign out when using a shared device.',
          ],
        },
        {
          id: 'third-party-services',
          title: 'Third-party services',
          paragraphs: [
            'The website may rely on hosting and other infrastructure needed to run the storefront and related services.',
            'This draft does not name an analytics provider, advertising platform, email provider, or payment provider, because those services are not presented here as configured customer-facing integrations.',
          ],
        },
        {
          id: 'your-choices',
          title: 'Your choices',
          paragraphs: [
            'You can update account details from the Account area when you are signed in. You can also use the Contact page to prepare an enquiry, noting that delivery is not yet available.',
            'A published customer-support email or postal address is not listed on this page because those details are not published on the website.',
          ],
        },
        {
          id: 'changes',
          title: 'Changes to this draft',
          paragraphs: [
            'This informational draft may be replaced with a fuller privacy notice before purchases that require it are processed.',
          ],
        },
      ]}
    />
  );
}
