import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Fetches one API resource and tracks its own loading/error state, so a failing
 * section degrades on its own instead of blanking the whole dashboard.
 * `initialLoad` distinguishes the first fetch (spinner) from later ones (skeleton).
 */
export function useResource(fetcher, deps = [], { refreshToken = 0 } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: true, initialLoad: true });
  const requestId = useRef(0);

  const run = useCallback(async () => {
    const id = ++requestId.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const result = await fetcher();
      if (id !== requestId.current) return;
      setState({ data: result, error: null, loading: false, initialLoad: false });
    } catch (error) {
      if (id !== requestId.current || error.name === 'AbortError') return;
      setState((prev) => ({ ...prev, error, loading: false, initialLoad: false }));
    }
    // fetcher is recreated per render; deps below are the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run, refreshToken]);

  return { ...state, reload: run };
}
