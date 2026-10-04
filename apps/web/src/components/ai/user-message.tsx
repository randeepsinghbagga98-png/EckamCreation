import type { AiChatMessage } from '@/lib/ai/types';

type UserMessageProps = {
  message: AiChatMessage;
};

export function UserMessage({ message }: UserMessageProps) {
  return (
    <article className="eckam-ai-bubble eckam-ai-bubble--user" aria-label="Your message">
      <p>{message.content}</p>
    </article>
  );
}
