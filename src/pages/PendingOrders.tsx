import React, { useState, useEffect } from 'react';
import { Search, X, ArrowUpRight, ArrowDownRight, IndianRupee, CheckCircle, Clock, Trash2 } from 'lucide-react';
import db from '../lib/db';
import { generateId } from '../lib/db';

interface PendingOrder {
  id: string;
  customer_name: string;
  order_date: string;
  total_amount: number;
  advance_amount: number;
  remaining_amount: number;
  is_sent: boolean;
  created_at: string;
}

const PendingOrders: React.FC = () => {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddAdvanceModal, setShowAddAdvanceModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);
  const [newAdvance, setNewAdvance] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPendingOrders();
  }, []);

  const loadPendingOrders = async () => {
    try {
      setIsLoading(true);
      const dbInstance = await db.init();
      const result = await dbInstance.exec(`
        SELECT 
          cs.id,
          cs.customer_name,
          cs.date as order_date,
          cs.amount as total_amount,
          cs.paid_amount as advance_amount,
          (cs.amount - cs.paid_amount) as remaining_amount,
          CASE WHEN cs.paid_amount = cs.amount THEN 1 ELSE 0 END as is_sent,
          cs.created_at
        FROM credit_sales cs
        WHERE cs.amount > cs.paid_amount
        ORDER BY cs.date DESC, cs.created_at DESC
      `);
      
      if (result.length > 0) {
        const orders = result[0].values.map((row: any[]) => ({
          id: row[0],
          customer_name: row[1],
          order_date: row[2],
          total_amount: row[3],
          advance_amount: row[4],
          remaining_amount: row[5],
          is_sent: Boolean(row[6]),
          created_at: row[7]
        }));
        setOrders(orders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error loading pending orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAdvance = async () => {
    if (!newAdvance.amount || !newAdvance.date || !selectedOrder) {
      alert('Amount and date are required');
      return;
    }

    try {
      const dbInstance = await db.init();
      const paymentId = generateId();

      // Start transaction
      await db.run('BEGIN TRANSACTION');

      try {
        // Insert payment
        await db.run(`
          INSERT INTO credit_payments (
            id, credit_sale_id, amount, date
          ) VALUES (?, ?, ?, ?)
        `, [
          paymentId,
          selectedOrder.id,
          parseFloat(newAdvance.amount),
          newAdvance.date
        ]);

        // Update credit sale paid amount
        await db.run(`
          UPDATE credit_sales
          SET paid_amount = paid_amount + ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [parseFloat(newAdvance.amount), selectedOrder.id]);

        // Commit transaction
        await db.run('COMMIT');

        setShowAddAdvanceModal(false);
        setNewAdvance({
          amount: '',
          date: new Date().toISOString().split('T')[0]
        });
        setSelectedOrder(null);
        await loadPendingOrders();
      } catch (error) {
        // Rollback on error
        await db.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error adding advance:', error);
      alert('Error adding advance. Please try again.');
    }
  };

  const handleMarkAsSent = async (orderId: string) => {
    try {
      const dbInstance = await db.init();
      await dbInstance.run(`
        UPDATE credit_sales
        SET paid_amount = amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [orderId]);
      await loadPendingOrders();
    } catch (error) {
      console.error('Error marking order as sent:', error);
      alert('Error marking order as sent. Please try again.');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm('Are you sure you want to delete this order? This will also delete all associated payments.')) {
      try {
        const dbInstance = await db.init();

        // Start a transaction
        dbInstance.exec('BEGIN TRANSACTION;');

        try {
          // Delete associated payments
          dbInstance.exec('DELETE FROM credit_payments WHERE credit_sale_id = ?', [orderId]);

          // Delete the credit sale
          dbInstance.exec('DELETE FROM credit_sales WHERE id = ?', [orderId]);

          // Commit the transaction
          dbInstance.exec('COMMIT;');

          await loadPendingOrders();
        } catch (error) {
          // Rollback on error
          dbInstance.exec('ROLLBACK;');
          throw error;
        }
      } catch (error) {
        console.error('Error deleting credit sale:', error);
        alert('Error deleting credit sale. Please try again.');
      }
    }
  };

  const filteredOrders = orders.filter(order =>
    order.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPending = orders.reduce((sum, order) => sum + order.remaining_amount, 0);

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
        <h1 className="text-2xl font-semibold text-gray-900">Pending Orders</h1>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        {/* Total Pending */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pending</p>
              <p className="text-xl font-semibold text-red-600">₹{totalPending.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <ArrowDownRight className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Pending Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer Name
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Date
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Advance
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remaining
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.customer_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.order_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{order.total_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    ₹{order.advance_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      order.remaining_amount > 0
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      ₹{order.remaining_amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.is_sent ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Sent
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="w-4 h-4 mr-1" />
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {!order.is_sent && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowAddAdvanceModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <IndianRupee className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleMarkAsSent(order.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Advance Modal */}
      {showAddAdvanceModal && selectedOrder && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Advance</h3>
              <button
                onClick={() => setShowAddAdvanceModal(false)}
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
                  value={newAdvance.date}
                  onChange={(e) => setNewAdvance({ ...newAdvance, date: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Amount
                </label>
                <input
                  type="number"
                  value={newAdvance.amount}
                  onChange={(e) => setNewAdvance({ ...newAdvance, amount: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter amount"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowAddAdvanceModal(false)}
                className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAdvance}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add Advance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingOrders;
