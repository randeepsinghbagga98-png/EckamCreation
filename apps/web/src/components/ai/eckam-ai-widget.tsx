'use client';

import { usePathname } from 'next/navigation';
import { EckamAiLauncher } from './eckam-ai-launcher';
import { EckamAiPanel } from './eckam-ai-panel';

export function EckamAiWidget() {
  const pathname = usePathname() || '/';
  const hideLauncher = pathname.startsWith('/checkout') || pathname.startsWith('/cart');

  return (
    <div className="eckam-ai-shell">
      {hideLauncher ? null : <EckamAiPanel />}
      <EckamAiLauncher hidden={hideLauncher} />
    </div>
  );
}

export default EckamAiWidget;
