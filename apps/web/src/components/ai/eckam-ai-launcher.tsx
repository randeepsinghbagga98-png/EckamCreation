'use client';

import { SparklesIcon } from '@/components/icons';
import { closeAiChat, openAiChat, useAiChat } from '@/lib/ai/store';

type EckamAiLauncherProps = {
  hidden?: boolean;
};

export function EckamAiLauncher({ hidden = false }: EckamAiLauncherProps) {
  const chat = useAiChat();

  if (hidden || chat.open) {
    return null;
  }

  return (
    <button
      type="button"
      className="eckam-ai-launcher"
      aria-haspopup="dialog"
      aria-expanded={chat.open}
      aria-controls="eckam-ai-panel"
      onClick={() => (chat.open ? closeAiChat() : openAiChat())}
    >
      <span className="eckam-ai-launcher-icon" aria-hidden="true">
        <SparklesIcon className="size-5" />
      </span>
      <span className="eckam-ai-launcher-label">Ask Eckam AI</span>
    </button>
  );
}
