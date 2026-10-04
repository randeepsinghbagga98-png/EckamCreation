'use client';

import { SparklesIcon } from '@/components/icons';
import { AI_SUGGESTED_PROMPTS } from '@/lib/ai/types';

type EckamAiWelcomeProps = {
  onPrompt: (prompt: string) => void;
  disabled?: boolean;
};

export function EckamAiWelcome({ onPrompt, disabled = false }: EckamAiWelcomeProps) {
  return (
    <div className="eckam-ai-welcome">
      <span className="eckam-ai-welcome-mark" aria-hidden="true">
        <SparklesIcon className="size-6" />
      </span>
      <p className="eckam-ai-kicker">Eckam AI</p>
      <h3 className="eckam-ai-welcome-title">Discover something you&apos;ll love.</h3>
      <p className="eckam-ai-welcome-copy">
        Ask me to find products, explore categories, or compare items from the Eckam collection.
      </p>
      <div className="eckam-ai-suggestions">
        {AI_SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="eckam-ai-suggestion"
            disabled={disabled}
            onClick={() => onPrompt(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
