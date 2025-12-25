import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface SpendTrendChartProps {
    data: { month: string; amount: number; fullDate?: Date }[];
    onMonthClick?: (date: Date) => void;
}

const CHART_MARGIN = { top: 10, right: 10, left: -20, bottom: 0 };
const TOOLTIP_CONTENT_STYLE = { backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' };
const TOOLTIP_CURSOR_STYLE = { fill: '#f1f5f9' };
const TOOLTIP_ITEM_STYLE = { color: '#fff' };
const TICK_STYLE = { fill: '#64748b', fontSize: 12 };
const ACTIVE_BAR_STYLE = { fill: '#e11d48' };
const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];

const SpendTrendChart: React.FC<SpendTrendChartProps> = React.memo(({ data, onMonthClick }) => {

    const formatYAxisTick = React.useCallback((val: number) => `$${val}`, []);

    const formatTooltipValue = React.useCallback((value: number) => {
        return [
            new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(value),
            'Spent'
        ];
    }, []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleClick = React.useCallback((data: any) => {
        if (onMonthClick && data && data.activePayload && data.activePayload.length > 0) {
            const payload = data.activePayload[0].payload;
            if (payload.fullDate) {
                onMonthClick(payload.fullDate);
            }
        }
    }, [onMonthClick]);

    const style = React.useMemo(() => ({ cursor: 'pointer' }), []);

    return (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 h-80">
            <h3 className="mb-4 text-lg font-bold text-slate-800">Monthly Spend Trend</h3>
            <p className="text-xs text-slate-400 mb-4 -mt-3">Click a bar to view that month</p>
            <ResponsiveContainer height="100%" width="100%">
                <BarChart data={data} margin={CHART_MARGIN} onClick={handleClick} style={style}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                        axisLine={false}
                        dataKey="month"
                        stroke="#64748b"
                        tick={TICK_STYLE}
                        tickLine={false}
                    />
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
                    <Bar
                        activeBar={ACTIVE_BAR_STYLE}
                        dataKey="amount"
                        fill="#f43f5e"
                        radius={BAR_RADIUS}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
});

SpendTrendChart.displayName = 'SpendTrendChart';

export default SpendTrendChart;
