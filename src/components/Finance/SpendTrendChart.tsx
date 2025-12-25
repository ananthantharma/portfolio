import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface SpendTrendChartProps {
    data: { month: string; amount: number }[];
}

const CHART_MARGIN = { top: 10, right: 10, left: -20, bottom: 0 };
const TOOLTIP_CONTENT_STYLE = { backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' };
const TOOLTIP_CURSOR_STYLE = { fill: '#f1f5f9' };
const TOOLTIP_ITEM_STYLE = { color: '#fff' };
const TICK_STYLE = { fill: '#64748b', fontSize: 12 };

const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];

const SpendTrendChart: React.FC<SpendTrendChartProps> = React.memo(({ data }) => {
    const formatYAxisTick = React.useCallback((val: number) => `$${val}`, []);

    const formatTooltipValue = React.useCallback((value: number) => {
        return [
            new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(value),
            'Spent'
        ];
    }, []);

    return (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 h-80">
            <h3 className="mb-4 text-lg font-bold text-slate-800">Monthly Spend Trend</h3>
            <ResponsiveContainer height="100%" width="100%">
                <BarChart data={data} margin={CHART_MARGIN}>
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
