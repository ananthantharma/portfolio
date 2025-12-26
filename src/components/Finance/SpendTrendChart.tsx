import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface Transaction {
  amount: number;
  date: string | Date;
  type: 'Income' | 'Expense' | 'Transfer';
}

interface SpendTrendChartProps {
  onMonthClick?: (date: Date) => void;
  transactions: Transaction[];
}

const CHART_MARGIN = { top: 10, right: 10, left: -20, bottom: 0 };
const TOOLTIP_CONTENT_STYLE = { backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' };
const TOOLTIP_CURSOR_STYLE = { fill: '#f1f5f9' };
const TOOLTIP_ITEM_STYLE = { color: '#fff' };
const TICK_STYLE = { fill: '#64748b', fontSize: 12 };
const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];

const SpendTrendChart: React.FC<SpendTrendChartProps> = React.memo(({ onMonthClick, transactions }) => {
  const [filterType, setFilterType] = useState<'Expense' | 'Income'>('Expense');
  const [timeframe, setTimeframe] = useState<'Year' | 'All'>('Year');

  const data = useMemo(() => {
    const groups: { [key: string]: { amount: number; date: Date } } = {};
    let filtered = transactions.filter(t => t.type === filterType);

    if (timeframe === 'Year') {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      filtered = filtered.filter(t => new Date(t.date) >= oneYearAgo);
    }

    const sortedTrans = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedTrans.forEach(t => {
      const d = new Date(t.date);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (!groups[key]) groups[key] = { amount: 0, date: d };
      groups[key].amount += t.amount;
    });

    return Object.entries(groups).map(([month, val]) => ({
      month,
      amount: val.amount,
      fullDate: val.date,
    }));
  }, [transactions, filterType, timeframe]);

  const formatYAxisTick = React.useCallback((val: number) => `$${val}`, []);

  const formatTooltipValue = React.useCallback(
    (value: number) => {
      return [
        new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(value),
        filterType === 'Income' ? 'Earned' : 'Spent',
      ];
    },
    [filterType],
  );

  const handleClick = React.useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data: any) => {
      if (onMonthClick && data && data.activePayload && data.activePayload.length > 0) {
        const payload = data.activePayload[0].payload;
        if (payload.fullDate) {
          onMonthClick(payload.fullDate);
        }
      }
    },
    [onMonthClick],
  );

  const style = React.useMemo(() => ({ cursor: 'pointer' }), []);
  const activeBarStyle = useMemo(() => ({ fill: filterType === 'Income' ? '#059669' : '#e11d48' }), [filterType]);
  const barFill = filterType === 'Income' ? '#10b981' : '#f43f5e';

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 h-96 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{filterType === 'Income' ? 'Income' : 'Spend'} Trend</h3>
          <p className="text-xs text-slate-400">{timeframe === 'Year' ? 'Past 12 Months' : 'All Time'} history</p>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
          <button
            className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${filterType === 'Expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            onClick={() => setFilterType('Expense')}>
            Expense
          </button>
          <button
            className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${filterType === 'Income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            onClick={() => setFilterType('Income')}>
            Income
          </button>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-1 gap-1 ml-2">
          <button
            className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all ${timeframe === 'Year' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            onClick={() => setTimeframe('Year')}>
            1Y
          </button>
          <button
            className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all ${timeframe === 'All' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            onClick={() => setTimeframe('All')}>
            All
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={data} margin={CHART_MARGIN} onClick={handleClick} style={style}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis axisLine={false} dataKey="month" stroke="#64748b" tick={TICK_STYLE} tickLine={false} />
            <YAxis
              axisLine={false}
              stroke="#64748b"
              tick={TICK_STYLE}
              tickFormatter={formatYAxisTick}
              tickLine={false}
            />
            <Tooltip
              contentStyle={TOOLTIP_CONTENT_STYLE}
              cursor={TOOLTIP_CURSOR_STYLE}
              formatter={formatTooltipValue}
              itemStyle={TOOLTIP_ITEM_STYLE}
            />
            <Bar activeBar={activeBarStyle} dataKey="amount" fill={barFill} radius={BAR_RADIUS} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

SpendTrendChart.displayName = 'SpendTrendChart';

export default SpendTrendChart;
