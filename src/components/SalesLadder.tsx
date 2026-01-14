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

interface SalesData {
  retailer: string;
  product?: string; // optional: some CSVs include product/product line
  category: string;
  items: string[];
  weeklyData: Map<number, Map<string, CategoryMetrics>>; // weekNum -> itemName -> category metrics
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

\
type RetailerRow = { retailer: string; product?: string; category: string; itemNumber: string };

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
    h === 'ITEM NUMBER' || h === 'ITEM_NUMBER' || h === 'ITEM' || h === 'ITEMNO' || h === 'PRODUCT ITEM NUMBER' || h === 'PRODUCT_ITEM_NUMBER'
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

// Fetch CSV from GitHub
const fetchRetailerData = async (): Promise<RetailerRow[]> => {
  try {
    // Try direct fetch first
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
    
    // Fallback to sample data
    toast.warning('Could not load data from GitHub. Using sample data instead.');
    
    // Return sample data as fallback
    return [
      { retailer: 'Walmart', category: 'Car Seats', itemNumber: 'CS-001' },
      { retailer: 'Walmart', category: 'Car Seats', itemNumber: 'CS-002' },
      { retailer: 'Walmart', category: 'Car Seats', itemNumber: 'CS-003' },
      { retailer: 'Walmart', category: 'Strollers', itemNumber: 'ST-001' },
      { retailer: 'Walmart', category: 'Strollers', itemNumber: 'ST-002' },
      { retailer: 'Walmart', category: 'Travel Systems', itemNumber: 'TS-001' },
      { retailer: 'Target', category: 'Car Seats', itemNumber: 'CS-101' },
      { retailer: 'Target', category: 'Car Seats', itemNumber: 'CS-102' },
      { retailer: 'Target', category: 'Nursery Furniture', itemNumber: 'NF-001' },
      { retailer: 'Target', category: 'Nursery Furniture', itemNumber: 'NF-002' },
      { retailer: 'Target', category: 'Toys & Art', itemNumber: 'TA-001' },
      { retailer: 'Amazon', category: 'Home Safety', itemNumber: 'HS-001' },
      { retailer: 'Amazon', category: 'Home Safety', itemNumber: 'HS-002' },
      { retailer: 'Amazon', category: 'Car Seats', itemNumber: 'CS-201' },
      { retailer: 'Amazon', category: 'Travel Systems', itemNumber: 'TS-101' },
    ];
  }
};

// Generate data based on CSV input
const generateDataFromCSV = (csvData: RetailerRow[]): SalesData[] => {
  // Group by retailer -> (product?) -> category
  const grouped: Map<string, Map<string, Map<string, string[]>>> = new Map();
  
  csvData.forEach(row => {
    if (!grouped.has(row.retailer)) grouped.set(row.retailer, new Map());
    const productKey = row.product && row.product.trim() ? row.product.trim() : '__NO_PRODUCT__';
    const retailerMap = grouped.get(row.retailer)!;
    if (!retailerMap.has(productKey)) retailerMap.set(productKey, new Map());
    const productMap = retailerMap.get(productKey)!;
    if (!productMap.has(row.category)) productMap.set(row.category, []);
    productMap.get(row.category)!.push(row.itemNumber);
  });
  
  const data: SalesData[] = [];
  
  // Generate mock metrics for each retailer/category/item combination
  grouped.forEach((products, retailer) => {
    products.forEach((categories, productKey) => {
      categories.forEach((items, category) => {
      const weeklyData = new Map<number, Map<string, CategoryMetrics>>();
      
      for (let weekNum = 1; weekNum <= 52; weekNum++) {
        const weekMap = new Map<string, CategoryMetrics>();
        
        items.forEach(item => {
          const baseUnits = Math.floor(Math.random() * 5000) + 1000;
          const unitPrice = Math.random() * 20 + 5;
          const variance = 0.2;
          
          const generateMetricData = (multiplier: number = 1, decimals: boolean = false): MetricData => {
            const base = baseUnits * multiplier;
            const value = (val: number) => decimals ? parseFloat(val.toFixed(2)) : Math.floor(val);
            
            return {
              actualUnitsLY: value(base * (1 + (Math.random() - 0.5) * variance)),
              actualUnits: weekNum <= 3 ? value(base * (1 + (Math.random() - 0.5) * variance)) : 0,
              retailerForecastUnits: value(base * (1 + (Math.random() - 0.5) * variance * 0.8)),
              planUnits: value(base * (1 + (Math.random() - 0.5) * variance * 0.6)),
              suggestedPlanUnits: value(base * (1 + (Math.random() - 0.5) * variance * 0.5))
            };
          };
          
          const categoryMetrics: CategoryMetrics = {
            units: generateMetricData(1),
            dollars: generateMetricData(unitPrice, true),
            inventory: generateMetricData(0.3),
            inventoryCost: generateMetricData(unitPrice * 0.6, true),
            plannedSales: generateMetricData(unitPrice * 0.9, true),
            plannedSalesReceipts: generateMetricData(unitPrice * 0.95, true),
            weeksOfSupply: {
              actualUnitsLY: parseFloat((Math.random() * 4 + 2).toFixed(2)),
              actualUnits: weekNum <= 3 ? parseFloat((Math.random() * 4 + 2).toFixed(2)) : 0,
              retailerForecastUnits: parseFloat((Math.random() * 4 + 2).toFixed(2)),
              planUnits: parseFloat((Math.random() * 4 + 2).toFixed(2)),
              suggestedPlanUnits: parseFloat((Math.random() * 4 + 2).toFixed(2))
            }
          };
          
          weekMap.set(item, categoryMetrics);
        });
        
        weeklyData.set(weekNum, weekMap);
      }
      
        const product = productKey === '__NO_PRODUCT__' ? undefined : productKey;
        data.push({ retailer, product, category, items, weeklyData });
      });
    });
  });
  
  return data;
};

const generateWeeks = (): WeekData[] => {
  const weeks: WeekData[] = [];
  const startDate = new Date('2026-01-05');
  
  for (let i = 0; i < 52; i++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + (i * 7));
    
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
  const [data, setData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeks] = useState<WeekData[]>(generateWeeks());
  const [metricCategories] = useState(getMetricCategories());
  const NO_PRODUCT_LABEL = '(No product)';
  const [selectedRetailer, setSelectedRetailer] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [editedCells, setEditedCells] = useState<Map<string, number>>(new Map());

  // Fetch data from GitHub on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const csvData = await fetchRetailerData();
      if (csvData.length > 0) {
        const generatedData = generateDataFromCSV(csvData);
        setData(generatedData);
        toast.success(`Loaded ${csvData.length} items from GitHub`);
      } else {
        toast.error('No data loaded. Please check the CSV file.');
      }
      setLoading(false);
    };
    
    loadData();
  }, []);

  const retailers = useMemo(() => {
    const unique = Array.from(new Set(data.map(d => d.retailer)));
    return unique.sort();
  }, [data]);

  const hasProductDimension = useMemo(() => {
    return data.some(d => (d.product ?? '').trim().length > 0);
  }, [data]);

  const products = useMemo(() => {
    if (!selectedRetailer || !hasProductDimension) return [];
    const filtered = data.filter(d => d.retailer === selectedRetailer);
    const unique = Array.from(new Set(filtered.map(d => (d.product?.trim() ? d.product.trim() : NO_PRODUCT_LABEL))));
    return unique.sort();
  }, [data, selectedRetailer, hasProductDimension]);

  const categories = useMemo(() => {
    if (!selectedRetailer) return [];
    const filtered = data.filter(d => {
      if (d.retailer !== selectedRetailer) return false;
      if (!hasProductDimension) return true;
      if (!selectedProduct) return false;
      const label = d.product?.trim() ? d.product.trim() : NO_PRODUCT_LABEL;
      return label === selectedProduct;
    });
    const unique = Array.from(new Set(filtered.map(d => d.category)));
    return unique.sort();
  }, [data, selectedRetailer, hasProductDimension, selectedProduct]);

  const items = useMemo(() => {
    if (!selectedRetailer || !selectedCategory) return [];
    if (hasProductDimension && !selectedProduct) return [];
    const filtered = data.find(d => {
      if (d.retailer !== selectedRetailer) return false;
      if (d.category !== selectedCategory) return false;
      if (!hasProductDimension) return true;
      const label = d.product?.trim() ? d.product.trim() : NO_PRODUCT_LABEL;
      return label === selectedProduct;
    });
    return filtered?.items || [];
  }, [data, selectedRetailer, selectedCategory, hasProductDimension, selectedProduct]);

  const currentData = useMemo(() => {
    if (!selectedRetailer || !selectedCategory || !selectedItem) return null;
    if (hasProductDimension && !selectedProduct) return null;
    const salesData = data.find(d => {
      if (d.retailer !== selectedRetailer) return false;
      if (d.category !== selectedCategory) return false;
      if (!hasProductDimension) return true;
      const label = d.product?.trim() ? d.product.trim() : NO_PRODUCT_LABEL;
      return label === selectedProduct;
    });
    if (!salesData) return null;

    // Extract data for the selected item across all weeks
    const itemWeeklyData = new Map<number, CategoryMetrics>();
    salesData.weeklyData.forEach((weekMap, weekNum) => {
      const itemMetrics = weekMap.get(selectedItem);
      if (itemMetrics) {
        itemWeeklyData.set(weekNum, itemMetrics);
      }
    });

    return itemWeeklyData;
  }, [data, selectedRetailer, selectedProduct, selectedCategory, selectedItem, hasProductDimension]);

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
    // Apply edited cells back to data
    const newData = data.map(d => {
      if (d.retailer === selectedRetailer && d.category === selectedCategory) {
        const newWeeklyData = new Map(d.weeklyData);
        editedCells.forEach((value, key) => {
          const [weekStr, location, field] = key.split('|');
          const weekNum = parseInt(weekStr);
          const weekMap = newWeeklyData.get(weekNum);
          if (weekMap) {
            const newWeekMap = new Map(weekMap);
            const itemMetrics = newWeekMap.get(selectedItem);
            if (itemMetrics) {
              const newItemMetrics = { ...itemMetrics };
              const locationMetrics = newItemMetrics[location];
              if (locationMetrics) {
                newItemMetrics[location] = {
                  ...locationMetrics,
                  [field]: value
                };
              }
              newWeekMap.set(selectedItem, newItemMetrics);
            }
            newWeeklyData.set(weekNum, newWeekMap);
          }
        });
        return { ...d, weeklyData: newWeeklyData };
      }
      return d;
    });
    setData(newData);
    setEditedCells(new Map());
    toast.success('Data saved successfully!');
  };

  const handleCellEdit = (weekNum: number, location: string, field: 'planUnits' | 'suggestedPlanUnits', value: string) => {
    const numValue = parseInt(value) || 0;
    const key = `${weekNum}|${location}|${field}`;
    const newEditedCells = new Map(editedCells);
    newEditedCells.set(key, numValue);
    setEditedCells(newEditedCells);
  };

  const getCellValue = (weekNum: number, location: string, field: 'planUnits' | 'suggestedPlanUnits', originalValue: number): number => {
    const key = `${weekNum}|${location}|${field}`;
    return editedCells.get(key) ?? originalValue;
  };

  const hasRequiredSelections =
    Boolean(selectedRetailer) &&
    (!hasProductDimension || Boolean(selectedProduct)) &&
    Boolean(selectedCategory) &&
    Boolean(selectedItem);

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50 p-6">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Sales Ladder Plan - 52 Week View</CardTitle>
            <div className="flex gap-2">
              <Button onClick={exportData} variant="outline" size="sm" disabled={!hasRequiredSelections}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button onClick={saveData} variant="outline" size="sm" disabled={!hasRequiredSelections}>
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
              <Select value={selectedRetailer} onValueChange={(value) => {
                setSelectedRetailer(value);
                setSelectedProduct('');
                setSelectedCategory(''); // Reset category when retailer changes
                setSelectedItem('');
              }}>
                <SelectTrigger className={!selectedRetailer ? 'border-red-300' : ''}>
                  <SelectValue placeholder="Select Retailer (Required)" />
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
                Product Item <span className="text-red-500">*</span>
              </label>
              <Select 
                value={selectedItem} 
                onValueChange={setSelectedItem}
                disabled={!selectedCategory}
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

          {hasRequiredSelections && currentData && (
            <div className="flex items-center justify-between mt-4">
              <Badge variant="secondary">
                52 weeks × 35 metrics = 1,820 data points
              </Badge>
              <div className="text-sm text-gray-600">
                Total Columns: 36 (1 Week + 35 Metrics across 7 Categories)
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 overflow-auto p-0">
          {loading ? (
            <div className="flex items-center justify-center h-full p-8">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-sm text-gray-600">Loading retailer data from GitHub...</p>
              </div>
            </div>
          ) : !hasRequiredSelections ? (
            <div className="flex items-center justify-center h-full p-8">
              <Alert className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please select both a <strong>Retailer</strong>, <strong>Product Category</strong>, and <strong>Product Item</strong> to view the sales ladder plan.
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
                        <th key={`${location.key}-ly`} className="p-2 text-[10px] bg-blue-50 border-r border-gray-200 min-w-[80px]">
                          Actual<br/>Units LY
                        </th>
                        <th key={`${location.key}-actual`} className="p-2 text-[10px] bg-green-50 border-r border-gray-200 min-w-[80px]">
                          Actual<br/>Units
                        </th>
                        <th key={`${location.key}-forecast`} className="p-2 text-[10px] bg-purple-50 border-r border-gray-200 min-w-[80px]">
                          Retailer<br/>Forecast
                        </th>
                        <th key={`${location.key}-plan`} className="p-2 text-[10px] bg-yellow-50 border-r border-gray-200 min-w-[80px]">
                          Plan<br/>Units
                        </th>
                        <th key={`${location.key}-suggested`} className="p-2 text-[10px] bg-orange-50 border-r-2 border-gray-300 min-w-[80px]">
                          Suggested<br/>Plan
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
                        {metricCategories.map(location => {
                          const metrics = weekMetrics?.[location.key];
                          if (!metrics) return null;
                          
                          const planValue = getCellValue(week.weekNum, location.key, 'planUnits', metrics.planUnits);
                          const suggestedValue = getCellValue(week.weekNum, location.key, 'suggestedPlanUnits', metrics.suggestedPlanUnits);
                          
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
                                  onChange={(e) => handleCellEdit(week.weekNum, location.key, 'suggestedPlanUnits', e.target.value)}
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
