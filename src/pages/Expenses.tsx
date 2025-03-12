import React, { useState, useEffect } from 'react';
    import { Search, Filter, Plus, X, ArrowUpRight, ArrowDownRight, IndianRupee, Users, Trash2 } from 'lucide-react';
    import db, { generateId } from '../lib/db';

    interface Expense {
      id: string;
      date: string;
      amount: number;
      expense_category: string;
      has_gst: boolean;
      description?: string;
      party_id?: string;
      staff_id?: string;
      party_name?: string;
      staff_name?: string;
      related_name?: string;
      created_at: string;
    }

    const EXPENSE_CATEGORIES = [
      { value: 'goods_purchase', label: 'Goods Purchase' },
      { value: 'salary', label: 'Salary' },
      { value: 'advance', label: 'Advance' },
      { value: 'home', label: 'Home' },
      { value: 'rent', label: 'Rent' },
      { value: 'party_payment', label: 'Party Payment' },
      { value: 'petty', label: 'Petty Cash' },
      { value: 'poly', label: 'Poly' },
      { value: 'food', label: 'Food' }
    ];

    const Expenses: React.FC = () => {
      const [expenses, setExpenses] = useState<Expense[]>([]);
      const [searchTerm, setSearchTerm] = useState('');
      const [selectedCategory, setSelectedCategory] = useState<string>('all');
      const [startDate, setStartDate] = useState<string>('');
      const [endDate, setEndDate] = useState<string>('');
      const [showAddModal, setShowAddModal] = useState(false);
      const [newExpense, setNewExpense] = useState({
        amount: '',
        expense_category: 'petty',
        has_gst: false,
        description: '',
        party_name: '',
        staff_name: '',
        date: new Date().toISOString().split('T')[0]
      });
      const [isLoading, setIsLoading] = useState(true);

      useEffect(() => {
        loadExpenses();
      }, []);

      const loadExpenses = async () => {
        try {
          setIsLoading(true);
          const dbInstance = await db.init();
          const result = dbInstance.exec(`
            SELECT 
              t.id,
              t.date,
              t.amount,
              t.expense_category,
              t.has_gst,
              t.description,
              t.party_id,
              t.staff_id,
              t.created_at,
              CASE 
                WHEN t.expense_category = 'party_payment' THEN 'Payment to ' || COALESCE(p.name, 'Unknown Party')
                WHEN t.expense_category = 'salary' THEN 'Salary to ' || COALESCE(s.name, 'Unknown Staff')
                WHEN t.expense_category = 'advance' THEN 'Advance to ' || COALESCE(s.name, 'Unknown Staff')
                ELSE NULL 
              END as related_name,
              p.name as party_name,
              s.name as staff_name
            FROM transactions t
            LEFT JOIN parties p ON t.party_id = p.id
            LEFT JOIN staff s ON t.staff_id = s.id
            WHERE t.type = 'expense'
            ORDER BY t.date DESC, t.created_at DESC
          `);
          
          if (result.length > 0) {
            const expenses = result[0].values.map((row: any[]) => ({
              id: row[0],
              date: row[1],
              amount: row[2],
              expense_category: row[3],
              has_gst: Boolean(row[4]),
              description: row[5],
              party_id: row[6],
              staff_id: row[7],
              created_at: row[8],
              related_name: row[9],
              party_name: row[10],
              staff_name: row[11]
            }));
            setExpenses(expenses);
          } else {
            setExpenses([]);
          }
        } catch (error) {
          console.error('Error loading expenses:', error);
        } finally {
          setIsLoading(false);
        }
      };

      const handleAddExpense = async () => {
        if (!newExpense.amount || !newExpense.date || !newExpense.expense_category) {
          alert('Amount, date, and category are required');
          return;
        }

        try {
          const dbInstance = await db.init();
          const id = generateId();

          dbInstance.exec(`
            INSERT INTO transactions (
              id, date, type, amount, expense_category,
              has_gst, description, party_id, staff_id
            ) VALUES (?, ?, 'expense', ?, ?, ?, ?, ?, ?)
          `, [
            id,
            newExpense.date,
            parseFloat(newExpense.amount),
            newExpense.expense_category,
            newExpense.has_gst ? 1 : 0,
            newExpense.description || null,
            null,
            null
          ]);

          setShowAddModal(false);
          setNewExpense({
            amount: '',
            expense_category: 'petty',
            has_gst: false,
            description: '',
            party_name: '',
            staff_name: '',
            date: new Date().toISOString().split('T')[0]
          });
          
          await loadExpenses();
        } catch (error) {
          console.error('Error adding expense:', error);
          alert('Error adding expense. Please try again.');
        }
      };

      const handleDeleteExpense = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this expense?')) {
          return;
        }

        try {
          const dbInstance = await db.init();
          dbInstance.run('DELETE FROM transactions WHERE id = ?', [id]);
          await loadExpenses();
        } catch (error) {
          console.error('Error deleting expense:', error);
          alert('Error deleting expense. Please try again.');
        }
      };

      const filteredExpenses = expenses.filter(expense => {
        const matchesSearch = 
          expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          expense.related_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          expense.amount.toString().includes(searchTerm);
        
        const matchesCategory = selectedCategory === 'all' || expense.expense_category === selectedCategory;
        
        const matchesDateRange = 
          (!startDate || expense.date >= startDate) &&
          (!endDate || expense.date <= endDate);
        
        return matchesSearch && matchesCategory && matchesDateRange;
      });

      const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const gstExpenses = filteredExpenses
        .filter(expense => expense.has_gst)
        .reduce((sum, expense) => sum + expense.amount, 0);
      const nonGstExpenses = totalExpenses - gstExpenses;

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
            <h1 className="text-2xl font-semibold text-gray-900">Expenses</h1>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Expense
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="all">All Categories</option>
                  {EXPENSE_CATEGORIES.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="flex items-center">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Expenses</p>
                  <p className="text-xl font-semibold text-gray-900">₹{totalExpenses.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <IndianRupee className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">GST Expenses</p>
                  <p className="text-xl font-semibold text-blue-600">₹{gstExpenses.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">
                    Base: ₹{Math.round(gstExpenses / 1.03).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <IndianRupee className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Non-GST Expenses</p>
                  <p className="text-xl font-semibold text-purple-600">₹{nonGstExpenses.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <IndianRupee className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      GST
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Party/Staff
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(expense.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          expense.expense_category === 'party_payment'
                            ? 'bg-blue-100 text-blue-800'
                            : expense.expense_category === 'salary'
                            ? 'bg-green-100 text-green-800'
                            : expense.expense_category === 'advance'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {EXPENSE_CATEGORIES.find(c => c.value === expense.expense_category)?.label || 
                           expense.expense_category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{expense.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {expense.has_gst ? (
                          <span className="text-green-600">Yes</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {expense.related_name ? (
                          <span className={`${
                            expense.expense_category === 'party_payment' 
                              ? 'text-blue-600' 
                              : ['salary', 'advance'].includes(expense.expense_category) 
                                ? 'text-green-600' 
                                : 'text-gray-900'
                          }`}>
                            {expense.related_name}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {expense.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Expense Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">New Expense</h3>
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
                      Date
                    </label>
                    <input
                      type="date"
                      value={newExpense.date}
                      onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Category
                    </label>
                    <select
                      value={newExpense.expense_category}
                      onChange={(e) => setNewExpense({ ...newExpense, expense_category: e.target.value })}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      {EXPENSE_CATEGORIES.map(category => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Amount
                    </label>
                    <input
                      type="number"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter amount"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="has_gst"
                      checked={newExpense.has_gst}
                      onChange={(e) => setNewExpense({ ...newExpense, has_gst: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="has_gst" className="ml-2 block text-sm text-gray-900">
                      Has GST
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <input
                      type="text"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter description (optional)"
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
                    onClick={handleAddExpense}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Add Expense
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    };

    export default Expenses;
