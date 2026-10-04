import { ApiClientError } from '@/lib/api/client';
import type { AiChatError } from './types';

export function messageForAiError(error: unknown): AiChatError {
  if (error instanceof ApiClientError) {
    if (error.status === 401 || error.code === 'UNAUTHORIZED' || error.code === 'AI_CONVERSATION_FORBIDDEN') {
      return {
        kind: 'auth',
        message: 'Sign in to continue with Eckam AI.',
      };
    }
    if (
      error.code === 'AI_PROVIDER_NOT_CONFIGURED' ||
      error.code === 'AI_PROVIDER_UNAVAILABLE' ||
      error.code === 'AI_PROVIDER_TIMEOUT' ||
      error.code === 'AI_PROVIDER_RATE_LIMITED' ||
      error.status === 503 ||
      error.status === 504
    ) {
      return {
        kind: 'unavailable',
        message: 'Eckam AI is temporarily unavailable. Please try again.',
      };
    }
    if (error.code === 'AI_INVALID_MESSAGE' || error.code === 'VALIDATION_ERROR' || error.status === 400) {
      return {
        kind: 'invalid',
        message: "I couldn't process that request. Please try again.",
      };
    }
  }

  return {
    kind: 'network',
    message: 'Something went wrong while connecting to Eckam AI.',
  };
}
