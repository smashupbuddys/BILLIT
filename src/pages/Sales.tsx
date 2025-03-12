import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, X, ArrowUpRight, ArrowDownRight, IndianRupee, Trash2 } from 'lucide-react';
import db, { generateId } from '../lib/db';
import CreditHistoryModal from '../components/CreditHistoryModal';
import { format } from 'date-fns';

interface Sale {
  id: string;
  date: string;
  amount: number;
  payment_mode: 'cash' | 'digital' | 'credit';
  party_name?: string;
  created_at: string;
}

interface Creditor {
  id: string;
  name: string;
  total_credit: number;
  total_paid: number;
  remaining_balance: number;
  last_transaction_date: string;
}

interface Transaction {
  id: string;
  date: string;
  type: 'sale' | 'payment';
  amount: number;
  description?: string;
  created_at: string;
}

const Sales: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreditHistory, setShowCreditHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'sales' | 'creditors'>('sales');
  const [selectedCreditor, setSelectedCreditor] = useState<{
    name: string;
    transactions: Transaction[];
    totalCredit: number;
    totalPaid: number;
  } | null>(null);
  const [newSale, setNewSale] = useState({
    amount: '',
    payment_mode: 'cash' as const,
    party_name: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    loadSales();
    loadCreditors();
  }, []);

  const loadSales = async () => {
    setIsLoading(true);
    try {
      const dbInstance = await db.init();
      const result = await dbInstance.exec(`
        SELECT 
          t.id,
          t.date,
          t.amount,
          t.payment_mode,
          p.name as party_name,
          t.created_at
        FROM transactions t
        LEFT JOIN parties p ON t.party_id = p.id
        WHERE t.type = 'sale'
        ORDER BY t.date DESC, t.created_at DESC
      `);

      if (result && result[0]?.values) {
        const salesData = result[0].values.map(row => ({
          id: row[0],
          date: row[1],
          amount: row[2],
          payment_mode: row[3],
          party_name: row[4],
          created_at: row[5]
        }));
        setSales(salesData);
      }
    } catch (error) {
      console.error('Error loading sales:', error);
      alert('Error loading sales data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCreditors = async () => {
    try {
      const dbInstance = await db.init();
      const result = await dbInstance.exec(`
        SELECT 
          p.id,
          p.name,
          COALESCE(SUM(CASE WHEN t.type = 'sale' THEN t.amount ELSE 0 END), 0) as total_credit,
          COALESCE(SUM(CASE WHEN t.type = 'payment' THEN t.amount ELSE 0 END), 0) as total_paid,
          p.current_balance as remaining_balance,
          MAX(t.date) as last_transaction_date
        FROM parties p
        LEFT JOIN transactions t ON p.id = t.party_id
        GROUP BY p.id, p.name
        HAVING total_credit > 0 OR total_paid > 0
        ORDER BY remaining_balance DESC
      `);

      if (result && result[0]?.values) {
        const creditorsData = result[0].values.map(row => ({
          id: row[0],
          name: row[1],
          total_credit: row[2],
          total_paid: row[3],
          remaining_balance: row[4],
          last_transaction_date: row[5]
        }));
        setCreditors(creditorsData);
      }
    } catch (error) {
      console.error('Error loading creditors:', error);
      alert('Error loading creditors data. Please try again.');
    }
  };

const handleDeleteSale = async (saleId: string) => {
  if (!window.confirm('Are you sure you want to delete this sale?')) {
    return;
  }

  setIsLoading(true);
  try {
    const dbInstance = await db.init();
    
    // Get sale details before deletion
    const result = dbInstance.exec(`
      SELECT 
        amount, 
        payment_mode, 
        party_id 
      FROM transactions 
      WHERE id = ? AND type = 'sale'
    `, [saleId]);

    if (!result.length || !result[0].values.length) {
      throw new Error('Sale not found');
    }

    // Start transaction
    dbInstance.run('BEGIN TRANSACTION');

    try {
      const [amount, paymentMode, partyId] = result[0].values[0];

      // If it's a credit sale, update party balance
      if (paymentMode === 'credit' && partyId) {
        dbInstance.run(`
          UPDATE parties
          SET current_balance = current_balance - ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [amount, partyId]);
      }

      // Delete the sale
      dbInstance.run('DELETE FROM transactions WHERE id = ?', [saleId]);
      
      // Commit transaction
      dbInstance.run('COMMIT');
      
      // Save changes to localStorage
      db.save();
      
      // Reload data
      await loadSales();
      await loadCreditors();
      
    } catch (error) {
      dbInstance.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error deleting sale:', error);
    alert('Error deleting sale. Please try again.');
  } finally {
    setIsLoading(false);
  }
};

  const handleAddSale = async () => {
    if (!newSale.amount || !newSale.date) {
      alert('Amount and date are required');
      return;
    }

    if (newSale.payment_mode === 'credit' && !newSale.party_name.trim()) {
      alert('Please enter a party name for credit sales');
      return;
    }

    setIsLoading(true);
    const dbInstance = await db.init();

    try {
      const saleId = generateId();
      
      await dbInstance.run('BEGIN TRANSACTION');

      try {
        let partyId = null;
        
        if (newSale.payment_mode === 'credit') {
          // Check if party exists
          const partyResult = await dbInstance.exec(`
            SELECT id FROM parties WHERE LOWER(name) = LOWER(?)
          `, [newSale.party_name.trim()]);

          if (partyResult.length > 0 && partyResult[0].values.length > 0) {
            partyId = partyResult[0].values[0][0];
          } else {
            // Create new party
            partyId = generateId();
            await dbInstance.run(`
              INSERT INTO parties (id, name, current_balance, created_at, updated_at)
              VALUES (?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [partyId, newSale.party_name.trim()]);
          }
        }

        // Add the sale transaction
        await dbInstance.run(`
          INSERT INTO transactions (
            id, date, type, amount, payment_mode, party_id, created_at
          ) VALUES (?, ?, 'sale', ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          saleId,
          newSale.date,
          parseFloat(newSale.amount),
          newSale.payment_mode,
          partyId
        ]);

        // Update party balance for credit sales
        if (newSale.payment_mode === 'credit' && partyId) {
          await dbInstance.run(`
            UPDATE parties
            SET current_balance = current_balance + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [parseFloat(newSale.amount), partyId]);
        }

        await dbInstance.run('COMMIT');

        // Reset form and close modal
        setNewSale({
          amount: '',
          payment_mode: 'cash',
          party_name: '',
          date: format(new Date(), 'yyyy-MM-dd')
        });
        setShowAddModal(false);

        // Reload data
        await loadSales();
        await loadCreditors();
      } catch (error) {
        await dbInstance.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error adding sale:', error);
      alert('Error adding sale. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowCreditHistory = async (creditor: Creditor) => {
    try {
      const dbInstance = await db.init();
      const result = await dbInstance.exec(`
        SELECT 
          id, date, type, amount, description, created_at
        FROM transactions
        WHERE party_id = ?
        ORDER BY date DESC, created_at DESC
      `, [creditor.id]);

      if (result && result[0]?.values) {
        const transactions = result[0].values.map(row => ({
          id: row[0],
          date: row[1],
          type: row[2],
          amount: row[3],
          description: row[4],
          created_at: row[5]
        }));

        setSelectedCreditor({
          name: creditor.name,
          transactions,
          totalCredit: creditor.total_credit,
          totalPaid: creditor.total_paid
        });
        setShowCreditHistory(true);
      }
    } catch (error) {
      console.error('Error loading credit history:', error);
      alert('Error loading credit history. Please try again.');
    }
  };

  const handleDateFilter = (filter: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (filter) {
      case 'today':
        start = today;
        break;
      case 'yesterday':
        start.setDate(today.getDate() - 1);
        end = start;
        break;
      case 'week':
        start.setDate(today.getDate() - 7);
        break;
      case 'month':
        start.setMonth(today.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(today.getMonth() - 3);
        break;
      case 'halfYear':
        start.setMonth(today.getMonth() - 6);
        break;
      case 'year':
        start.setFullYear(today.getFullYear() - 1);
        break;
      default:
        return;
    }

    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };


  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const matchesSearch = sale.party_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.amount.toString().includes(searchTerm);
      const matchesPaymentMode = selectedPaymentMode === 'all' || sale.payment_mode === selectedPaymentMode;
      const matchesDateRange = (!startDate || sale.date >= startDate) && (!endDate || sale.date <= endDate);
      
      return matchesSearch && matchesPaymentMode && matchesDateRange;
    });
  }, [sales, searchTerm, selectedPaymentMode, startDate, endDate]);

  const filteredCreditors = useMemo(() => {
    return creditors.filter(creditor =>
      creditor.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [creditors, searchTerm]);

  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalCash = filteredSales
    .filter(sale => sale.payment_mode === 'cash')
    .reduce((sum, sale) => sum + sale.amount, 0);
  const totalDigital = filteredSales
    .filter(sale => sale.payment_mode === 'digital')
    .reduce((sum, sale) => sum + sale.amount, 0);
  const totalCredit = filteredSales
    .filter(sale => sale.payment_mode === 'credit')
    .reduce((sum, sale) => sum + sale.amount, 0);

  return (
    <div className="space-y-6 relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Sales</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={isLoading}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Sale
        </button>
      </div>

      {/* Tabs */}
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
            disabled={isLoading}
          >All Sales
          </button>
          <button
            onClick={() => setActiveTab('creditors')}
            className={`
              pb-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'creditors'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
            disabled={isLoading}
          >
            Credit Buyers
          </button>
        </nav>
      </div>

{activeTab === 'sales' && (
  <>
    <div className="flex flex-wrap gap-2 mb-4">
      {['today', 'yesterday', 'week', 'month', 'quarter', 'halfYear', 'year'].map((filter) => (
        <button
          key={filter}
          onClick={() => handleDateFilter(filter)}
          className="px-3 py-1 border rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
          disabled={isLoading}
        >
          {filter === 'week' ? 'This Week' :
           filter === 'month' ? 'This Month' :
           filter === 'quarter' ? 'Last 3 Months' :
           filter === 'halfYear' ? 'Last 6 Months' :
           filter === 'year' ? 'This Year' :
           filter.charAt(0).toUpperCase() + filter.slice(1)}
        </button>
      ))}
      <button
        onClick={() => {
          setStartDate('');
          setEndDate('');
        }}
        className="px-3 py-1 border rounded-md text-sm hover:bg-gray-50 text-blue-600 border-blue-200 hover:border-blue-300"
        disabled={isLoading}
      >
        Clear Filter
      </button>
    </div>

    {/* Custom Date Range Filter */}
    <div className="flex flex-wrap items-center gap-4 mb-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">From:</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border border-gray-300 rounded-md shadow-sm py-1.5 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          max={endDate || undefined}
          disabled={isLoading}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">To:</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border border-gray-300 rounded-md shadow-sm py-1.5 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          min={startDate || undefined}
          disabled={isLoading}
        />
      </div>
      {(startDate || endDate) && (
        <div className="flex items-center text-sm text-gray-500">
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md">
            Showing sales from {startDate ? new Date(startDate).toLocaleDateString() : 'the beginning'} 
            {' '}to{' '}
            {endDate ? new Date(endDate).toLocaleDateString() : 'now'}
          </span>
        </div>
      )}
    </div>
  </>
)}


      {activeTab === 'sales' ? (
        <>
          {/* Search and Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Search sales..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div>
                  <select
                    value={selectedPaymentMode}
                    onChange={(e) => setSelectedPaymentMode(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    disabled={isLoading}
                  >
                    <option value="all">All Modes</option>
                    <option value="cash">Cash</option>
                    <option value="digital">Digital</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Total Sales */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Sales</p>
                  <p className="text-xl font-semibold text-gray-900">₹{totalSales.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <IndianRupee className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Cash Sales */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cash Sales</p>
                  <p className="text-xl font-semibold text-green-600">₹{totalCash.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <IndianRupee className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Digital Sales */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Digital Sales</p>
                  <p className="text-xl font-semibold text-purple-600">₹{totalDigital.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <IndianRupee className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Sales Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Mode
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Party Name
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(sale.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{sale.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          sale.payment_mode === 'cash'
                            ? 'bg-green-100 text-green-800'
                            : sale.payment_mode === 'digital'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {sale.payment_mode.charAt(0).toUpperCase() + sale.payment_mode.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sale.party_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleDeleteSale(sale.id)}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          disabled={isLoading}
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
        </>
      ) : (
        <>
          {/* Creditors Search */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search creditors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Creditors Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Party Name
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Credit
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Paid
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remaining Balance
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Transaction
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCreditors.map((creditor) => (
                    <tr
                      key={creditor.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => !isLoading && handleShowCreditHistory(creditor)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {creditor.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{creditor.total_credit.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        ₹{creditor.total_paid.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          creditor.remaining_balance > 0
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          ₹{Math.abs(creditor.remaining_balance).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(creditor.last_transaction_date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add Sale Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">New Sale</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-500"
                disabled={isLoading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  value={newSale.date}
                  onChange={(e) => setNewSale({ ...newSale, date: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Amount
                </label>
                <input
                  type="number"
                  value={newSale.amount}
                  onChange={(e) => setNewSale({ ...newSale, amount: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter amount"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Payment Mode
                </label>
                <select
                  value={newSale.payment_mode}
onChange={(e) => setNewSale({ 
                    ...newSale, 
                    payment_mode: e.target.value as 'cash' | 'digital' | 'credit',
                    // Reset party name if not credit
                    party_name: e.target.value === 'credit' ? newSale.party_name : ''
                  })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  disabled={isLoading}
                >
                  <option value="cash">Cash</option>
                  <option value="digital">Digital</option>
                  <option value="credit">Credit</option>
                </select>
              </div>

              {newSale.payment_mode === 'credit' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Party Name
                  </label>
                  <input
                    type="text"
                    value={newSale.party_name}
                    onChange={(e) => setNewSale({ ...newSale, party_name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter party name"
                    disabled={isLoading}
                  />
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleAddSale}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={isLoading}
              >
                Add Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credit History Modal */}
      {showCreditHistory && selectedCreditor && (
        <CreditHistoryModal
          show={showCreditHistory}
          onClose={() => {
            setShowCreditHistory(false);
            setSelectedCreditor(null);
          }}
          customerName={selectedCreditor.name}
          transactions={selectedCreditor.transactions}
          totalCredit={selectedCreditor.totalCredit}
          totalPaid={selectedCreditor.totalPaid}
        />
      )}
    </div>
  );
};

export default Sales;
