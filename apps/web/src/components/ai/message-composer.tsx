'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowRightIcon } from '@/components/icons';

type MessageComposerProps = {
  disabled?: boolean;
  onSend: (value: string) => void;
};

export function MessageComposer({ disabled = false, onSend }: MessageComposerProps) {
  const [value, setValue] = useState('');

  function submit() {
    const next = value.trim();
    if (!next || disabled) {
      return;
    }
    onSend(next);
    setValue('');
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form className="eckam-ai-composer" onSubmit={onSubmit}>
      <label className="sr-only" htmlFor="eckam-ai-input">
        Message Eckam AI
      </label>
      <textarea
        id="eckam-ai-input"
        name="message"
        rows={2}
        value={value}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ask about the collection"
        maxLength={8000}
      />
      <button type="submit" className="eckam-ai-send" disabled={disabled || !value.trim()} aria-label="Send message">
        <ArrowRightIcon className="size-4" />
      </button>
    </form>
  );
}
