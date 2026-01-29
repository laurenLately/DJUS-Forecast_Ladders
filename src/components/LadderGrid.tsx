import React, { useEffect, useMemo, useState } from "react";
import { fetchLadder } from "../lib/api";
import { toGridModel, type LadderGridModel } from "../lib/models";

// Map API metric keys to groups + formatting.
// IMPORTANT: keys must match meta.metric_order and row[metricKey]
type ColDef = { key: string; label: string; isDollar?: boolean; isPercent?: boolean; isDecimal?: boolean };

type ColGroup = {
  name: string;
  color: string;
  headerColor: string;
  columns: ColDef[];
};

const columnGroups: ColGroup[] = [
  {
    name: "UNITS",
    color: "bg-blue-100/70",
    headerColor: "bg-blue-200/80",
    columns: [
      { key: "ACTUAL_UNITS_LY", label: "Actual Units LY" },
      { key: "ACTUAL_UNITS", label: "Actual Units" },
      { key: "WEEKLY_FORECAST_UNITS", label: "Weekly Forecast" },
      { key: "PLAN_UNITS", label: "Plan Units" },
      { key: "SUGGESTED_PLAN_UNITS", label: "Suggested Plan Units" }
    ]
  },
  {
    name: "DOLLARS",
    color: "bg-green-100/70",
    headerColor: "bg-green-200/80",
    columns: [
      { key: "ACTUAL_DOLLARS_LY", label: "Actual Dollars LY", isDollar: true },
      { key: "ACTUAL_DOLLARS", label: "Actual Dollars", isDollar: true },
      { key: "FORECAST_DOLLARS", label: "Forecast Dollars", isDollar: true }
    ]
  },
  {
    name: "INVENTORY UNITS",
    color: "bg-amber-100/60",
    headerColor: "bg-amber-200/70",
    columns: [
      { key: "ACTUAL_UNIT_INV_LY", label: "Actual Unit Inv LY" },
      { key: "ACTUAL_UNIT_INV", label: "Actual Unit Inv" },
      { key: "FORECAST_UNIT_INVENTORY", label: "Forecast Unit Inv" },
      { key: "PLAN_UNIT_INVENTORY", label: "Plan Unit Inv" },
      { key: "SUGGESTED_PLAN_UNIT_INVENTORY", label: "Suggested Unit Inv" }
    ]
  },
  {
    name: "RECEIPTS",
    color: "bg-teal-100/60",
    headerColor: "bg-teal-200/70",
    columns: [
      { key: "FORECAST_UNIT_RECEIPTS", label: "Forecast Receipts Units" },
      { key: "PLAN_UNIT_RECEIPTS", label: "Plan Receipts Units" },
      { key: "SUGGESTED_PLAN_UNIT_RECEIPTS", label: "Suggested Receipts Units" }
    ]
  },
  {
    name: "OTHER METRICS",
    color: "bg-slate-100/60",
    headerColor: "bg-slate-200/70",
    columns: [{ key: "WOS", label: "WOS", isDecimal: true }]
  }
];

function formatValue(
  value: number | null | string,
  isDollar?: boolean,
  isPercent?: boolean,
  isDecimal?: boolean
) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string") return value;

  if (isPercent) return `${value.toFixed(0)}%`;
  if (isDecimal) return value.toFixed(2);

  if (isDollar) {
    const formatted = Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 0 });
    return `$${formatted}`;
  }

  return Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatWeekBegin(weekEnd: string) {
  // If weekEnd is YYYY-MM-DD, compute begin = end - 6 days (simple weekly assumption).
  // If your retail calendar differs, we can replace with an API-provided begin date later.
  const d = new Date(`${weekEnd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() - 6);
  return d.toISOString().slice(0, 10);
}

export function LadderGrid() {
  const [grid, setGrid] = useState<LadderGridModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TEMP until filter UI is wired:
  const retailer = "AMZ";
  const category = "DEFAULT";
  const retailer_item_id = "12345";

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetchLadder({ retailer, category, retailer_item_id })
      .then((resp) => {
        if (cancelled) return;
        setGrid(toGridModel(resp));
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? "Failed to load ladder");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [retailer, category, retailer_item_id]);

  const allColumns = useMemo(
    () => columnGroups.flatMap((g) => g.columns),
    []
  );

  if (loading) return <div className="p-4 text-sm">Loading ladder…</div>;
  if (error) return <div className="p-4 text-sm text-red-600">{error}</div>;
  if (!grid) return <div className="p-4 text-sm">No data</div>;

  return (
    <div className="relative bg-white">
      <style>{`
        .excel-table { font-family: 'Calibri', 'Arial', sans-serif; }
        .excel-table tbody tr:hover td { background-color: rgba(59, 130, 246, 0.05) !important; }
      `}</style>

      <div className="overflow-x-auto">
        <table className="excel-table border-collapse" style={{ fontSize: "10px" }}>
          <thead className="sticky top-0 z-10">
            {/* Group names row */}
            <tr className="border-b border-gray-400">
              {/* Frozen columns */}
              <th className="bg-gray-100 border-r border-gray-400 px-0.5 py-1" style={{ width: "45px" }} />
              <th className="bg-gray-100 border-r border-gray-400 px-0.5 py-1" style={{ width: "28px" }} />
              <th className="bg-gray-100 border-r border-gray-400 px-0.5 py-1" style={{ width: "60px" }} />
              <th className="bg-gray-100 border-r border-gray-400 px-0.5 py-1" style={{ width: "60px" }} />
              <th className="bg-gray-100 border-r-2 border-gray-500 px-0.5 py-1" style={{ width: "90px" }} />

              {columnGroups.map((group, idx) => (
                <th
                  key={group.name}
                  className={`${group.headerColor} ${
                    idx === columnGroups.length - 1 ? "border-r-2 border-gray-500" : "border-r border-gray-400"
                  } px-2 py-1.5 text-center font-bold text-gray-900`}
                  colSpan={group.columns.length}
                  style={{ fontSize: "11px" }}
                >
                  {group.name}
                </th>
              ))}
            </tr>

            {/* Column labels row */}
            <tr className="border-b-2 border-gray-500 bg-gray-50">
              <th className="bg-gray-100 border-r border-gray-400 px-0.5 py-1" />
              <th className="bg-gray-100 border-r border-gray-400 px-0.5 py-1 text-center font-semibold text-gray-800" style={{ fontSize: "9px" }}>
                Wk
              </th>
              <th className="bg-gray-100 border-r border-gray-400 px-0 py-1 text-center font-semibold text-gray-800" style={{ fontSize: "9px" }}>
                WEEK<br />(BEG. DATE)
              </th>
              <th className="bg-gray-100 border-r border-gray-400 px-0 py-1 text-center font-semibold text-gray-800" style={{ fontSize: "9px" }}>
                week<br />(end date)
              </th>
              <th className="bg-gray-100 border-r-2 border-gray-500 px-0 py-1" style={{ width: "90px" }} />

              {columnGroups.map((group, groupIdx) =>
                group.columns.map((col, idx) => (
                  <th
                    key={`${group.name}-${col.key}`}
                    className={`${group.headerColor} ${
                      idx === group.columns.length - 1 && groupIdx === columnGroups.length - 1
                        ? "border-r-2 border-gray-500"
                        : idx === group.columns.length - 1
                          ? "border-r border-gray-400"
                          : "border-r border-gray-300"
                    } px-1.5 py-1 text-center font-semibold text-gray-800 whitespace-nowrap`}
                    style={{ minWidth: "30px", maxWidth: "140px", fontSize: "8.5px" }}
                    title={grid.meta.metric_labels?.[col.key] ?? col.label}
                  >
                    {grid.meta.metric_labels?.[col.key] ?? col.label}
                  </th>
                ))
              )}
            </tr>
          </thead>

          <tbody>
            {grid.data.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-gray-300">
                {/* Month column: blank for now (API doesn’t provide month group) */}
                <td className="bg-white border-r border-gray-400 px-0.5 py-1 text-center font-semibold" style={{ fontSize: "9px" }} />

                <td className="bg-white border-r border-gray-400 px-0.5 py-0.5 text-center" style={{ fontSize: "9px" }}>
                  {row.week_num ?? ""}
                </td>

                <td className="bg-white border-r border-gray-400 px-0 py-0.5 text-center text-gray-700" style={{ fontSize: "8.5px" }}>
                  {row.week_end ? formatWeekBegin(String(row.week_end)) : ""}
                </td>

                <td className="bg-white border-r border-gray-400 px-0 py-0.5 text-center text-gray-700" style={{ fontSize: "8.5px" }}>
                  {row.week_end ?? ""}
                </td>

                {/* Promo/Notes column: blank for now */}
                <td className="bg-white border-r-2 border-gray-500 px-0 py-0.5 text-left text-gray-700" style={{ fontSize: "8px" }} />

                {columnGroups.map((group, groupIdx) =>
                  group.columns.map((col, idx) => {
                    const value = (row as any)[col.key] as number | string | null;
                    const cellColor = group.color;

                    return (
                      <td
                        key={`${group.name}-${col.key}-${rowIndex}`}
                        className={`${cellColor} ${
                          idx === group.columns.length - 1 && groupIdx === columnGroups.length - 1
                            ? "border-r-2 border-gray-500"
                            : idx === group.columns.length - 1
                              ? "border-r border-gray-400"
                              : "border-r border-gray-300"
                        } px-1.5 py-0.5 text-right whitespace-nowrap`}
                        style={{ fontSize: "9.5px" }}
                      >
                        {formatValue(value, col.isDollar, col.isPercent, col.isDecimal)}
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
