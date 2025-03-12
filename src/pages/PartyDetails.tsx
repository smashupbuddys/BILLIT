import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Trash2, AlertTriangle, ArrowUpRight, RefreshCw, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar } from 'recharts';
import db, { generateId } from '../lib/db';
import { addTransaction, deleteTransaction, processBulkEntries, fixAllPartiesBalances, recalculatePartyBalance } from '../lib/db/operations';
import BulkEntryModal from '../components/BulkEntryModal';
import { SparkLineChart } from '../components/metrics';

interface Party {
  id: string;
  name: string;
  credit_limit: number;
  current_balance: number;
  contact_person?: string;
  phone?: string;
  address?: string;
  gst_number?: string;
  created_at: string;
  updated_at: string;
}

interface Transaction {
  id: string;
  date: string;
  type: 'bill' | 'payment';
  amount: number;
  bill_number?: string;
  has_gst: boolean;
  description?: string;
  running_balance: number;
  created_at: string;
}

const calculateGSTAmount = (amount: number) => {
  const baseAmount = Math.round((amount / 1.03) * 100) / 100;
  const gstAmount = Math.round((amount - baseAmount) * 100) / 100;
  return { baseAmount, gstAmount };
};

const PartyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [party, setParty] = useState<Party | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [fixStatus, setFixStatus] = useState<string>('Ready');
  const [showOnlyWithGR, setShowOnlyWithGR] = useState<boolean>(false);

  useEffect(() => {
    if (id) {
      loadPartyDetails();
      loadTransactions();
    }
  }, [id, startDate, endDate, showOnlyWithGR]);

  const loadPartyDetails = async () => {
    try {
      const dbInstance = await db.init();
      const result = dbInstance.exec('SELECT * FROM parties WHERE id = ?', [id]);

      if (result.length > 0 && result[0].values.length > 0) {
        const row = result[0].values[0];
        setParty({
          id: row[0],
          name: row[1],
          credit_limit: row[2],
          current_balance: row[3],
          contact_person: row[4],
          phone: row[5],
          address: row[6],
          gst_number: row[7],
          created_at: row[8],
          updated_at: row[9],
        });
      } else {
        setParty(null);
      }
    } catch (error) {
      console.error('Error loading party details:', error);
    }
  };

const loadTransactions = async () => {
  try {
    setIsLoading(true);
    const dbInstance = await db.init();
  let query = `
    WITH ordered_transactions AS (
      SELECT 
        t.id,
        t.date,
        CASE 
          WHEN t.type = 'expense' AND t.expense_category = 'party_payment' THEN 'payment'
          WHEN t.type = 'bill' THEN 'bill'
          ELSE t.type 
        END as type,
        t.amount,
        t.has_gst,
        t.bill_number,
        t.description,
        t.created_at
      FROM transactions t
      WHERE t.party_id = ?
      AND (t.type = 'bill' OR (t.type = 'expense' AND t.expense_category = 'party_payment'))
      ${startDate && endDate ? 'AND t.date BETWEEN ? AND ?' : startDate ? 'AND t.date >= ?' : endDate ? 'AND t.date <= ?' : ''}
      ${showOnlyWithGR ? 'AND t.bill_number IS NOT NULL' : ''}
      ORDER BY t.date ASC
    )
    SELECT * FROM ordered_transactions
  `;

    const params = [id];
    if (startDate && endDate) {
      params.push(startDate, endDate);
    } else if (startDate) {
      params.push(startDate);
    } else if (endDate) {
      params.push(endDate);
    }

    const result = await db.exec(query, params);

    if (result.length > 0) {
      let runningBalance = 0;
      // Process in chronological order
      const txns = result[0].values.map((row: any) => {
        const [id, date, type, amount, has_gst, bill_number, description, created_at] = row;
        const numAmount = Number(amount || 0);
        const { baseAmount, gstAmount } = calculateGSTAmount(numAmount, has_gst);

        // Calculate running balance in chronological order
        if (type === 'bill') {
          runningBalance += numAmount;
        } else if (type === 'payment') {
          runningBalance -= numAmount;
        }

        return {
          id,
          date,
          type,
          amount: numAmount,
          has_gst,
          bill_number,
          description,
          created_at,
          baseAmount,
          gstAmount,
          running_balance: runningBalance
        };
      });

      // Reverse the order for display (newest first)
      setTransactions([...txns].reverse());
    } else {
      setTransactions([]);
    }
  } catch (error) {
    console.error('Error loading transactions:', error);
  } finally {
    setIsLoading(false);
  }
};
	
  const handleFixBalances = async () => {
    if (isSaving) return;
    setFixStatus('Reordering Transactions...');
    setIsSaving(true);
    try {
      const dbInstance = await db.init();
      const transactionsResult = await dbInstance.exec(
        'SELECT id, date, created_at FROM transactions WHERE party_id = ? ORDER BY date ASC, created_at ASC',
        [id]
      );

      if (transactionsResult.length > 0 && transactionsResult[0].values.length > 0) {
        const sortedTransactions = transactionsResult[0].values.map((row: any[]) => ({
          id: row[0],
          date: row[1],
          created_at: row[2],
        }));

        for (let i = 0; i < sortedTransactions.length; i++) {
          dbInstance.run('UPDATE transactions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [sortedTransactions[i].id]);
        }
      }

      setFixStatus('Recalculating Balances...');
      await recalculatePartyBalance(id!);
      await loadTransactions();
      await loadPartyDetails();
      setFixStatus('Balances Fixed!');
      setTimeout(() => setFixStatus('Ready'), 2000);
    } catch (error) {
      console.error('Error fixing balances:', error);
      setFixStatus('Error');
      setTimeout(() => setFixStatus('Ready'), 2000);
      alert('Error fixing balances. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    setIsSaving(true);
    try {
      await deleteTransaction(id!, transactionId);
      await loadTransactions();
      await loadPartyDetails();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Error deleting transaction. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkDeleteTransactions = async () => {
    if (selectedTransactions.length === 0) {
      alert('Please select at least one transaction to delete.');
      return;
    }

    setIsSaving(true);
    try {
      const dbInstance = await db.init();
      dbInstance.run('BEGIN TRANSACTION');

      try {
        const sortedTransactions = selectedTransactions
          .map((txId) => transactions.find((t) => t.id === txId))
          .filter((t) => t !== undefined)
          .sort((a, b) => new Date(a!.date).getTime() - new Date(b!.date).getTime());

        for (const transaction of sortedTransactions) {
          if (transaction) {
            await deleteTransaction(id!, transaction.id);
          }
        }

        dbInstance.run('COMMIT');
        setSelectedTransactions([]);
        await loadTransactions();
        await loadPartyDetails();
      } catch (error) {
        dbInstance.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error deleting transactions:', error);
      alert('Error deleting transactions. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkEntry = async (entries: any[]) => {
    setIsSaving(true);
    try {
      await processBulkEntries(id!, entries);
      await loadTransactions();
      await loadPartyDetails();
      setShowBulkModal(false);
    } catch (error) {
      console.error('Error processing bulk entries:', error);
      alert('Error processing bulk entries. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteParty = async () => {
    if (!party) return;

    if (!window.confirm(`Are you sure you want to delete ${party.name} and all associated transactions?`)) {
      return;
    }

    setIsSaving(true);
    try {
      const dbInstance = await db.init();
      dbInstance.run('BEGIN TRANSACTION');

      try {
        dbInstance.run('DELETE FROM transactions WHERE party_id = ?', [id]);
        dbInstance.run('DELETE FROM parties WHERE id = ?', [id]);
        dbInstance.run('COMMIT');
        db.save();
        navigate('/parties');
      } catch (error) {
        dbInstance.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error deleting party:', error);
      alert('Error deleting party. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSelectTransaction = (transactionId: string) => {
    setSelectedTransactions((prev) =>
      prev.includes(transactionId) ? prev.filter((id) => id !== transactionId) : [...prev, transactionId]
    );
  };

  const filteredTransactions = useMemo(() => {
    return transactions;
  }, [transactions]);

  const summary = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    let gstTransactions = 0;
    let totalGSTAmount = 0;

    const transactionsWithBalance = filteredTransactions.map((t) => {
      const { baseAmount, gstAmount } = t.has_gst ? calculateGSTAmount(t.amount) : { baseAmount: t.amount, gstAmount: 0 };

      if (t.has_gst) {
        gstTransactions++;
        totalGSTAmount += gstAmount;
      }

      if (t.type === 'bill') {
        totalDebit += t.amount;
      } else {
        totalCredit += t.amount;
      }

      return {
        ...t,
        baseAmount,
        gstAmount,
      };
    });

    return {
      totalDebit,
      totalCredit,
      pendingBalance: party?.current_balance || 0,
      gstTransactions,
      totalGSTAmount,
      gstPercentage: (gstTransactions / filteredTransactions.length) * 100 || 0,
      transactionsWithBalance,
    };
  }, [filteredTransactions, party?.current_balance]);

  const chartData = useMemo(() => {
    const monthlyData: Record<string, { month: string; bills: number; payments: number; balance: number; gstAmount: number }> = {};

    filteredTransactions.forEach((t) => {
      const month = new Date(t.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          bills: 0,
          payments: 0,
          balance: t.running_balance,
          gstAmount: 0,
        };
      }

      const { gstAmount } = t.has_gst ? calculateGSTAmount(t.amount) : { gstAmount: 0 };
      monthlyData[month].gstAmount += gstAmount;

      if (t.type === 'bill') {
        monthlyData[month].bills += t.amount;
      } else {
        monthlyData[month].payments += t.amount;
      }

      monthlyData[month].balance = t.running_balance;
    });

    return Object.values(monthlyData);
  }, [filteredTransactions]);

  const handleFixChronologicalOrder = async () => {
    if (!window.confirm('This will reorder all transactions and update running balances. Continue?')) {
      return;
    }

    setIsSaving(true);
    try {
      const dbInstance = await db.init();
      const transactionsResult = await dbInstance.exec(
        'SELECT id, date, created_at FROM transactions WHERE party_id = ? ORDER BY date ASC, created_at ASC',
        [id]
      );

      if (transactionsResult.length > 0 && transactionsResult[0].values.length > 0) {
        const sortedTransactions = transactionsResult[0].values.map((row: any[]) => ({
          id: row[0],
          date: row[1],
          created_at: row[2],
        }));

        for (let i = 0; i < sortedTransactions.length; i++) {
          dbInstance.run('UPDATE transactions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [sortedTransactions[i].id]);
        }
      }

      await recalculatePartyBalance(id!);
      await loadTransactions();
      await loadPartyDetails();
      alert('Transactions reordered and balances updated successfully');
    } catch (error) {
      console.error('Error reordering transactions:', error);
      alert('Error reordering transactions. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !party) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/parties')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{party.name}</h1>
            <p className="text-sm text-gray-500">
              {party.gst_number && <span className="mr-3">GST: {party.gst_number}</span>}
              {party.contact_person && <span>Contact: {party.contact_person}</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleFixBalances}
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSaving ? 'animate-spin' : ''}`} />
            {fixStatus}
          </button>
          <button
            onClick={() => setShowBulkModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={isLoading || isSaving}
          >
            <Plus className="w-4 h-4 mr-2" />
            Bulk Entry
          </button>
          <button
            onClick={handleDeleteParty}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            disabled={isLoading || isSaving}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Party
          </button>
        </div>
      </div>

      {/* Date Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <div className="relative mt-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <Calendar className="absolute right-3 top-2 h-5 w-5 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <div className="relative mt-1">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <Calendar className="absolute right-3 top-2 h-5 w-5 text-gray-400" />
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Show only with GR filter */}
      <div className="flex items-center mb-4">
        <input
          id="showOnlyWithGR"
          type="checkbox"
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          checked={showOnlyWithGR}
          onChange={(e) => setShowOnlyWithGR(e.target.checked)}
        />
        <label htmlFor="showOnlyWithGR" className="ml-2 block text-sm text-gray-900">
          Show only bills with GR number
        </label>
      </div>

      {/* Summary and Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Total Debit (Bills)</p>
              <p className="text-xl font-semibold text-red-600">₹{summary.totalDebit.toLocaleString()}</p>
              {summary.totalGSTAmount > 0 && (
                <div className="mt-1">
                  <p className="text-sm text-gray-500">Base Amount: ₹{(summary.totalDebit - summary.totalGSTAmount).toLocaleString()}</p>
                  <p className="text-sm text-gray-500">GST Amount: ₹{summary.totalGSTAmount.toLocaleString()}</p>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Credit (Payments)</p>
              <p className="text-xl font-semibold text-green-600">₹{summary.totalCredit.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending Balance</p>
              <p className={`text-xl font-semibold ${summary.pendingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ₹{Math.abs(summary.pendingBalance).toLocaleString()}
                {summary.pendingBalance !== 0 && (
                  <span className="ml-1">{summary.pendingBalance > 0 ? 'DR' : 'CR'}</span>
                )}
              </p>
            </div>
            <div className="border-t pt-4">
              <div>
                <p className="text-sm text-gray-600">GST Summary</p>
                <p className="text-xl font-semibold text-blue-600">₹{summary.totalGSTAmount.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1">{summary.gstTransactions} GST Transactions</p>
                <p className="text-sm text-gray-500">{summary.gstPercentage.toFixed(1)}% of total transactions</p>
              </div>
            </div>
            {party.credit_limit > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm text-gray-600">Credit Limit Status</p>
                <p className="text-xl font-semibold text-gray-900">
                  {((summary.pendingBalance / party.credit_limit) * 100).toFixed(1)}% Used
                </p>
                <p className="text-sm text-gray-500">Limit: ₹{party.credit_limit.toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Transactions</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#6B7280" />
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
                <Bar dataKey="bills" name="Bills" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="payments" name="Payments" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="balance"
                  name="Running Balance"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="gstAmount"
                  name="GST"
                  stroke="#8B5CF6"
                  dot={false}
                  strokeDasharray="5 5"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Transaction History</h2>
          {selectedTransactions.length > 0 && (
            <button
              onClick={() => setShowDeleteConfirmation(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected ({selectedTransactions.length})
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={selectedTransactions.length === filteredTransactions.length && filteredTransactions.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTransactions(filteredTransactions.map((t) => t.id));
                      } else {
                        setSelectedTransactions([]);
                      }
                    }}
                  />
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Amount</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GST</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Number</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Running Balance</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {summary.transactionsWithBalance.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={selectedTransactions.includes(transaction.id)}
                      onChange={() => toggleSelectTransaction(transaction.id)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      transaction.type === 'bill'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {transaction.type === 'bill' ? 'Bill' : 'Payment'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{transaction.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{transaction.baseAmount.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {transaction.has_gst ? (
                      <span className="text-green-600">Yes</span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.bill_number || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${
                      transaction.running_balance > 0
                        ? 'text-red-600'
                        : transaction.running_balance < 0
                        ? 'text-green-600'
                        : 'text-gray-900'
                    }`}>
                      ₹{Math.abs(transaction.running_balance).toLocaleString()}
                      {transaction.running_balance !== 0 && (
                        <span className="ml-1">
                          {transaction.running_balance > 0 ? 'DR' : 'CR'}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => handleDeleteTransaction(transaction.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Entry Modal */}
      <BulkEntryModal
        show={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSubmit={handleBulkEntry}
        transactions={transactions}
        partyId={id}
      />

      {/* Delete Confirmation Modal */}  
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center">
              <div className="mr-4">
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Confirm Delete</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Are you sure you want to delete the selected transactions? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleBulkDeleteTransactions();
                  setShowDeleteConfirmation(false);
                }}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Confirm Delete  
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartyDetails;
