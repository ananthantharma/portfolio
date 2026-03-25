'use client';

import React from 'react';
import {Legend, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip} from 'recharts';

interface Props {
  financialRisk: number;
  operationalRisk: number;
  complianceRisk: number;
  esgRisk: number;
  className?: string;
}

export const RiskRadarChart: React.FC<Props> = ({financialRisk, operationalRisk, complianceRisk, esgRisk, className}) => {
  const data = [
    {subject: 'Financial', score: financialRisk, fullMark: 100},
    {subject: 'Operational', score: operationalRisk, fullMark: 100},
    {subject: 'Compliance', score: complianceRisk, fullMark: 100},
    {subject: 'ESG', score: esgRisk, fullMark: 100},
  ];

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" tick={{fontSize: 12}} />
          <Radar
            name="Risk Score"
            dataKey="score"
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Tooltip formatter={(v: number) => [`${v}/100`, 'Score']} />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
