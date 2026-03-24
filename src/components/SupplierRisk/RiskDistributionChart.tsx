'use client';

import React from 'react';
import {Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip} from 'recharts';

interface Props {
  data: {Low: number; Medium: number; High: number; Critical: number};
}

const COLORS = {
  Low: '#10b981',
  Medium: '#f59e0b',
  High: '#f97316',
  Critical: '#ef4444',
};

export const RiskDistributionChart: React.FC<Props> = ({data}) => {
  const chartData = Object.entries(data)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({name, value}));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
          label={({name, percent}) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={false}>
          {chartData.map(entry => (
            <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => [v, 'Suppliers']} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};
