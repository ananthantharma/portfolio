import {ArrowDownIcon, ArrowUpIcon, BanknotesIcon, HomeModernIcon} from '@heroicons/react/24/solid';
import React from 'react';

interface SummaryCardsProps {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  rentalProfitability: number;
}

const SummaryCards: React.FC<SummaryCardsProps> = React.memo(({totalIncome, totalExpenses, netCashFlow, rentalProfitability}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  };

  const cards = [
    {
      title: 'Total Income',
      amount: totalIncome,
      icon: BanknotesIcon,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-500',
    },
    {
      title: 'Total Expenses',
      amount: totalExpenses,
      icon: ArrowDownIcon,
      color: 'bg-rose-500',
      textColor: 'text-rose-500',
    },
    {
      title: 'Net Cash Flow',
      amount: netCashFlow,
      icon: ArrowUpIcon,
      color: netCashFlow >= 0 ? 'bg-blue-500' : 'bg-red-500',
      textColor: netCashFlow >= 0 ? 'text-blue-500' : 'text-red-500',
    },
    {
      title: 'Rental Profitability',
      amount: rentalProfitability,
      icon: HomeModernIcon,
      color: rentalProfitability >= 0 ? 'bg-indigo-500' : 'bg-orange-500',
      textColor: rentalProfitability >= 0 ? 'text-indigo-500' : 'text-orange-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(card => (
        <div
          className="overflow-hidden rounded-xl bg-gray-800 p-6 shadow-lg transition-transform hover:scale-105"
          key={card.title}>
          <div className="flex items-center">
            <div className={`rounded-md p-3 ${card.color} bg-opacity-20`}>
              <card.icon aria-hidden="true" className={`h-8 w-8 ${card.textColor}`} />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-400">{card.title}</dt>
                <dd>
                  <div className="text-2xl font-bold text-white">{formatCurrency(card.amount)}</div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

export default SummaryCards;
