import React from 'react';
import { 
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import { Users } from 'lucide-react';

interface CustomerInsightsProps {
  data?: {
    retention: number;
    repeatRate: number;
    averageValue: number;
    segments: Array<{
      name: string;
      count: number;
      value: number;
    }>;
  };
}

const defaultData = {
  retention: 0,
  repeatRate: 0,
  averageValue: 0,
  segments: [
    { name: 'New Customers', count: 0, value: 0 },
    { name: 'Repeat Customers', count: 0, value: 0 },
    { name: 'High Value Customers', count: 0, value: 0 }
  ]
};

const COLORS = ['#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#F59E0B', '#6366F1'];

const CustomerInsights: React.FC<CustomerInsightsProps> = ({ data = defaultData }) => {
  const {
    retention = defaultData.retention,
    repeatRate = defaultData.repeatRate,
    averageValue = defaultData.averageValue,
    segments = defaultData.segments
  } = data;

  return (
    <div className="space-y-6">
      {/* Customer Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm font-medium text-gray-600">Customer Retention</h4>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {retention}%
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Of customers return
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm font-medium text-gray-600">Repeat Purchase Rate</h4>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {repeatRate}%
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Make repeat purchases
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm font-medium text-gray-600">Average Order Value</h4>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            ₹{averageValue.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Per transaction
          </p>
        </div>
      </div>

      {/* Customer Segments */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Segments</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={segments}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {segments.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={segments}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Customer Count" fill="#3B82F6" />
                <Bar dataKey="value" name="Total Value" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerInsights;
