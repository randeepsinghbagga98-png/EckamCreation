"use client";

/* Data-fetching hook: loader identity is stored off-render and request state
   updates after the async work starts. */
/* eslint-disable react-hooks/refs, react-hooks/set-state-in-effect */

import { useCallback, useEffect, useRef, useState } from "react";
import { isUnauthorized } from "@/lib/api/errors";

export function useAsync<T>(loader: () => Promise<T>, key = "") {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(() => {
    setNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loaderRef.current()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (cancelled) return;
        if (isUnauthorized(err)) {
          setError("Sign in required.");
          return;
        }
        setError(err instanceof Error ? err.message : "Unable to load data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  return { data, error, loading, reload, setData };
}
