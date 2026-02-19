export type LadderOptionsRow = {
  retailer: string;
  category: string;

  retailer_item_id: string;       // query key (API + DB)
  retailer_item_number: string;   // display string (dropdown)

  dorel_item?: string;
  item_description?: string;

  minor?: string;
  product?: string;

  is_active?: boolean;
};

export type LadderMeta = {
  retailer: string;
  category: string;
  retailer_item_id: string;

  retailer_item_number?: string;
  dorel_item?: string;

  timezone: string;         // e.g. America/Los_Angeles
  currency: string;         // e.g. USD

  week_start_day?: "SAT" | "SUN" | "MON";

  // drives grid column order & UI grouping
  metric_order: string[];

  // optional friendly names for headers
  metric_labels?: Record<string, string>;
};

export type LadderRow = {
  week_end: string;         // YYYY-MM-DD
  week_num: number;         // 1..53
  year: number;             // retail year or calendar year (your choice, but be consistent)
  metrics: Record<string, number | null>;
};

export type LadderResponse = {
  meta: LadderMeta;
  rows: LadderRow[];
};

/**
 * Normalized “grid-ready” shape:
 * - `columns`: the ordered metric keys
 * - `data`: rows with week info + each metric pulled into direct properties
 */
export type LadderGridModel = {
  meta: LadderMeta;
  columns: string[];
  data: Array<
    { week_end: string; week_num: number; year: number } & Record<string, number | null>
  >;
};

export function toGridModel(resp: LadderResponse): LadderGridModel {
  const columns = resp.meta.metric_order;

  const data = resp.rows.map(r => {
    const flat: Record<string, number | null> = {};
    for (const k of columns) flat[k] = r.metrics[k] ?? null;

    return {
      week_end: r.week_end,
      week_num: r.week_num,
      year: r.year,
      ...flat
    };
  });

  return { meta: resp.meta, columns, data };
}

