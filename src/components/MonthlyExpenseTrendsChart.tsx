import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine 
} from 'recharts';
import { 
  BarChart3, TrendingUp, LineChart as LineChartIcon, Building2, Tag, 
  Calendar, Layers, ArrowUpRight, ArrowDownRight, DollarSign, Activity,
  Info, ExternalLink, MousePointerClick
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Invoice, ExpenseSource, PaymentType } from '../types';
import { formatCurrency } from '../lib/utils';

export type ChartType = 'bar' | 'line' | 'area';
export type ViewMode = 'total' | 'vendor' | 'category';
export type TimeHorizon = '6m' | '12m' | 'ytd';

interface MonthlyExpenseTrendsChartProps {
  invoices: Invoice[];
  sources: ExpenseSource[];
  paymentTypes: PaymentType[];
  className?: string;
  onMonthSelect?: (monthData: { year: number; month: number; name: string; fullLabel: string; total: number; keyName?: string }) => void;
}

const COLOR_PALETTE = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', 
  '#06b6d4', '#6366f1', '#14b8a6', '#f97316', '#84cc16'
];

export const MonthlyExpenseTrendsChart: React.FC<MonthlyExpenseTrendsChartProps> = ({
  invoices,
  sources,
  paymentTypes,
  className = '',
  onMonthSelect
}) => {
  const navigate = useNavigate();
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [viewMode, setViewMode] = useState<ViewMode>('vendor');
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>('6m');
  const [showAverageLine, setShowAverageLine] = useState<boolean>(true);

  // Memoized Lookup Maps
  const srcMap = useMemo(() => new Map(sources.map(s => [s.id, s.name])), [sources]);
  const typMap = useMemo(() => new Map(paymentTypes.map(t => [t.id, t.name])), [paymentTypes]);

  // Generate monthly periods and aggregate data
  const { chartData, activeKeys, stats } = useMemo(() => {
    const now = new Date();
    let numMonths = 6;
    if (timeHorizon === '12m') numMonths = 12;
    if (timeHorizon === 'ytd') numMonths = now.getMonth() + 1;

    const monthsArr: { name: string; fullLabel: string; year: number; month: number; total: number; [key: string]: any }[] = [];
    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const shortName = d.toLocaleString('default', { month: 'short' });
      const fullLabel = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      monthsArr.push({
        name: numMonths > 6 ? `${shortName} '${d.getFullYear().toString().slice(-2)}` : shortName,
        fullLabel,
        year: d.getFullYear(),
        month: d.getMonth(),
        total: 0
      });
    }

    const keyTotals: Record<string, number> = {};

    invoices.forEach(inv => {
      // Include all approved or disbursed expenditures
      if (inv.status === 'Approved' || inv.status === 'Received') {
        const d = new Date(inv.date);
        const match = monthsArr.find(m => m.month === d.getMonth() && m.year === d.getFullYear());
        if (match) {
          match.total += inv.amount;

          if (viewMode === 'vendor') {
            const vendorName = (inv.expenseSourceId ? srcMap.get(inv.expenseSourceId) : undefined) || 'Other Vendor';
            match[vendorName] = (match[vendorName] || 0) + inv.amount;
            keyTotals[vendorName] = (keyTotals[vendorName] || 0) + inv.amount;
          } else if (viewMode === 'category') {
            const catName = (inv.paymentTypeId ? typMap.get(inv.paymentTypeId) : undefined) || 'General Operations';
            match[catName] = (match[catName] || 0) + inv.amount;
            keyTotals[catName] = (keyTotals[catName] || 0) + inv.amount;
          }
        }
      }
    });

    // Top 5 keys sorted by total volume
    const topKeys = Object.entries(keyTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k]) => k);

    // Compute key statistics for oversight
    const totalSpend = monthsArr.reduce((acc, m) => acc + m.total, 0);
    const averageMonthly = monthsArr.length > 0 ? totalSpend / monthsArr.length : 0;
    
    let peakMonth = monthsArr[0];
    monthsArr.forEach(m => {
      if (!peakMonth || m.total > peakMonth.total) {
        peakMonth = m;
      }
    });

    // Month-over-month delta
    const lastMonth = monthsArr[monthsArr.length - 1]?.total || 0;
    const prevMonth = monthsArr.length > 1 ? monthsArr[monthsArr.length - 2]?.total || 0 : 0;
    const momChange = prevMonth > 0 ? ((lastMonth - prevMonth) / prevMonth) * 100 : 0;

    return {
      chartData: monthsArr,
      activeKeys: topKeys.length > 0 ? topKeys : ['Default'],
      stats: {
        totalSpend,
        averageMonthly,
        peakMonth: peakMonth || { fullLabel: 'N/A', total: 0 },
        lastMonth,
        momChange
      }
    };
  }, [invoices, srcMap, typMap, viewMode, timeHorizon]);

  // Month navigation click handler
  const handleNavigateToMonth = (monthData: { year: number; month: number; name: string; fullLabel: string; total: number; [key: string]: any }, specificKey?: string) => {
    if (!monthData) return;
    if (onMonthSelect) {
      onMonthSelect({ ...monthData, keyName: specificKey });
      return;
    }

    const targetYear = monthData.year;
    const targetMonth = monthData.month; // 0-indexed: 0 = Jan, 11 = Dec
    
    // First day of month (e.g. 2026-08-01)
    const startDate = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-01`;
    // Last day of month
    const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
    const endDate = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    let url = `/invoices?startDate=${startDate}&endDate=${endDate}&monthLabel=${encodeURIComponent(monthData.fullLabel)}`;

    if (specificKey && specificKey !== 'total' && specificKey !== 'Default') {
      if (viewMode === 'vendor') {
        const foundSource = sources.find(s => s.name.toLowerCase() === specificKey.toLowerCase());
        if (foundSource) {
          url += `&source=${foundSource.id}`;
        }
      } else if (viewMode === 'category') {
        const foundType = paymentTypes.find(t => t.name.toLowerCase() === specificKey.toLowerCase());
        if (foundType) {
          url += `&category=${foundType.id}`;
        }
      }
    }

    navigate(url);
  };

  // Custom Interactive Tooltip with Click Instructions
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const monthItem = payload[0]?.payload;
    const fullLabel = monthItem?.fullLabel || label;
    const totalAmount = monthItem?.total || 0;

    return (
      <div className="bg-bg-panel border border-border-subtle rounded-xl shadow-xl p-3 text-xs min-w-[200px] animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-border-subtle font-semibold text-text-base">
          <span>{fullLabel}</span>
          <span className="font-mono text-accent-600 font-bold">{formatCurrency(totalAmount)}</span>
        </div>

        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
          {payload.map((entry: any, index: number) => {
            const seriesName = entry.name === 'total' ? 'Total Spend' : entry.name;
            const seriesVal = entry.value || 0;
            return (
              <div key={`item-${index}`} className="flex items-center justify-between text-[11px] gap-2">
                <span className="flex items-center gap-1.5 text-text-muted truncate max-w-[130px]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color || entry.stroke || '#3b82f6' }} />
                  <span className="truncate">{seriesName}</span>
                </span>
                <span className="font-mono font-medium text-text-base shrink-0">{formatCurrency(seriesVal)}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-2.5 pt-1.5 border-t border-border-subtle flex items-center justify-between text-[10px] text-accent-600 font-semibold bg-accent-50 dark:bg-accent-950/40 -mx-3 -mb-3 p-2 rounded-b-xl">
          <span className="flex items-center gap-1">
            <MousePointerClick className="w-3 h-3" /> Click to view month vouchers
          </span>
          <ExternalLink className="w-3 h-3" />
        </div>
      </div>
    );
  };

  return (
    <div id="monthly-expense-trends-card" className={`bg-bg-panel rounded-xl shadow-sm border border-border-subtle p-4 sm:p-6 flex flex-col justify-between ${className}`}>
      <div>
        {/* Header & Controls Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-accent-50 dark:bg-accent-950/40 text-accent-600 rounded-lg">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-text-base">Monthly Expense Trends</h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-100 text-accent-700 dark:bg-accent-950/60 dark:text-accent-300">
                    <MousePointerClick className="w-3 h-3" /> Clickable
                  </span>
                </div>
                <p className="text-xs text-text-muted">Click any month bar or data point to inspect filtered invoices.</p>
              </div>
            </div>
          </div>

          {/* Interactive Visualization Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Chart Type Toggle: Bar vs Line vs Area */}
            <div className="flex bg-bg-base p-1 rounded-lg border border-border-subtle shadow-2xs">
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  chartType === 'bar' 
                    ? 'bg-bg-panel text-accent-600 shadow-2xs font-bold' 
                    : 'text-text-muted hover:text-text-base'
                }`}
                title="Switch to Column / Bar Chart View"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Bar</span>
              </button>
              
              <button
                type="button"
                onClick={() => setChartType('line')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  chartType === 'line' 
                    ? 'bg-bg-panel text-accent-600 shadow-2xs font-bold' 
                    : 'text-text-muted hover:text-text-base'
                }`}
                title="Switch to Line Trend Chart View"
              >
                <LineChartIcon className="w-3.5 h-3.5" />
                <span>Line</span>
              </button>

              <button
                type="button"
                onClick={() => setChartType('area')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  chartType === 'area' 
                    ? 'bg-bg-panel text-accent-600 shadow-2xs font-bold' 
                    : 'text-text-muted hover:text-text-base'
                }`}
                title="Switch to Area Stream Chart View"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Area</span>
              </button>
            </div>

            {/* Categorization Dimension Toggle */}
            <div className="flex bg-bg-base p-1 rounded-lg border border-border-subtle shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('vendor')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'vendor' ? 'bg-bg-panel text-accent-600 shadow-2xs' : 'text-text-muted hover:text-text-base'
                }`}
                title="Group by Vendor / Expense Source"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vendor</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('category')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'category' ? 'bg-bg-panel text-accent-600 shadow-2xs' : 'text-text-muted hover:text-text-base'
                }`}
                title="Group by Payment Type / Category"
              >
                <Tag className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Category</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('total')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'total' ? 'bg-bg-panel text-accent-600 shadow-2xs' : 'text-text-muted hover:text-text-base'
                }`}
                title="Show Total Outflow Only"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Total</span>
              </button>
            </div>

            {/* Time Horizon Selector */}
            <select
              value={timeHorizon}
              onChange={e => setTimeHorizon(e.target.value as TimeHorizon)}
              className="text-xs bg-bg-base border border-border-subtle rounded-lg px-2.5 py-1.5 text-text-base font-semibold outline-none cursor-pointer hover:bg-bg-panel transition-colors"
            >
              <option value="6m">Last 6 Months</option>
              <option value="12m">Last 12 Months</option>
              <option value="ytd">Year to Date (YTD)</option>
            </select>
          </div>
        </div>

        {/* Quick Oversight Financial Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-3 bg-bg-base/70 rounded-xl border border-border-subtle">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-0.5">
              Period Total
            </span>
            <div className="text-base sm:text-lg font-bold text-text-base truncate">
              {formatCurrency(stats.totalSpend)}
            </div>
          </div>

          <div className="p-3 bg-bg-base/70 rounded-xl border border-border-subtle">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-0.5">
              Monthly Average
            </span>
            <div className="text-base sm:text-lg font-bold text-text-base truncate">
              {formatCurrency(stats.averageMonthly)}
            </div>
          </div>

          <div 
            onClick={() => stats.peakMonth?.total > 0 && handleNavigateToMonth(stats.peakMonth)}
            className={`p-3 bg-bg-base/70 rounded-xl border border-border-subtle transition-all ${
              stats.peakMonth?.total > 0 ? 'cursor-pointer hover:border-accent-400 hover:bg-accent-50/30' : ''
            }`}
            title={stats.peakMonth?.total > 0 ? `Click to inspect peak month (${stats.peakMonth.fullLabel}) invoices` : undefined}
          >
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-0.5 flex items-center justify-between">
              <span>Peak Month</span>
              {stats.peakMonth?.total > 0 && <ExternalLink className="w-3 h-3 text-accent-600" />}
            </span>
            <div className="text-base sm:text-lg font-bold text-text-base truncate">
              {stats.peakMonth.total > 0 ? (
                <span>{stats.peakMonth.name || stats.peakMonth.fullLabel}</span>
              ) : (
                <span className="text-text-muted">None</span>
              )}
            </div>
          </div>

          <div className="p-3 bg-bg-base/70 rounded-xl border border-border-subtle">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-0.5">
              MoM Trend
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`text-base sm:text-lg font-bold ${
                stats.momChange > 0 ? 'text-amber-600 dark:text-amber-400' :
                stats.momChange < 0 ? 'text-emerald-600 dark:text-emerald-400' :
                'text-text-muted'
              }`}>
                {stats.momChange === 0 ? '0.0%' : `${stats.momChange > 0 ? '+' : ''}${stats.momChange.toFixed(1)}%`}
              </span>
              {stats.momChange > 0 ? (
                <ArrowUpRight className="w-4 h-4 text-amber-500 shrink-0" />
              ) : stats.momChange < 0 ? (
                <ArrowDownRight className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : null}
            </div>
          </div>
        </div>

        {/* Recharts Canvas */}
        <div className="h-[300px] sm:h-[340px] w-full cursor-pointer">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart 
                data={chartData} 
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload.length > 0) {
                    const payload = state.activePayload[0].payload;
                    const dataKey = state.activePayload[0].dataKey;
                    handleNavigateToMonth(payload, String(dataKey));
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11 }} 
                  tickFormatter={(val) => `৳${(val / 1000).toFixed(0)}k`} 
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '14px', fontSize: '11px' }} 
                  iconType="circle"
                />
                {showAverageLine && stats.averageMonthly > 0 && (
                  <ReferenceLine 
                    y={stats.averageMonthly} 
                    stroke="#94a3b8" 
                    strokeDasharray="4 4" 
                    label={{ value: `Avg ৳${(stats.averageMonthly/1000).toFixed(0)}k`, fill: '#64748b', fontSize: 10, position: 'right' }} 
                  />
                )}
                {viewMode === 'total' ? (
                  <Bar 
                    dataKey="total" 
                    name="Total Outflow" 
                    fill="#3b82f6" 
                    radius={[6, 6, 0, 0]} 
                    cursor="pointer"
                    onClick={(entry: any) => handleNavigateToMonth(entry?.payload || entry, 'total')}
                  />
                ) : (
                  activeKeys.map((keyName, idx) => (
                    <Bar 
                      key={keyName} 
                      dataKey={keyName} 
                      name={keyName} 
                      stackId="expenseStack" 
                      fill={COLOR_PALETTE[idx % COLOR_PALETTE.length]} 
                      radius={idx === activeKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      cursor="pointer"
                      onClick={(entry: any) => handleNavigateToMonth(entry?.payload || entry, keyName)}
                    />
                  ))
                )}
              </BarChart>
            ) : chartType === 'line' ? (
              <LineChart 
                data={chartData} 
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload.length > 0) {
                    const payload = state.activePayload[0].payload;
                    const dataKey = state.activePayload[0].dataKey;
                    handleNavigateToMonth(payload, String(dataKey));
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11 }} 
                  tickFormatter={(val) => `৳${(val / 1000).toFixed(0)}k`} 
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '14px', fontSize: '11px' }} 
                  iconType="circle"
                />
                {showAverageLine && stats.averageMonthly > 0 && (
                  <ReferenceLine 
                    y={stats.averageMonthly} 
                    stroke="#94a3b8" 
                    strokeDasharray="4 4" 
                    label={{ value: `Avg ৳${(stats.averageMonthly/1000).toFixed(0)}k`, fill: '#64748b', fontSize: 10, position: 'right' }} 
                  />
                )}
                {viewMode === 'total' ? (
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    name="Total Outflow" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#ffffff', cursor: 'pointer' }}
                    activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 2, cursor: 'pointer' }}
                    cursor="pointer"
                    onClick={(entry: any) => handleNavigateToMonth(entry?.payload || entry, 'total')}
                  />
                ) : (
                  activeKeys.map((keyName, idx) => (
                    <Line 
                      key={keyName} 
                      type="monotone" 
                      dataKey={keyName} 
                      name={keyName} 
                      stroke={COLOR_PALETTE[idx % COLOR_PALETTE.length]} 
                      strokeWidth={2.5} 
                      dot={{ r: 4, fill: COLOR_PALETTE[idx % COLOR_PALETTE.length], cursor: 'pointer' }}
                      activeDot={{ r: 7, cursor: 'pointer' }}
                      cursor="pointer"
                      onClick={(entry: any) => handleNavigateToMonth(entry?.payload || entry, keyName)}
                    />
                  ))
                )}
              </LineChart>
            ) : (
              <AreaChart 
                data={chartData} 
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload.length > 0) {
                    const payload = state.activePayload[0].payload;
                    const dataKey = state.activePayload[0].dataKey;
                    handleNavigateToMonth(payload, String(dataKey));
                  }
                }}
              >
                <defs>
                  <linearGradient id="totalSpendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                  </linearGradient>
                  {COLOR_PALETTE.map((color, idx) => (
                    <linearGradient key={`grad-${idx}`} id={`areaGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={color} stopOpacity={0.05}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11 }} 
                  tickFormatter={(val) => `৳${(val / 1000).toFixed(0)}k`} 
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '14px', fontSize: '11px' }} 
                  iconType="circle"
                />
                {showAverageLine && stats.averageMonthly > 0 && (
                  <ReferenceLine 
                    y={stats.averageMonthly} 
                    stroke="#94a3b8" 
                    strokeDasharray="4 4" 
                    label={{ value: `Avg ৳${(stats.averageMonthly/1000).toFixed(0)}k`, fill: '#64748b', fontSize: 10, position: 'right' }} 
                  />
                )}
                {viewMode === 'total' ? (
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    name="Total Outflow" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#totalSpendGrad)" 
                    cursor="pointer"
                    onClick={(entry) => handleNavigateToMonth(entry, 'total')}
                  />
                ) : (
                  activeKeys.map((keyName, idx) => (
                    <Area 
                      key={keyName} 
                      type="monotone" 
                      dataKey={keyName} 
                      name={keyName} 
                      stackId="expenseAreaStack" 
                      stroke={COLOR_PALETTE[idx % COLOR_PALETTE.length]} 
                      strokeWidth={2} 
                      fillOpacity={1} 
                      fill={`url(#areaGrad-${idx % COLOR_PALETTE.length})`} 
                      cursor="pointer"
                      onClick={(entry) => handleNavigateToMonth(entry, keyName)}
                    />
                  ))
                )}
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Quick Month Filter Pills (Accessible 1-Click Navigation) */}
        <div className="pt-4 mt-2 border-t border-border-subtle">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-accent-600" />
              <span>Quick-Jump by Month</span>
            </span>
            <span className="text-[10px] text-text-muted">Click any month to inspect vouchers</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {chartData.map((m) => (
              <button
                key={`btn-month-${m.year}-${m.month}`}
                type="button"
                onClick={() => handleNavigateToMonth(m)}
                className="group flex items-center gap-1.5 px-2.5 py-1 bg-bg-base hover:bg-accent-50 dark:hover:bg-accent-950/40 hover:text-accent-600 border border-border-subtle hover:border-accent-300 rounded-lg text-xs transition-all shadow-2xs"
                title={`Open vouchers for ${m.fullLabel} (${formatCurrency(m.total)})`}
              >
                <span className="font-semibold text-text-base group-hover:text-accent-600">{m.name}</span>
                <span className="font-mono text-[11px] text-text-muted group-hover:text-accent-600/80">({formatCurrency(m.total)})</span>
                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-accent-600" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Toggle for Reference Baseline */}
      <div className="pt-3 mt-3 border-t border-border-subtle flex items-center justify-between text-xs text-text-muted">
        <span className="flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-accent-600" />
          Click any chart point, bar or quick-jump button to filter vouchers.
        </span>
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input 
            type="checkbox" 
            checked={showAverageLine} 
            onChange={e => setShowAverageLine(e.target.checked)} 
            className="rounded text-accent-600 focus:ring-accent-500 w-3.5 h-3.5"
          />
          <span>Average Guideline</span>
        </label>
      </div>
    </div>
  );
};
