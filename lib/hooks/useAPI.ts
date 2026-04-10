'use client';

import useSWR, { SWRConfiguration } from 'swr';

/**
 * Generic JSON fetcher for SWR.
 * Throws on non-2xx responses so SWR can handle errors.
 * Uses default browser cache instead of no-store for performance.
 */
export async function jsonFetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed (${res.status})`);
  }
  const data = await res.json();
  return data as T;
}

/**
 * Reusable SWR hook for KarmaSetu API calls.
 *
 * Features:
 * - Aggressive caching (60s dedup, stale-while-revalidate)
 * - Automatic revalidation on window focus
 * - Retry on error (1 retry)
 * - Instant UI on revisit (stale data shown immediately)
 *
 * Usage:
 *   const { data, error, isLoading, mutate } = useAPI<MyType>('/api/admin/users');
 */
export function useAPI<T = unknown>(
  url: string | null,
  options?: SWRConfiguration
) {
  return useSWR<T>(url, jsonFetcher, {
    dedupingInterval: 60_000,       // Dedup identical requests within 60s
    revalidateOnFocus: false,       // Don't re-fetch just because window gained focus
    revalidateIfStale: true,        // Revalidate stale data in background
    errorRetryCount: 1,             // Retry once on error
    keepPreviousData: true,         // Show stale data while revalidating
    ...options,
  });
}

/**
 * Wrapper for SWR mutate — can be used for optimistic updates.
 */
export { mutate } from 'swr';

