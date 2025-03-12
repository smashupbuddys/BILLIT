import React from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ComposedChart 
} from 'recharts';
import { Clock } from 'lucide-react';

interface TimeBasedAnalyticsProps {
  data?: {
    salesVelocity?: Array<{
      hour: number;
      sales: number;
      transactions: number;
    }>;
    peakHours?: Array<{
      hour: number;
      sales: number;
      transactions: number;
    }>;
    dayOfWeek?: Array<{
      day: string;
      sales: number;
      transactions: number;
    }>;
    monthlyTrends?: Array<{
      month: string;
      sales: number;
      expenses: number;
      profit: number;
    }>;
  };
}

// Default data for when real data is not available
const defaultData = {
  salesVelocity: Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    sales: 0,
    transactions: 0
  })),
  peakHours: Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    sales: 0,
    transactions: 0
  })),
  dayOfWeek: [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ].map(day => ({
    day,
    sales: 0,
    transactions: 0
  })),
  monthlyTrends: Array.from({ length: 12 }, (_, i) => ({
    month: new Date(0, i).toLocaleString('default', { month: 'short' }),
    sales: 0,
    expenses: 0,
    profit: 0
  }))
};

const TimeBasedAnalytics: React.FC<TimeBasedAnalyticsProps> = ({ data = defaultData }) => {
  // Use provided data or fall back to defaults
  const {
    salesVelocity = defaultData.salesVelocity,
    peakHours = defaultData.peakHours,
    dayOfWeek = defaultData.dayOfWeek,
    monthlyTrends = defaultData.monthlyTrends
  } = data;

  return (
    <div className="space-y-6">
      {/* Sales Velocity */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Sales Velocity</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={salesVelocity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="hour"
                tickFormatter={(hour) => `${hour}:00`}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `₹${value.toLocaleString()}`,
                  name
                ]}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="transactions"
                name="Transactions"
                fill="#3B82F6"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="sales"
                name="Sales Amount"
                stroke="#10B981"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Peak Hours Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Peak Business Hours</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="hour"
                  tickFormatter={(hour) => `${hour}:00`}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'Sales' ? `₹${value.toLocaleString()}` : value,
                    name
                  ]}
                />
                <Legend />
                <Bar dataKey="sales" name="Sales" fill="#10B981" />
                <Bar dataKey="transactions" name="Transactions" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Day of Week Performance</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayOfWeek}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'Sales' ? `₹${value.toLocaleString()}` : value,
                    name
                  ]}
                />
                <Legend />
                <Bar dataKey="sales" name="Sales" fill="#10B981" />
                <Bar dataKey="transactions" name="Transactions" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Trends</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `₹${value.toLocaleString()}`,
                  name
                ]}
              />
              <Legend />
              <Bar dataKey="sales" name="Sales" fill="#10B981" />
              <Bar dataKey="expenses" name="Expenses" fill="#EF4444" />
              <Line
                type="monotone"
                dataKey="profit"
                name="Profit"
                stroke="#3B82F6"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default TimeBasedAnalytics;
