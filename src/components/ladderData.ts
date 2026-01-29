export interface ExcelRow {
  month: string;
  week: number | null;
  weekBegin: string;
  weekEnd: string;
  promo: string;
  isTotal?: boolean;
  
  // UNITS
  actualUnitsLY2024: number | null;
  actualUnits2025: number | null;
  amzWeeklyForecast2025: number | null;
  planUnits2025: number | null;
  suggestedPlanUnits2025: number | null;
  unitsVsLY: number | string | null;
  unitsVsPlan: number | string | null;
  suggPlanVsLYAbs: number | null;
  suggPlanVsLYPct: number | string | null;
  
  // DOLLARS
  actualDollarsLY2024: number | null;
  actualDollars2025: number | null;
  amzForecastDollars2025: number | null;
  planDollars2025: number | null;
  suggestedPlanDollars2025: number | null;
  dollarsVsLY: number | string | null;
  dollarsVsPlan: number | string | null;
  
  // INVENTORY UNITS
  actualUnitInvLY2024: number | null;
  actualUnitInv2025: number | null;
  amzPlanUnitInv2025: number | null;
  planUnitInv2025: number | null;
  suggestedUnitInv2025: number | null;
  
  // INVENTORY COST
  actualCostInv2024: number | null;
  actualCostInv2025: number | null;
  planCostInv2025: number | null;
  
  // RECEIPTS
  actualReceiptsUnits: number | null;
  amzPlanReceiptsUnits: number | null;
  planReceiptsUnits: number | null;
  suggestedPlanReceiptsUnits: number | null;
  amzPlanReceiptsCost: number | null;
  planReceiptsCost: number | null;
  suggestedPlanReceiptsCost: number | null;
  
  // OTHER METRICS
  totalCost: number | null;
  totalRet: number | null;
  budget2025Totals: number | null;
  storeOnOrder: number | null;
  whseInv: number | null;
  whseOnOrder: number | null;
  tow: number | null;
  wos: number | null;
  futureWos: number | null;
  tyAvgWeeklyRetail: number | null;
}

function getWeekDate(weekNum: number, year: number = 2025): { begin: string; end: string } {
  const startDate = new Date(year, 0, 5); // Starting Jan 5
  const beginDate = new Date(startDate);
  beginDate.setDate(startDate.getDate() + (weekNum - 1) * 7);
  
  const endDate = new Date(beginDate);
  endDate.setDate(beginDate.getDate() + 6);
  
  const formatDate = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${month}/${day}/${year}`;
  };
  
  return {
    begin: formatDate(beginDate),
    end: formatDate(endDate),
  };
}

function getMonthName(weekNum: number, year: number = 2025): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const startDate = new Date(year, 0, 5);
  const weekDate = new Date(startDate);
  weekDate.setDate(startDate.getDate() + (weekNum - 1) * 7);
  return months[weekDate.getMonth()];
}

function calcPercent(current: number | null, base: number | null): number | string {
  if (base === null || base === 0 || current === null) return '';
  return Math.round(((current - base) / base) * 100);
}

function generateWeekData(weekNum: number): ExcelRow {
  const dates = getWeekDate(weekNum);
  const month = getMonthName(weekNum);
  
  // Simulate the actual data pattern from Excel
  const baseUnits = 5 + Math.floor(Math.random() * 15);
  const avgPrice = 64.99;
  
  // For first few weeks (like the example), many values are 0 or null
  const actualUnitsLY2024 = weekNum === 4 ? 11 : (weekNum <= 4 ? null : Math.floor(Math.random() * 20));
  const actualUnits2025 = weekNum === 1 ? 0 : weekNum === 2 ? 0 : weekNum === 3 ? 0 : weekNum === 4 ? 11 : Math.floor(Math.random() * 15);
  const amzWeeklyForecast2025 = weekNum === 1 ? 9 : weekNum === 2 ? 7 : weekNum === 3 ? 7 : weekNum === 4 ? 10 : Math.floor(Math.random() * 12);
  const planUnits2025 = weekNum === 1 ? 0 : weekNum === 2 ? 0 : weekNum === 3 ? 0 : weekNum === 4 ? 0 : Math.floor(Math.random() * 20);
  const suggestedPlanUnits2025 = weekNum <= 4 ? 5 : Math.floor(Math.random() * 10) + 5;
  
  const unitsVsLY = calcPercent(actualUnits2025, actualUnitsLY2024);
  const unitsVsPlan = calcPercent(actualUnits2025, planUnits2025);
  const suggPlanVsLYAbs = actualUnitsLY2024 !== null && suggestedPlanUnits2025 !== null ? suggestedPlanUnits2025 - actualUnitsLY2024 : null;
  const suggPlanVsLYPct = calcPercent(suggestedPlanUnits2025, actualUnitsLY2024);
  
  const actualDollarsLY2024 = actualUnitsLY2024 ? Math.round(actualUnitsLY2024 * (weekNum === 4 ? 45.49 : avgPrice)) : null;
  const actualDollars2025 = actualUnits2025 ? Math.round(actualUnits2025 * (weekNum >= 3 ? 45.49 : avgPrice)) : null;
  const amzForecastDollars2025 = amzWeeklyForecast2025 ? Math.round(amzWeeklyForecast2025 * avgPrice * 0.7) : null;
  const planDollars2025 = planUnits2025 ? Math.round(planUnits2025 * avgPrice) : null;
  const suggestedPlanDollars2025 = suggestedPlanUnits2025 ? Math.round(suggestedPlanUnits2025 * avgPrice) : null;
  
  const dollarsVsLY = calcPercent(actualDollars2025, actualDollarsLY2024);
  const dollarsVsPlan = calcPercent(actualDollars2025, planDollars2025);
  
  // Inventory data (based on Excel example)
  const actualUnitInvLY2024 = weekNum === 1 ? 155 : weekNum === 2 ? 71 : weekNum === 3 ? 34 : weekNum === 4 ? 32 : Math.floor(Math.random() * 100) + 20;
  const actualUnitInv2025 = weekNum === 1 ? 13 : weekNum === 2 ? 8 : weekNum === 3 ? 2 : weekNum === 4 ? 0 : Math.floor(Math.random() * 15);
  const amzPlanUnitInv2025 = weekNum === 1 ? 23 : weekNum === 2 ? 31 : weekNum === 3 ? 38 : weekNum === 4 ? 41 : Math.floor(Math.random() * 40) + 20;
  const planUnitInv2025 = weekNum === 1 ? 70 : weekNum === 2 ? 77 : weekNum === 3 ? 80 : weekNum === 4 ? 82 : Math.floor(Math.random() * 50) + 60;
  const suggestedUnitInv2025 = weekNum === 1 ? 15 : weekNum === 2 ? 37 : weekNum === 3 ? 60 : weekNum === 4 ? 82 : Math.floor(Math.random() * 60) + 20;
  
  const actualCostInv2024 = actualUnitInvLY2024 ? Math.round(actualUnitInvLY2024 * 36.72) : null;
  const actualCostInv2025 = actualUnitInv2025 ? Math.round(actualUnitInv2025 * 36.72) : null;
  const planCostInv2025 = planUnitInv2025 ? Math.round(planUnitInv2025 * 36.72) : null;
  
  // Receipts (mostly 0 in the example)
  const actualReceiptsUnits = 0;
  const amzPlanReceiptsUnits = weekNum === 1 ? 10 : weekNum === 2 ? 14 : weekNum === 3 ? 14 : weekNum === 4 ? 13 : Math.floor(Math.random() * 15);
  const planReceiptsUnits = weekNum === 1 ? 25 : weekNum === 2 ? 27 : weekNum === 3 ? 27 : weekNum === 4 ? 27 : Math.floor(Math.random() * 30);
  const suggestedPlanReceiptsUnits = weekNum === 1 ? 5 : weekNum === 2 ? 27 : weekNum === 3 ? 27 : weekNum === 4 ? 27 : Math.floor(Math.random() * 30);
  const amzPlanReceiptsCost = amzPlanReceiptsUnits ? Math.round(amzPlanReceiptsUnits * 36.72) : null;
  const planReceiptsCost = planReceiptsUnits ? Math.round(planReceiptsUnits * 36.72) : null;
  const suggestedPlanReceiptsCost = suggestedPlanReceiptsUnits ? Math.round(suggestedPlanReceiptsUnits * 36.72) : null;
  
  // Other metrics
  const totalCost = 36.72;
  const totalRet = null;
  const budget2025Totals = null;
  const storeOnOrder = null;
  const whseInv = weekNum === 1 ? 3 : weekNum === 2 ? 2 : weekNum === 3 ? 0 : weekNum === 4 ? 0 : Math.floor(Math.random() * 5);
  const whseOnOrder = weekNum === 1 ? 16 : weekNum === 2 ? 10 : weekNum === 3 ? 2 : weekNum === 4 ? 0 : Math.floor(Math.random() * 15);
  const wos = weekNum === 1 ? 1.78 : weekNum === 2 ? 1.67 : weekNum === 3 ? 0.17 : weekNum === 4 ? 0.0 : Math.random() * 2;
  const futureWos = weekNum === 1 ? 0.69 : weekNum === 2 ? 0.39 : weekNum === 3 ? 0.08 : weekNum === 4 ? 0.0 : Math.random() * 1;
  const tyAvgWeeklyRetail = weekNum >= 3 ? 45.49 : 64.99;
  
  // Promo notes
  let promo = '';
  if (weekNum === 3 || weekNum === 4) {
    promo = '30% off 2-16 to 3-8';
  }
  
  return {
    month,
    week: weekNum,
    weekBegin: dates.begin,
    weekEnd: dates.end,
    promo,
    
    actualUnitsLY2024,
    actualUnits2025,
    amzWeeklyForecast2025,
    planUnits2025,
    suggestedPlanUnits2025,
    unitsVsLY,
    unitsVsPlan,
    suggPlanVsLYAbs,
    suggPlanVsLYPct,
    
    actualDollarsLY2024,
    actualDollars2025,
    amzForecastDollars2025,
    planDollars2025,
    suggestedPlanDollars2025,
    dollarsVsLY,
    dollarsVsPlan,
    
    actualUnitInvLY2024,
    actualUnitInv2025,
    amzPlanUnitInv2025,
    planUnitInv2025,
    suggestedUnitInv2025,
    
    actualCostInv2024,
    actualCostInv2025,
    planCostInv2025,
    
    actualReceiptsUnits,
    amzPlanReceiptsUnits,
    planReceiptsUnits,
    suggestedPlanReceiptsUnits,
    amzPlanReceiptsCost,
    planReceiptsCost,
    suggestedPlanReceiptsCost,
    
    totalCost,
    totalRet,
    budget2025Totals,
    storeOnOrder,
    whseInv,
    whseOnOrder,
    tow: null,
    wos,
    futureWos,
    tyAvgWeeklyRetail,
  };
}

function generateMonthTotal(monthName: string, weeks: ExcelRow[]): ExcelRow {
  const sum = (key: keyof ExcelRow) => {
    const values = weeks.map(w => w[key]).filter(v => typeof v === 'number') as number[];
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) : null;
  };
  
  const totalActualUnitsLY2024 = sum('actualUnitsLY2024');
  const totalActualUnits2025 = sum('actualUnits2025');
  const totalPlanUnits2025 = sum('planUnits2025');
  const totalSuggestedPlanUnits2025 = sum('suggestedPlanUnits2025');
  
  const unitsVsLY = calcPercent(totalActualUnits2025, totalActualUnitsLY2024);
  const unitsVsPlan = calcPercent(totalActualUnits2025, totalPlanUnits2025);
  const suggPlanVsLYAbs = totalActualUnitsLY2024 !== null && totalSuggestedPlanUnits2025 !== null ? totalSuggestedPlanUnits2025 - totalActualUnitsLY2024 : null;
  const suggPlanVsLYPct = calcPercent(totalSuggestedPlanUnits2025, totalActualUnitsLY2024);
  
  const totalActualDollarsLY2024 = sum('actualDollarsLY2024');
  const totalActualDollars2025 = sum('actualDollars2025');
  const totalPlanDollars2025 = sum('planDollars2025');
  
  const dollarsVsLY = calcPercent(totalActualDollars2025, totalActualDollarsLY2024);
  const dollarsVsPlan = calcPercent(totalActualDollars2025, totalPlanDollars2025);
  
  return {
    month: `TOTAL ${monthName.toUpperCase()}`,
    week: null,
    weekBegin: '',
    weekEnd: '',
    promo: '',
    isTotal: true,
    
    actualUnitsLY2024: totalActualUnitsLY2024,
    actualUnits2025: totalActualUnits2025,
    amzWeeklyForecast2025: sum('amzWeeklyForecast2025'),
    planUnits2025: totalPlanUnits2025,
    suggestedPlanUnits2025: totalSuggestedPlanUnits2025,
    unitsVsLY,
    unitsVsPlan,
    suggPlanVsLYAbs,
    suggPlanVsLYPct,
    
    actualDollarsLY2024: totalActualDollarsLY2024,
    actualDollars2025: totalActualDollars2025,
    amzForecastDollars2025: sum('amzForecastDollars2025'),
    planDollars2025: totalPlanDollars2025,
    suggestedPlanDollars2025: sum('suggestedPlanDollars2025'),
    dollarsVsLY,
    dollarsVsPlan,
    
    actualUnitInvLY2024: null,
    actualUnitInv2025: null,
    amzPlanUnitInv2025: null,
    planUnitInv2025: null,
    suggestedUnitInv2025: null,
    
    actualCostInv2024: null,
    actualCostInv2025: null,
    planCostInv2025: null,
    
    actualReceiptsUnits: sum('actualReceiptsUnits'),
    amzPlanReceiptsUnits: sum('amzPlanReceiptsUnits'),
    planReceiptsUnits: sum('planReceiptsUnits'),
    suggestedPlanReceiptsUnits: sum('suggestedPlanReceiptsUnits'),
    amzPlanReceiptsCost: sum('amzPlanReceiptsCost'),
    planReceiptsCost: sum('planReceiptsCost'),
    suggestedPlanReceiptsCost: sum('suggestedPlanReceiptsCost'),
    
    totalCost: null,
    totalRet: null,
    budget2025Totals: null,
    storeOnOrder: null,
    whseInv: null,
    whseOnOrder: null,
    tow: null,
    wos: null,
    futureWos: null,
    tyAvgWeeklyRetail: null,
  };
}

export function generateExcelStyleData(): ExcelRow[] {
  const data: ExcelRow[] = [];
  const monthWeeks: { [key: string]: ExcelRow[] } = {};
  
  // Generate all 52 weeks
  for (let week = 1; week <= 52; week++) {
    const weekData = generateWeekData(week);
    const monthName = weekData.month;
    
    if (!monthWeeks[monthName]) {
      monthWeeks[monthName] = [];
    }
    
    monthWeeks[monthName].push(weekData);
    data.push(weekData);
  }
  
  // Insert month totals
  const result: ExcelRow[] = [];
  let currentMonth = '';
  
  for (const row of data) {
    if (row.month !== currentMonth && currentMonth !== '') {
      // Insert total for previous month
      result.push(generateMonthTotal(currentMonth, monthWeeks[currentMonth]));
    }
    
    result.push(row);
    currentMonth = row.month;
  }
  
  // Add final month total
  if (currentMonth) {
    result.push(generateMonthTotal(currentMonth, monthWeeks[currentMonth]));
  }
  
  return result;
}