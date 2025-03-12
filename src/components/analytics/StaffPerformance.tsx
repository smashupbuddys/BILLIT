import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { Users, Award } from 'lucide-react';

interface StaffPerformanceProps {
  data?: {
    salesPerEmployee: Array<{
      employee: string;
      sales: number;
      target: number;
    }>;
    attendance: {
      present: number;
      absent: number;
      halfDay: number;
    };
    performance: Array<{
      metric: string;
      value: number;
      target: number;
    }>;
  };
}

const defaultData = {
  salesPerEmployee: [],
  attendance: {
    present: 0,
    absent: 0,
    halfDay: 0
  },
  performance: []
};

const COLORS = ['#10B981', '#EF4444', '#F59E0B'];

const StaffPerformance: React.FC<StaffPerformanceProps> = ({ data = defaultData }) => {
  const {
    salesPerEmployee = defaultData.salesPerEmployee,
    attendance = defaultData.attendance,
    performance = defaultData.performance
  } = data;

  return (
    <div className="space-y-6">
      {/* Sales Performance */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Sales Performance by Employee</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesPerEmployee}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="employee" />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `₹${value.toLocaleString()}`,
                  name
                ]}
              />
              <Legend />
              <Bar dataKey="sales" name="Actual Sales" fill="#3B82F6" />
              <Bar dataKey="target" name="Target" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attendance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Attendance Overview</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Present', value: attendance.present },
                    { name: 'Absent', value: attendance.absent },
                    { name: 'Half Day', value: attendance.halfDay }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            {performance.map((metric, index) => {
              const percentage = (metric.value / metric.target) * 100;
              return (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">{metric.metric}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="relative pt-1">
                    <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                      <div
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                        className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                          percentage >= 100 ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffPerformance;
