import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import React from 'react';

interface MonthSelectorProps {
    currentDate: Date;
    onMonthChange: (date: Date) => void;
}

const MonthSelector: React.FC<MonthSelectorProps> = React.memo(({ currentDate, onMonthChange }) => {
    const handlePrevMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() - 1);
        onMonthChange(newDate);
    };

    const handleNextMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + 1);
        onMonthChange(newDate);
    };

    const formattedDate = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="flex items-center space-x-4 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
            <button
                className="p-1 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                onClick={handlePrevMonth}
            >
                <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <span className="min-w-[140px] text-center font-bold text-slate-700 select-none">
                {formattedDate}
            </span>
            <button
                className="p-1 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                onClick={handleNextMonth}
            >
                <ChevronRightIcon className="h-5 w-5" />
            </button>
        </div>
    );
});

MonthSelector.displayName = 'MonthSelector';

export default MonthSelector;
