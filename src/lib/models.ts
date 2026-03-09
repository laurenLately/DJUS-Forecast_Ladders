// src/lib/models.ts
import type { LadderColumnKey } from "./ladderColumns";
 
/** Dropdown rows for SelectionGate */
export type LadderOptionsRow = {
  retailer: string;
  category: string;
  retailer_item_id: string;      // query key (API + DB)
  retailer_item_number: string;  // display string (dropdown)
  dorel_item?: string;
  item_description?: string;
  minor?: string;
  product?: string;
  is_active?: boolean;
};
 
export type LadderMeta = {
  retailer?: string;
  category?: string;
  timezone?: string;   // e.g. America/Los_Angeles
  currency?: string;   // e.g. USD
  week_start_day?: "SAT" | "SUN" | "MON";
  metric_order?: LadderColumnKey[];          // drives column order
  metric_labels?: Record<string, string>;    // optional header labels
};
 
/**
 * Row shape coming back from /api/ladder:
 * - must include identity keys used by mergeReturnedSlice()
 * - may include many metric columns (PLAN_UNITS, etc.)
 */
export type LadderRow =
  & {
      RETAILER: string;
      RETAILER_ITEM_ID: string;
      WEEK_ENDING: string;               // ISO date string
      ITEM_ID_AT_WEEK?: string | null;
      CATEGORY?: string | null;
    }
  & Partial<Record<LadderColumnKey, string | number | null>>;
 
export type LadderResponse = {
  ok?: boolean;
  rows: LadderRow[];
  meta?: LadderMeta;
  error?: string;
};
 
