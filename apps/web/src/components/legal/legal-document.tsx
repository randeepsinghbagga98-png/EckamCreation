import Link from 'next/link';

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
};

type RelatedLink = {
  href: string;
  label: string;
};

const RELATED_LINKS: RelatedLink[] = [
  { href: '/shop', label: 'Shop' },
  { href: '/collections', label: 'Collections' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/refund-policy', label: 'Refund Policy' },
];

type LegalDocumentProps = {
  kicker: string;
  title: string;
  intro: string;
  draftNotice: string;
  currentPath: string;
  sections: LegalSection[];
};

export function LegalDocument({
  kicker,
  title,
  intro,
  draftNotice,
  currentPath,
  sections,
}: LegalDocumentProps) {
  const related = RELATED_LINKS.filter((link) => link.href !== currentPath);

  return (
    <article className="legal-page">
      <header className="legal-hero">
        <div className="legal-hero-inner">
          <p className="legal-kicker">{kicker}</p>
          <h1 className="legal-title">{title}</h1>
          <p className="legal-intro">{intro}</p>
        </div>
      </header>

      <div className="legal-body">
        <div className="legal-prose">
          <p className="legal-notice" role="note">
            {draftNotice}
          </p>

          {sections.map((section) => (
            <section key={section.id} aria-labelledby={section.id}>
              <h2 id={section.id} className="legal-heading">
                {section.title}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}

          <nav className="legal-related" aria-label="Related pages">
            <h2 className="legal-heading">Continue shopping</h2>
            <p>
              Return to the store or review another policy page.
            </p>
            <ul className="legal-related-list">
              {related.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="legal-link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </article>
  );
}
