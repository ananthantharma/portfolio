import React from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface FinanceChartsProps {
    data: {
        name: string; // 'Income' or 'Expenses'
        [key: string]: number | string; // Dynamic categories
    }[];
    categories: string[]; // List of categories for the stack
}

const COLORS = [
    '#10b981', // Emerald (Income)
    '#f43f5e', // Rose
    '#3b82f6', // Blue
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#84cc16', // Lime
];

const TOOLTIP_CONTENT_STYLE = {backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem'};
const TOOLTIP_ITEM_STYLE = {color: '#fff'};
const CURSOR_STYLE = {fill: '#374151', opacity: 0.2};
const CHART_MARGIN = {top: 20, right: 30, left: 20, bottom: 5};

const TICK_STYLE = {fill: '#9ca3af'};
const LEGEND_WRAPPER_STYLE = {paddingTop: '20px'};

const formatYAxisTick = (value: number | string) => `$${value}`;
const formatTooltipValue = (value: number) => [`$${value}`, ''];

const FinanceCharts: React.FC<FinanceChartsProps> = React.memo(({data, categories}) => {
    return (
        <div className="rounded-xl bg-gray-800 p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold text-white">Monthly Budget Breakdown</h3>
            <div className="h-96 w-full">
                <ResponsiveContainer height="100%" width="100%">
                    <BarChart data={data} margin={CHART_MARGIN}>
                        <CartesianGrid stroke="#374151" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            axisLine={false}
                            dataKey="name"
                            stroke="#9ca3af"
                            tick={TICK_STYLE}
                            tickLine={false}
                        />
                        <YAxis
                            axisLine={false}
                            stroke="#9ca3af"
                            tick={TICK_STYLE}
                            tickFormatter={formatYAxisTick}
                            tickLine={false}
                        />
                        <Tooltip
                            contentStyle={TOOLTIP_CONTENT_STYLE}
                            cursor={CURSOR_STYLE}
                            formatter={formatTooltipValue}
                            itemStyle={TOOLTIP_ITEM_STYLE}
                        />
                        <Legend wrapperStyle={LEGEND_WRAPPER_STYLE} />
                        {categories.map((category, index) => (
                            <Bar
                                dataKey={category}
                                fill={COLORS[index % COLORS.length]}
                                key={category}
                                stackId="a"
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
});

export default FinanceCharts;
