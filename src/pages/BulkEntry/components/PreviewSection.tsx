import React, { useState, useEffect } from 'react';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { ParsedEntry, PreviewProps } from '../types';
import db from '../../../lib/db';

interface DuplicateCheck {
  isDuplicate: boolean;
  existingEntry?: {
    date: string;
    amount: number;
    billNumber?: string;
    type: string;
  };
  overridden?: boolean;  // Added to track override status
}

const PreviewSection: React.FC<PreviewProps> = ({
  parsedEntries,
  onSubmit,
  isProcessing,
  hasErrors
}) => {
  const [duplicateChecks, setDuplicateChecks] = useState<{ [key: string]: DuplicateCheck }>({});

  useEffect(() => {
    const checkDuplicates = async () => {
      const checks: { [key: string]: DuplicateCheck } = {};
      
      for (const entry of parsedEntries) {
        if ('error' in entry) continue;
        if (entry.type !== 'bill' && entry.type !== 'payment') continue;
        
        const result = await checkForDuplicate(entry);
        if (entry.data.id) {
          checks[entry.data.id] = result;
        }
      }
      
      setDuplicateChecks(checks);
    };

    checkDuplicates();
  }, [parsedEntries]);

  const checkForDuplicate = async (entry: ParsedEntry): Promise<DuplicateCheck> => {
    if (!entry.data.party_name) return { isDuplicate: false };
    
    const dbInstance = await db.init();
    
    try {
      const partyResult = dbInstance.exec(
        'SELECT id FROM parties WHERE name = ?',
        [entry.data.party_name]
      );
      
      if (!partyResult.length || !partyResult[0].values.length) {
        return { isDuplicate: false };
      }
      
      const partyId = partyResult[0].values[0][0];
      
      let query = `
        SELECT date, amount, bill_number, type
        FROM transactions 
        WHERE party_id = ? 
        AND date = ? 
        AND amount = ?
        AND (
          (type = ? AND expense_category = 'party_payment')
          OR
          (type = ?)
        )
      `;

      const params = [
        partyId,
        entry.data.date,
        entry.data.amount,
        entry.type === 'payment' ? 'expense' : entry.type,
        entry.type
      ];

      if (entry.type === 'bill' && entry.data.billNumber) {
        query += ' AND bill_number = ?';
        params.push(entry.data.billNumber);
      }

      const result = dbInstance.exec(query, params);

      if (result.length && result[0].values.length) {
        const [date, amount, billNumber, type] = result[0].values[0];
        return {
          isDuplicate: true,
          existingEntry: {
            date,
            amount,
            billNumber,
            type
          },
          overridden: false
        };
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return { isDuplicate: false };
    }
  };

  const handleDuplicateOverride = (entryId: string, override: boolean) => {
    setDuplicateChecks(prev => ({
      ...prev,
      [entryId]: {
        ...prev[entryId],
        overridden: override
      }
    }));
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateGSTAmount = (amount: number) => {
    return Math.round((amount / 1.03) * 100) / 100;
  };

  const formatDate = (date: string) => {
    try {
      const [year, month, day] = date.split('-').map(part => part.trim());
      if (year && month && day) {
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
          .toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
          });
      }
      return new Date(date).toLocaleDateString('en-IN');
    } catch (error) {
      return date;
    }
  };

  const isDuplicate = (entry: ParsedEntry) => {
    return entry.data.id && duplicateChecks[entry.data.id]?.isDuplicate;
  };

  const getEntryStatusColor = (entry: ParsedEntry) => {
    const check = entry.data.id ? duplicateChecks[entry.data.id] : null;
    if (check?.isDuplicate) {
      if (entry.type === 'payment' && check.overridden) {
        return 'bg-yellow-50'; // Overridden duplicates are yellow
      }
      return 'bg-red-50'; // Regular duplicates are red
    }
    return '';
  };

  const isEntryBlocked = (entry: ParsedEntry) => {
    if (!entry.data.id || !duplicateChecks[entry.data.id]) return false;
    const check = duplicateChecks[entry.data.id];
    
    // Bills are always blocked if duplicate
    if (entry.type === 'bill' && check.isDuplicate) return true;
    
    // Payments are blocked only if not overridden
    if (entry.type === 'payment' && check.isDuplicate) {
      return check.overridden !== true;
    }
    
    return false;
  };

  const renderDuplicateWarning = (entry: ParsedEntry) => {
    if (!isDuplicate(entry)) return null;

    const duplicateInfo = duplicateChecks[entry.data.id!];
    if (!duplicateInfo?.existingEntry) return null;

    return (
      <div className="mt-2 text-xs bg-red-50 text-red-700 p-2 rounded">
        <div className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          <span className="font-medium">Duplicate Found</span>
        </div>
        <div className="mt-1">
          Existing {duplicateInfo.existingEntry.type} on {formatDate(duplicateInfo.existingEntry.date)}
          {duplicateInfo.existingEntry.billNumber && ` (Bill: ${duplicateInfo.existingEntry.billNumber})`}
          <br />
          Amount: {formatAmount(duplicateInfo.existingEntry.amount)}
        </div>
        
        {/* Override options only for payments */}
        {entry.type === 'payment' && (
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => handleDuplicateOverride(entry.data.id!, true)}
              className={`px-2 py-1 text-xs font-medium rounded ${
                duplicateInfo.overridden
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Process Anyway
            </button>
            <button
              onClick={() => handleDuplicateOverride(entry.data.id!, false)}
              className={`px-2 py-1 text-xs font-medium rounded ${
                duplicateInfo.overridden === false
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Skip
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-3">Preview</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Sales Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Sales</h4>
          <div className="space-y-2">
            {parsedEntries
              .filter(entry => !('error' in entry) && entry.type === 'sale')
              .map((entry: ParsedEntry, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">
                      {entry.data.payment_mode}
                    </span>
                    {entry.data.party_name && (
                      <>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <span>{entry.data.party_name}</span>
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {formatAmount(entry.data.amount)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(entry.data.date)}
                    </div>
                  </div>
                </div>
              ))}
            {parsedEntries.filter(e => !('error' in e) && e.type === 'sale').length === 0 && (
              <p className="text-sm text-gray-500 italic">No sales entered</p>
            )}
          </div>
        </div>

        {/* Bills Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Bills</h4>
          <div className="space-y-2">
            {parsedEntries
              .filter(entry => !('error' in entry) && entry.type === 'bill')
              .map((entry: ParsedEntry, index) => (
                <div 
                  key={index} 
                  className={`text-sm p-2 rounded-md ${getEntryStatusColor(entry)}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{entry.data.party_name}</span>
                        {isDuplicate(entry) && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      {entry.data.billNumber && (
                        <span className="text-gray-500 text-xs">
                          #{entry.data.billNumber}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatAmount(entry.data.amount)}
                      </div>
                      {entry.data.hasGST && (
                        <div className="text-xs text-blue-600">
                          Base: {formatAmount(calculateGSTAmount(entry.data.amount))}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        {formatDate(entry.data.date)}
                      </div>
                    </div>
                  </div>
                  {isDuplicate(entry) && renderDuplicateWarning(entry)}
                </div>
              ))}
            {parsedEntries.filter(e => !('error' in e) && e.type === 'bill').length === 0 && (
              <p className="text-sm text-gray-500 italic">No bills entered</p>
            )}
          </div>
        </div>

        {/* Expenses and Payments Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Expenses & Payments</h4>
          <div className="space-y-2">
            {parsedEntries
              .filter(entry => !('error' in entry) && (entry.type === 'expense' || entry.type === 'payment'))
              .map((entry: ParsedEntry, index) => (
                <div 
                  key={index} 
                  className={`text-sm p-2 rounded-md ${getEntryStatusColor(entry)}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">
                          {entry.type === 'payment' ? `Payment to ${entry.data.party_name}` : 
                           entry.data.description || entry.type}
                        </span>
                        {isDuplicate(entry) && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatAmount(entry.data.amount)}
                      </div>
                      {entry.data.hasGST && (
                        <div className="text-xs text-blue-600">
                          Base: {formatAmount(calculateGSTAmount(entry.data.amount))}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        {formatDate(entry.data.date)}
                      </div>
                    </div>
                  </div>
                  {isDuplicate(entry) && renderDuplicateWarning(entry)}
                </div>
              ))}
            {parsedEntries.filter(e => !('error' in e) && (e.type === 'expense' || e.type === 'payment')).length === 0 && (
              <p className="text-sm text-gray-500 italic">No expenses or payments entered</p>
            )}
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="mt-4 bg-gray-50 rounded-lg p-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-red-600">
            <span className="font-medium">Total Debit:</span>
            <span>₹{parsedEntries
              .filter(e => !('error' in e) && (e.type === 'payment' || e.type === 'expense'))
              .reduce((sum, e) => {
                const entry = e as ParsedEntry;
                return sum + entry.data.amount;
              }, 0)
              .toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm text-green-600">
            <span className="font-medium">Total Credit:</span>
<span>₹{parsedEntries
              .filter(e => !('error' in e) && (e.type === 'sale' || e.type === 'bill'))
              .reduce((sum, e) => {
                const entry = e as ParsedEntry;
                return sum + entry.data.amount;
              }, 0)
              .toLocaleString()}</span>
          </div>

          {/* GST Summary */}
          {parsedEntries.some(e => !('error' in e) && e.data.hasGST) && (
            <div className="flex justify-between text-sm text-blue-600">
              <span className="font-medium">Total GST Base:</span>
              <span>₹{parsedEntries
                .filter(e => !('error' in e) && e.data.hasGST)
                .reduce((sum, e) => {
                  const entry = e as ParsedEntry;
                  return sum + calculateGSTAmount(entry.data.amount);
                }, 0)
                .toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Duplicate Summary */}
        {Object.values(duplicateChecks).some(check => check.isDuplicate) && (
          <div className="mt-4 space-y-2">
            <div className="text-sm font-medium text-gray-700">Duplicate Entries:</div>
            {parsedEntries
              .filter(entry => !('error' in entry) && entry.data.id && duplicateChecks[entry.data.id]?.isDuplicate)
              .map((entry: ParsedEntry, index) => {
                const check = duplicateChecks[entry.data.id!];
                const status = entry.type === 'payment' && check.overridden 
                  ? 'Will be processed'
                  : entry.type === 'payment' 
                    ? 'Awaiting decision'
                    : 'Blocked';
                const statusColor = entry.type === 'payment' && check.overridden
                  ? 'text-yellow-600'
                  : entry.type === 'payment'
                    ? 'text-blue-600'
                    : 'text-red-600';
                
                return (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {entry.type === 'bill' 
                        ? `Bill for ${entry.data.party_name}`
                        : `Payment to ${entry.data.party_name}`
                      } ({formatAmount(entry.data.amount)})
                    </span>
                    <span className={statusColor}>{status}</span>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Process Button */}
      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {Object.values(duplicateChecks).some(check => check.isDuplicate) && (
            <>
              <span className="font-medium">Note:</span> Bills with duplicates are blocked. 
              Duplicate payments can be processed with confirmation.
            </>
          )}
        </div>
        <button
          onClick={onSubmit}
          disabled={
            isProcessing || 
            hasErrors || 
            parsedEntries.length === 0 ||
            parsedEntries.some(entry => 
              !('error' in entry) && 
              isEntryBlocked(entry)
            )
          }
          className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white 
                   bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
                   focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Processing...' : 'Process Entries'}
        </button>
      </div>
    </div>
  );
};

export default PreviewSection;
