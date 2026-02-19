// src/lib/api.ts

import type { LadderResponse, LadderRow } from './models';
import type { LadderColumnKey } from './ladderColumns';
import type { LadderOptionsRow } from './models';

export type LadderQuery = {
  retailer?: string;
  category?: string;
  retailerItemId?: string;
  // week range as ISO date strings: 'YYYY-MM-DD'
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

export async function fetchOptions(): Promise<LadderOptionsRow[]>{
  const res = await fetch('/api/options', { method: 'GET'});
  if (!res.ok) throw new Error ('fetchOptions failed: ${res.status}');
    return res.json();
}

export async function fetchLadder(q: LadderQuery): Promise<LadderResponse> {
  const res = await fetch(
    `/api/ladder${qs({
      retailer: q.retailer,
      category: q.category,
      retailer_item_id: q.retailerItemId,
      week_ending_from: q.weekEndingFrom,
      week_ending_to: q.weekEndingTo,
    })}`,
    { method: 'GET' }
  );
  if (!res.ok) throw new Error(`fetchLadder failed: ${res.status}`);
  return res.json();
}

export type CellEditPayload = {
  retailer: string;
  retailer_item_id: string;
  item_id_at_week?: string | null;
  week_ending: string; // ISO date
  field: Extract<LadderColumnKey, 'PLAN_UNITS' | 'SUGGESTED_PLAN_UNITS'>;
  value: number | null;
  updated_by: string; // svc_automation in your case
  // optional: return window after edit
  week_window?: { from: string; to: string };
};

export async function saveCellEdit(payload: CellEditPayload): Promise<LadderResponse> {
  const res = await fetch('/api/ladder/cell', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`saveCellEdit failed: ${res.status}`);
  return res.json();
}

/**
 * Helper to patch rows in memory after a returned slice comes back.
 * Uses identity key: retailer + retailer_item_id + week_ending
 */
export function mergeReturnedSlice(existing: LadderRow[], returned: LadderRow[]): LadderRow[] {
  const key = (r: LadderRow) => `${r.RETAILER}||${r.RETAILER_ITEM_ID}||${r.WEEK_ENDING}`;
  const map = new Map(existing.map(r => [key(r), r]));
  returned.forEach(r => map.set(key(r), r));
  // preserve ordering by WEEK_ENDING if possible
  return Array.from(map.values()).sort((a, b) => {
    const da = String(a.WEEK_ENDING);
    const db = String(b.WEEK_ENDING);
    return da.localeCompare(db);
  });
}

export async function fetchoptions(){
  const res = await fetch("/api/options");

  if (!res.ok){
    throw new Error('Options API failed(${res.status})');
  }
  return res.json();
}
