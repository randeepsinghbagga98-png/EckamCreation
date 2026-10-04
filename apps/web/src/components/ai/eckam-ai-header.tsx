'use client';

import { CloseIcon, PlusIcon } from '@/components/icons';

type EckamAiHeaderProps = {
  onClose: () => void;
  onNewConversation: () => void;
  newDisabled?: boolean;
};

export function EckamAiHeader({ onClose, onNewConversation, newDisabled = false }: EckamAiHeaderProps) {
  return (
    <header className="eckam-ai-header">
      <div className="eckam-ai-header-copy">
        <p className="eckam-ai-kicker">Eckam AI</p>
        <p className="eckam-ai-subtitle">Your personal shopping assistant</p>
      </div>
      <div className="eckam-ai-header-actions">
        <button
          type="button"
          className="eckam-ai-icon-button"
          onClick={onNewConversation}
          disabled={newDisabled}
          aria-label="Start a new conversation"
        >
          <PlusIcon className="size-4" />
        </button>
        <button type="button" className="eckam-ai-icon-button" onClick={onClose} aria-label="Close Eckam AI">
          <CloseIcon className="size-4" />
        </button>
      </div>
    </header>
  );
}
