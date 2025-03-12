// components/ProcessingSummary.tsx
import React from 'react';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { ProcessingResult } from '../types';

interface ProcessingSummaryProps {
  result: ProcessingResult;
  onUndo: () => void;
  isUndoing: boolean;
}

const ProcessingSummary: React.FC<ProcessingSummaryProps> = ({
  result,
  onUndo,
  isUndoing
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Processing Summary</h3>
        <button
          onClick={onUndo}
          disabled={isUndoing}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {isUndoing ? 'Undoing...' : 'Undo Changes'}
        </button>
      </div>

      {/* Successful Entries */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">
            Successfully Processed ({result.successfulEntries.length} entries)
          </span>
        </div>
        <div className="pl-7 space-y-1">
          {result.successfulEntries.map((entry, index) => (
            <div key={index} className="text-sm text-gray-600">
              {entry.type === 'sale' && `Sale: ${entry.data.amount} (${entry.data.payment_mode})`}
              {entry.type === 'bill' && `Bill: ${entry.data.party_name} - ${entry.data.amount}`}
              {entry.type === 'expense' && `Expense: ${entry.data.description} - ${entry.data.amount}`}
              {entry.type === 'payment' && `Payment: ${entry.data.party_name} - ${entry.data.amount}`}
            </div>
          ))}
        </div>
      </div>

      {/* Failed Entries */}
      {result.failedEntries.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-red-700">
            <XCircle className="h-5 w-5" />
            <span className="font-medium">
              Failed to Process ({result.failedEntries.length} entries)
            </span>
          </div>
          <div className="pl-7 space-y-1">
            {result.failedEntries.map((failure, index) => (
              <div key={index} className="text-sm">
                <span className="text-gray-600">
                  {failure.entry.type === 'sale' && `Sale: ${failure.entry.data.amount}`}
                  {failure.entry.type === 'bill' && `Bill: ${failure.entry.data.party_name} - ${failure.entry.data.amount}`}
                  {failure.entry.type === 'expense' && `Expense: ${failure.entry.data.description} - ${failure.entry.data.amount}`}
                  {failure.entry.type === 'payment' && `Payment: ${failure.entry.data.party_name} - ${failure.entry.data.amount}`}
                </span>
                <span className="text-red-600 ml-2">({failure.error})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Party Balance Changes */}
      {result.partyBalances && result.partyBalances.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-700">
            <RefreshCw className="h-5 w-5" />
            <span className="font-medium">Updated Party Balances</span>
          </div>
          <div className="pl-7 space-y-1">
            {result.partyBalances.map((balance, index) => (
              <div key={index} className="text-sm text-gray-600">
                {balance.partyName}: ₹{balance.oldBalance.toLocaleString()} → ₹{balance.newBalance.toLocaleString()}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessingSummary;
