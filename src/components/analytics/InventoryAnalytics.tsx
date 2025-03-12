import React from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { ShoppingBag, AlertTriangle } from 'lucide-react';

interface InventoryAnalyticsProps {
  data?: {
    turnoverRate: number;
    stockouts: number;
    deadStock: number;
    reorderAlerts: Array<{
      item: string;
      currentStock: number;
      reorderPoint: number;
    }>;
  };
}

const defaultData = {
  turnoverRate: 0,
  stockouts: 0,
  deadStock: 0,
  reorderAlerts: []
};

const COLORS = ['#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#F59E0B', '#6366F1'];

const InventoryAnalytics: React.FC<InventoryAnalyticsProps> = ({ data = defaultData }) => {
  const {
    turnoverRate = defaultData.turnoverRate,
    stockouts = defaultData.stockouts,
    deadStock = defaultData.deadStock,
    reorderAlerts = defaultData.reorderAlerts
  } = data;

  return (
    <div className="space-y-6">
      {/* Inventory Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm font-medium text-gray-600">Inventory Turnover</h4>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {turnoverRate.toFixed(2)}x
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Annual turnover rate
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm font-medium text-gray-600">Stock-outs</h4>
          <p className="mt-2 text-3xl font-semibold text-red-600">
            {stockouts}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Items out of stock
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm font-medium text-gray-600">Dead Stock</h4>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {deadStock}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Items with no movement
          </p>
        </div>
      </div>

      {/* Reorder Alerts */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Reorder Alerts</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {reorderAlerts.map((item, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-4 bg-red-50 rounded-lg"
              >
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-red-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.item}</p>
                    <p className="text-sm text-gray-500">
                      Current Stock: {item.currentStock} | Reorder Point: {item.reorderPoint}
                    </p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700">
                  Reorder Now
                </button>
              </div>
            ))}
            {reorderAlerts.length === 0 && (
              <p className="text-sm text-gray-500 italic">No reorder alerts</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryAnalytics;
