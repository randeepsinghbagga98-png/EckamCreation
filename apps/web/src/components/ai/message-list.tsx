'use client';

import { useEffect, useRef } from 'react';
import type { AiChatMessage } from '@/lib/ai/types';
import { AssistantMessage } from './assistant-message';
import { UserMessage } from './user-message';

type MessageListProps = {
  messages: AiChatMessage[];
  thinking?: boolean;
};

export function MessageList({ messages, thinking = false }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, thinking]);

  return (
    <div className="eckam-ai-messages" aria-live="polite">
      {messages.map((message) =>
        message.role === 'USER' ? (
          <UserMessage key={message.id} message={message} />
        ) : (
          <AssistantMessage key={message.id} message={message} />
        ),
      )}
      {thinking ? (
        <p className="eckam-ai-thinking" role="status">
          Thinking…
        </p>
      ) : null}
      <div ref={endRef} />
    </div>
  );
}
