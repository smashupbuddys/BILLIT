import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { SparkLineChart } from './SparkLineChart';

interface MetricsCardProps {
  title: string;
  amount: number;
  percentageChange: number;
  trend: 'up' | 'down' | 'neutral';
  theme: 'red' | 'green' | 'blue' | 'purple';
  subtitle?: string;
  breakdown?: { label: string; value: number }[];
  sparklineData?: number[];
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  amount,
  percentageChange,
  trend,
  theme,
  subtitle,
  breakdown,
  sparklineData
}) => {
  const themeColors = {
    red: 'bg-red-50 border-red-100',
    green: 'bg-green-50 border-green-100',
    blue: 'bg-blue-50 border-blue-100',
    purple: 'bg-purple-50 border-purple-100'
  };

  const textColors = {
    red: 'text-red-700',
    green: 'text-green-700',
    blue: 'text-blue-700',
    purple: 'text-purple-700'
  };

  return (
    <div className={`rounded-2xl border p-6 ${themeColors[theme]} backdrop-blur-sm`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-medium opacity-75">{title}</h3>
          <div className="mt-2 flex items-baseline">
            <p className={`text-2xl font-semibold ${textColors[theme]}`}>
              ₹{amount.toLocaleString()}
            </p>
            <p className={`ml-2 text-sm flex items-center ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 
              'text-gray-500'
            }`}>
              {trend === 'up' ? <ArrowUp className="w-4 h-4" /> : 
               trend === 'down' ? <ArrowDown className="w-4 h-4" /> : null}
              {Math.abs(percentageChange).toFixed(1)}%
            </p>
          </div>
          {subtitle && (
            <p className="mt-1 text-sm opacity-75">{subtitle}</p>
          )}
        </div>
        {sparklineData && (
          <div className="w-24 h-12">
            <SparkLineChart data={sparklineData} color={theme} />
          </div>
        )}
      </div>
      {breakdown && (
        <div className="mt-4 space-y-1">
          {breakdown.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="opacity-75">{item.label}</span>
              <span className="font-medium">₹{item.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MetricsCard;
