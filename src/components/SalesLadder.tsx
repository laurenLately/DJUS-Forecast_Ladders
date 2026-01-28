import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, Filter, AlertCircle, Save, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner';

interface WeekData { weekNum: number; weekStart: Date; weekEnd: Date; }
interface MetricData { actualUnitsLY: number; actualUnits: number; retailerForecastUnits: number; planUnits: number; suggestedPlanUnits: number; }
interface CategoryMetrics {
  units: MetricData;
  dollars: MetricData;
  inventory: MetricData;
  inventoryCost: MetricData;
  plannedSales: MetricData;
  plannedSalesReceipts: MetricData;
  weeksOfSupply: MetricData;
}

const getMetricCategories = (): Array<{ key: keyof CategoryMetrics; label: string }> => ([
  { key: 'units', label: 'Units' },
  { key: 'dollars', label: 'Dollars' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'inventoryCost', label: 'Inventory Cost' },
  { key: 'plannedSales', label: 'Planned Sales' },
  { key: 'plannedSalesReceipts', label: 'Planned Sales Receipts' },
  { key: 'weeksOfSupply', label: 'Weeks of Supply' },
]);

type ItemOption = { value: string; label: string };

// ---------- Dropdown options (from Snowflake via API) ----------
type OptionRow = {
  retailer: string;
  category?: string;
  retailerItemId: string;
  dorelItem?: string;
  product?: string;
};

const fetchOptionsFromApi = async (): Promise<OptionRow[]> => {
  const resp = await fetch('/api/options', { cache: 'no-cache' });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Options API ${resp.status}: ${text}`);
  }
  const json = await resp.json();
  const rows = (json.rows ?? json.data ?? json ?? []) as any[];

  // Normalize keys defensively (supports multiple backend shapes)
  return rows
    .map((r) => ({
      retailer: String(r.retailer ?? r.RETAILER ?? '').trim(),
      category: (r.category ?? r.ULTRAGROUP_DESC1 ?? r.ultragroup_desc1 ?? undefined) as string | undefined,
      retailerItemId: String(r.retailerItemId ?? r.RETAILER_ITEM_ID ?? r.retailer_item_id ?? '').trim(),
      dorelItem: (r.dorelItem ?? r.DOREL_ITEM ?? r.dorel_item ?? undefined) as string | undefined,
      product: (r.product ?? r.PRODUCT ?? r.product_line ?? undefined) as string | undefined,
    }))
    .filter((r) => r.retailer && r.retailerItemId);
};

// ---------- Ladder helpers ----------
type LadderApiRow = {
  weekNum?: number; week_num?: number; week?: number;
  weekEnd?: string; week_end?: string; weekEnding?: string;
  metrics?: CategoryMetrics; categoryMetrics?: CategoryMetrics;
  [key: string]: any;
};
type LadderApiResponse = { rows?: LadderApiRow[]; data?: LadderApiRow[]; };

const emptyMetricData = (): MetricData => ({
  actualUnitsLY: 0, actualUnits: 0, retailerForecastUnits: 0, planUnits: 0, suggestedPlanUnits: 0,
});

const emptyCategoryMetrics = (): CategoryMetrics => ({
  units: emptyMetricData(),
  dollars: emptyMetricData(),
  inventory: emptyMetricData(),
  inventoryCost: emptyMetricData(),
  plannedSales: emptyMetricData(),
  plannedSalesReceipts: emptyMetricData(),
  weeksOfSupply: emptyMetricData(),
});

const pickNumber = (obj: any, keys: string[], fallback = 0): number => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v === 0) return 0;
    if (v !== undefined && v !== null && v !== '') {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  return fallback;
};

const normalizeRowToCategoryMetrics = (row: any): CategoryMetrics => {
  const direct = row?.metrics ?? row?.categoryMetrics;
  if (direct) return direct as CategoryMetrics;

  const n = (v: any) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };

  const unitPrice = n(row.ITEM_AMOUNT);

  const actualUnitsLY = n(row.ACTUAL_UNITS_LY);
  const actualUnits = n(row.ACTUAL_UNITS);
  const fcstUnits = n(row.WEEKLY_FORECAST_UNITS);
  const planUnits = n(row.PLAN_UNITS);
  const suggUnits = n(row.SUGGESTED_PLAN_UNITS);

  const actualDollarsLY = n(row.ACTUAL_DOLLARS_LY);
  const actualDollars = n(row.ACTUAL_DOLLARS);
  const forecastDollars =
    row.FORECAST_DOLLARS !== undefined && row.FORECAST_DOLLARS !== null && row.FORECAST_DOLLARS !== ''
      ? n(row.FORECAST_DOLLARS)
      : n(fcstUnits * unitPrice);

  const planDollars = n(planUnits * unitPrice);
  const suggestedDollars = n(suggUnits * unitPrice);

  return {
    units: { actualUnitsLY, actualUnits, retailerForecastUnits: fcstUnits, planUnits, suggestedPlanUnits: suggUnits },
    dollars: {
      actualUnitsLY: actualDollarsLY,
      actualUnits: actualDollars,
      retailerForecastUnits: forecastDollars,
      planUnits: planDollars,
      suggestedPlanUnits: suggestedDollars,
    },
    inventory: {
      actualUnitsLY: n(row.ACTUAL_UNIT_INV_LY),
      actualUnits: n(row.ACTUAL_UNIT_INV),
      retailerForecastUnits: n(row.FORECAST_UNIT_INVENTORY),
      planUnits: n(row.PLAN_UNIT_INVENTORY),
      suggestedPlanUnits: n(row.SUGGESTED_PLAN_UNIT_INVENTORY),
    },
    inventoryCost: { actualUnitsLY: 0, actualUnits: 0, retailerForecastUnits: 0, planUnits: 0, suggestedPlanUnits: 0 },
    plannedSales: { actualUnitsLY: 0, actualUnits: 0, retailerForecastUnits: 0, planUnits: 0, suggestedPlanUnits: 0 },
    plannedSalesReceipts: {
      actualUnitsLY: 0, actualUnits: 0,
      retailerForecastUnits: n(row.FORECAST_UNIT_RECEIPTS),
      planUnits: n(row.PLAN_UNIT_RECEIPTS),
      suggestedPlanUnits: n(row.SUGGESTED_PLAN_UNIT_RECEIPTS),
    },
    weeksOfSupply: {
      actualUnitsLY: 0, actualUnits: 0,
      retailerForecastUnits: n(row.WOS), planUnits: n(row.WOS), suggestedPlanUnits: n(row.WOS),
    },
  };
};

const getWeekNumFromRow = (row: LadderApiRow): number =>
  (pickNumber(row, ['weekNum', 'week_num', 'week', 'week_number'], 0) || 0);

const generateWeeks = (): WeekData[] => {
  const weeks: WeekData[] = [];
  const startDate = new Date('2026-01-05');
  for (let i = 0; i < 52; i++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weeks.push({ weekNum: i + 1, weekStart, weekEnd });
  }
  return weeks;
};

export function SalesLadder() {
  // Dropdown options (from Snowflake via API)
  const [options, setOptions] = useState<OptionRow[]>([]);

  // Ladder grid data (from Snowflake via API)
  const [ladderByWeek, setLadderByWeek] = useState<Map<number, CategoryMetrics>>(new Map());
  const [ladderLoading, setLadderLoading] = useState(false);
  const [ladderError, setLadderError] = useState<string | null>(null);

  // UI state
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [weeks] = useState<WeekData[]>(generateWeeks());
  const [metricCategories] = useState(getMetricCategories());
  const NO_PRODUCT_LABEL = '(No product)';

  const [selectedRetailer, setSelectedRetailer] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<string>('');

  const [editedCells, setEditedCells] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true);
      try {
        const rows = await fetchOptionsFromApi();
        setOptions(rows);
        toast.success(`Loaded ${rows.length} option rows from Snowflake`);
      } catch (e: any) {
        console.error(e);
        setOptions([]);
        toast.error(e?.message ?? 'Failed to load dropdown options');
      } finally {
        setLoadingOptions(false);
      }
    };
    loadOptions();
  }, []);

  // Product dimension removed (no CSV-based product line). Add back later if your options API includes it.
  const hasProductDimension = false;

  const retailers = useMemo(() => {
    const unique = Array.from(new Set(options.map(r => r.retailer).filter(Boolean)));
    return unique.sort((a, b) => a.localeCompare(b));
  }, [options]);

  const categories = useMemo(() => {
    if (!selectedRetailer) return [];
    const filtered = options.filter(r => r.retailer === selectedRetailer);
    const unique = Array.from(new Set(filtered.map(r => (r.category ?? '').trim() || 'Uncategorized')));
    return unique.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [options, selectedRetailer]);

  const itemOptions = useMemo<ItemOption[]>(() => {
    if (!selectedRetailer || !selectedCategory) return [];
    const filtered = options.filter(r => {
      if (r.retailer !== selectedRetailer) return false;
      const cat = (r.category ?? '').trim() || 'Uncategorized';
      return cat === selectedCategory;
    });

    const map = new Map<string, string | undefined>();
    for (const r of filtered) {
      const retailerItem = (r.retailerItemId ?? '').trim();
      if (!retailerItem) continue;
      const existing = map.get(retailerItem);
      const dorel = (r.dorelItem ?? '').trim();

      if ((!existing || existing.length === 0) && dorel) map.set(retailerItem, dorel);
      else if (!map.has(retailerItem)) map.set(retailerItem, dorel || undefined);
    }

    return Array.from(map.entries())
      .map(([retailerItem, dorelItem]) => ({
        value: retailerItem, // value is retailer item ID only
        label: dorelItem ? `${retailerItem} / ${dorelItem}` : retailerItem,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' }));
  }, [options, selectedRetailer, selectedCategory]);

  const hasRequiredSelections =
    Boolean(selectedRetailer) &&
    (!hasProductDimension || Boolean(selectedProduct)) &&
    Boolean(selectedCategory) &&
    Boolean(selectedItem);

  // Fetch ladder data when selections complete
  useEffect(() => {
    const fetchLadder = async () => {
      if (!hasRequiredSelections) {
        setLadderByWeek(new Map());
        setLadderError(null);
        setEditedCells(new Map());
        return;
      }

      setLadderLoading(true);
      setLadderError(null);

      try {
        const url = `/api/ladder?retailer=${encodeURIComponent(selectedRetailer)}&item=${encodeURIComponent(selectedItem)}${
          hasProductDimension ? `&product=${encodeURIComponent(selectedProduct)}` : ''
        }`;

        const resp = await fetch(url, { cache: 'no-cache' });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`API ${resp.status}: ${text}`);
        }

        const json = (await resp.json()) as LadderApiResponse;
        const rows = (json.rows ?? json.data ?? []) as LadderApiRow[];

        if (!rows.length) {
          setLadderByWeek(new Map());
          toast.warning('No ladder rows returned for that selection.');
          return;
        }

        const byWeek = new Map<number, CategoryMetrics>();
        for (const r of rows) {
          const wk = getWeekNumFromRow(r);
          if (!wk) continue;
          byWeek.set(wk, normalizeRowToCategoryMetrics(r));
        }

        for (const w of weeks) {
          if (!byWeek.has(w.weekNum)) byWeek.set(w.weekNum, emptyCategoryMetrics());
        }

        setLadderByWeek(byWeek);
        toast.success(`Loaded ladder data (${rows.length} rows)`);
      } catch (e: any) {
        console.error(e);
        setLadderByWeek(new Map());
        setLadderError(e?.message ?? 'Failed to load ladder data');
        toast.error(e?.message ?? 'Failed to load ladder data');
      } finally {
        setLadderLoading(false);
      }
    };

    fetchLadder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRequiredSelections, selectedRetailer, selectedProduct, selectedCategory, selectedItem]);

  const formatWeekDate = (date: Date) => {
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().slice(2)}`;
  };

  const getVariancePercent = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 5) return 'text-green-600';
    if (variance < -5) return 'text-red-600';
    return 'text-gray-600';
  };

  const exportData = () => {
    alert('Export functionality would download CSV/Excel file');
  };

  const saveData = () => {
    if (!hasRequiredSelections) return;

    const newByWeek = new Map(ladderByWeek);

    editedCells.forEach((value, key) => {
      const [weekStr, location, field] = key.split('|');
      const weekNum = parseInt(weekStr);
      const existing = newByWeek.get(weekNum) ?? emptyCategoryMetrics();

      const locationKey = location as keyof CategoryMetrics;
      const locationMetrics = existing[locationKey];

      const updated: CategoryMetrics = {
        ...existing,
        [locationKey]: {
          ...locationMetrics,
          [field]: value,
        },
      };

      newByWeek.set(weekNum, updated);
    });

    setLadderByWeek(newByWeek);
    setEditedCells(new Map());
    toast.success('Edits saved locally (API save not implemented yet).');
  };

  const handleCellEdit = (
    weekNum: number,
    location: keyof CategoryMetrics,
    field: 'planUnits' | 'suggestedPlanUnits',
    value: string
  ) => {
    const numValue = parseInt(value) || 0;
    const key = `${weekNum}|${location}|${field}`;
    const newEditedCells = new Map(editedCells);
    newEditedCells.set(key, numValue);
    setEditedCells(newEditedCells);
  };

  const getCellValue = (
    weekNum: number,
    location: keyof CategoryMetrics,
    field: 'planUnits' | 'suggestedPlanUnits',
    originalValue: number
  ): number => {
    const key = `${weekNum}|${location}|${field}`;
    return editedCells.get(key) ?? originalValue;
  };

  const currentData = useMemo(() => {
    if (!hasRequiredSelections) return null;
    return ladderByWeek;
  }, [hasRequiredSelections, ladderByWeek]);

  const pageLoading = loadingOptions;

  // ... (your JSX below)

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50 p-6">
      {/* ... header ... */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="border-b">
          {/* Retailer select */}
          {/* Category select */}
          {/* Item select */}
          {/* NOTE: onValueChange for Item uses setSelectedItem(value) directly */}
          {/* ... */}
        </CardHeader>

        {/* ... CardContent with table grid that uses currentData ... */}
      </Card>
    </div>
  );
}
