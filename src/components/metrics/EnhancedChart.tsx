import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea
} from 'recharts';

interface EnhancedChartProps {
  data: any[];
  creditLimit?: number;
  onPeriodClick?: (period: string) => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;

  return (
    <div className="bg-white p-3 border rounded-lg shadow-lg">
      <p className="font-medium text-gray-900">{label}</p>
      <div className="mt-2 space-y-1">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center">
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-600">{entry.name}:</span>
            <span className="ml-2 text-sm font-medium">
              ₹{entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const EnhancedChart: React.FC<EnhancedChartProps> = ({
  data,
  creditLimit,
  onPeriodClick
}) => {
  return (
    <div className="bg-white p-4 rounded-lg border">
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          onClick={(e) => e?.activeLabel && onPeriodClick?.(e.activeLabel)}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
          <XAxis
            dataKey="period"
            height={60}
            tick={{ angle: -45, textAnchor: 'end' }}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={(value) => `₹${value/1000}K`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(value) => `₹${value/1000}K`}
          />
          
          {creditLimit && (
            <ReferenceArea
              y1={creditLimit}
              y2={Infinity}
              yAxisId="right"
              fill="#FEE2E2"
              fillOpacity={0.3}
            />
          )}

          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="bills"
            name="Bills"
            stroke="#EF4444"
            dot={false}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="payments"
            name="Payments"
            stroke="#10B981"
            dot={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="balance"
            name="Running Balance"
            stroke="#3B82F6"
            strokeWidth={2}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="gstAmount"
            name="GST"
            stroke="#8B5CF6"
            strokeDasharray="5 5"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
