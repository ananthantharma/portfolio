import React from 'react';

interface StatCardProps {
  amount: number;
  colorClass: string;
  icon: React.ElementType;
  title: string;
}

const StatCard: React.FC<StatCardProps> = React.memo(({amount, colorClass, icon: Icon, title}) => {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-CA', {style: 'currency', currency: 'CAD'}).format(val);

  return (
    <div className="rounded-3xl p-6 relative overflow-hidden transition-all duration-300 hover:shadow-md border border-slate-100 bg-white">
      {/* Background Tint */}
      <div className={`absolute inset-0 opacity-[0.03] ${colorClass.replace('text-', 'bg-')}`}></div>

      <div className="relative z-10">
        <div className="flex items-center space-x-3 mb-2">
          <div className={`p-1.5 rounded-lg bg-opacity-10 ${colorClass.replace('text-', 'bg-')}`}>
            <Icon className={`h-5 w-5 ${colorClass}`} />
          </div>
          <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{title}</h4>
        </div>
        <div className={`text-4xl font-extrabold ${colorClass} tracking-tight mt-2`}>{formatCurrency(amount)}</div>
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';

export default StatCard;
