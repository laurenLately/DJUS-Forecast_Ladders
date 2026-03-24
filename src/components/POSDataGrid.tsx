// src/components/POSDataGrid.tsx

import React, { useEffect, useMemo, useState } from 'react';
import { POS_COLUMNS, POS_GROUP_META } from '../lib/posColumnConfig';
import type { POSRow, POSResponse } from '../lib/models';
import { fetchPOS } from '../lib/api';

type Props = {
  retailer?: string;
  retailerItemId?: string;
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
  return String(v);
}

function groupSpans() {
  const spans: { group: string; span: number }[] = [];
  for (const col of POS_COLUMNS) {
    const last = spans[spans.length - 1];
    if (last && last.group === col.group) last.span += 1;
    else spans.push({ group: col.group, span: 1 });
  }
  return spans;
}

export function POSDataGrid({
  retailer,
  retailerItemId,
  weekEndingFrom,
  weekEndingTo,
}: Props) {
  const [rows, setRows] = useState<POSRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const spans = useMemo(groupSpans, []);

  useEffect(() => {
    if (!retailer) {
      setRows([]);
      return;
    }
    setLoading(true);
    setErr(null);
    fetchPOS({ retailer, retailerItemId, weekEndingFrom, weekEndingTo })
      .then((r: POSResponse) => {
        if (!r || !Array.isArray(r.rows)) {
          throw new Error('Unexpected response from POS API');
        }
        setRows(r.rows);
      })
      .catch((e) => setErr(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, [retailer, retailerItemId, weekEndingFrom, weekEndingTo]);

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
            {/* Group header row */}
            <tr>
              {spans.map((s, idx) => {
                const meta = POS_GROUP_META[s.group] ?? { label: s.group, className: 'bg-slate-100 text-slate-800' };
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
              {POS_COLUMNS.map((c) => (
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
                <td colSpan={POS_COLUMNS.length} className="px-2 py-6 text-center text-slate-500">
                  Loading POS data...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={POS_COLUMNS.length} className="px-2 py-6 text-center text-slate-500">
                  No POS data found for this selection.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={`${r.RETAILER}||${r.RETAILER_ITEM_ID}||${r.WEEK_ENDING}||${i}`} className="odd:bg-slate-50">
                  {POS_COLUMNS.map((c) => {
                    const val = r[c.key as keyof POSRow];
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
