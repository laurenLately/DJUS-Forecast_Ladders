// src/lib/api.ts

import type { LadderResponse, LadderRow } from './models';
import type { LadderColumnKey } from './ladderColumns';
import type { LadderOptionsRow } from './models';

// ---------------------------------------------------------------------------
// Polling helper — handles Databricks 202 / RUNNING responses
// ---------------------------------------------------------------------------

/** Returns true if the payload looks like a Databricks "still running" response. */
export function isRunningPayload(data: unknown): boolean {
  return (
    data !== null &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    (data as Record<string, unknown>).__state === 'RUNNING'
  );
}

/**
 * Wraps a fetch call with retry logic for Databricks jobs that return 202 or
 * a `{ __state: "RUNNING" }` body.  Re-calls the same endpoint until the job
 * completes or a timeout is reached.
 *
 * Linear backoff: 2 s → 3 s → 4 s → 5 s (cap).
 */
async function pollForResult<T>(
  requestFn: () => Promise<Response>,
  {
    initialDelayMs = 2000,
    maxDelayMs = 5000,
    timeoutMs = 120_000,
  } = {},
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let delay = initialDelayMs;

  while (true) {
    const res = await requestFn();

    if (!res.ok && res.status !== 202) {
      throw new Error(`Request failed: ${res.status}`);
    }

    const data = await res.json();

    if (res.status === 202 || isRunningPayload(data)) {
      if (Date.now() + delay > deadline) {
        throw new Error('Request timed out waiting for Databricks job to complete.');
      }
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay + 1000, maxDelayMs);
      continue;
    }

    return data as T;
  }
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export type LadderQuery = {
  retailer?: string;
  category?: string;
  retailerItemId?: string;
  weekEndingFrom?: string;
  weekEndingTo?: string;
};

function qs(params: Record<string, string | undefined>) {
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') u.set(k, v);
  });
  const s = u.toString();
  return s ? `?${s}` : '';
}

// ---------------------------------------------------------------------------
// Cluster warm-up
// ---------------------------------------------------------------------------

export type ClusterStatus = 'cold' | 'warming' | 'ready' | 'error';

/**
 * Fire-and-forget call to /api/options to wake the Databricks cluster.
 * Reports status back via the provided callback.
 */
export function warmUpCluster(onStatus: (s: ClusterStatus) => void): void {
  onStatus('warming');
  fetch('/api/options', { method: 'GET' })
    .then((res) => {
      onStatus(res.ok || res.status === 202 ? 'ready' : 'error');
    })
    .catch(() => onStatus('error'));
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function fetchOptions(retailer?: string): Promise<LadderOptionsRow[]> {
  const params = retailer ? `?retailer=${encodeURIComponent(retailer)}` : '';
  const data = await pollForResult<{ ok?: boolean; rows?: LadderOptionsRow[] }>(
    () => fetch(`/api/options${params}`, { method: 'GET' }),
  );
  return data.rows ?? [];
}

export async function fetchLadder(q: LadderQuery): Promise<LadderResponse> {
  return pollForResult<LadderResponse>(
    () =>
      fetch(
        `/api/ladder${qs({
          retailer: q.retailer,
          category: q.category,
          retailer_item_id: q.retailerItemId,
          week_ending_from: q.weekEndingFrom,
          week_ending_to: q.weekEndingTo,
        })}`,
        { method: 'GET' },
      ),
  );
}

export type CellEditPayload = {
  retailer: string;
  retailer_item_id: string;
  item_id_at_week?: string | null;
  week_ending: string;
  field: Extract<LadderColumnKey, 'PLAN_UNITS' | 'SUGGESTED_PLAN_UNITS'>;
  value: number | null;
  updated_by: string;
  week_window?: { from: string; to: string };
};

export async function saveCellEdit(payload: CellEditPayload): Promise<LadderResponse> {
  const res = await fetch('/api/ladder/cell', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`saveCellEdit failed: ${res.status}`);
  const data = await res.json();
  if (isRunningPayload(data)) {
    throw new Error('Cell save is still processing. Please refresh to see your changes.');
  }
  return data;
}

// ---------------------------------------------------------------------------
// Merge helper
// ---------------------------------------------------------------------------

/**
 * Patch rows in memory after a returned slice comes back.
 * Identity key: retailer + retailer_item_id + week_ending
 */
export function mergeReturnedSlice(existing: LadderRow[], returned: LadderRow[]): LadderRow[] {
  const key = (r: LadderRow) => `${r.RETAILER}||${r.RETAILER_ITEM_ID}||${r.WEEK_ENDING}`;
  const map = new Map(existing.map((r) => [key(r), r]));
  returned.forEach((r) => map.set(key(r), r));
  return Array.from(map.values()).sort((a, b) => {
    const da = String(a.WEEK_ENDING);
    const db = String(b.WEEK_ENDING);
    return da.localeCompare(db);
  });
}
