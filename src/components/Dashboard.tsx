import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, ComposedChart,
  Bell, CheckCircle
} from 'recharts';
import { 
  IndianRupee, TrendingUp, TrendingDown, CreditCard, Wallet, BankNote,
  ShoppingBag, Users, Receipt, ArrowUpRight, ArrowDownRight, Calendar, Download
} from 'lucide-react';
import db from '../lib/db';
import { generatePDF } from '../utils/pdfGenerator';
import StatCard from '../components/StatCard';
import MetricsCard from '../components/metrics/MetricsCard';
import { supabase } from '../lib/supabase';
import { Notification } from '../lib/types';

const COLORS = ['#007AFF', '#34C759', '#FF3B30', '#5856D6', '#FF9500', '#AF52DE'];

const Dashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [growthRates, setGrowthRates] = useState<any>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const dbInstance = await db.init();

      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      switch (timeRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Format dates for SQL
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = new Date().toISOString().split('T')[0];

      // Fetch transactions
      const result = dbInstance.exec(`
        SELECT 
          date,
          SUM(CASE WHEN type = 'sale' THEN amount ELSE 0 END) as sales,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses,
          SUM(CASE 
            WHEN type = 'sale' THEN amount 
            WHEN type = 'expense' THEN -amount 
            ELSE 0 
          END) as profit
        FROM transactions 
        WHERE date BETWEEN ? AND ?
        GROUP BY date
        ORDER BY date
      `, [startDateStr, endDateStr]);

      // Fetch payment distribution
      const paymentResult = dbInstance.exec(`
        SELECT 
          COALESCE(payment_mode, 'unknown') as name,
          SUM(amount) as amount
        FROM transactions 
        WHERE type = 'sale' AND date BETWEEN ? AND ?
        GROUP BY payment_mode
      `, [startDateStr, endDateStr]);

      // Calculate summary
      const summaryResult = dbInstance.exec(`
        SELECT 
          SUM(CASE WHEN type = 'sale' THEN amount ELSE 0 END) as totalSales,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as totalExpenses,
          SUM(CASE 
            WHEN type = 'sale' THEN amount 
            WHEN type = 'expense' THEN -amount 
            ELSE 0 
          END) as totalProfit
        FROM transactions 
        WHERE date BETWEEN ? AND ?
      `, [startDateStr, endDateStr]);

      // Calculate growth rates
      const previousPeriodResult = dbInstance.exec(`
        SELECT 
          SUM(CASE WHEN type = 'sale' THEN amount ELSE 0 END) as prevSales,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as prevExpenses,
          SUM(CASE 
            WHEN type = 'sale' THEN amount 
            WHEN type = 'expense' THEN -amount 
            ELSE 0 
          END) as prevProfit
        FROM transactions 
        WHERE date BETWEEN ? AND ?
      `, [
        new Date(startDate.getTime() - (startDate.getTime() - now.getTime())).toISOString().split('T')[0],
        startDateStr
      ]);

      // Process the results
      const daily = result[0]?.values.map((row: any) => ({
        date: row[0],
        sales: row[1] || 0,
        expenses: row[2] || 0,
        profit: row[3] || 0
      })) || [];

      const payments = paymentResult[0]?.values.map((row: any) => ({
        name: row[0],
        amount: row[1] || 0
      })) || [];

      const summary = {
        totalSales: summaryResult[0]?.values[0][0] || 0,
        totalExpenses: summaryResult[0]?.values[0][1] || 0,
        totalProfit: summaryResult[0]?.values[0][2] || 0
      };

      const prevPeriod = {
        sales: previousPeriodResult[0]?.values[0][0] || 0,
        expenses: previousPeriodResult[0]?.values[0][1] || 0,
        profit: previousPeriodResult[0]?.values[0][2] || 0
      };

      // Calculate growth rates
      const calculateGrowthRate = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      const growth = {
        sales: calculateGrowthRate(summary.totalSales, prevPeriod.sales),
        expenses: calculateGrowthRate(summary.totalExpenses, prevPeriod.expenses),
        profit: calculateGrowthRate(summary.totalProfit, prevPeriod.profit)
      };

      setData({ daily, payments, summary });
      setGrowthRates(growth);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', supabase.auth.getUser()?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      setNotifications(data as Notification[]);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  useEffect(() => {
    loadDashboardData();
    loadNotifications();
  }, [timeRange]);

  const handleExportPDF = async () => {
    try {
      if (!data) throw new Error('Data not loaded');
      setIsGeneratingPDF(true);
      await generatePDF(data, growthRates);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading dashboard data...</div>
      </div>
    );
  }

  const profitMargin = ((data.summary.totalSales - data.summary.totalExpenses) / data.summary.totalSales) * 100;
  const netCashflow = data.summary.totalSales - data.summary.totalExpenses;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard Overview</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="block w-full sm:w-40 px-4 py-2 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <button
            onClick={handleExportPDF}
            disabled={isGeneratingPDF}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            <Download className="w-4 h-4 mr-2" />
            {isGeneratingPDF ? 'Generating...' : 'Export PDF'}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-full hover:bg-gray-100 relative"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {notifications.filter(n => !n.is_read).length > 0 && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
            {showNotifications && (
              <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-md p-2 w-80 z-50">
                {notifications.length > 0 ? (
                  <ul className="space-y-2">
                    {notifications.map(notification => (
                      <li key={notification.id} className="p-2 rounded-md hover:bg-gray-100">
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-700">{notification.message}</p>
                          {!notification.is_read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="text-green-600 hover:text-green-800"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 italic">No notifications</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Growth Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {['sales', 'expenses', 'profit'].map((metric) => (
          <MetricsCard
            key={metric}
            title={`${metric.charAt(0).toUpperCase() + metric.slice(1)} Growth`}
            amount={data.summary[`total${metric.charAt(0).toUpperCase() + metric.slice(1)}`] || 0}
            percentageChange={growthRates[metric]}
            trend={growthRates[metric] >= 0 ? 'up' : 'down'}
            theme={metric === 'sales' ? 'green' : metric === 'expenses' ? 'red' : 'blue'}
            sparklineData={data.daily.map((d: any) => d[metric])}
          />
        ))}
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Overview</h3>
            <div className="space-y-4">
              <StatCard
                label="Total Sales"
                value={`₹${data.summary.totalSales.toLocaleString()}`}
                delta={{
                  value: `${growthRates.sales.toFixed(1)}%`,
                  type: growthRates.sales >= 0 ? 'increase' : 'decrease'
                }}
              />
              <StatCard
                label="Total Expenses"
                value={`₹${data.summary.totalExpenses.toLocaleString()}`}
                delta={{
                  value: `${growthRates.expenses.toFixed(1)}%`,
                  type: growthRates.expenses >= 0 ? 'increase' : 'decrease'
                }}
              />
              <StatCard
                label="Net Profit/Loss"
                value={`₹${Math.abs(netCashflow).toLocaleString()}`}
                delta={{
                  value: `${profitMargin.toFixed(1)}% margin`,
                  type: netCashflow >= 0 ? 'increase' : 'decrease'
                }}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.payments}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {data.payments.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `₹${parseInt(value).toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Transactions</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                    }}
                    formatter={(value: any) => `₹${parseInt(value).toLocaleString()}`}
                  />
                  <Legend />
                  <Bar dataKey="sales" name="Sales" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="Profit/Loss"
                    stroke={COLORS[0]}
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Cash Flow</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                    }}
                    formatter={(value: any) => `₹${parseInt(value).toLocaleString()}`}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    name="Inflow"
                    stackId="1"
                    stroke={COLORS[1]}
                    fill={COLORS[1]}
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    name="Outflow"
                    stackId="1"
                    stroke={COLORS[2]}
                    fill={COLORS[2]}
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
