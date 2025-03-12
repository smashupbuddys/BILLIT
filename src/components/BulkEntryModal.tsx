import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Transaction } from '../lib/types';
import { processBulkEntries } from '../lib/db/operations';

interface BulkEntryModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (entries: ParsedEntry[]) => Promise<void>;
  transactions: Transaction[];
  partyId: string | undefined;
}

interface ParsedEntry {
  type: 'bill' | 'payment';
  data: {
    date: string;
    amount: number;
    hasGST?: boolean;
    billNumber?: string;
    description?: string;
    refId?: string;
  };
}

const formatDate = (dateStr: string) => {
  const [day, month, year] = dateStr.split('/');
  if (!day || !month || !year) throw new Error('Invalid date format');
  return `20${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const BulkEntryModal: React.FC<BulkEntryModalProps> = ({
  show,
  onClose,
  onSubmit,
  transactions,
  partyId
}) => {
  // State declarations
  const [debitEntries, setDebitEntries] = useState<string>('');
  const [creditEntries, setCreditEntries] = useState<string>('');
  const [parsedEntries, setParsedEntries] = useState<ParsedEntry[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset form when modal is closed
  useEffect(() => {
    if (!show) {
      resetForm();
    }
  }, [show]);

  const resetForm = () => {
    setDebitEntries('');
    setCreditEntries('');
    setParsedEntries([]);
    setErrors([]);
    setIsProcessing(false);
  };

  const parseDebitEntry = (line: string): ParsedEntry | null => {
    try {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 2) return null;

      const dateStr = parts[0];
      const amount = parseFloat(parts[1]);
      let type = parts[2]?.toUpperCase();
      let refId: string | undefined;

      // Check if the last part is a 4-digit number (reference ID)
      const lastPart = parts[parts.length - 1];
      if (/^\d{4}$/.test(lastPart)) {
        refId = lastPart;
        // If we have both type and refId, type will be second to last
        if (parts.length > 3) {
          type = parts[2]?.toUpperCase();
        }
      }

      if (isNaN(amount)) return null;

      return {
        type: 'payment',
        data: {
          date: formatDate(dateStr),
          amount,
          hasGST: type === 'GST',
          description: type === 'K' ? 'K' : undefined,
          refId
        }
      };
    } catch (error) {
      return null;
    }
  };

  const parseCreditEntry = (line: string): ParsedEntry | null => {
    try {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 2) return null;

      const dateStr = parts[0];
      const amount = parseFloat(parts[1]);
      const billNumber = parts.length > 2 ? parts[2] : undefined;
      const grMatch = line.match(/GR\s+(.+)$/);
      const grNumber = grMatch ? grMatch[1].trim() : undefined;

      if (isNaN(amount)) return null;

      return {
        type: 'bill',
        data: {
          date: formatDate(dateStr),
          amount,
          billNumber,
          description: grNumber ? `GR: ${grNumber}` : undefined
        }
      };
    } catch (error) {
      return null;
    }
  };

  const handleDebitEntriesChange = (value: string) => {
    setDebitEntries(value);
    const lines = value.split('\n').filter(line => line.trim());
    const entries: ParsedEntry[] = [];
    
    lines.forEach(line => {
      const entry = parseDebitEntry(line);
      if (entry) entries.push(entry);
    });

    setParsedEntries(prev => [...entries, ...prev.filter(e => e.type === 'bill')]);
  };

  const handleCreditEntriesChange = (value: string) => {
    setCreditEntries(value);
    const lines = value.split('\n').filter(line => line.trim());
    const entries: ParsedEntry[] = [];
    
    lines.forEach(line => {
      const entry = parseCreditEntry(line);
      if (entry) entries.push(entry);
    });

    setParsedEntries(prev => [...prev.filter(e => e.type === 'payment'), ...entries]);
  };

  const validateEntries = () => {
    const newErrors: string[] = [];
    const seenDates = new Set<string>();
    const seenBillNumbers = new Set<string>();

    parsedEntries.forEach((entry, index) => {
      const key = `${entry.data.date}-${entry.data.amount}`;
      
      if (entry.type === 'bill' && entry.data.billNumber) {
        if (seenBillNumbers.has(entry.data.billNumber)) {
          newErrors.push(`Duplicate bill number on line ${index + 1}`);
        }
        seenBillNumbers.add(entry.data.billNumber);
      } else if (seenDates.has(key)) {
        newErrors.push(`Duplicate transaction on line ${index + 1}`);
      }
      
      seenDates.add(key);

      // Check for existing transactions
      const existingTransaction = transactions.find(t => 
        t.date === entry.data.date && 
        Math.abs(t.amount - entry.data.amount) < 0.01 &&
        ((entry.type === 'bill' && t.bill_number === entry.data.billNumber) ||
         (entry.type === 'payment' && !t.bill_number))
      );

      if (existingTransaction) {
        newErrors.push(`Transaction already exists on line ${index + 1}`);
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validateEntries()) {
      return;
    }

    setIsProcessing(true);
    try {
      if (partyId) {
        await processBulkEntries(partyId, parsedEntries);
      }
      onClose();
    } catch (error) {
      console.error('Error submitting entries:', error);
      setErrors(prev => [...prev, 'Failed to process entries. Please try again.']);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Bulk Entry</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Left Column - Input Fields */}
          <div className="space-y-6">
            {/* Debit Section (Our Payments) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Payment to Party (Debit)
                </label>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Optional GST
                </span>
              </div>
              <div className="mb-2 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">Format: DD/MM/YY AMOUNT [K/GST] [REF_ID]</p>
                <p className="text-xs text-gray-500 mt-1">Examples:</p>
                <p className="text-xs text-gray-500">Basic: 13/12/24 20000</p>
                <p className="text-xs text-gray-500">Cash: 13/12/24 20000 K</p>
                <p className="text-xs text-gray-500">With GST: 13/12/24 20000 GST</p>
                <p className="text-xs text-gray-500">With Ref: 13/12/24 20000 1234</p>
                <p className="text-xs text-gray-500">Full: 13/12/24 20000 GST 1234</p>
              </div>
              <textarea
                value={debitEntries}
                onChange={(e) => handleDebitEntriesChange(e.target.value)}
                rows={8}
                className="block w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="13/12/24 20000&#10;13/12/24 20000 K&#10;13/12/24 15000 GST&#10;13/12/24 25000 1234&#10;13/12/24 30000 GST 1234"
              />
            </div>

            {/* Credit Section (Party's Bills) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Receipt from Party (Credit)
                </label>
              </div>
              <div className="mb-2 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">Format: DD/MM/YY AMOUNT [BILL_NUMBER] GR [GR_NUMBER]</p>
                <p className="text-xs text-gray-500 mt-1">Examples:</p>
                <p className="text-xs text-gray-500">Basic: 13/12/24 25000</p>
                <p className="text-xs text-gray-500">With Bill: 13/12/24 25000 BILL123 GR 302</p>
              </div>
              <textarea
                value={creditEntries}
                onChange={(e) => handleCreditEntriesChange(e.target.value)}
                rows={8}
                className="block w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="13/12/24 25000&#10;13/12/24 30000 BILL123 GR 302"
              />
            </div>
          </div>

          {/* Right Column - Preview */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-4">Preview</h4>
            <div className="border border-gray-200 rounded-md divide-y divide-gray-200">
              {/* Debit Preview */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-sm font-medium text-gray-900">Payments to Party (Debit)</h5>
                </div>
                <div className="space-y-2">
                  {parsedEntries
                    .filter(entry => entry.type === 'payment')
                    .map((entry, index) => (
                      <div 
                        key={`debit-${index}`}
                        className="text-sm text-gray-600"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span>{new Date(entry.data.date).toLocaleDateString()}</span>
                            {entry.data.refId && (
                              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                                Ref: {entry.data.refId}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-medium">₹{entry.data.amount.toLocaleString()}</div>
                            {entry.data.hasGST && (
                              <div className="text-xs text-blue-600">+GST</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  {parsedEntries.filter(e => e.type === 'payment').length === 0 && (
                    <p className="text-sm text-gray-500 italic">No payments entered</p>
                  )}
                </div>
              </div>

              {/* Credit Preview */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-sm font-medium text-gray-900">Receipts from Party (Credit)</h5>
                </div>
                <div className="space-y-2">
                  {parsedEntries
                    .filter(entry => entry.type === 'bill')
                    .map((entry, index) => (
                      <div 
                        key={`credit-${index}`}
                        className="text-sm text-gray-600"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <span>{new Date(entry.data.date).toLocaleDateString()}</span>
                            {entry.data.billNumber && (
                              <span className="ml-2 font-medium">#{entry.data.billNumber}</span>
                            )}
                            {entry.data.description && (
                              <span className="ml-2 text-gray-500">({entry.data.description})</span>
                            )}
                          </div>
                          <div className="font-medium">₹{entry.data.amount.toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  {parsedEntries.filter(e => e.type === 'bill').length === 0 && (
                    <p className="text-sm text-gray-500 italic">No receipts entered</p>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 bg-gray-50">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-red-600">
                    <span className="font-medium">Total Debit:</span>
                    <span>₹{parsedEntries
                      .filter(e => e.type === 'payment')
                      .reduce((sum, e) => sum + e.data.amount, 0)
                      .toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="font-medium">Total Credit:</span>
                    <span>₹{parsedEntries
                      .filter(e => e.type === 'bill')
                      .reduce((sum, e) => sum + e.data.amount, 0)
                      .toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div className="mt-4 p-4 bg-red-50 rounded-md">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Please fix the following errors:
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <ul className="list-disc pl-5 space-y-1">
                        {errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isProcessing || errors.length > 0 || parsedEntries.length === 0}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Process Entries'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkEntryModal;
