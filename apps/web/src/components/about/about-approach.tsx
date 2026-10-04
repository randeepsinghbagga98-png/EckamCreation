import { AboutReveal } from './about-reveal';

const APPROACH_NOTES = [
  {
    title: 'Thoughtful selection',
    copy: 'Every piece should have a reason to be here. We look for objects that earn their place in the edit.',
  },
  {
    title: 'Visual appeal',
    copy: 'Form, finish, and how something photographs matter — presentation is part of how the shop is experienced.',
  },
  {
    title: 'Usefulness',
    copy: 'Beauty without purpose is not enough. Pieces are chosen to live with — to wear, carry, set, or return to.',
  },
  {
    title: 'Gifting',
    copy: 'Some objects are selected because they are easy to give: considered, presentable, and ready for a celebration.',
  },
  {
    title: 'Personal style',
    copy: 'The edit leaves room for how you dress, decorate, and express yourself — not a single prescribed look.',
  },
  {
    title: 'Everyday discovery',
    copy: 'The shop is meant to be browsed. Finding something unexpected should feel as natural as knowing what you came for.',
  },
];

export function AboutApproach() {
  return (
    <section
      aria-labelledby="about-approach-heading"
      className="about-ivory bg-[#F6F0E5] text-[#1A1815]"
    >
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <AboutReveal className="lg:col-span-5" as="header">
            <div className="mb-5 flex items-center gap-3">
              <span
                className="h-px w-9 bg-gradient-to-r from-[#D6A84F] to-[#E8D3A4] sm:w-11"
                aria-hidden="true"
              />
              <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-[#8B6914] sm:text-[11px]">
                Our approach
              </p>
            </div>
            <h2
              id="about-approach-heading"
              className="font-sans text-[clamp(36px,5.2vw,64px)] font-light leading-[0.96] tracking-[-0.04em] uppercase"
            >
              Curated
              <span className="mt-1 block font-serif italic font-normal tracking-normal text-[#8B6914] normal-case">
                with intent.
              </span>
            </h2>
            <p className="mt-6 max-w-md text-[15px] font-light leading-relaxed text-[#1A1815]/72 sm:text-base">
              Eckam Creation is an editorial storefront. Products are selected
              for how they look, how they are used, and the moments they are
              meant for — personal style, gifting, and everyday discovery.
            </p>
          </AboutReveal>

          <ul className="grid gap-8 sm:grid-cols-2 lg:col-span-7 lg:gap-x-10 lg:gap-y-12">
            {APPROACH_NOTES.map((note, index) => (
              <li key={note.title}>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#8B6914]">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <span
                  className="mt-3 block h-px w-8 bg-[#D6A84F]"
                  aria-hidden="true"
                />
                <h3 className="mt-4 font-sans text-[15px] font-semibold tracking-[0.12em] uppercase">
                  {note.title}
                </h3>
                <p className="mt-3 text-[14px] font-light leading-relaxed text-[#1A1815]/70 sm:text-[15px]">
                  {note.copy}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
