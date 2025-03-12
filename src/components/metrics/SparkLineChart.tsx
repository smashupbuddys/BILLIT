import React from 'react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';

interface SparkLineChartProps {
  data: number[];
  color: 'red' | 'green' | 'blue' | 'purple';
}

const colorMap = {
  red: '#EF4444',
  green: '#10B981',
  blue: '#3B82F6',
  purple: '#8B5CF6'
};

export const SparkLineChart: React.FC<SparkLineChartProps> = ({ data, color }) => {
  const chartData = data.map((value, index) => ({ value }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={colorMap[color]}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
