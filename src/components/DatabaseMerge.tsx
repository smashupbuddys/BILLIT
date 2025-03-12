import React, { useState, useRef, useEffect } from 'react';
import { Upload, AlertTriangle, Check, X, PlusCircle } from 'lucide-react';
import { mergeDatabases, handleDuplicate } from '../lib/db/merge';
import db, { generateId } from '../lib/db';
import initSqlJs from 'sql.js';

interface DuplicateEntry {
  type: 'sale' | 'bill' | 'expense' | 'credit_sale' | 'staff';
  sourceData: any;
  existingData: any;
}

const DatabaseMerge: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateEntry[]>([]);
  const [stats, setStats] = useState<{ added: number; errors: string[] } | null>(null);
  const [previewEntries, setPreviewEntries] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'sales' | 'bills' | 'expenses' | 'credit_sales' | 'staff'>('sales');
  const [mergeTargets, setMergeTargets] = useState<Record<string, string>>({});
  const [nonDuplicateEntries, setNonDuplicateEntries] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      
      const result = await mergeDatabases(data);
      
      setDuplicates(result.duplicates);
      setStats({
        added: result.added,
        errors: result.errors
      });

      // Extract preview data
      const previewData = result.duplicates.map(duplicate => ({
        type: duplicate.type,
        sourceData: duplicate.sourceData,
        existingData: duplicate.existingData
      }));
      setPreviewEntries(previewData);

      // Extract non-duplicate entries
      const allEntries = await getAllEntries(data);
      setNonDuplicateEntries(allEntries);
      setImportErrors([]); // Clear any previous errors
    } catch (error) {
      console.error('Error processing database:', error);
      setStats({
        added: 0,
        errors: ['Failed to process database file', error.message]
      });
      setImportErrors(['Failed to process database file', error.message]);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDuplicateAction = async (index: number, action: 'skip' | 'add') => {
    const duplicate = duplicates[index];
    const success = await handleDuplicate(duplicate, action);
    
    if (success) {
      const newDuplicates = [...duplicates];
      newDuplicates.splice(index, 1);
      setDuplicates(newDuplicates);
      
      if (action === 'add') {
        setStats(prev => prev ? {
          ...prev,
          added: prev.added + 1
        } : null);
      }
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const handleMergeTargetChange = (index: number, targetId: string) => {
    setMergeTargets(prev => ({
      ...prev,
      [index]: targetId
    }));
  };

  const handleAddNonDuplicateEntries = async () => {
    setIsProcessing(true);
    try {
      const targetDb = await db.init();
      let addedCount = 0;
      const errors: string[] = [];

      for (const entry of filteredNonDuplicateEntries) {
        try {
          const newId = generateId();
          if (entry.type === 'sale') {
            targetDb.run(`
              INSERT INTO transactions (
                id, date, type, amount, payment_mode,
                has_gst, description, party_id, created_at
              ) VALUES (?, ?, 'sale', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [
              newId, entry.sourceData.date, entry.sourceData.amount, entry.sourceData.payment_mode,
              entry.sourceData.has_gst, entry.sourceData.description, entry.sourceData.party_id
            ]);
            addedCount++;
          } else if (entry.type === 'bill') {
            targetDb.run(`
              INSERT INTO transactions (
                id, date, type, amount, has_gst,
                bill_number, description, party_id, created_at
              ) VALUES (?, ?, 'bill', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [
              newId, entry.sourceData.date, entry.sourceData.amount, entry.sourceData.has_gst,
              entry.sourceData.bill_number, entry.sourceData.description, entry.sourceData.party_id
            ]);
            addedCount++;
          } else if (entry.type === 'expense') {
            targetDb.run(`
              INSERT INTO transactions (
                id, date, type, amount, expense_category,
                has_gst, description, party_id, staff_id, created_at
              ) VALUES (?, ?, 'expense', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [
              newId, entry.sourceData.date, entry.sourceData.amount, entry.sourceData.expense_category,
              entry.sourceData.has_gst, entry.sourceData.description, entry.sourceData.party_id, entry.sourceData.staff_id
            ]);
            addedCount++;
          } else if (entry.type === 'credit_sale') {
            targetDb.run(`
              INSERT INTO credit_sales (
                id, customer_name, amount, date, paid_amount, description, payment_frequency, next_payment_date, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [
              newId, entry.sourceData.customer_name, entry.sourceData.amount, entry.sourceData.date, entry.sourceData.paid_amount, entry.sourceData.description, entry.sourceData.payment_frequency, entry.sourceData.next_payment_date
            ]);
            addedCount++;
          } else if (entry.type === 'staff') {
            targetDb.run(`
              INSERT INTO staff (
                id, name, role, salary, joining_date, contact_number, address, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [
              newId, entry.sourceData.name, entry.sourceData.role, entry.sourceData.salary, entry.sourceData.joining_date, entry.sourceData.contact_number, entry.sourceData.address
            ]);
            addedCount++;
          }
        } catch (error) {
          errors.push(`Error adding entry ${entry.type}: ${error}`);
        }
      }
      db.save();
      setStats(prev => prev ? { ...prev, added: prev.added + addedCount } : null);
      setNonDuplicateEntries(prev => prev.filter(entry => !filteredNonDuplicateEntries.includes(entry)));
      setImportErrors(errors);
    } catch (error) {
      console.error('Error adding non-duplicate entries:', error);
      setStats(prev => prev ? { ...prev, errors: [...prev.errors, 'Failed to add non-duplicate entries'] } : null);
      setImportErrors(['Failed to add non-duplicate entries', error.message]);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredDuplicates = duplicates.filter(duplicate => duplicate.type === activeTab);
  const filteredNonDuplicateEntries = nonDuplicateEntries.filter(entry => entry.type === activeTab);

  const getAllEntries = async (sourceDbData: Uint8Array) => {
    try {
      const SQL = await initSqlJs({
        locateFile: file => `https://sql.js.org/dist/${file}`
      });
      const sourceDb = new SQL.Database(sourceDbData);
      const allEntries: any[] = [];

      const tables = ['transactions', 'staff', 'credit_sales'];
      for (const table of tables) {
        const result = sourceDb.exec(`SELECT * FROM ${table}`);
        if (result.length > 0) {
          result[0].values.forEach(row => {
            let entryType: 'sale' | 'bill' | 'expense' | 'credit_sale' | 'staff' = 'sale';
            if (table === 'transactions') {
              entryType = row[2];
            } else if (table === 'credit_sales') {
              entryType = 'credit_sale';
            } else if (table === 'staff') {
              entryType = 'staff';
            }
            allEntries.push({
              type: entryType,
              sourceData: row,
            });
          });
        }
      }
      return allEntries;
    } catch (error) {
      console.error('Error in getAllEntries:', error);
      throw new Error('Failed to extract entries from source database');
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Import Database</h3>
          <label className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50">
            <Upload className="w-4 h-4 mr-2" />
            Select Database File
            <input
              type="file"
              accept=".db"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isProcessing}
              ref={fileInputRef}
            />
          </label>
        </div>

        {isProcessing && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-sm text-gray-600">Processing database...</span>
          </div>
        )}

        {stats && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Added {stats.added} new entries
                </p>
                <p className="text-sm text-gray-500">
                  Found {duplicates.length} potential duplicates
                </p>
              </div>
              {stats.errors.length > 0 && (
                <div className="text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              )}
            </div>

            {stats.errors.length > 0 && (
              <div className="p-4 bg-red-50 rounded-lg">
                <h4 className="text-sm font-medium text-red-800 mb-2">Errors occurred:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {stats.errors.map((error, index) => (
                    <li key={index} className="text-sm text-red-600">{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      {(duplicates.length > 0 || nonDuplicateEntries.length > 0) && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('sales')}
              className={`
                pb-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'sales'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >Sales
            </button>
            <button
              onClick={() => setActiveTab('bills')}
              className={`
                pb-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'bills'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >Bills
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`
                pb-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'expenses'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >Expenses
            </button>
            <button
              onClick={() => setActiveTab('credit_sales')}
              className={`
                pb-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'credit_sales'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >Credit Sales
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`
                pb-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'staff'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >Staff
            </button>
          </nav>
        </div>
      )}

      {/* Duplicates */}
      {filteredDuplicates.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Review Duplicates</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredDuplicates.map((duplicate, index) => (
              <div key={index} className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {duplicate.type.charAt(0).toUpperCase() + duplicate.type.slice(1).replace('_', ' ')}
                    </p>
                    <div className="mt-2 space-y-2">
                      <div className="flex space-x-6">
                        <div>
                          <p className="text-xs text-gray-500">Date</p>
                          <p className="text-sm text-gray-900">{formatDate(duplicate.sourceData.date)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Amount</p>
                          <p className="text-sm text-gray-900">{formatAmount(duplicate.sourceData.amount)}</p>
                        </div>
                        {duplicate.type === 'bill' && duplicate.sourceData.bill_number && (
                          <div>
                            <p className="text-xs text-gray-500">Bill Number</p>
                            <p className="text-sm text-gray-900">{duplicate.sourceData.bill_number}</p>
                          </div>
                        )}
                        {duplicate.type === 'expense' && duplicate.sourceData.expense_category && (
                          <div>
                            <p className="text-xs text-gray-500">Category</p>
                            <p className="text-sm text-gray-900">{duplicate.sourceData.expense_category}</p>
                          </div>
                        )}
                        {duplicate.type === 'sale' && duplicate.sourceData.party_name && (
                          <div>
                            <p className="text-xs text-gray-500">Party</p>
                            <p className="text-sm text-gray-900">{duplicate.sourceData.party_name}</p>
                          </div>
                        )}
                        {duplicate.type === 'credit_sale' && duplicate.sourceData.customer_name && (
                          <div>
                            <p className="text-xs text-gray-500">Customer</p>
                            <p className="text-sm text-gray-900">{duplicate.sourceData.customer_name}</p>
                          </div>
                        )}
                        {duplicate.type === 'staff' && duplicate.sourceData.name && (
                          <div>
                            <p className="text-xs text-gray-500">Staff</p>
                            <p className="text-sm text-gray-900">{duplicate.sourceData.name}</p>
                          </div>
                        )}
                      </div>
                      {duplicate.sourceData.description && (
                        <p className="text-sm text-gray-500">{duplicate.sourceData.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDuplicateAction(index, 'skip')}
                      className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDuplicateAction(index, 'add')}
                      className="inline-flex items-center p-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-xs font-medium text-gray-500 mb-2">Existing Entry:</p>
                  <div className="flex space-x-6">
                    <div>
                      <p className="text-xs text-gray-500">Date</p>
                      <p className="text-sm text-gray-900">{formatDate(duplicate.existingData.date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Amount</p>
                      <p className="text-sm text-gray-900">{formatAmount(duplicate.existingData.amount)}</p>
                    </div>
                    {duplicate.type === 'bill' && duplicate.existingData.bill_number && (
                      <div>
                        <p className="text-xs text-gray-500">Bill Number</p>
                        <p className="text-sm text-gray-900">{duplicate.existingData.bill_number}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Non-Duplicate Entries */}
      {filteredNonDuplicateEntries.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">New Entries</h3>
              <button
                onClick={handleAddNonDuplicateEntries}
                disabled={isProcessing}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Add All
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredNonDuplicateEntries.map((entry, index) => (
              <div key={index} className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {entry.type.charAt(0).toUpperCase() + entry.type.slice(1).replace('_', ' ')}
                    </p>
                    <div className="mt-2 space-y-2">
                      <div className="flex space-x-6">
                        <div>
                          <p className="text-xs text-gray-500">Date</p>
                          <p className="text-sm text-gray-900">{formatDate(entry.sourceData.date)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Amount</p>
                          <p className="text-sm text-gray-900">{formatAmount(entry.sourceData.amount)}</p>
                        </div>
                        {entry.type === 'bill' && entry.sourceData.bill_number && (
                          <div>
                            <p className="text-xs text-gray-500">Bill Number</p>
                            <p className="text-sm text-gray-900">{entry.sourceData.bill_number}</p>
                          </div>
                        )}
                        {entry.type === 'expense' && entry.sourceData.expense_category && (
                          <div>
                            <p className="text-xs text-gray-500">Category</p>
                            <p className="text-sm text-gray-900">{entry.sourceData.expense_category}</p>
                          </div>
                        )}
                        {entry.type === 'sale' && entry.sourceData.party_name && (
                          <div>
                            <p className="text-xs text-gray-500">Party</p>
                            <p className="text-sm text-gray-900">{entry.sourceData.party_name}</p>
                          </div>
                        )}
                        {entry.type === 'credit_sale' && entry.sourceData.customer_name && (
                          <div>
                            <p className="text-xs text-gray-500">Customer</p>
                            <p className="text-sm text-gray-900">{entry.sourceData.customer_name}</p>
                          </div>
                        )}
                        {entry.type === 'staff' && entry.sourceData.name && (
                          <div>
                            <p className="text-xs text-gray-500">Staff</p>
                            <p className="text-sm text-gray-900">{entry.sourceData.name}</p>
                          </div>
                        )}
                      </div>
                      {entry.sourceData.description && (
                        <p className="text-sm text-gray-500">{entry.sourceData.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseMerge;
