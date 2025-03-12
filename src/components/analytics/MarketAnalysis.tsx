import React from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { TrendingUp, Globe, Target } from 'lucide-react';

interface MarketAnalysisProps {
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

const COLORS = ['#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#F59E0B', '#6366F1'];

const MarketAnalysis: React.FC<MarketAnalysisProps> = ({ data }) => {
  // Example market data
  const marketShareData = [
    { name: 'Our Business', value: 25 },
    { name: 'Competitor A', value: 30 },
    { name: 'Competitor B', value: 20 },
    { name: 'Others', value: 25 }
  ];

  const marketTrends = [
    { month: 'Jan', sales: 100, market: 400 },
    { month: 'Feb', sales: 120, market: 420 },
    { month: 'Mar', sales: 140, market: 450 },
    { month: 'Apr', sales: 160, market: 480 },
    { month: 'May', sales: 180, market: 500 }
  ];

  return (
    <div className="space-y-6">
      {/* Market Share */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Market Share</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={marketShareData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {marketShareData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Market Growth</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={marketTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sales"
                  name="Our Sales"
                  stroke="#3B82F6"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="market"
                  name="Market Size"
                  stroke="#10B981"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Competitive Analysis */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Competitive Analysis</h3>
        <div className="space-y-6">
          {[
            { 
              competitor: 'Competitor A',
              metrics: [
                { name: 'Price', us: 85, them: 90 },
                { name: 'Quality', us: 90, them: 85 },
                { name: 'Service', us: 95, them: 80 },
                { name: 'Selection', us: 80, them: 95 }
              ]
            },
            { 
              competitor: 'Competitor B',
              metrics: [
                { name: 'Price', us: 85, them: 80 },
                { name: 'Quality', us: 90, them: 90 },
                { name: 'Service', us: 95, them: 85 },
                { name: 'Selection', us: 80, them: 85 }
              ]
            }
          ].map((competitor, index) => (
            <div key={index} className="space-y-4">
              <h4 className="text-md font-medium text-gray-900">{competitor.competitor}</h4>
              <div className="space-y-3">
                {competitor.metrics.map((metric, mIndex) => (
                  <div key={mIndex} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600">{metric.name}</span>
                      <span className="text-sm font-medium text-gray-900">
                        Us: {metric.us} | Them: {metric.them}
                      </span>
                    </div>
                    <div className="relative pt-1">
                      <div className="flex space-x-2">
                        <div className="flex-1">
                          <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                            <div
                              style={{ width: `${metric.us}%` }}
                              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                            <div
                              style={{ width: `${metric.them}%` }}
                              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Market Opportunities */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Market Opportunities</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: 'Geographic Expansion',
              potential: 'High',
              investment: '₹500,000',
              timeframe: '6 months'
            },
            {
              title: 'Product Line Extension',
              potential: 'Medium',
              investment: '₹300,000',
              timeframe: '3 months'
            },
            {
              title: 'Digital Transformation',
              potential: 'High',
              investment: '₹700,000',
              timeframe: '12 months'
            }
          ].map((opportunity, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <h4 className="text-md font-medium text-gray-900">{opportunity.title}</h4>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-600">
                  Potential: <span className="font-medium text-gray-900">{opportunity.potential}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Investment: <span className="font-medium text-gray-900">{opportunity.investment}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Timeframe: <span className="font-medium text-gray-900">{opportunity.timeframe}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarketAnalysis;
