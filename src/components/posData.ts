export interface POSRow {
  month: string;
  week: number | string;
  weekBegin: string;
  weekEnd: string;
  notes: string;
  isTotal?: boolean;
  
  // Inventory columns
  ON_HAND_UNITS: number | null;
  SELLABLE_ON_HAND_UNITS: number | null;
  UNSELLABLE_UNITS: number | null;
  RETURN_UNITS: number | null;
  IN_TRANSIT_UNITS: number | null;
  DC_ON_HAND_UNITS: number | null;
  STORE_ON_HAND_UNITS: number | null;
  OPEN_ORDER_UNITS: number | null;
  BACKORDER_UNITS: number | null;
  AVAILABLE_TO_SELL_UNITS: number | null;
  WEEKS_OF_SUPPLY: number | null;
  STORE_COUNT: number | null;
}

const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'];

function getWeekDates(weekNum: number): { begin: string, end: string } {
  const startDate = new Date(2025, 0, 5); // Jan 5, 2025 (Week 1)
  const weekStart = new Date(startDate);
  weekStart.setDate(startDate.getDate() + (weekNum - 1) * 7);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  const formatDate = (date: Date) => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${month}/${day}/${date.getFullYear()}`;
  };
  
  return {
    begin: formatDate(weekStart),
    end: formatDate(weekEnd)
  };
}

function randomInRange(min: number, max: number, decimals: number = 0): number {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

function generateWeekData(weekNum: number): POSRow {
  const dates = getWeekDates(weekNum);
  const weekStart = new Date(2025, 0, 5 + (weekNum - 1) * 7);
  const monthIndex = weekStart.getMonth();
  
  const onHandUnits = randomInRange(5000, 15000);
  const unsellableUnits = randomInRange(100, 500);
  const sellableUnits = onHandUnits - unsellableUnits;
  const storeOnHand = randomInRange(3000, 8000);
  const dcOnHand = onHandUnits - storeOnHand;
  const inTransit = randomInRange(500, 2500);
  const openOrders = randomInRange(1000, 4000);
  const backorders = randomInRange(0, 300);
  const availableToSell = sellableUnits + inTransit + openOrders - backorders;
  const storeCount = randomInRange(180, 220);
  
  return {
    month: months[monthIndex],
    week: weekNum,
    weekBegin: dates.begin,
    weekEnd: dates.end,
    notes: weekNum % 8 === 0 ? 'Promo Week' : weekNum % 5 === 0 ? 'Holiday Period' : '',
    
    // Inventory columns
    ON_HAND_UNITS: onHandUnits,
    SELLABLE_ON_HAND_UNITS: sellableUnits,
    UNSELLABLE_UNITS: unsellableUnits,
    RETURN_UNITS: randomInRange(50, 200),
    IN_TRANSIT_UNITS: inTransit,
    DC_ON_HAND_UNITS: dcOnHand,
    STORE_ON_HAND_UNITS: storeOnHand,
    OPEN_ORDER_UNITS: openOrders,
    BACKORDER_UNITS: backorders,
    AVAILABLE_TO_SELL_UNITS: availableToSell,
    WEEKS_OF_SUPPLY: randomInRange(2.5, 9.5, 2),
    STORE_COUNT: storeCount,
  };
}

function generateMonthTotal(monthData: POSRow[]): POSRow {
  const sumOrAvg = (key: keyof POSRow, isAvg: boolean = false) => {
    const values = monthData.map(d => d[key] as number).filter(v => v !== null);
    if (values.length === 0) return null;
    const sum = values.reduce((a, b) => a + b, 0);
    return isAvg ? sum / values.length : sum;
  };
  
  return {
    month: monthData[0].month,
    week: 'Total',
    weekBegin: '',
    weekEnd: '',
    notes: '',
    isTotal: true,
    
    // Inventory (avg for inventory metrics)
    ON_HAND_UNITS: sumOrAvg('ON_HAND_UNITS', true),
    SELLABLE_ON_HAND_UNITS: sumOrAvg('SELLABLE_ON_HAND_UNITS', true),
    UNSELLABLE_UNITS: sumOrAvg('UNSELLABLE_UNITS', true),
    RETURN_UNITS: sumOrAvg('RETURN_UNITS', true),
    IN_TRANSIT_UNITS: sumOrAvg('IN_TRANSIT_UNITS', true),
    DC_ON_HAND_UNITS: sumOrAvg('DC_ON_HAND_UNITS', true),
    STORE_ON_HAND_UNITS: sumOrAvg('STORE_ON_HAND_UNITS', true),
    OPEN_ORDER_UNITS: sumOrAvg('OPEN_ORDER_UNITS', true),
    BACKORDER_UNITS: sumOrAvg('BACKORDER_UNITS', true),
    AVAILABLE_TO_SELL_UNITS: sumOrAvg('AVAILABLE_TO_SELL_UNITS', true),
    WEEKS_OF_SUPPLY: sumOrAvg('WEEKS_OF_SUPPLY', true),
    STORE_COUNT: sumOrAvg('STORE_COUNT', true),
  };
}

export function generatePOSData(): POSRow[] {
  const allData: POSRow[] = [];
  
  // Generate 52 weeks of data
  for (let week = 1; week <= 52; week++) {
    const weekData = generateWeekData(week);
    
    // Check if this is the last week of the month
    const nextWeekDate = new Date(2025, 0, 5 + week * 7);
    const currentWeekDate = new Date(2025, 0, 5 + (week - 1) * 7);
    const isLastWeekOfMonth = nextWeekDate.getMonth() !== currentWeekDate.getMonth() || week === 52;
    
    allData.push(weekData);
    
    if (isLastWeekOfMonth) {
      // Get all weeks for this month
      const currentMonth = months[currentWeekDate.getMonth()];
      const monthWeeks = allData.filter(d => !d.isTotal && d.month === currentMonth);
      allData.push(generateMonthTotal(monthWeeks));
    }
  }
  
  return allData;
}