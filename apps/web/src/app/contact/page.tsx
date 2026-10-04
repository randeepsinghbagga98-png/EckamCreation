import { ContactForm } from '@/components/contact/contact-form';
import { ContactHero } from '@/components/contact/contact-hero';
import { ContactPanel } from '@/components/contact/contact-panel';

export default function ContactPage() {
  return (
    <div className="contact-page">
      <ContactHero />
      <section
        aria-labelledby="contact-form-heading"
        className="bg-[#F6F0E5] text-[#1A1815]"
      >
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-12 lg:gap-16 lg:px-12 lg:py-24">
          <div className="lg:col-span-7">
            <h2
              id="contact-form-heading"
              className="font-sans text-[clamp(28px,4vw,40px)] font-light leading-tight tracking-[-0.03em] uppercase"
            >
              Send an enquiry
            </h2>
            <p className="mt-4 max-w-lg text-[15px] font-light leading-relaxed text-[#1A1815]/70">
              Share your question below. Delivery of messages is not available
              on this page yet.
            </p>
            <div className="mt-10">
              <ContactForm />
            </div>
          </div>
          <div className="lg:col-span-5">
            <ContactPanel />
          </div>
        </div>
      </section>
    </div>
  );
}
