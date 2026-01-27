import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, Filter, AlertCircle, Save, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner';

interface WeekData {
  weekNum: number;
  weekStart: Date;
  weekEnd: Date;
}

interface MetricData {
  actualUnitsLY: number;
  actualUnits: number;
  retailerForecastUnits: number;
  planUnits: number;
  suggestedPlanUnits: number;
}

interface CategoryMetrics {
  units: MetricData;
  dollars: MetricData;
  inventory: MetricData;
  inventoryCost: MetricData;
  plannedSales: MetricData;
  plannedSalesReceipts: MetricData;
  weeksOfSupply: MetricData;
}

// Generate 7 metric categories for 5 metrics each = 35 total columns
const getMetricCategories = (): Array<{ key: keyof CategoryMetrics; label: string }> => {
  return [
    { key: 'units', label: 'Units' },
    { key: 'dollars', label: 'Dollars' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'inventoryCost', label: 'Inventory Cost' },
    { key: 'plannedSales', label: 'Planned Sales' },
    { key: 'plannedSalesReceipts', label: 'Planned Sales Receipts' },
    { key: 'weeksOfSupply', label: 'Weeks of Supply' }
  ];
};

type RetailerRow = { retailer: string; product?: string; category: string; itemNumber: string };

// ---------- Dropdown options (CSV placeholder) ----------

// Parse CSV data (robust to BOM + header casing/order)
const parseCSV = (csvText: string): RetailerRow[] => {
  // remove UTF-8 BOM if present
  const cleaned = csvText.replace(/^\uFEFF/, '').trim();
  const lines = cleaned.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toUpperCase());

  const idxRetailer = headers.findIndex(h => h === 'RETAILER' || h === 'TRUE RETAILER' || h === 'RETAILER_NAME');
  const idxProduct = headers.findIndex(h =>
    h === 'PRODUCT' || h === 'PRODUCT LINE' || h === 'PRODUCT_LINE' || h === 'PRODUCTLINE' || h === 'DIVISION'
  );
  const idxCategory = headers.findIndex(h => h === 'CATEGORY' || h === 'PRODUCT CATEGORY' || h === 'PRODUCT_CATEGORY');
  const idxItem = headers.findIndex(h =>
    h === 'ITEM NUMBER' ||
    h === 'ITEM_NUMBER' ||
    h === 'ITEM' ||
    h === 'ITEMNO' ||
    h === 'PRODUCT ITEM NUMBER' ||
    h === 'PRODUCT_ITEM_NUMBER'
  );

  const data: RetailerRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim());
    const retailer = idxRetailer >= 0 ? parts[idxRetailer] : parts[0];
    const product = idxProduct >= 0 ? parts[idxProduct] : undefined;
    const category = idxCategory >= 0 ? parts[idxCategory] : (idxProduct >= 0 ? parts[2] : parts[1]); // best-effort fallback
    const itemNumber = idxItem >= 0 ? parts[idxItem] : (idxProduct >= 0 ? parts[3] : parts[2]);

    if (!retailer || !category || !itemNumber) continue;

    data.push({ retailer, product: product || undefined, category, itemNumber });
  }

  return data;
};

// Fetch CSV from /products (SWA static assets)
const fetchRetailerData = async (): Promise<RetailerRow[]> => {
  try {
    const response = await fetch('/products/retailer_items.csv', {
      mode: 'cors',
      cache: 'no-cache'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const csvText = await response.text();
    const parsed = parseCSV(csvText);

    if (parsed.length === 0) {
      throw new Error('CSV file is empty or could not be parsed');
    }

    return parsed;
  } catch (error) {
    console.error('Error fetching retailer data:', error);
    toast.warning('Could not load data from CSV. Using sample data instead.');

    // Sample fallback (dropdown-only)
    return [
      { retailer: 'Walmart', category: 'Car Seats', itemNumber: 'CS-001' },
      { retailer: 'Walmart', category: 'Car Seats', itemNumber: 'CS-002' },
      { retailer: 'Walmart', category: 'Strollers', itemNumber: 'ST-001' },
      { retailer: 'Target', category: 'Car Seats', itemNumber: 'CS-101' },
      { retailer: 'Amazon', category: 'Home Safety', itemNumber: 'HS-001' }
    ];
  }
};

// ---------- Ladder API types + normalization ----------

// Preferred API shape (recommended): one row per week with a CategoryMetrics object
// { weekNum: 1, weekEnd: '2026-01-11', metrics: { units: {...}, dollars: {...}, ... } }
// BUT to be resilient, we also support a "flat" wide-row with prefixed column names.

type LadderApiRow = {
  weekNum?: number;
  week_num?: number;
  week?: number;
  weekEnd?: string;
  week_end?: string;
  weekEnding?: string;
  metrics?: CategoryMetrics;
  categoryMetrics?: CategoryMetrics;
  // Flat fields are allowed (unknown keys)
  [key: string]: any;
};

type LadderApiResponse = {
  rows?: LadderApiRow[];
  data?: LadderApiRow[];
};

const emptyMetricData = (): MetricData => ({
  actualUnitsLY: 0,
  actualUnits: 0,
  retailerForecastUnits: 0,
  planUnits: 0,
  suggestedPlanUnits: 0
});

const emptyCategoryMetrics = (): CategoryMetrics => ({
  units: emptyMetricData(),
  dollars: emptyMetricData(),
  inventory: emptyMetricData(),
  inventoryCost: emptyMetricData(),
  plannedSales: emptyMetricData(),
  plannedSalesReceipts: emptyMetricData(),
  weeksOfSupply: emptyMetricData()
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

// Converts a wide/flat row into CategoryMetrics using common column prefix patterns.
// You can tweak these mappings once you finalize your Snowflake view output column names.
const normalizeRowToCategoryMetrics = (row: any): CategoryMetrics => {
  // If API already sends nested metrics, accept it.
  const direct = row?.metrics ?? row?.categoryMetrics;
  if (direct) return direct as CategoryMetrics;

  const n = (v: any) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };

  // ITEM_AMOUNT is defined as ACTUAL_DOLLARS / ACTUAL_UNITS (per your note).
  // Treat it as an implied unit price for the week. Guard against 0/NaN.
  const unitPrice = n(row.ITEM_AMOUNT);

  const actualUnitsLY = n(row.ACTUAL_UNITS_LY);
  const actualUnits = n(row.ACTUAL_UNITS);
  const fcstUnits = n(row.WEEKLY_FORECAST_UNITS);
  const planUnits = n(row.PLAN_UNITS);
  const suggUnits = n(row.SUGGESTED_PLAN_UNITS);

  // Dollars (use provided FORECAST_DOLLARS when present; otherwise derive from units × unitPrice)
  const actualDollarsLY = n(row.ACTUAL_DOLLARS_LY);
  const actualDollars = n(row.ACTUAL_DOLLARS);
  const forecastDollars = row.FORECAST_DOLLARS !== undefined && row.FORECAST_DOLLARS !== null && row.FORECAST_DOLLARS !== ''
    ? n(row.FORECAST_DOLLARS)
    : n(fcstUnits * unitPrice);

  // Plan/Suggested dollars are not explicitly in the view; derive them from unit price.
  const planDollars = n(planUnits * unitPrice);
  const suggestedDollars = n(suggUnits * unitPrice);

  return {
    units: {
      actualUnitsLY,
      actualUnits,
      retailerForecastUnits: fcstUnits,
      planUnits,
      suggestedPlanUnits: suggUnits,
    },

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

    // No true cost fields in the view; keep 0 until you add cost columns.
    inventoryCost: {
      actualUnitsLY: 0,
      actualUnits: 0,
      retailerForecastUnits: 0,
      planUnits: 0,
      suggestedPlanUnits: 0,
    },

    // Not currently provided in the view; keep 0 until you define it.
    plannedSales: {
      actualUnitsLY: 0,
      actualUnits: 0,
      retailerForecastUnits: 0,
      planUnits: 0,
      suggestedPlanUnits: 0,
    },

    // These are unit receipts (not dollars). If you later add dollar receipts, we can split/rename.
    plannedSalesReceipts: {
      actualUnitsLY: 0,
      actualUnits: 0,
      retailerForecastUnits: n(row.FORECAST_UNIT_RECEIPTS),
      planUnits: n(row.PLAN_UNIT_RECEIPTS),
      suggestedPlanUnits: n(row.SUGGESTED_PLAN_UNIT_RECEIPTS),
    },

    // WOS is a single value; we mirror into forecast/plan/suggested to fit the 5-metric grid.
    weeksOfSupply: {
      actualUnitsLY: 0,
      actualUnits: 0,
      retailerForecastUnits: n(row.WOS),
      planUnits: n(row.WOS),
      suggestedPlanUnits: n(row.WOS),
    },
  };
};

const getWeekNumFromRow = (row: LadderApiRow): number => {
  return (
    pickNumber(row, ['weekNum', 'week_num', 'week', 'week_number'], 0) ||
    0
  );
};

const generateWeeks = (): WeekData[] => {
  const weeks: WeekData[] = [];
  const startDate = new Date('2026-01-05');

  for (let i = 0; i < 52; i++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + i * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    weeks.push({
      weekNum: i + 1,
      weekStart,
      weekEnd
    });
  }

  return weeks;
};

export function SalesLadder() {
  // Dropdown options (from CSV placeholder)
  const [optionsRows, setOptionsRows] = useState<RetailerRow[]>([]);

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

  // Load dropdown options from CSV on mount
  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true);
      const csvData = await fetchRetailerData();
      setOptionsRows(csvData);
      setLoadingOptions(false);

      if (csvData.length > 0) toast.success(`Loaded ${csvData.length} option rows`);
      else toast.error('No option data loaded. Please check the CSV file.');
    };

    loadOptions();
  }, []);

  const hasProductDimension = useMemo(() => {
    return optionsRows.some(r => (r.product ?? '').trim().length > 0);
  }, [optionsRows]);

  const retailers = useMemo(() => {
    const unique = Array.from(new Set(optionsRows.map(r => r.retailer).filter(Boolean)));
    return unique.sort();
  }, [optionsRows]);

  const products = useMemo(() => {
    if (!selectedRetailer || !hasProductDimension) return [];
    const filtered = optionsRows.filter(r => r.retailer === selectedRetailer);
    const unique = Array.from(new Set(filtered.map(r => (r.product?.trim() ? r.product.trim() : NO_PRODUCT_LABEL))));
    return unique.sort();
  }, [optionsRows, selectedRetailer, hasProductDimension]);

  const categories = useMemo(() => {
    if (!selectedRetailer) return [];

    const filtered = optionsRows.filter(r => {
      if (r.retailer !== selectedRetailer) return false;
      if (!hasProductDimension) return true;
      if (!selectedProduct) return false;
      const label = r.product?.trim() ? r.product.trim() : NO_PRODUCT_LABEL;
      return label === selectedProduct;
    });

    const unique = Array.from(new Set(filtered.map(r => r.category).filter(Boolean)));
    return unique.sort();
  }, [optionsRows, selectedRetailer, hasProductDimension, selectedProduct]);

  const items = useMemo(() => {
    if (!selectedRetailer || !selectedCategory) return [];
    if (hasProductDimension && !selectedProduct) return [];

    const filtered = optionsRows.filter(r => {
      if (r.retailer !== selectedRetailer) return false;
      if (r.category !== selectedCategory) return false;
      if (!hasProductDimension) return true;
      const label = r.product?.trim() ? r.product.trim() : NO_PRODUCT_LABEL;
      return label === selectedProduct;
    });

    const unique = Array.from(new Set(filtered.map(r => r.itemNumber).filter(Boolean)));
    return unique.sort();
  }, [optionsRows, selectedRetailer, selectedCategory, hasProductDimension, selectedProduct]);

  const hasRequiredSelections =
    Boolean(selectedRetailer) &&
    (!hasProductDimension || Boolean(selectedProduct)) &&
    Boolean(selectedCategory) &&
    Boolean(selectedItem);

  // Fetch ladder data from API when selections are complete
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
        const url =
          `/api/ladder?retailer=${encodeURIComponent(selectedRetailer)}` +
          `&category=${encodeURIComponent(selectedCategory)}` +
          `&item=${encodeURIComponent(selectedItem)}` +
          (hasProductDimension ? `&product=${encodeURIComponent(selectedProduct)}` : '');

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

        // Ensure we at least have empty metrics for any missing weeks (so UI doesn’t explode)
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
    // NOTE: This currently only applies edits locally.
    // For real ladder editing, you’ll eventually post changes to an API endpoint (e.g., /api/ladder/save).

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
          [field]: value
        }
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

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50 p-6">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Sales Ladder Plan - 52 Week View</CardTitle>
            <div className="flex gap-2">
              <Button onClick={exportData} variant="outline" size="sm" disabled={!hasRequiredSelections || ladderLoading}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button onClick={saveData} variant="outline" size="sm" disabled={!hasRequiredSelections || ladderLoading}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>

          <div className="flex gap-4 mt-4 flex-wrap">
            <div className="flex-1 min-w-[250px]">
              <label className="text-sm font-medium mb-1 block">
                Retailer <span className="text-red-500">*</span>
              </label>
              <Select
                value={selectedRetailer}
                onValueChange={(value) => {
                  setSelectedRetailer(value);
                  setSelectedProduct('');
                  setSelectedCategory('');
                  setSelectedItem('');
                }}
              >
                <SelectTrigger className={!selectedRetailer ? 'border-red-300' : ''}>
                  <SelectValue placeholder={pageLoading ? 'Loading...' : 'Select Retailer (Required)'} />
                </SelectTrigger>
                <SelectContent>
                  {retailers.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasProductDimension && (
              <div className="flex-1 min-w-[250px]">
                <label className="text-sm font-medium mb-1 block">
                  Product <span className="text-red-500">*</span>
                </label>
                <Select
                  value={selectedProduct}
                  onValueChange={(value) => {
                    setSelectedProduct(value);
                    setSelectedCategory('');
                    setSelectedItem('');
                  }}
                  disabled={!selectedRetailer}
                >
                  <SelectTrigger className={!selectedProduct && selectedRetailer ? 'border-red-300' : ''}>
                    <SelectValue placeholder="Select Product (Required)" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex-1 min-w-[250px]">
              <label className="text-sm font-medium mb-1 block">
                Product Category <span className="text-red-500">*</span>
              </label>
              <Select
                value={selectedCategory}
                onValueChange={(value) => {
                  setSelectedCategory(value);
                  setSelectedItem('');
                }}
                disabled={!selectedRetailer || (hasProductDimension && !selectedProduct)}
              >
                <SelectTrigger className={!selectedCategory && selectedRetailer ? 'border-red-300' : ''}>
                  <SelectValue placeholder="Select Category (Required)" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[250px]">
              <label className="text-sm font-medium mb-1 block">
                Item Number <span className="text-red-500">*</span>
              </label>
              <Select
                value={selectedItem}
                onValueChange={(value) => {
                  setSelectedItem(value);
                }}
                disabled={!selectedRetailer || !selectedCategory || (hasProductDimension && !selectedProduct)}
              >
                <SelectTrigger className={!selectedItem && selectedCategory ? 'border-red-300' : ''}>
                  <SelectValue placeholder="Select Item (Required)" />
                </SelectTrigger>
                <SelectContent>
                  {items.map(i => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {hasRequiredSelections && currentData && !ladderLoading && !ladderError && (
            <div className="flex items-center justify-between mt-4">
              <Badge variant="secondary">52 weeks × 35 metrics = 1,820 data points</Badge>
              <div className="text-sm text-gray-600">Total Columns: 36 (1 Week + 35 Metrics across 7 Categories)</div>
            </div>
          )}

          {(ladderLoading || ladderError) && (
            <div className="mt-4">
              {ladderLoading && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription className="ml-2">Loading ladder data from Snowflake…</AlertDescription>
                </Alert>
              )}
              {ladderError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="ml-2">{ladderError}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardHeader>

        {/*
          NOTE:
          The grid rendering below still expects `currentData` as Map<weekNum, CategoryMetrics>.
          Since we now populate `ladderByWeek` from /api/ladder, the rest of your grid can remain unchanged.

          If your original file had the big table/grid below, leave it as-is and swap references from
          the old `currentData` to this `currentData` (same name).
        */}

        <CardContent className="flex-1 overflow-auto p-0">
          {loadingOptions ? (
            <div className="flex items-center justify-center h-full p-8">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-sm text-gray-600">Loading retailer options…</p>
              </div>
            </div>
          ) : !hasRequiredSelections ? (
            <div className="flex items-center justify-center h-full p-8">
              <Alert className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please select a <strong>Retailer</strong>, <strong>Product Category</strong>, and <strong>Item Number</strong> to view the sales ladder plan.
                </AlertDescription>
              </Alert>
            </div>
          ) : ladderLoading ? (
            <div className="flex items-center justify-center h-full p-8">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-sm text-gray-600">Loading ladder data from Snowflake…</p>
              </div>
            </div>
          ) : ladderError ? (
            <div className="flex items-center justify-center h-full p-8">
              <Alert variant="destructive" className="max-w-xl">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {ladderError}
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="overflow-auto h-full">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-white z-20">
                  {/* Main header row with location names */}
                  <tr className="border-b border-gray-300">
                    <th
                      className="sticky left-0 bg-white border-r-2 border-gray-300 p-3 text-left font-semibold w-40 z-30"
                      rowSpan={2}
                    >
                      Week
                    </th>
                    {metricCategories.map((location) => (
                      <th
                        key={location.key}
                        className="p-2 border-r-2 border-gray-300 text-center font-semibold bg-gray-100"
                        colSpan={5}
                      >
                        <div className="text-xs">{location.label}</div>
                      </th>
                    ))}
                  </tr>

                  {/* Sub-header row with metric names */}
                  <tr className="border-b-2 border-gray-300">
                    {metricCategories.map((location) => (
                      <React.Fragment key={location.key}>
                        <th
                          key={`${location.key}-ly`}
                          className="p-2 text-[10px] bg-blue-50 border-r border-gray-200 min-w-[80px]"
                        >
                          Actual
                          <br />Units LY
                        </th>
                        <th
                          key={`${location.key}-actual`}
                          className="p-2 text-[10px] bg-green-50 border-r border-gray-200 min-w-[80px]"
                        >
                          Actual
                          <br />Units
                        </th>
                        <th
                          key={`${location.key}-forecast`}
                          className="p-2 text-[10px] bg-purple-50 border-r border-gray-200 min-w-[80px]"
                        >
                          Retailer
                          <br />Forecast
                        </th>
                        <th
                          key={`${location.key}-plan`}
                          className="p-2 text-[10px] bg-yellow-50 border-r border-gray-200 min-w-[80px]"
                        >
                          Plan
                          <br />Units
                        </th>
                        <th
                          key={`${location.key}-suggested`}
                          className="p-2 text-[10px] bg-orange-50 border-r-2 border-gray-300 min-w-[80px]"
                        >
                          Suggested
                          <br />Plan
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {weeks.map((week, rowIndex) => {
                    const weekMetrics = currentData?.get(week.weekNum);

                    return (
                      <tr
                        key={week.weekNum}
                        className={rowIndex % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'}
                      >
                        <td className="sticky left-0 bg-inherit border-r-2 border-gray-300 p-3 font-medium z-10">
                          <div className="flex flex-col">
                            <span className="font-semibold">Week {week.weekNum}</span>
                            <span className="text-xs text-gray-600">
                              {formatWeekDate(week.weekStart)} - {formatWeekDate(week.weekEnd)}
                            </span>
                          </div>
                        </td>

                        {metricCategories.map((location) => {
                          const metrics = weekMetrics?.[location.key];
                          if (!metrics) return null;

                          const planValue = getCellValue(week.weekNum, location.key, 'planUnits', metrics.planUnits);
                          const suggestedValue = getCellValue(
                            week.weekNum,
                            location.key,
                            'suggestedPlanUnits',
                            metrics.suggestedPlanUnits
                          );

                          return (
                            <React.Fragment key={`${week.weekNum}-${location.key}`}>
                              <td className="p-1 text-xs border-r border-gray-100 text-center">
                                {metrics.actualUnitsLY.toLocaleString()}
                              </td>
                              <td className="p-1 text-xs border-r border-gray-100 text-center font-medium">
                                {metrics.actualUnits > 0 ? metrics.actualUnits.toLocaleString() : '-'}
                              </td>
                              <td className="p-1 text-xs border-r border-gray-100 text-center">
                                {metrics.retailerForecastUnits.toLocaleString()}
                              </td>
                              <td className="p-1 border-r border-gray-100">
                                <Input
                                  type="number"
                                  value={planValue}
                                  onChange={(e) => handleCellEdit(week.weekNum, location.key, 'planUnits', e.target.value)}
                                  className="h-7 text-xs text-center border-yellow-200 bg-yellow-50/50 focus:bg-yellow-50"
                                />
                              </td>
                              <td className="p-1 border-r-2 border-gray-300">
                                <Input
                                  type="number"
                                  value={suggestedValue}
                                  onChange={(e) =>
                                    handleCellEdit(week.weekNum, location.key, 'suggestedPlanUnits', e.target.value)
                                  }
                                  className="h-7 text-xs text-center border-orange-200 bg-orange-50/50 focus:bg-orange-50"
                                />
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 flex justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-50 border border-gray-300"></div>
          <span>LY = Last Year</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-50 border border-gray-300"></div>
          <span>CY = Current Year</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-50 border border-gray-300"></div>
          <span>N3W = Next 3 Weeks Forecast</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-50 border border-gray-300"></div>
          <span>Cust = Customer Suggested</span>
        </div>
      </div>
    </div>
  );
}
