'use client';

import dynamic from 'next/dynamic';

const EckamAiWidget = dynamic(() => import('./eckam-ai-widget'), { ssr: false });

export function EckamAiRoot() {
  return <EckamAiWidget />;
}
