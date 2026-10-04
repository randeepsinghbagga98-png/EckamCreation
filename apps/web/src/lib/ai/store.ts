'use client';

import { useSyncExternalStore } from 'react';
import { ApiClientError } from '@/lib/api/client';
import { retryCart } from '@/lib/cart/store';
import { createAiConversation, getAiConversation, sendAiMessage } from './api';
import { messageForAiError } from './errors';
import { createLocalId, toChatMessages } from './messages';
import type { AiChatSnapshot } from './types';

const CONVERSATION_KEY = 'eckam.ai.conversationId';

const emptySnapshot: AiChatSnapshot = {
  open: false,
  phase: 'welcome',
  conversationId: null,
  messages: [],
  error: null,
  lastPrompt: null,
  pending: false,
};

let snapshot: AiChatSnapshot = emptySnapshot;
const listeners = new Set<() => void>();
let sendLock = false;

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function setSnapshot(next: AiChatSnapshot) {
  snapshot = next;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readStoredConversationId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.sessionStorage.getItem(CONVERSATION_KEY);
  } catch {
    return null;
  }
}

function writeStoredConversationId(id: string | null) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (id) {
      window.sessionStorage.setItem(CONVERSATION_KEY, id);
    } else {
      window.sessionStorage.removeItem(CONVERSATION_KEY);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

function nextIdempotencyKey() {
  return createLocalId('ai');
}

export function openAiChat() {
  setSnapshot({ ...snapshot, open: true });
  void hydrateConversation();
}

export function closeAiChat() {
  setSnapshot({ ...snapshot, open: false });
}

export function toggleAiChat() {
  if (snapshot.open) {
    closeAiChat();
    return;
  }
  openAiChat();
}

export async function hydrateConversation() {
  const storedId = snapshot.conversationId ?? readStoredConversationId();
  if (!storedId || snapshot.pending) {
    return;
  }

  try {
    const conversation = await getAiConversation(storedId);
    writeStoredConversationId(conversation.id);
    setSnapshot({
      ...snapshot,
      conversationId: conversation.id,
      messages: toChatMessages(conversation),
      phase: conversation.messages?.length ? 'ready' : 'welcome',
      error: null,
    });
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      writeStoredConversationId(null);
      setSnapshot({
        ...snapshot,
        conversationId: null,
        messages: [],
        phase: 'welcome',
        error: null,
      });
      return;
    }
    if (error instanceof ApiClientError && (error.status === 401 || error.code === 'UNAUTHORIZED')) {
      writeStoredConversationId(null);
      setSnapshot({
        ...snapshot,
        conversationId: null,
        messages: [],
        phase: 'welcome',
        error: messageForAiError(error),
      });
    }
  }
}

export async function sendAiPrompt(raw: string) {
  const content = raw.trim();
  if (!content || sendLock || snapshot.pending) {
    return;
  }

  sendLock = true;
  const optimisticUser: AiChatSnapshot['messages'][number] = {
    id: createLocalId('local'),
    role: 'USER',
    content,
  };

  setSnapshot({
    ...snapshot,
    phase: 'sending',
    pending: true,
    lastPrompt: content,
    error: null,
    messages: [...snapshot.messages, optimisticUser],
  });

  try {
    const conversation = snapshot.conversationId
      ? await sendAiMessage(snapshot.conversationId, content, nextIdempotencyKey())
      : await createAiConversation(content, nextIdempotencyKey());

    writeStoredConversationId(conversation.id);
    const messages = toChatMessages(conversation);
    setSnapshot({
      ...snapshot,
      conversationId: conversation.id,
      messages,
      phase: 'ready',
      pending: false,
      error: null,
      lastPrompt: content,
    });
    if (messages.some((message) => message.commerce?.kind.startsWith('cart') && message.commerce.success)) {
      void retryCart();
    }
  } catch (error) {
    setSnapshot({
      ...snapshot,
      phase: 'error',
      pending: false,
      error: messageForAiError(error),
      lastPrompt: content,
      messages: snapshot.messages.filter((message) => message.id !== optimisticUser.id),
    });
  } finally {
    sendLock = false;
  }
}

export async function retryAiPrompt() {
  if (!snapshot.lastPrompt || snapshot.pending) {
    return;
  }
  await sendAiPrompt(snapshot.lastPrompt);
}

export function startNewAiConversation() {
  if (snapshot.pending) {
    return;
  }
  writeStoredConversationId(null);
  setSnapshot({
    ...snapshot,
    conversationId: null,
    messages: [],
    phase: 'welcome',
    error: null,
    lastPrompt: null,
    pending: false,
  });
}

export function useAiChat() {
  return useSyncExternalStore(subscribe, () => snapshot, () => emptySnapshot);
}

export function resetAiChatForTest() {
  sendLock = false;
  snapshot = {
    open: false,
    phase: 'welcome',
    conversationId: null,
    messages: [],
    error: null,
    lastPrompt: null,
    pending: false,
  };
}

export function getAiChatSnapshot() {
  return snapshot;
}
