'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/session';
import {
  closeAiChat,
  retryAiPrompt,
  sendAiPrompt,
  startNewAiConversation,
  useAiChat,
} from '@/lib/ai/store';
import { EckamAiError } from './eckam-ai-error';
import { EckamAiHeader } from './eckam-ai-header';
import { EckamAiSignIn } from './eckam-ai-signin';
import { EckamAiWelcome } from './eckam-ai-welcome';
import { MessageComposer } from './message-composer';
import { MessageList } from './message-list';

export function EckamAiPanel() {
  const chat = useAiChat();
  const auth = useAuth();
  const pathname = usePathname() || '/';
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLDivElement>(null);
  const needsSignIn = auth.status === 'anonymous' || chat.error?.kind === 'auth';
  const canCompose = auth.status === 'authenticated' && chat.error?.kind !== 'auth';

  useEffect(() => {
    if (!chat.open) {
      return;
    }

    const panel = panelRef.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = panel?.querySelector<HTMLElement>('button, textarea, a[href]');
    focusable?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeAiChat();
      }
    }

    document.addEventListener('keydown', onKeyDown);

    const viewport = window.visualViewport;
    const syncViewport = () => {
      if (!panel || !viewport) {
        return;
      }
      if (window.innerWidth >= 768) {
        panel.style.height = '';
        panel.style.top = '';
        return;
      }
      panel.style.top = `${Math.max(8, viewport.offsetTop + 8)}px`;
      panel.style.height = `${Math.max(280, viewport.height - 16)}px`;
    };
    syncViewport();
    viewport?.addEventListener('resize', syncViewport);
    viewport?.addEventListener('scroll', syncViewport);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      viewport?.removeEventListener('resize', syncViewport);
      viewport?.removeEventListener('scroll', syncViewport);
      if (panel) {
        panel.style.height = '';
        panel.style.top = '';
      }
      previous?.focus();
    };
  }, [chat.open]);

  if (!chat.open) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      id="eckam-ai-panel"
      className="eckam-ai-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="eckam-ai-title"
    >
      <div ref={closeRef}>
        <EckamAiHeader
          onClose={closeAiChat}
          onNewConversation={startNewAiConversation}
          newDisabled={chat.pending}
        />
      </div>
      <h2 id="eckam-ai-title" className="sr-only">
        Eckam AI
      </h2>
      <div className="eckam-ai-body">
        {chat.messages.length === 0 ? (
          <EckamAiWelcome onPrompt={sendAiPrompt} disabled={chat.pending} />
        ) : (
          <MessageList messages={chat.messages} thinking={chat.pending} />
        )}
        {chat.error && chat.error.kind !== 'auth' ? (
          <EckamAiError message={chat.error.message} onRetry={retryAiPrompt} />
        ) : null}
        {needsSignIn ? <EckamAiSignIn nextPath={pathname} /> : null}
      </div>
      {canCompose ? <MessageComposer disabled={chat.pending} onSend={sendAiPrompt} /> : null}
    </div>
  );
}
