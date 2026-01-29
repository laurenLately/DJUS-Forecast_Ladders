import React from 'react';
import { generatePOSData, type POSRow } from './posData';

const columnGroups = [
  {
    name: 'ON HAND INVENTORY',
    color: 'bg-blue-100/70',
    headerColor: 'bg-blue-200/80',
    columns: [
      { key: 'ON_HAND_UNITS', label: 'On Hand Units' },
      { key: 'SELLABLE_ON_HAND_UNITS', label: 'Sellable On Hand Units' },
      { key: 'UNSELLABLE_UNITS', label: 'Unsellable Units' },
      { key: 'RETURN_UNITS', label: 'Return Units' },
    ],
  },
  {
    name: 'LOCATION INVENTORY',
    color: 'bg-green-100/70',
    headerColor: 'bg-green-200/80',
    columns: [
      { key: 'DC_ON_HAND_UNITS', label: 'DC On Hand Units' },
      { key: 'STORE_ON_HAND_UNITS', label: 'Store On Hand Units' },
      { key: 'STORE_COUNT', label: 'Store Count' },
    ],
  },
  {
    name: 'SUPPLY CHAIN',
    color: 'bg-amber-100/60',
    headerColor: 'bg-amber-200/70',
    columns: [
      { key: 'IN_TRANSIT_UNITS', label: 'In Transit Units' },
      { key: 'OPEN_ORDER_UNITS', label: 'Open Order Units' },
      { key: 'BACKORDER_UNITS', label: 'Backorder Units' },
    ],
  },
  {
    name: 'AVAILABILITY',
    color: 'bg-purple-100/60',
    headerColor: 'bg-purple-200/70',
    columns: [
      { key: 'AVAILABLE_TO_SELL_UNITS', label: 'Available To Sell Units' },
      { key: 'WEEKS_OF_SUPPLY', label: 'Weeks Of Supply', isDecimal: true },
    ],
  },
];

export function POSDataGrid() {
  const data = generatePOSData();

  const formatValue = (value: number | null | string, isDollar?: boolean, isPercent?: boolean, isDecimal?: boolean) => {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'string') return value;
    if (value === 0 && !isDecimal) return '0';
    
    if (isPercent) {
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
    if (value === null || value === undefined || value === 0) return 'text-gray-900';
    if (typeof value !== 'number') return 'text-gray-900';
    if (isPercent) {
      return value < 0 ? 'text-red-600' : 'text-gray-900';
    }
    return 'text-gray-900';
  };

  // Group rows by month for merged cells
  const getMonthSpan = (index: number, rows: POSRow[]) => {
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

  const shouldRenderMonthCell = (index: number, rows: POSRow[]) => {
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
              {/* Navigation column headers */}
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
                  
                  {/* Notes column */}
                  <td className={`${isTotal ? 'bg-gray-200' : 'bg-white'} border-r-2 border-gray-500 px-0 py-0.5 text-left text-gray-700`} style={{ fontSize: '8px' }}>
                    {row.notes || ''}
                  </td>

                  {/* Metric columns */}
                  {columnGroups.map((group, groupIdx) =>
                    group.columns.map((col, idx) => {
                      const value = row[col.key as keyof POSRow];
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