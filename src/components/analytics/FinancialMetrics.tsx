import React from 'react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar 
} from 'recharts';
import { IndianRupee, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface FinancialMetricsProps {
  data?: {
    profitMargins?: Array<{
      period: string;
      gross: number;
      operating: number;
      net: number;
    }>;
    cashFlow?: Array<{
      date: string;
      inflow: number;
      outflow: number;
      balance: number;
    }>;
    workingCapital?: {
      current: number;
      trend: Array<{
        date: string;
        amount: number;
      }>;
    };
  };
}

const defaultData = {
  profitMargins: Array.from({ length: 12 }, (_, i) => ({
    period: new Date(0, i).toLocaleString('default', { month: 'short' }),
    gross: 0,
    operating: 0,
    net: 0
  })),
  cashFlow: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    inflow: 0,
    outflow: 0,
    balance: 0
  })),
  workingCapital: {
    current: 0,
    trend: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount: 0
    }))
  }
};

const FinancialMetrics: React.FC<FinancialMetricsProps> = ({ data = defaultData }) => {
  const {
    profitMargins = defaultData.profitMargins,
    cashFlow = defaultData.cashFlow,
    workingCapital = defaultData.workingCapital
  } = data;

  return (
    <div className="space-y-6">
      {/* Profit Margins */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Profit Margins</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={profitMargins}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis tickFormatter={(value) => `₹${value.toLocaleString()}`} />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `₹${value.toLocaleString()}`,
                  name
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="gross"
                name="Gross Margin"
                stroke="#10B981"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="operating"
                name="Operating Margin"
                stroke="#3B82F6"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="net"
                name="Net Margin"
                stroke="#8B5CF6"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cash Flow */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Cash Flow</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashFlow}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => `₹${value.toLocaleString()}`} />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `₹${value.toLocaleString()}`,
                  name
                ]}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="inflow"
                name="Cash In"
                stackId="1"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.3}
              />
              <Area
                type="monotone"
                dataKey="outflow"
                name="Cash Out"
                stackId="1"
                stroke="#EF4444"
                fill="#EF4444"
                fillOpacity={0.3}
              />
              <Line
                type="monotone"
                dataKey="balance"
                name="Net Balance"
                stroke="#3B82F6"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Working Capital */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Working Capital</h3>
          <div className="flex items-center text-sm">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium ${
              workingCapital.current >= 0
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {workingCapital.current >= 0 ? (
                <ArrowUpRight className="w-4 h-4 mr-1" />
              ) : (
                <ArrowDownRight className="w-4 h-4 mr-1" />
              )}
              ₹{Math.abs(workingCapital.current).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={workingCapital.trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => `₹${value.toLocaleString()}`} />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `₹${value.toLocaleString()}`,
                  name
                ]}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default FinancialMetrics;
