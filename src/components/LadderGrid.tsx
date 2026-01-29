import React from 'react';
import { generateExcelStyleData, type ExcelRow } from './ladderData';

const columnGroups = [
  {
    name: 'UNITS',
    color: 'bg-blue-100/70',
    headerColor: 'bg-blue-200/80',
    columns: [
      { key: 'actualUnitsLY2024', label: 'Actual Units LY 2024' },
      { key: 'actualUnits2025', label: 'Actual Units 2025' },
      { key: 'amzWeeklyForecast2025', label: 'AMZ Weekly Forecast 2025' },
      { key: 'planUnits2025', label: 'Plan Units 2025' },
      { key: 'suggestedPlanUnits2025', label: 'Suggested Plan Units 2025' },
      { key: 'unitsVsLY', label: 'Units vs LY', isPercent: true },
      { key: 'unitsVsPlan', label: 'Units vs Plan', isPercent: true },
      { key: 'suggPlanVsLYAbs', label: 'Sugg Plan vs. LY' },
      { key: 'suggPlanVsLYPct', label: 'Sugg Plan vs. LY', isPercent: true },
    ],
  },
  {
    name: 'DOLLARS',
    color: 'bg-green-100/70',
    headerColor: 'bg-green-200/80',
    columns: [
      { key: 'actualDollarsLY2024', label: 'Actual Dollars LY 2024', isDollar: true },
      { key: 'actualDollars2025', label: 'Actual Dollars 2025', isDollar: true },
      { key: 'amzForecastDollars2025', label: 'AMZ Forecast $ 2025', isDollar: true },
      { key: 'planDollars2025', label: 'Plan Dollars 2025', isDollar: true },
      { key: 'suggestedPlanDollars2025', label: 'Suggested Plan Dollars 2025', isDollar: true },
      { key: 'dollarsVsLY', label: 'Dollars vs LY', isPercent: true },
      { key: 'dollarsVsPlan', label: 'Dollars vs Plan', isPercent: true },
    ],
  },
  {
    name: 'INVENTORY UNITS',
    color: 'bg-amber-100/60',
    headerColor: 'bg-amber-200/70',
    columns: [
      { key: 'actualUnitInvLY2024', label: 'Actual Unit Inv LY 2024' },
      { key: 'actualUnitInv2025', label: 'Actual Unit Inv. 2025' },
      { key: 'amzPlanUnitInv2025', label: 'AMZ Plan Unit Inv 2025' },
      { key: 'planUnitInv2025', label: 'Plan Unit Inv. 2025' },
      { key: 'suggestedUnitInv2025', label: 'Suggested Unit Inv 2025' },
    ],
  },
  {
    name: 'INVENTORY COST',
    color: 'bg-purple-100/60',
    headerColor: 'bg-purple-200/70',
    columns: [
      { key: 'actualCostInv2024', label: 'Actual Cost Inv. 2024', isDollar: true },
      { key: 'actualCostInv2025', label: 'Actual Cost Inv. 2025', isDollar: true },
      { key: 'planCostInv2025', label: 'Plan Cost Inv. 2025', isDollar: true },
    ],
  },
  {
    name: 'RECEIPTS',
    color: 'bg-teal-100/60',
    headerColor: 'bg-teal-200/70',
    columns: [
      { key: 'actualReceiptsUnits', label: 'Actual Receipts Units' },
      { key: 'amzPlanReceiptsUnits', label: 'AMZ Plan Receipts Units' },
      { key: 'planReceiptsUnits', label: 'Plan Receipts Units' },
      { key: 'suggestedPlanReceiptsUnits', label: 'Suggested Plan Receipts Units' },
      { key: 'amzPlanReceiptsCost', label: 'AMZ Plan Receipts Cost $', isDollar: true },
      { key: 'planReceiptsCost', label: 'Plan Receipts Cost', isDollar: true },
      { key: 'suggestedPlanReceiptsCost', label: 'Suggested Plan Receipts Cost', isDollar: true },
    ],
  },
  {
    name: 'OTHER METRICS',
    color: 'bg-slate-100/60',
    headerColor: 'bg-slate-200/70',
    columns: [
      { key: 'totalCost', label: 'Total Cost', isDollar: true },
      { key: 'totalRet', label: 'Total Ret', isDollar: true },
      { key: 'budget2025Totals', label: '2025 Budget Totals', isDollar: true },
      { key: 'storeOnOrder', label: 'Store On Order' },
      { key: 'whseInv', label: 'Whse Inv' },
      { key: 'whseOnOrder', label: 'Whse On Order' },
      { key: 'tow', label: 'TOW' },
      { key: 'wos', label: 'WOS', isDecimal: true },
      { key: 'futureWos', label: 'FUTURE WOS', isDecimal: true },
      { key: 'tyAvgWeeklyRetail', label: 'TY AVG WEEKLY RETAIL', isDollar: true },
    ],
  },
];

export function LadderGrid() {
  const data = generateExcelStyleData();

  const formatValue = (value: number | null | string, isDollar?: boolean, isPercent?: boolean, isDecimal?: boolean) => {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'string') return value;
    if (value === 0 && !isDecimal) return '0';
    
    if (isPercent) {
      if (typeof value === 'string' && value.includes('DIV')) return '#DIV/0!';
      const sign = value >= 0 ? '' : '';
      return `${sign}${value.toFixed(0)}%`;
    }
    
    if (isDecimal) {
      return value.toFixed(2);
    }
    
    if (isDollar) {
      const formatted = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      return `$${formatted}`;
    }
    
    return Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const getVarianceColor = (value: number | string | null, isPercent?: boolean) => {
    if (typeof value === 'string' && value.includes('DIV')) return 'text-gray-500';
    if (value === null || value === undefined || value === 0) return 'text-gray-900';
    if (typeof value !== 'number') return 'text-gray-900';
    if (isPercent) {
      return value < 0 ? 'text-red-600' : 'text-gray-900';
    }
    return 'text-gray-900';
  };

  // Group rows by month for merged cells
  const getMonthSpan = (index: number, rows: ExcelRow[]) => {
    if (rows[index].isTotal) return 0;
    
    const currentMonth = rows[index].month;
    let span = 1;
    
    for (let i = index + 1; i < rows.length; i++) {
      if (rows[i].month === currentMonth && !rows[i].isTotal) {
        span++;
      } else {
        break;
      }
    }
    
    return span;
  };

  const shouldRenderMonthCell = (index: number, rows: ExcelRow[]) => {
    if (rows[index].isTotal) return true;
    if (index === 0) return true;
    
    return rows[index].month !== rows[index - 1].month || rows[index - 1].isTotal;
  };

  return (
    <div className="relative bg-white">
      <style>{`
        .excel-table {
          font-family: 'Calibri', 'Arial', sans-serif;
        }
        
        .excel-table tbody tr:hover td {
          background-color: rgba(59, 130, 246, 0.05) !important;
        }
        
        .excel-table tbody tr.total-row {
          background-color: #e5e7eb !important;
        }
        
        .excel-table tbody tr.total-row:hover td {
          background-color: #d1d5db !important;
        }
      `}</style>
      <div className="overflow-x-auto">
        <table className="excel-table border-collapse" style={{ fontSize: '10px' }}>
          {/* Two-tier header */}
          <thead className="sticky top-0 z-10">
            {/* Group names row */}
            <tr className="border-b border-gray-400">
              {/* Frozen column headers */}
              <th className="bg-gray-100 border-r border-gray-400 px-0.5 py-1" style={{ width: '45px' }}></th>
              <th className="bg-gray-100 border-r border-gray-400 px-0.5 py-1" style={{ width: '28px' }}></th>
              <th className="bg-gray-100 border-r border-gray-400 px-0.5 py-1" style={{ width: '60px' }}></th>
              <th className="bg-gray-100 border-r border-gray-400 px-0.5 py-1" style={{ width: '60px' }}></th>
              <th className="bg-gray-100 border-r-2 border-gray-500 px-0.5 py-1" style={{ width: '90px' }}></th>
              
              {/* Metric group headers */}
              {columnGroups.map((group, idx) => (
                <th
                  key={group.name}
                  className={`${group.headerColor} ${
                    idx === columnGroups.length - 1 ? 'border-r-2 border-gray-500' : 'border-r border-gray-400'
                  } px-2 py-1.5 text-center font-bold text-gray-900`}
                  colSpan={group.columns.length}
                  style={{ fontSize: '11px' }}
                >
                  {group.name}
                </th>
              ))}
            </tr>
            
            {/* Column labels row */}
            <tr className="border-b-2 border-gray-500 bg-gray-50">
              <th className="bg-gray-100 border-r border-gray-400 px-0.5 py-1 text-center font-semibold text-gray-800" style={{ fontSize: '9px' }}></th>
              <th className="bg-gray-100 border-r border-gray-400 px-0.5 py-1 text-center font-semibold text-gray-800" style={{ fontSize: '9px' }}>
                Wk
              </th>
              <th className="bg-gray-100 border-r border-gray-400 px-0 py-1 text-center font-semibold text-gray-800" style={{ fontSize: '9px' }}>
                WEEK<br/>(BEG. DATE)
              </th>
              <th className="bg-gray-100 border-r border-gray-400 px-0 py-1 text-center font-semibold text-gray-800" style={{ fontSize: '9px' }}>
                week<br/>(end date)
              </th>
              <th className="bg-gray-100 border-r-2 border-gray-500 px-0 py-1" style={{ width: '90px' }}></th>
              
              {/* Column headers */}
              {columnGroups.map((group, groupIdx) =>
                group.columns.map((col, idx) => (
                  <th
                    key={`${group.name}-${col.key}`}
                    className={`${group.headerColor} ${
                      idx === group.columns.length - 1 && groupIdx === columnGroups.length - 1 ? 'border-r-2 border-gray-500' : 
                      idx === group.columns.length - 1 ? 'border-r border-gray-400' : 'border-r border-gray-300'
                    } px-1.5 py-1 text-center font-semibold text-gray-800 whitespace-nowrap`}
                    style={{ minWidth: '30px', maxWidth: '120px', fontSize: '8.5px' }}
                  >
                    {col.label}
                  </th>
                ))
              )}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {data.map((row, rowIndex) => {
              const isTotal = row.isTotal;
              const monthSpan = getMonthSpan(rowIndex, data);
              const showMonthCell = shouldRenderMonthCell(rowIndex, data);
              
              const rowClass = isTotal
                ? 'font-bold border-t-2 border-gray-500 total-row'
                : 'border-b border-gray-300';

              return (
                <tr key={rowIndex} className={rowClass}>
                  {/* Month cell - merged vertically */}
                  {showMonthCell && (
                    <td 
                      className={`${isTotal ? 'bg-gray-200' : 'bg-white'} border-r border-gray-400 px-0.5 py-1 text-center font-semibold`}
                      rowSpan={isTotal ? 1 : monthSpan}
                      style={{ verticalAlign: 'middle', fontSize: '9px' }}
                    >
                      {row.month}
                    </td>
                  )}
                  
                  {/* Week # */}
                  <td className={`${isTotal ? 'bg-gray-200' : 'bg-white'} border-r border-gray-400 px-0.5 py-0.5 text-center`} style={{ fontSize: '9px' }}>
                    {row.week || ''}
                  </td>
                  
                  {/* Week Begin Date */}
                  <td className={`${isTotal ? 'bg-gray-200' : 'bg-white'} border-r border-gray-400 px-0 py-0.5 text-center text-gray-700`} style={{ fontSize: '8.5px' }}>
                    {row.weekBegin || ''}
                  </td>
                  
                  {/* Week End Date */}
                  <td className={`${isTotal ? 'bg-gray-200' : 'bg-white'} border-r border-gray-400 px-0 py-0.5 text-center text-gray-700`} style={{ fontSize: '8.5px' }}>
                    {row.weekEnd || ''}
                  </td>
                  
                  {/* Promo/Notes column */}
                  <td className={`${isTotal ? 'bg-gray-200' : 'bg-white'} border-r-2 border-gray-500 px-0 py-0.5 text-left text-gray-700`} style={{ fontSize: '8px' }}>
                    {row.promo || ''}
                  </td>

                  {/* Metric columns */}
                  {columnGroups.map((group, groupIdx) =>
                    group.columns.map((col, idx) => {
                      const value = row[col.key as keyof ExcelRow];
                      const cellColor = isTotal ? 'bg-gray-200' : group.color;
                      const textColor = col.isPercent ? getVarianceColor(value as number | string, true) : 'text-gray-900';
                      
                      return (
                        <td
                          key={`${group.name}-${col.key}`}
                          className={`${cellColor} ${textColor} ${
                            idx === group.columns.length - 1 && groupIdx === columnGroups.length - 1 ? 'border-r-2 border-gray-500' : 
                            idx === group.columns.length - 1 ? 'border-r border-gray-400' : 'border-r border-gray-300'
                          } px-1.5 py-0.5 text-right whitespace-nowrap`}
                          style={{ fontSize: '9.5px' }}
                        >
                          {formatValue(value as number | string | null, col.isDollar, col.isPercent, col.isDecimal)}
                        </td>
                      );
                    })
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}