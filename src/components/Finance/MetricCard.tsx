import React from 'react';
import {Line, LineChart, ResponsiveContainer} from 'recharts';

interface MetricCardProps {
  amount: number;
  data?: {value: number}[]; // For sparkline
  icon: React.ElementType;
  iconColorClass: string; // e.g. "bg-emerald-500"
  title: string;
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = React.memo(
  ({amount, data, icon: Icon, iconColorClass, title, onClick}) => {
    const formatCurrency = (val: number) =>
      new Intl.NumberFormat('en-CA', {style: 'currency', currency: 'CAD', maximumFractionDigits: 0}).format(val);

    // Default sparkline data if none provided to prevent crash
    const chartData =
      data && data.length > 1
        ? data
        : [{value: 10}, {value: 15}, {value: 10}, {value: 20}, {value: 25}, {value: 22}, {value: 30}];
    const isUp = chartData[chartData.length - 1].value >= chartData[0].value;
    const strokeColor = isUp ? '#10b981' : '#f43f5e'; // Emerald or Rose

    return (
      <div
        className={`relative overflow-hidden rounded-2xl bg-white p-5 shadow-lg shadow-slate-200/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border border-slate-50 ${
          onClick ? 'cursor-pointer' : ''
        }`}
        onClick={onClick}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
            <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">{formatCurrency(amount)}</h3>
          </div>
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full text-white shadow-md ${iconColorClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="h-10 w-full opacity-60">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={chartData}>
              <Line dataKey="value" dot={false} stroke={strokeColor} strokeWidth={2} type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  },
);

MetricCard.displayName = 'MetricCard';

export default MetricCard;
