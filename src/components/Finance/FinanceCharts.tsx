import React from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface FinanceChartsProps {
    expensesByCategory: { name: string; value: number }[];
    monthlyTrend: { name: string; Income: number; Expense: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const TOOLTIP_CONTENT_STYLE = {backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem'};
const TOOLTIP_ITEM_STYLE = {color: '#fff'};
const CURSOR_STYLE = {fill: '#374151', opacity: 0.2};
const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
const CHART_MARGIN = {top: 5, right: 30, left: 20, bottom: 5};

const FinanceCharts: React.FC<FinanceChartsProps> = React.memo(({expensesByCategory, monthlyTrend}) => {
    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Expenses by Category - Donut Chart */}
            <div className="rounded-xl bg-gray-800 p-6 shadow-lg">
                <h3 className="mb-4 text-lg font-semibold text-white">Expenses by Category</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer height="100%" width="100%">
                        <PieChart>
                            <Pie
                                cx="50%"
                                cy="50%"
                                data={expensesByCategory}
                                dataKey="value"
                                fill="#8884d8"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}>
                                {expensesByCategory.map((_entry, index) => (
                                    <Cell fill={COLORS[index % COLORS.length]} key={`cell-${index}`} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={TOOLTIP_CONTENT_STYLE}
                                itemStyle={TOOLTIP_ITEM_STYLE}
                            />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Income vs Expense - Bar Chart */}
            <div className="rounded-xl bg-gray-800 p-6 shadow-lg">
                <h3 className="mb-4 text-lg font-semibold text-white">Monthly Income vs Expense</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer height="100%" width="100%">
                        <BarChart
                            data={monthlyTrend}
                            margin={CHART_MARGIN}>
                            <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
                            <XAxis dataKey="name" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip
                                contentStyle={TOOLTIP_CONTENT_STYLE}
                                cursor={CURSOR_STYLE}
                                itemStyle={TOOLTIP_ITEM_STYLE}
                            />
                            <Legend />
                            <Bar dataKey="Income" fill="#10b981" radius={BAR_RADIUS} />
                            <Bar dataKey="Expense" fill="#f43f5e" radius={BAR_RADIUS} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
});

export default FinanceCharts;
