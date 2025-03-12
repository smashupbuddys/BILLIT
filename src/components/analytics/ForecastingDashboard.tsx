import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar 
} from 'recharts';
import { generateFinancialForecast, generateProfitabilityAnalysis } from '../../utils/forecasting';
import { calculateMetrics } from '../../utils/analytics';
import db from '../../lib/db';

const ForecastingDashboard: React.FC = () => {
  const [forecastData, setForecastData] = useState<any>(null);
  const [profitabilityData, setProfitabilityData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'3m' | '6m' | '1y'>('6m');

  useEffect(() => {
    loadForecastData();
  }, [timeRange]);

  const loadForecastData = async () => {
    try {
      setIsLoading(true);
      
      // Load historical data
      const transactions = await loadTransactions();
      const parties = await loadParties();
      const inventory = await loadInventory();
      
      // Generate forecasts
      const forecast = await generateFinancialForecast(transactions, getForecastPeriods());
      const profitability = await generateProfitabilityAnalysis(transactions, parties, inventory);
      
      setForecastData(forecast);
      setProfitabilityData(profitability);
    } catch (error) {
      console.error('Error loading forecast data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async () => {
    // Implementation
  };

  const loadParties = async () => {
    // Implementation
  };

  const loadInventory = async () => {
    // Implementation
  };

  const getForecastPeriods = () => {
    switch (timeRange) {
      case '3m': return 90;
      case '6m': return 180;
      case '1y': return 365;
      default: return 180;
    }
  };

  if (isLoading) {
    return <div>Loading forecasts...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Financial Forecasting</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="block w-32 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        >
          <option value="3m">3 Months</option>
          <option value="6m">6 Months</option>
          <option value="1y">1 Year</option>
        </select>
      </div>

      {/* Revenue Forecast */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Forecast</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={forecastData?.revenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="confidence.upper"
                fill="#3B82F6"
                stroke="#3B82F6"
                fillOpacity={0.1}
              />
              <Area
                type="monotone"
                dataKey="confidence.lower"
                fill="#3B82F6"
                stroke="#3B82F6"
                fillOpacity={0.1}
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#3B82F6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Profitability Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Profit Margins</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={profitabilityData?.currentMetrics?.margins}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
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
                  dataKey="net"
                  name="Net Margin"
                  stroke="#3B82F6"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="operating"
                  name="Operating Margin"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Working Capital</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={profitabilityData?.partyAnalysis?.workingCapital}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="receivables"
                  name="Receivables"
                  stackId="1"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.3}
                />
                <Area
                  type="monotone"
                  dataKey="payables"
                  name="Payables"
                  stackId="2"
                  stroke="#EF4444"
                  fill="#EF4444"
                  fillOpacity={0.3}
                />
                <Line
                  type="monotone"
                  dataKey="netWorking"
                  name="Net Working Capital"
                  stroke="#3B82F6"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Ratio */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm font-medium text-gray-600">Current Ratio</h4>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {profitabilityData?.currentMetrics?.currentRatio.toFixed(2)}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Recommended: {'>'} 2.0
          </p>
        </div>

        {/* Quick Ratio */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm font-medium text-gray-600">Quick Ratio</h4>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {profitabilityData?.currentMetrics?.quickRatio.toFixed(2)}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Recommended: {'>'} 1.0
          </p>
        </div>

        {/* Days Payable */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm font-medium text-gray-600">Days Payable</h4>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {Math.round(profitabilityData?.partyAnalysis?.daysPayableOutstanding)}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Industry Avg: 45 days
          </p>
        </div>

        {/* Days Receivable */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm font-medium text-gray-600">Days Receivable</h4>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {Math.round(profitabilityData?.partyAnalysis?.daysReceivableOutstanding)}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Target: {'<'} 30 days
          </p>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h3>
        <div className="space-y-4">
          {profitabilityData?.recommendations?.map((rec: any, index: number) => (
            <div key={index} className="flex items-start">
              <div className={`
                p-2 rounded-full mr-3 mt-1
                ${rec.type === 'positive' ? 'bg-green-100' : 'bg-red-100'}
              `}>
                <div className={`
                  w-2 h-2 rounded-full
                  ${rec.type === 'positive' ? 'bg-green-600' : 'bg-red-600'}
                `} />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">{rec.title}</h4>
                <p className="mt-1 text-sm text-gray-500">{rec.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ForecastingDashboard;
