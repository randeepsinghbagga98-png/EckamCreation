'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CloseIcon, SearchIcon } from '@/components/icons';
import { buildSearchHref } from '@/lib/search/query';

type SearchFormProps = {
  initialQuery: string;
};

export function SearchForm({ initialQuery }: SearchFormProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialQuery);

  function commit(next = value) {
    router.push(buildSearchHref(next));
  }

  return (
    <form
      role="search"
      action="/search"
      method="get"
      className="search-form"
      onSubmit={(event) => {
        event.preventDefault();
        const submitted = new FormData(event.currentTarget).get('q');
        commit(typeof submitted === 'string' ? submitted : value);
      }}
    >
      <label htmlFor="eckam-search-input" className="sr-only">
        Search products, categories, collections
      </label>
      <SearchIcon className="search-form-icon pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#D6A84F] sm:left-5" />
      <input
        ref={inputRef}
        id="eckam-search-input"
        name="q"
        type="search"
        value={value}
        maxLength={120}
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="Search products, categories, collections..."
        className="search-form-input"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            if (value || initialQuery) {
              setValue('');
              router.push('/search');
              return;
            }
            inputRef.current?.blur();
          }
        }}
      />
      {value ? (
        <button
          type="button"
          className="search-form-clear"
          aria-label="Clear search"
          onClick={() => {
            setValue('');
            router.push('/search');
            inputRef.current?.focus();
          }}
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      ) : null}
    </form>
  );
}
