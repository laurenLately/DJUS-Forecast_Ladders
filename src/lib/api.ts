// src/lib/api.ts

import type { LadderResponse, LadderRow, POSResponse } from './models';
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
 * a `{ __state: "RUNNING" }` body.
 *
 * IMPORTANT: Each call to requestFn() triggers a NEW Databricks job run on the
 * backend. So we only retry a limited number of times to avoid flooding the
 * job queue with duplicate runs. The Azure Function already waits ~25 s
 * server-side for the job to finish, so one retry is usually enough.
 *
 * Linear backoff: 3 s → 5 s → 8 s.
 */
async function pollForResult<T>(
  requestFn: () => Promise<Response>,
  {
    initialDelayMs = 3000,
    maxDelayMs = 8000,
    maxRetries = 2,
  } = {},
): Promise<T> {
  let delay = initialDelayMs;
  let attempts = 0;

  while (true) {
    const res = await requestFn();

    if (!res.ok && res.status !== 202) {
      throw new Error(`Request failed: ${res.status}`);
    }

    const data = await res.json();

    if (res.status === 202 || isRunningPayload(data)) {
      attempts++;
      if (attempts > maxRetries) {
        throw new Error(
          'Databricks cluster is still starting. Please wait a moment and try again.'
        );
      }
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay + 2000, maxDelayMs);
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
 * Fire-and-forget ping to wake the main Databricks cluster.
 * Hits /api/health?warm=true which triggers a lightweight "ping" action
 * on the main cluster (not serverless). The cluster starts warming so
 * it's ready by the time the user submits their selection.
 */
export function warmUpCluster(onStatus: (s: ClusterStatus) => void): void {
  onStatus('warming');
  fetch('/api/health?warm=true', { method: 'GET' })
    .then((res) => {
      onStatus(res.ok ? 'ready' : 'error');
    })
    .catch(() => onStatus('error'));
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function fetchOptions(retailer: string, category: string): Promise<LadderOptionsRow[]> {
  const params = `?retailer=${encodeURIComponent(retailer)}&category=${encodeURIComponent(category)}`;
  const data = await pollForResult<{ ok?: boolean; rows?: LadderOptionsRow[] }>(
    () => fetch(`/api/options${params}`, { method: 'GET' }),
  );
  return data.rows ?? [];
}

export type POSQuery = {
  retailer: string;
  retailerItemId?: string;
  weekEndingFrom?: string;
  weekEndingTo?: string;
};

export async function fetchPOS(q: POSQuery): Promise<POSResponse> {
  return pollForResult<POSResponse>(
    () =>
      fetch(
        `/api/pos${qs({
          retailer: q.retailer,
          retailer_item_id: q.retailerItemId,
          week_ending_from: q.weekEndingFrom,
          week_ending_to: q.weekEndingTo,
        })}`,
        { method: 'GET' },
      ),
  );
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
