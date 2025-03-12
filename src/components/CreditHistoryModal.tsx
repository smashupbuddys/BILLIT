import React from 'react';
import { X, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  type: 'sale' | 'payment';
  amount: number;
  description?: string;
  created_at: string;
}

interface CreditHistoryModalProps {
  show: boolean;
  onClose: () => void;
  customerName: string;
  transactions: Transaction[];
  totalCredit: number;
  totalPaid: number;
}

const CreditHistoryModal: React.FC<CreditHistoryModalProps> = ({
  show,
  onClose,
  customerName,
  transactions,
  totalCredit,
  totalPaid
}) => {
  if (!show) return null;

  const remainingBalance = totalCredit - totalPaid;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{customerName}</h3>
            <p className="mt-1 text-sm text-gray-500">Credit History</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Total Credit</p>
                <p className="mt-1 text-xl font-semibold text-blue-700">
                  ₹{totalCredit.toLocaleString()}
                </p>
              </div>
              <ArrowUpRight className="w-6 h-6 text-blue-500" />
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Total Paid</p>
                <p className="mt-1 text-xl font-semibold text-green-700">
                  ₹{totalPaid.toLocaleString()}
                </p>
              </div>
              <ArrowDownRight className="w-6 h-6 text-green-500" />
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Remaining Balance</p>
                <p className="mt-1 text-xl font-semibold text-red-700">
                  ₹{remainingBalance.toLocaleString()}
                </p>
              </div>
              <ArrowUpRight className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="mt-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Running Balance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction, index) => {
                  // Calculate running balance
                  const runningBalance = transactions
                    .slice(0, index + 1)
                    .reduce((sum, t) => 
                      sum + (t.type === 'sale' ? t.amount : -t.amount), 
                    0);

                  return (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(transaction.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.type === 'sale'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {transaction.type === 'sale' ? 'Credit' : 'Payment'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{transaction.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          runningBalance > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          ₹{Math.abs(runningBalance).toLocaleString()}
                          {runningBalance !== 0 && (
                            <span className="ml-1">
                              {runningBalance > 0 ? 'DR' : 'CR'}
                            </span>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditHistoryModal;
