import { AboutApproach } from '@/components/about/about-approach';
import { AboutCategories } from '@/components/about/about-categories';
import { AboutCta } from '@/components/about/about-cta';
import { AboutDiscovery } from '@/components/about/about-discovery';
import { AboutEvolving } from '@/components/about/about-evolving';
import { AboutHero } from '@/components/about/about-hero';
import { AboutStandard } from '@/components/about/about-standard';
import { AboutWorld } from '@/components/about/about-world';

export default function AboutPage() {
  return (
    <div className="about-page">
      <AboutHero />
      <AboutApproach />
      <AboutStandard />
      <AboutCategories />
      <AboutWorld />
      <AboutDiscovery />
      <AboutEvolving />
      <AboutCta />
    </div>
  );
}
