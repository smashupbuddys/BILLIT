import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ArrowUpRight, ArrowDownRight, X, Trash2, Pencil } from 'lucide-react';
import db, { generateId } from '../lib/db';

interface CreditSale {
  id: string;
  customer_name: string;
  amount: number;
  date: string;
  paid_amount: number;
  description?: string;
  created_at: string;
  payment_frequency?: 'daily' | 'weekly' | 'monthly';
  next_payment_date?: string;
  credit_increase_description?: string;
}

const CreditSales: React.FC = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState<CreditSale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSale, setNewSale] = useState({
    customer_name: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    payment_frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    next_payment_date: new Date().toISOString().split('T')[0]
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<CreditSale | null>(null);
  const [editSaleData, setEditSaleData] = useState<CreditSale>({
    id: '',
    customer_name: '',
    amount: 0,
    date: '',
    paid_amount: 0,
    description: '',
    created_at: '',
    payment_frequency: 'weekly',
    next_payment_date: '',
    credit_increase_description: ''
  });

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      setIsLoading(true);
      const dbInstance = await db.init();
      const result = dbInstance.exec(`
        SELECT * FROM credit_sales 
        ORDER BY date DESC, created_at DESC
      `);
      
      if (result.length > 0) {
        const sales = result[0].values.map((row: any[]) => ({
          id: row[0],
          customer_name: row[1],
          amount: row[2],
          date: row[3],
          paid_amount: row[4] || 0,
          description: row[5],
          created_at: row[6],
          payment_frequency: row[7],
          next_payment_date: row[8],
          credit_increase_description: row[9]
        }));
        setSales(sales);
      } else {
        setSales([]);
      }
    } catch (error) {
      console.error('Error loading credit sales:', error);
    } finally {
      setIsLoading(false);
    }
  };

const handleAddSale = async () => {
  // Validate inputs with more robust checking
  if (!newSale.customer_name || newSale.customer_name.trim() === '') {
    alert('Customer name is required');
    return;
  }

  if (!newSale.amount || isNaN(parseFloat(newSale.amount)) || parseFloat(newSale.amount) <= 0) {
    alert('Valid amount is required');
    return;
  }

  if (!newSale.date) {
    alert('Date is required');
    return;
  }

  try {
    const dbInstance = await db.init();
    const id = generateId();

    // Detailed logging of input values
    console.log('Adding Credit Sale:', {
      id,
      customer_name: newSale.customer_name.trim(),
      amount: parseFloat(newSale.amount),
      date: newSale.date,
      description: newSale.description.trim() || null,
      payment_frequency: newSale.payment_frequency,
      next_payment_date: newSale.next_payment_date
    });

    // Begin transaction
    dbInstance.exec('BEGIN TRANSACTION');

    try {
      // Modify the INSERT query to match exact column names and order
const insertQuery = `
  INSERT INTO credit_sales (
    id, customer_name, amount, date, paid_amount, description, 
    payment_frequency, next_payment_date, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`;

const params = [
  id,
  newSale.customer_name.trim(),
  parseFloat(newSale.amount),
  newSale.date,
  0,  // Initial paid_amount
  newSale.description.trim() || null,
  newSale.payment_frequency,
  newSale.next_payment_date || null
];

      // Log the exact SQL query and parameters
      console.log('SQL Query:', insertQuery);
      console.log('SQL Params:', params);

      // Attempt to run the insertion
      dbInstance.run(insertQuery, params);

      // Commit transaction
      dbInstance.exec('COMMIT');

      // Save changes to localStorage
      db.save();

      // Reset form
      setShowAddModal(false);
      setNewSale({
        customer_name: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        payment_frequency: 'weekly',
        next_payment_date: new Date().toISOString().split('T')[0]
      });

      // Reload sales list
      await loadSales();
    } catch (insertError) {
      // Rollback transaction
      dbInstance.exec('ROLLBACK');
      
      // Log detailed error information
      console.error('Insertion Error:', insertError);
      console.error('Error Details:', {
        message: insertError.message,
        stack: insertError.stack
      });

      // Show user-friendly error message
      alert(`Failed to add credit sale: ${insertError.message}`);
    }
  } catch (initError) {
    console.error('Database Initialization Error:', initError);
    alert('Error initializing database. Please try again.');
  }
};

  const handleDeleteSale = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this credit sale? This will also delete all associated payments.')) {
      try {
        const dbInstance = await db.init();

        dbInstance.exec('BEGIN TRANSACTION;');

        try {
          // Delete associated payments first
          dbInstance.run('DELETE FROM credit_payments WHERE credit_sale_id = ?', [id]);
          
          // Then delete the credit sale
          dbInstance.run('DELETE FROM credit_sales WHERE id = ?', [id]);
          
          dbInstance.exec('COMMIT');
          db.save();
          
          await loadSales();
        } catch (error) {
          dbInstance.exec('ROLLBACK');
          throw error;
        }
      } catch (error) {
        console.error('Error deleting credit sale:', error);
        alert('Error deleting credit sale. Please try again.');
      }
    }
  };

  const handleEditSale = async () => {
    if (!selectedSale || !editSaleData.amount || !editSaleData.date) {
      alert('Customer name, amount, and date are required');
      return;
    }

    try {
      const dbInstance = await db.init();
      dbInstance.exec('BEGIN TRANSACTION');

      try {
        dbInstance.run(`
          UPDATE credit_sales
          SET customer_name = ?, amount = ?, date = ?, paid_amount = ?, description = ?, 
              payment_frequency = ?, next_payment_date = ?, updated_at = CURRENT_TIMESTAMP, credit_increase_description = ?
          WHERE id = ?
        `, [
          editSaleData.customer_name,
          parseFloat(editSaleData.amount),
          editSaleData.date,
          editSaleData.paid_amount,
          editSaleData.description,
          editSaleData.payment_frequency,
          editSaleData.next_payment_date,
          editSaleData.credit_increase_description,
          selectedSale.id
        ]);

        dbInstance.exec('COMMIT');
        db.save();
        setShowEditModal(false);
        setSelectedSale(null);
        await loadSales();
      } catch (error) {
        dbInstance.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error editing credit sale:', error);
      alert('Error editing credit sale. Please try again.');
    }
  };

  const filteredSales = sales.filter(sale =>
    sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCredit = sales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalPaid = sales.reduce((sum, sale) => sum + (sale.paid_amount || 0), 0);
  const totalPending = totalCredit - totalPaid;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Credit Buyers (Udhaar)</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Credit Sale
        </button>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Total Credit */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Credit</p>
              <p className="text-xl font-semibold text-gray-900">₹{totalCredit.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <ArrowUpRight className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Total Paid */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Paid</p>
              <p className="text-xl font-semibold text-green-600">₹{totalPaid.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <ArrowDownRight className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Total Pending */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pending</p>
              <p className="text-xl font-semibold text-red-600">₹{totalPending.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <ArrowUpRight className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Credit Sales Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer Name
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remaining
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credit Increase Description
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSales.map((sale) => (
                <tr 
                  key={sale.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/credit-sales/${sale.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{sale.customer_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(sale.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{sale.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    ₹{sale.paid_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      sale.amount > sale.paid_amount
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      ₹{(sale.amount - sale.paid_amount).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sale.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sale.credit_increase_description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSale(sale);
                        setShowEditModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSale(sale.id);
                      }}
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

      {/* Add Sale Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">New Credit Sale</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSale.customer_name}
                  onChange={(e) => setNewSale({ ...newSale, customer_name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newSale.date}
                  onChange={(e) => setNewSale({ ...newSale, date: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={newSale.amount}
                  onChange={(e) => setNewSale({ ...newSale, amount: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <input
                  type="text"
                  value={newSale.description}
                  onChange={(e) => setNewSale({ ...newSale, description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter description (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Payment Frequency
                </label>
                <select
                  value={newSale.payment_frequency}
                  onChange={(e) => setNewSale({ ...newSale, payment_frequency: e.target.value as 'daily' | 'weekly' | 'monthly' })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Next Payment Date
                </label>
                <input
                  type="date"
                  value={newSale.next_payment_date}
                  onChange={(e) => setNewSale({ ...newSale, next_payment_date: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSale}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sale Modal */}
      {showEditModal && selectedSale && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Credit Sale</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editSaleData.customer_name}
                  onChange={(e) => setEditSaleData({ ...editSaleData, customer_name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={editSaleData.date}
                  onChange={(e) => setEditSaleData({ ...editSaleData, date: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={editSaleData.amount}
                  onChange={(e) => setEditSaleData({ ...editSaleData, amount: parseFloat(e.target.value) })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Paid Amount
                </label>
                <input
                  type="number"
                  value={editSaleData.paid_amount}
                  onChange={(e) => setEditSaleData({ ...editSaleData, paid_amount: parseFloat(e.target.value) })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter paid amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <input
                  type="text"
                  value={editSaleData.description}
                  onChange={(e) => setEditSaleData({ ...editSaleData, description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter description (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Payment Frequency
                </label>
                <select
                  value={editSaleData.payment_frequency}
                  onChange={(e) => setEditSaleData({ ...editSaleData, payment_frequency: e.target.value as 'daily' | 'weekly' | 'monthly' })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Next Payment Date
                </label>
                <input
                  type="date"
                  value={editSaleData.next_payment_date}
                  onChange={(e) => setEditSaleData({ ...editSaleData, next_payment_date: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Credit Increase Description
                </label>
                <input
                  type="text"
                  value={editSaleData.credit_increase_description}
                  onChange={(e) => setEditSaleData({ ...editSaleData, credit_increase_description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter description (optional)"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowEditModal(false)}
                className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSale}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditSales;
