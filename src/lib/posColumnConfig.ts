// src/lib/posColumnConfig.ts

export type POSColumnKey =
  | 'RETAILER'
  | 'RETAILER_ITEM_ID'
  | 'ITEM_ID_AT_WEEK'
  | 'RETAIL_YEAR'
  | 'RETAIL_WEEK'
  | 'WEEK_ENDING'
  | 'ACTUAL_UNITS'
  | 'ACTUAL_DOLLARS'
  | 'FORECAST_UNITS'
  | 'ON_HAND_UNITS'
  | 'WHSE_ON_ORDER_UNITS';

export interface POSColumn {
  key: POSColumnKey;
  label: string;
  group: string;
  format?: 'text' | 'int' | 'currency' | 'decimal' | 'date';
  width?: number;
}

/**
 * Column definitions for the POS data grid.
 * Keys match TR3_WEEKLY_UNIFIED output (uppercase).
 */
export const POS_COLUMNS: POSColumn[] = [
  // Identity / time
  { key: 'RETAILER', label: 'Retailer', group: 'identity', format: 'text', width: 120 },
  { key: 'RETAILER_ITEM_ID', label: 'Retailer Item', group: 'identity', format: 'text', width: 140 },
  { key: 'ITEM_ID_AT_WEEK', label: 'Dorel Item', group: 'identity', format: 'text', width: 120 },
  { key: 'RETAIL_YEAR', label: 'Year', group: 'identity', format: 'int', width: 80 },
  { key: 'RETAIL_WEEK', label: 'Week', group: 'identity', format: 'int', width: 80 },
  { key: 'WEEK_ENDING', label: 'Week End', group: 'identity', format: 'date', width: 120 },

  // Sales
  { key: 'ACTUAL_UNITS', label: 'POS Units', group: 'sales', format: 'int' },
  { key: 'ACTUAL_DOLLARS', label: 'POS Dollars', group: 'sales', format: 'currency' },

  // Forecast
  { key: 'FORECAST_UNITS', label: 'Forecast Units', group: 'forecast', format: 'int' },

  // Inventory
  { key: 'ON_HAND_UNITS', label: 'On Hand', group: 'inventory', format: 'int' },
  { key: 'WHSE_ON_ORDER_UNITS', label: 'WHSE On Order', group: 'inventory', format: 'int' },
];

/**
 * Group header labels/colors for the POS grid.
 */
export const POS_GROUP_META: Record<string, { label: string; className: string }> = {
  identity: { label: 'Identity', className: 'bg-slate-100 text-slate-800' },
  sales: { label: 'POS Sales', className: 'bg-sky-100 text-sky-900' },
  forecast: { label: 'Forecast', className: 'bg-violet-100 text-violet-900' },
  inventory: { label: 'Inventory', className: 'bg-emerald-100 text-emerald-900' },
};
