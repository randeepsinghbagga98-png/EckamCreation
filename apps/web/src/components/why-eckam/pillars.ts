import type { ComponentType, SVGProps } from 'react';
import { EyeIcon, GlobeIcon, SearchIcon, SparklesIcon } from '../icons';

export type ValuePillar = {
  id: string;
  index: string;
  title: string;
  description: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export const WHY_ECKAM_PILLARS: ValuePillar[] = [
  {
    id: 'curated-with-intent',
    index: '01',
    title: 'Curated with intent',
    description: 'Thoughtfully selected products across distinctive lifestyle categories.',
    Icon: SparklesIcon,
  },
  {
    id: 'designed-for-discovery',
    index: '02',
    title: 'Designed for discovery',
    description:
      'An editorial shopping experience built to make finding something special effortless.',
    Icon: SearchIcon,
  },
  {
    id: 'india-global-reach',
    index: '03',
    title: 'India & global reach',
    description: 'A storefront designed for customers in India and international markets.',
    Icon: GlobeIcon,
  },
  {
    id: 'details-that-matter',
    index: '04',
    title: 'Details that matter',
    description: 'Careful attention to presentation, usability, and every digital touchpoint.',
    Icon: EyeIcon,
  },
];
