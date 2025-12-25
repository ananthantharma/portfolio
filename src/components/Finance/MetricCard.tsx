import { ArrowTrendingDownIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/solid';
import React from 'react';

interface MetricCardProps {
    amount: number;
    gradient: string;
    icon: React.ElementType;
    title: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
}

const MetricCard: React.FC<MetricCardProps> = React.memo(({ amount, gradient, icon: Icon, title, trend, trendValue }) => {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(val);

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md border border-slate-100">
            <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full ${gradient} opacity-10 blur-xl`}></div>

            <div className="flex items-start justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${gradient} text-white shadow-sm`}>
                    <Icon className="h-5 w-5" />
                </div>
                {trend && (
                    <div className={`flex items-center space-x-1 rounded-full px-2 py-0.5 text-xs font-medium ${trend === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                        {trend === 'up' ? <ArrowTrendingUpIcon className="h-3 w-3" /> : <ArrowTrendingDownIcon className="h-3 w-3" />}
                        <span>{trendValue}</span>
                    </div>
                )}
            </div>

            <div className="mt-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
                <h3 className="mt-1 text-2xl font-bold text-slate-800">{formatCurrency(amount)}</h3>
            </div>
        </div>
    );
});

MetricCard.displayName = 'MetricCard';

export default MetricCard;
