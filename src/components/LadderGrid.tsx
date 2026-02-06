// src/components/LadderGrid.tsx

import React, { useEffect, useMemo, useState } from 'react';
import { LADDER_COLUMNS, LADDER_GROUP_META } from '../lib/ladderColumnConfig';
import type { LadderRow, LadderResponse } from '../lib/models';
import { fetchLadder, mergeReturnedSlice, saveCellEdit } from '../lib/api';
import type { LadderColumnKey } from '../lib/ladderColumns';

type Props = {
  retailer?: string;
  category?: string;
  retailerItemId?: string;
  updatedBy?: string; // default svc_automation
  weekEndingFrom?: string;
  weekEndingTo?: string;
};

function formatValue(v: unknown, format?: string) {
  if (v === null || v === undefined || v === '') return '';
  const n = typeof v === 'number' ? v : Number(v);
  if (Number.isFinite(n)) {
    if (format === 'currency') return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
    if (format === 'decimal') return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (format === 'int') return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  // date + text fall back
  return String(v);
}

function groupSpans() {
  // compute colspans for the top group header row (Figma-style)
  const spans: { group: string; span: number }[] = [];
  for (const col of LADDER_COLUMNS) {
    const last = spans[spans.length - 1];
    if (last && last.group === col.group) last.span += 1;
    else spans.push({ group: col.group, span: 1 });
  }
  return spans;
}

export default function LadderGrid({
  retailer,
  category,
  retailerItemId,
  updatedBy = 'svc_automation',
  weekEndingFrom,
  weekEndingTo,
}: Props) {
  const [rows, setRows] = useState<LadderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const spans = useMemo(groupSpans, []);

  useEffect(() => {
    // don’t fetch unless minimally filtered (prevents accidental 500k load)
    if (!retailer || !category) {
      setRows([]);
      return;
    }
    setLoading(true);
    setErr(null);
    fetchLadder({ retailer, category, retailerItemId, weekEndingFrom, weekEndingTo })
      .then((r: LadderResponse) => setRows(r.rows ?? []))
      .catch((e) => setErr(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, [retailer, category, retailerItemId, weekEndingFrom, weekEndingTo]);

  async function onBlurSave(row: LadderRow, field: Extract<LadderColumnKey, 'PLAN_UNITS' | 'SUGGESTED_PLAN_UNITS'>, raw: string) {
    const trimmed = raw.trim();
    const value = trimmed === '' ? null : Number(trimmed);
    if (trimmed !== '' && !Number.isFinite(value)) return; // ignore bad input

    try {
      const resp = await saveCellEdit({
        retailer: String(row.RETAILER),
        retailer_item_id: String(row.RETAILER_ITEM_ID),
        item_id_at_week: (row.ITEM_ID_AT_WEEK ?? null) as any,
        week_ending: String(row.WEEK_ENDING),
        field,
        value,
        updated_by: updatedBy,
        // return a window to capture ripple effects (week-2 -> week+12)
        week_window: {
          from: String(row.WEEK_BEG_DATE ?? row.WEEK_ENDING),
          to: String(row.WEEK_ENDING),
        },
      });

      // merge returned slice into current grid
      setRows((prev) => mergeReturnedSlice(prev, resp.rows ?? []));
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    }
  }

  return (
    <div className="w-full">
      {err && (
        <div className="mb-2 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-800">
          {err}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 overflow-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            {/* Group header row (Figma-like) */}
            <tr>
              {spans.map((s, idx) => {
                const meta = LADDER_GROUP_META[s.group] ?? { label: s.group, className: 'bg-slate-100 text-slate-800' };
                return (
                  <th
                    key={`${s.group}-${idx}`}
                    colSpan={s.span}
                    className={`sticky top-0 z-10 border-b border-slate-200 px-2 py-2 text-left font-semibold ${meta.className}`}
                  >
                    {meta.label}
                  </th>
                );
              })}
            </tr>

            {/* Column header row */}
            <tr>
              {LADDER_COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className="sticky top-10 z-10 border-b border-slate-200 bg-white px-2 py-2 text-left font-semibold"
                  style={c.width ? { minWidth: c.width } : undefined}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={LADDER_COLUMNS.length} className="px-2 py-6 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={LADDER_COLUMNS.length} className="px-2 py-6 text-center text-slate-500">
                  Select a retailer + category to load ladder rows.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={`${r.RETAILER}||${r.RETAILER_ITEM_ID}||${r.WEEK_ENDING}||${i}`} className="odd:bg-slate-50">
                  {LADDER_COLUMNS.map((c) => {
                    const val = r[c.key];

                    if (c.editable && (c.key === 'PLAN_UNITS' || c.key === 'SUGGESTED_PLAN_UNITS')) {
                      return (
                        <td key={c.key} className="border-b border-slate-100 px-2 py-1">
                          <input
                            className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-sky-200"
                            defaultValue={val === null || val === undefined ? '' : String(val)}
                            onBlur={(e) => onBlurSave(r, c.key, e.target.value)}
                            inputMode="numeric"
                          />
                        </td>
                      );
                    }

                    return (
                      <td key={c.key} className="border-b border-slate-100 px-2 py-1 text-right tabular-nums">
                        <span className="block">
                          {formatValue(val, c.format)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
