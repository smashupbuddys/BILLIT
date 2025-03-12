import React, { useState, useEffect } from 'react';
    import { generateEnhancedReport } from '../utils/reportGenerator';
    import { Download } from 'lucide-react';
    import { generatePDF } from '../utils/pdfGenerator'; // Import generatePDF

    const Report: React.FC = () => {
      const [reportData, setReportData] = useState<any>(null);
      const [isLoading, setIsLoading] = useState(true);
      const [isGenerating, setIsGenerating] = useState(false);

      useEffect(() => {
        loadReport();
      }, []);

      const loadReport = async () => {
        try {
          setIsLoading(true);
          const data = await generateEnhancedReport();
          setReportData(data);
        } catch (error) {
          console.error('Error loading report data:', error);
          alert('Error loading report data. Please try again.');
        } finally {
          setIsLoading(false);
        }
      };

      const handleExportReport = async () => {
        try {
          setIsGenerating(true);
          await generatePDF(); // Call generatePDF function
        } catch (error) {
          console.error('Error exporting report:', error);
          alert('Error exporting report. Please try again.');
        } finally {
          setIsGenerating(false);
        }
      };

      if (isLoading) {
        return (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-gray-600">Loading report data...</div>
          </div>
        );
      }

      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-900">Enhanced Report</h1>
            <button
              onClick={handleExportReport}
              disabled={isGenerating}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Export PDF'}
            </button>
          </div>

          {/* Sales and Expenses Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Sales and Expenses Summary</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sales</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Expenses</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.sales.map((row: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row[0]}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{row[1].toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{row[2].toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bills Paid and Received per Party */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Bills Paid and Received per Party</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party Name</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Bills</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Payments</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.partyBills.map((row: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row[0]}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row[1]}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{row[2].toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{row[3].toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total Purchase per Party per Month */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Total Purchase per Party per Month</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party Name</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Purchase Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.partyPurchases.map((row: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row[0]}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row[1]}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{row[2].toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Credit Pending Forecasting */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Credit Pending Forecasting</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Pending Credit</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.creditPending.map((row: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row[0]}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{row[1].toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    };

    export default Report;
