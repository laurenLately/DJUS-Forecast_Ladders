// src/lib/ladderColumnConfig.ts

import { LadderColumn } from './ladderColumns';

/**
 * These columns are the canonical “grid contract” for the UI.
 * Keys MUST match Snowflake/view output (uppercase).
 */
export const LADDER_COLUMNS: LadderColumn[] = [
  // Time (identity cols like RETAILER, ITEM etc. are in the filter bar)
  { key: 'RETAIL_YEAR', label: 'Year', group: 'identity', format: 'int', width: 80 },
  { key: 'RETAIL_WEEK', label: 'Week', group: 'identity', format: 'int', width: 80 },
  { key: 'WEEK_ENDING', label: 'Week End', group: 'identity', format: 'date', width: 120 },

  // Actuals
  { key: 'ACTUAL_UNITS_LY', label: 'Units LY', group: 'actuals', format: 'int' },
  { key: 'ACTUAL_DOLLARS_LY', label: 'Dollars LY', group: 'actuals', format: 'currency' },
  { key: 'ACTUAL_UNIT_INV_LY', label: 'Inv Units LY', group: 'actuals', format: 'int' },

  { key: 'ACTUAL_UNITS', label: 'Units', group: 'actuals', format: 'int' },
  { key: 'ACTUAL_DOLLARS', label: 'Dollars', group: 'actuals', format: 'currency' },
  { key: 'ACTUAL_UNIT_INV', label: 'Inv Units', group: 'actuals', format: 'int' },

  // Forecast
  { key: 'WEEKLY_FORECAST_UNITS', label: 'Forecast Units', group: 'forecast', format: 'int' },
  { key: 'ITEM_AMOUNT', label: 'Item $/Unit', group: 'forecast', format: 'currency' },
  { key: 'FORECAST_DOLLARS', label: 'Forecast $', group: 'forecast', format: 'currency' },

  // Plans (editable)
  { key: 'PLAN_UNITS', label: 'Plan Units', group: 'plans', format: 'int', editable: true },
  { key: 'SUGGESTED_PLAN_UNITS', label: 'Suggested Plan', group: 'plans', format: 'int', editable: true },

  // Receipts
  { key: 'FORECAST_UNIT_RECEIPTS', label: 'Forecast Receipts', group: 'receipts', format: 'int' },
  { key: 'PLAN_UNIT_RECEIPTS', label: 'Plan Receipts', group: 'receipts', format: 'int' },
  { key: 'SUGGESTED_PLAN_UNIT_RECEIPTS', label: 'Suggested Receipts', group: 'receipts', format: 'int' },

  // Inventory projections
  { key: 'START_INV_UNITS_TR3', label: 'Start Inv (TR3)', group: 'inventory', format: 'int' },
  { key: 'FORECAST_UNIT_INVENTORY', label: 'Forecast Inv', group: 'inventory', format: 'int' },
  { key: 'PLAN_UNIT_INVENTORY', label: 'Plan Inv', group: 'inventory', format: 'int' },
  { key: 'SUGGESTED_PLAN_UNIT_INVENTORY', label: 'Suggested Inv', group: 'inventory', format: 'int' },

  // On-order + KPIs
  { key: 'WHSE_ON_ORDER_UNITS', label: 'WHSE On Order', group: 'inventory', format: 'int' },
  { key: 'TOW', label: 'TOW', group: 'kpi', format: 'int' },
  { key: 'WOS', label: 'WOS', group: 'kpi', format: 'decimal' },
];

/**
 * Group header labels/colors (Figma-like).
 * These are purely presentational.
 */
export const LADDER_GROUP_META: Record<string, { label: string; className: string }> = {
  identity: { label: 'Identity', className: 'bg-slate-100 text-slate-800' },
  actuals: { label: 'Actuals', className: 'bg-sky-100 text-sky-900' },
  forecast: { label: 'Forecast', className: 'bg-violet-100 text-violet-900' },
  plans: { label: 'Plans', className: 'bg-amber-100 text-amber-900' },
  receipts: { label: 'Receipts', className: 'bg-emerald-100 text-emerald-900' },
  inventory: { label: 'Inventory', className: 'bg-emerald-50 text-emerald-900' },
  kpi: { label: 'KPIs', className: 'bg-rose-100 text-rose-900' },
};
