// SalesLadder.tsx (merged: networking debugging steps + CSV/item fixes + ladder query fix) // // Includes: // - CSV parse: dorelItem actually loads (robust header match) // - Item dropdown: value=itemNumber only, label shows "item / dorel" // - No backslash encoding or split hacks // - Ladder API call does NOT send category // - Networking debug: base url, timeout+retry, abort controller, health/test, debug panel
import React, { useState, useMemo, useEffect, useRef } from 'react'; import { Download, Save, Activity, Bug, RotateCcw } from 'lucide-react'; import { Button } from './ui/button'; import { Card, CardHeader, CardTitle } from './ui/card'; import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'; import { toast } from 'sonner';
/* ------------------------- Types -------------------------- */
interface WeekData { weekNum: number; weekStart: Date; weekEnd: Date; }
interface MetricData { actualUnitsLY: number; actualUnits: number; retailerForecastUnits: number; planUnits: number; suggestedPlanUnits: number; }
interface CategoryMetrics { units: MetricData; dollars: MetricData; inventory: MetricData; inventoryCost: MetricData; plannedSales: MetricData; plannedSalesReceipts: MetricData; weeksOfSupply: MetricData; }
type RetailerRow = { retailer: string; product?: string; category: string; itemNumber: string; // retailer_item_id dorelItem?: string; // dorel_item };
type ItemOption = { value: string; label: string };
export type LadderRow = { weekNum: number; weekEnd: string; // ISO date
units_actual_ly: number; units_actual: number; units_retailer_fcst: number; units_plan: number; units_suggested: number; };
/* ------------------------- Helpers -------------------------- */
const getMetricCategories = (): Array<{ key: keyof CategoryMetrics; label: string }> => [ { key: 'units', label: 'Units' }, { key: 'dollars', label: 'Dollars' }, { key: 'inventory', label: 'Inventory' }, { key: 'inventoryCost', label: 'Inventory Cost' }, { key: 'plannedSales', label: 'Planned Sales' }, { key: 'plannedSalesReceipts', label: 'Planned Sales Receipts' }, { key: 'weeksOfSupply', label: 'Weeks of Supply' } ];
const generateWeeks = (): WeekData[] => { const weeks: WeekData[] = []; const startDate = new Date('2026-01-05'); for (let i = 0; i < 52; i++) { const weekStart = new Date(startDate); weekStart.setDate(startDate.getDate() + i * 7);
const weekEnd = new Date(weekStart);
weekEnd.setDate(weekStart.getDate() + 6);

weeks.push({ weekNum: i + 1, weekStart, weekEnd });
 
} return weeks; };
/* ------------------------- Networking debug utilities -------------------------- */
const API_BASE_URL = (import.meta as any)?.env?.VITE_API_BASE_URL?.toString?.() ?? '';
const joinUrl = (base: string, path: string) => { if (!base) return path; const b = base.endsWith('/') ? base.slice(0, -1) : base; const p = path.startsWith('/') ? path : /${path}; return ${b}${p}; };
type FetchDebugInfo = { ts: string; url: string; method: string; status?: number; ok?: boolean; ms?: number; requestId?: string | null; error?: string; responseSnippet?: string; };
async function fetchWithTimeoutAndRetry( input: RequestInfo, init: RequestInit & { timeoutMs?: number; retries?: number; debug?: boolean } = {} ): Promise<{ resp: Response; debug: FetchDebugInfo }> { const { timeoutMs = 12_000, retries = 1, debug = false, ...rest } = init;
const url = typeof input === 'string' ? input : (input as Request).url; const method = (rest.method ?? 'GET').toString();
let lastErr: any = null;
for (let attempt = 0; attempt <= retries; attempt++) { const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), timeoutMs);
const started = performance.now();
const dbg: FetchDebugInfo = { ts: new Date().toISOString(), url, method };

try {
  const resp = await fetch(input, {
    ...rest,
    signal: rest.signal ?? controller.signal,
    cache: rest.cache ?? 'no-cache'
  });

  dbg.ms = Math.round(performance.now() - started);
  dbg.status = resp.status;
  dbg.ok = resp.ok;
  dbg.requestId =
    resp.headers.get('x-request-id') ??
    resp.headers.get('x-ms-request-id') ??
    resp.headers.get('x-correlation-id');

  if (!resp.ok) {
    let snippet = '';
    try {
      snippet = (await resp.clone().text()).slice(0, 500);
    } catch {}
    dbg.responseSnippet = snippet;

    if ([502, 503, 504].includes(resp.status) && attempt < retries) {
      if (debug) console.warn(`[fetch retry] ${resp.status} attempt ${attempt + 1}/${retries}`, dbg);
      continue;
    }
  }

  return { resp, debug: dbg };
} catch (e: any) {
  dbg.ms = Math.round(performance.now() - started);
  dbg.error = e?.name === 'AbortError' ? `Timeout after ${timeoutMs}ms` : (e?.message ?? String(e));
  lastErr = e;

  if (attempt < retries) {
    if (debug) console.warn(`[fetch retry] error attempt ${attempt + 1}/${retries}`, dbg);
    continue;
  }

  const msg =
    e?.name === 'AbortError'
      ? `Request timed out after ${timeoutMs}ms`
      : (e?.message ?? 'Network request failed');
  throw new Error(msg);
} finally {
  clearTimeout(timeout);
}
 
}
throw lastErr ?? new Error('Network request failed'); }
/* ------------------------- CSV parsing (FIXED: dorelItem loads) -------------------------- */
const parseCSV = (csvText: string): RetailerRow[] => { const cleaned = csvText.replace(/^\uFEFF/, '').trim(); const lines = cleaned.split(/\r?\n/).filter(Boolean); if (lines.length < 2) return [];
const headers = lines[0].split(',').map(h => h.trim().toUpperCase());
const idxRetailer = headers.indexOf('RETAILER'); const idxProduct = headers.indexOf('PRODUCT'); const idxCategory = headers.indexOf('CATEGORY'); const idxItem = headers.indexOf('ITEM_NUMBER');
// ✅ robust dorel header match (your requested variants) const idxDorel = headers.findIndex(h => h === 'DOREL_ITEM' || h === 'DOREL ITEM' || h === 'DORELITEM' || h === 'DOREL ITEM NUMBER' );
return lines .slice(1) .map(line => { const parts = line.split(',').map(v => v.trim());
 const retailer = idxRetailer >= 0 ? parts[idxRetailer] : '';
  const product = idxProduct >= 0 ? parts[idxProduct] : '';
  const category = idxCategory >= 0 ? parts[idxCategory] : '';
  const itemNumber = idxItem >= 0 ? parts[idxItem] : '';

  const dorelItem = idxDorel >= 0 ? parts[idxDorel] : undefined;

  return {
    retailer,
    product: product || undefined,
    category,
    itemNumber,
    dorelItem: dorelItem || undefined
  };
})
.filter(r => r.retailer && r.category && r.itemNumber);
 
};
const fetchRetailerOptions = async (): Promise<RetailerRow[]> => { const resp = await fetch('/products/retailer_items.csv', { cache: 'no-cache' }); if (!resp.ok) throw new Error('Failed to load retailer CSV'); return parseCSV(await resp.text()); };
/* ------------------------- Component -------------------------- */
export function SalesLadder() { const [weeks] = useState(generateWeeks()); const [metricCategories] = useState(getMetricCategories());
const [options, setOptions] = useState<RetailerRow[]>([]);
const [ladderRows, setLadderRows] = useState<LadderRow[]>([]); const [ladderLoading, setLadderLoading] = useState(false);
const [selectedRetailer, setSelectedRetailer] = useState(''); const [selectedProduct, setSelectedProduct] = useState(''); const [selectedCategory, setSelectedCategory] = useState(''); const [selectedItem, setSelectedItem] = useState('');
const debugEnabled = useMemo(() => { try { const p = new URLSearchParams(window.location.search); return p.get('debug') === '1'; } catch { return false; } }, []);
const [lastFetch, setLastFetch] = useState<FetchDebugInfo | null>(null); const [lastHealth, setLastHealth] = useState<FetchDebugInfo | null>(null);
const abortRef = useRef<AbortController | null>(null);
/* ------------------------- Load dropdown options (CSV) -------------------------- */
useEffect(() => { fetchRetailerOptions() .then(setOptions) .then(() => toast.success('Dropdown options loaded')) .catch(e => toast.error(e.message)); }, []);
/* ------------------------- Derived dropdown lists -------------------------- */
const retailers = useMemo( () => Array.from(new Set(options.map(o => o.retailer))).sort(), [options] );
// determines if product is a real dimension for the selected retailer const hasProductDimension = useMemo(() => { if (!selectedRetailer) return false; return options.some(o => o.retailer === selectedRetailer && (o.product ?? '').trim().length > 0); }, [options, selectedRetailer]);
const products = useMemo(() => { if (!selectedRetailer || !hasProductDimension) return []; return Array.from( new Set( options .filter(o => o.retailer === selectedRetailer) .map(o => (o.product ?? '').trim()) .filter(Boolean) ) ).sort(); }, [options, selectedRetailer, hasProductDimension]);
const categories = useMemo(() => { return options .filter(o => { if (o.retailer !== selectedRetailer) return false; if (hasProductDimension && selectedProduct && (o.product ?? '').trim() !== selectedProduct) return false; return true; }) .map(o => o.category) .filter((v, i, a) => a.indexOf(v) === i) .sort(); }, [options, selectedRetailer, hasProductDimension, selectedProduct]);
// ✅ (#2/#3) stable itemOptions: value=itemNumber only, label shows item / dorel const itemOptions = useMemo<ItemOption[]>(() => { if (!selectedRetailer || !selectedCategory) return []; if (hasProductDimension && !selectedProduct) return [];
const filtered = options.filter(r => {
  if (r.retailer !== selectedRetailer) return false;
  if (r.category !== selectedCategory) return false;
  if (!hasProductDimension) return true;
  return (r.product ?? '').trim() === selectedProduct;
});

// retailer_item_id -> dorel_item (first non-empty wins)
const map = new Map<string, string | undefined>();
for (const r of filtered) {
  const retailerItem = (r.itemNumber ?? '').trim();
  if (!retailerItem) continue;

  const existing = map.get(retailerItem);
  const dorel = (r.dorelItem ?? '').trim();

  if ((!existing || existing.length === 0) && dorel) map.set(retailerItem, dorel);
  else if (!map.has(retailerItem)) map.set(retailerItem, dorel || undefined);
}

return Array.from(map.entries())
  .map(([retailerItem, dorelItem]) => ({
    value: retailerItem,
    label: dorelItem ? `${retailerItem} / ${dorelItem}` : retailerItem
  }))
  .sort((a, b) => a.label.localeCompare(b.label));
 
}, [options, selectedRetailer, selectedCategory, hasProductDimension, selectedProduct]);
const hasRequiredSelections = Boolean( selectedRetailer && selectedCategory && selectedItem && (!hasProductDimension || selectedProduct) );
/* ------------------------- Debug: Health check + snowflake test endpoints -------------------------- */
const runHealthCheck = async () => { try { const url = joinUrl(API_BASE_URL, '/api/health'); const { resp, debug } = await fetchWithTimeoutAndRetry(url, { timeoutMs: 8000, retries: 0, debug: debugEnabled }); setLastHealth(debug);
 if (!resp.ok) {
    toast.error(`Health check failed (${resp.status})`);
    return;
  }

  let msg = 'API reachable';
  try {
    const j = await resp.clone().json();
    msg = j?.status ? `API: ${j.status}` : msg;
  } catch {}
  toast.success(msg);
} catch (e: any) {
  toast.error(e?.message ?? 'Health check failed');
  setLastHealth({
    ts: new Date().toISOString(),
    url: joinUrl(API_BASE_URL, '/api/health'),
    method: 'GET',
    error: e?.message ?? 'Health check failed'
  });
}
 
};
const runSnowflakeTest = async () => { try { const url = joinUrl(API_BASE_URL, '/api/snowflake-test'); const { resp, debug } = await fetchWithTimeoutAndRetry(url, { timeoutMs: 12000, retries: 0, debug: debugEnabled }); setLastHealth(debug);
 if (!resp.ok) {
    toast.error(`Snowflake test failed (${resp.status})`);
    return;
  }

  toast.success('Snowflake test OK');
} catch (e: any) {
  toast.error(e?.message ?? 'Snowflake test failed');
}
 
};
/* ------------------------- Fetch ladder data (API) -------------------------- */
useEffect(() => { if (!hasRequiredSelections) { setLadderRows([]); abortRef.current?.abort(); abortRef.current = null; return; }
const loadLadder = async () => {
  abortRef.current?.abort();
  const controller = new AbortController();
  abortRef.current = controller;

  setLadderLoading(true);
  try {
    // ✅ (#5) DO NOT send category to ladder endpoint
    const qs = new URLSearchParams({
      retailer: selectedRetailer,
      item: selectedItem,
      ...(hasProductDimension && selectedProduct ? { product: selectedProduct } : {})
    });

    const url = joinUrl(API_BASE_URL, `/api/ladder?${qs.toString()}`);

    const { resp, debug } = await fetchWithTimeoutAndRetry(url, {
      timeoutMs: 15000,
      retries: 1,
      debug: debugEnabled,
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });

    setLastFetch(debug);

    if (!resp.ok) {
      const extra = debug.responseSnippet ? ` — ${debug.responseSnippet}` : '';
      throw new Error(`API ${resp.status}${extra ? extra : ''}`);
    }

    const json = await resp.json();
    setLadderRows(json.rows ?? []);
  } catch (e: any) {
    if (e?.name === 'AbortError') return;
    toast.error(e.message ?? 'Failed to load ladder data');
    setLadderRows([]);
  } finally {
    setLadderLoading(false);
  }
};

loadLadder();

return () => {
  abortRef.current?.abort();
};
 
}, [ hasRequiredSelections, selectedRetailer, selectedProduct, selectedCategory, selectedItem, hasProductDimension, debugEnabled ]);
/* ------------------------- Adapt API rows to existing grid shape -------------------------- */
const currentData = useMemo(() => { if (!hasRequiredSelections) return null;
const m = new Map<number, CategoryMetrics>();

ladderRows.forEach(r => {
  m.set(r.weekNum, {
    units: {
      actualUnitsLY: r.units_actual_ly,
      actualUnits: r.units_actual,
      retailerForecastUnits: r.units_retailer_fcst,
      planUnits: r.units_plan,
      suggestedPlanUnits: r.units_suggested
    },
    dollars: { actualUnitsLY: 0, actualUnits: 0, retailerForecastUnits: 0, planUnits: 0, suggestedPlanUnits: 0 },
    inventory: { actualUnitsLY: 0, actualUnits: 0, retailerForecastUnits: 0, planUnits: 0, suggestedPlanUnits: 0 },
    inventoryCost: { actualUnitsLY: 0, actualUnits: 0, retailerForecastUnits: 0, planUnits: 0, suggestedPlanUnits: 0 },
    plannedSales: { actualUnitsLY: 0, actualUnits: 0, retailerForecastUnits: 0, planUnits: 0, suggestedPlanUnits: 0 },
    plannedSalesReceipts: { actualUnitsLY: 0, actualUnits: 0, retailerForecastUnits: 0, planUnits: 0, suggestedPlanUnits: 0 },
    weeksOfSupply: { actualUnitsLY: 0, actualUnits: 0, retailerForecastUnits: 0, planUnits: 0, suggestedPlanUnits: 0 }
  });
});

return m;
 
}, [hasRequiredSelections, ladderRows]);
/* ------------------------- Render -------------------------- */
return ( 
Sales Ladder Plan – 52 Week View
       <div className="flex gap-2 items-center">
          <Button variant="outline" size="sm" onClick={runHealthCheck} title="Hit /api/health to confirm routing">
            <Activity className="w-4 h-4 mr-2" />
            Health
          </Button>

          <Button variant="outline" size="sm" onClick={runSnowflakeTest} title="Hit /api/snowflake-test if implemented">
            <Bug className="w-4 h-4 mr-2" />
            Snowflake Test
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={!hasRequiredSelections || ladderLoading}
            onClick={() => {
              toast.info('Refreshing ladder data...');
              abortRef.current?.abort();
              // If you want a guaranteed refetch button, add a refreshNonce state and include it in the effect deps.
            }}
            title="Manual refresh"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>

          <Button variant="outline" size="sm" disabled={!hasRequiredSelections || ladderLoading} onClick={() => toast.info('Export wired later')}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>

          <Button variant="outline" size="sm" disabled={!hasRequiredSelections || ladderLoading} onClick={() => toast.info('Save wired later')}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* ---- Drop-down wiring example (Item uses itemOptions + direct value) ---- */}
      {/* Paste this into your existing dropdown section; retailer/product/category selects omitted here */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Category select (example) */}
        <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setSelectedItem(''); }}>
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Item select (✅ #4) */}
        <Select
          value={selectedItem}
          onValueChange={(value) => {
            setSelectedItem(value); // ✅ no splitting, no backslashes
          }}
          disabled={!selectedRetailer || !selectedCategory || (hasProductDimension && !selectedProduct)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Item" />
          </SelectTrigger>
          <SelectContent>
            {itemOptions.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Inline diagnostics */}
      {debugEnabled && (
        <div className="mt-4 text-xs bg-white border rounded p-3 leading-5">
          <div className="font-semibold mb-2">Diagnostics (debug=1)</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <div><span className="font-medium">API_BASE_URL:</span> {API_BASE_URL || '(same-origin)'}</div>
              <div><span className="font-medium">CSV options loaded:</span> {options.length}</div>
              <div>
                <span className="font-medium">Selections:</span>{' '}
                {JSON.stringify({ retailer: selectedRetailer, product: selectedProduct, category: selectedCategory, item: selectedItem })}
              </div>
              <div><span className="font-medium">Has required selections:</span> {String(hasRequiredSelections)}</div>
              <div><span className="font-medium">Ladder rows:</span> {ladderRows.length}</div>
              <div><span className="font-medium">Loading:</span> {String(ladderLoading)}</div>
            </div>

            <div>
              <div className="font-medium">Last /api/health:</div>
              <pre className="whitespace-pre-wrap">{lastHealth ? JSON.stringify(lastHealth, null, 2) : '—'}</pre>

              <div className="font-medium mt-2">Last /api/ladder:</div>
              <pre className="whitespace-pre-wrap">{lastFetch ? JSON.stringify(lastFetch, null, 2) : '—'}</pre>
            </div>
          </div>
        </div>
      )}
    </CardHeader>

   
  </Card>
</div>
 
); }

