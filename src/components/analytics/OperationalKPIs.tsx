import React from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Activity, CheckCircle, XCircle } from 'lucide-react';

interface OperationalKPIsProps {
  data: {
    summary: {
      totalSales: number;
      totalExpenses: number;
      totalCredit: number;
      profitMargin: number;
    };
    timeBasedMetrics: any;
    financialMetrics: any;
    customerMetrics: any;
    inventoryMetrics: any;
    staffMetrics: any;
  };
}

const OperationalKPIs: React.FC<OperationalKPIsProps> = ({ data }) => {
  // Calculate operational metrics
  const orderFulfillmentRate = 95; // Example calculation
  const returnRate = 2.5; // Example calculation
  const averageProcessingTime = 25; // Example calculation
  const qualityScore = 4.8; // Example calculation

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm font-medium text-gray-600">Order Fulfillment Rate</h4>
          <p className="mt-2 text-3xl font-semibold text-green-600">
            {orderFulfillmentRate}%
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Target: 98%
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm font-medium text-gray-600">Return Rate</h4>
          <p className="mt-2 text-3xl font-semibold text-red-600">
            {returnRate}%
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Target: {'<'}2%
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm font-medium text-gray-600">Avg. Processing Time</h4>
          <p className="mt-2 text-3xl font-semibold text-blue-600">
            {averageProcessingTime}m
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Target: 20m
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm font-medium text-gray-600">Quality Score</h4>
          <p className="mt-2 text-3xl font-semibold text-purple-600">
            {qualityScore}/5
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Target: 4.5/5
          </p>
        </div>
      </div>

      {/* Efficiency Metrics */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Operational Efficiency</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {[
              { label: 'Order Accuracy', value: 98.5, target: 99 },
              { label: 'On-Time Delivery', value: 94.2, target: 95 },
              { label: 'Stock Availability', value: 96.8, target: 98 },
              { label: 'Staff Utilization', value: 87.5, target: 90 }
            ].map((metric, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">{metric.label}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {metric.value}% / {metric.target}%
                  </span>
                </div>
                <div className="relative pt-1">
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                    <div
                      style={{ width: `${(metric.value / metric.target) * 100}%` }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                        metric.value >= metric.target ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[
                { month: 'Jan', efficiency: 85 },
                { month: 'Feb', efficiency: 88 },
                { month: 'Mar', efficiency: 92 },
                { month: 'Apr', efficiency: 90 },
                { month: 'May', efficiency: 95 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="efficiency"
                  name="Efficiency Score"
                  stroke="#3B82F6"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Process Performance */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Process Performance</h3>
        <div className="space-y-4">
          {[
            { process: 'Order Processing', success: 95, failure: 5 },
            { process: 'Inventory Management', success: 98, failure: 2 },
            { process: 'Customer Service', success: 92, failure: 8 },
            { process: 'Delivery', success: 94, failure: 6 }
          ].map((process, index) => (
            <div key={index} className="flex items-center space-x-4">
              <div className="w-48">
                <span className="text-sm font-medium text-gray-900">{process.process}</span>
              </div>
              <div className="flex-1">
                <div className="relative pt-1">
                  <div className="overflow-hidden h-4 text-xs flex rounded">
                    <div
                      style={{ width: `${process.success}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"
                    >
                      {process.success}%
                    </div>
                    <div
                      style={{ width: `${process.failure}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-red-500"
                    >
                      {process.failure}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OperationalKPIs;
