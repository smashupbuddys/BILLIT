import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, IndianRupee } from 'lucide-react';
import db, { generateId } from '../lib/db';

interface CreditSale {
  id: string;
  customer_name: string;
  amount: number;
  date: string;
  paid_amount: number;
  description?: string;
  created_at: string;
  credit_increase_description?: string;
}

interface Payment {
  id: string;
  amount: number;
  date: string;
  description?: string;
  created_at: string;
}

interface CreditAdjustment {
  id: string;
  adjustment_amount: number;
  adjustment_date: string;
  description?: string;
  created_at: string;
}

const CreditSaleDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sale, setSale] = useState<CreditSale | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showIncreaseCreditModal, setShowIncreaseCreditModal] = useState(false);
  const [increaseCreditAmount, setIncreaseCreditAmount] = useState('');
  const [increaseCreditDescription, setIncreaseCreditDescription] = useState('');
  const [creditAdjustments, setCreditAdjustments] = useState<CreditAdjustment[]>([]);

  useEffect(() => {
    if (id) {
      loadSaleDetails();
      loadPayments();
      loadCreditAdjustments();
    }
  }, [id]);

  const loadSaleDetails = async () => {
    try {
      const dbInstance = await db.init();
      const result = dbInstance.exec('SELECT * FROM credit_sales WHERE id = ?', [id]);
      
      if (result.length > 0 && result[0].values.length > 0) {
        const row = result[0].values[0];
        setSale({
          id: row[0],
          customer_name: row[1],
          amount: row[2],
          date: row[3],
          paid_amount: row[4],
          description: row[5],
          created_at: row[6],
          credit_increase_description: row[9]
        });
      }
    } catch (error) {
      console.error('Error loading sale details:', error);
    }
  };

  const loadPayments = async () => {
    try {
      const dbInstance = await db.init();
      const result = dbInstance.exec(`
        SELECT * FROM credit_payments 
        WHERE credit_sale_id = ?
        ORDER BY date DESC, created_at DESC
      `, [id]);

      if (result.length > 0) {
        const payments = result[0].values.map((row: any[]) => ({
          id: row[0],
          amount: row[2],
          date: row[3],
          description: row[4],
          created_at: row[5]
        }));
        setPayments(payments);
      } else {
        setPayments([]);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCreditAdjustments = async () => {
    try {
      const dbInstance = await db.init();
      const result = dbInstance.exec(`
        SELECT * FROM credit_adjustments
        WHERE credit_sale_id = ?
        ORDER BY adjustment_date DESC, created_at DESC
      `, [id]);

      if (result.length > 0) {
        const adjustments = result[0].values.map((row: any[]) => ({
          id: row[0],
          adjustment_amount: row[2],
          adjustment_date: row[3],
          description: row[4],
          created_at: row[5]
        }));
        setCreditAdjustments(adjustments);
      } else {
        setCreditAdjustments([]);
      }
    } catch (error) {
      console.error('Error loading credit adjustments:', error);
    }
  };

  const handleAddPayment = async () => {
    if (!newPayment.amount || !newPayment.date) {
      alert('Amount and date are required');
      return;
    }

    try {
      const dbInstance = await db.init();
      const paymentId = generateId();

      dbInstance.exec(`
        INSERT INTO credit_payments (
          id, credit_sale_id, amount, date, description
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        paymentId,
        id,
        parseFloat(newPayment.amount),
        newPayment.date,
        newPayment.description.trim() || null
      ]);

      // Update the sale's paid_amount
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0) + parseFloat(newPayment.amount);
      dbInstance.exec(`
        UPDATE credit_sales
        SET paid_amount = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [totalPaid, id]);

      setShowAddModal(false);
      setNewPayment({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
      });
      
      await Promise.all([loadSaleDetails(), loadPayments()]);
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('Error adding payment. Please try again.');
    }
  };

  const handleIncreaseCredit = async () => {
    if (!increaseCreditAmount || isNaN(parseFloat(increaseCreditAmount))) {
      alert('Please enter a valid amount to increase credit.');
      return;
    }

    try {
      const dbInstance = await db.init();
      const newAmount = parseFloat(increaseCreditAmount) + (sale?.amount || 0);
      const adjustmentId = generateId();

      // Start transaction
      dbInstance.exec('BEGIN TRANSACTION');

      try {
        // Update credit_sales table
        dbInstance.run(`
          UPDATE credit_sales
          SET amount = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [newAmount, id]);

        // Insert into credit_adjustments table
        dbInstance.run(`
          INSERT INTO credit_adjustments (
            id, credit_sale_id, adjustment_amount, adjustment_date, description
          ) VALUES (?, ?, ?, ?, ?)
        `, [
          adjustmentId,
          id,
          parseFloat(increaseCreditAmount),
          new Date().toISOString().split('T')[0],
          increaseCreditDescription
        ]);

        // Commit transaction
        dbInstance.exec('COMMIT');
        db.save();

        setShowIncreaseCreditModal(false);
        setIncreaseCreditAmount('');
        setIncreaseCreditDescription('');
        await Promise.all([loadSaleDetails(), loadCreditAdjustments()]);
      } catch (error) {
        // Rollback on error
        dbInstance.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error increasing credit:', error);
      alert('Error increasing credit. Please try again.');
    }
  };

  if (isLoading || !sale) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const remainingAmount = sale.amount - sale.paid_amount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/credit-sales')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Credit Buyer Details</h1>
            <p className="text-sm text-gray-500">View sale details and payment history</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            disabled={remainingAmount <= 0}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Payment
          </button>
          <button
            onClick={() => setShowIncreaseCreditModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <IndianRupee className="w-4 h-4 mr-2" />
            Increase Credit
          </button>
        </div>
      </div>

      {/* Sale Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Customer Name</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{sale.customer_name}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-500">Sale Date</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {new Date(sale.date).toLocaleDateString()}
            </p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-500">Total Amount</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              ₹{sale.amount.toLocaleString()}
            </p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-500">Remaining Amount</p>
            <p className="mt-1 text-lg font-semibold text-red-600">
              ₹{remainingAmount.toLocaleString()}
            </p>
          </div>
        </div>

        {sale.description && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">{sale.description}</p>
          </div>
        )}
      </div>

      {/* Payments History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Payment History</h2>
        </div>
        
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
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(payment.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{payment.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payment.description || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Credit Adjustments History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Credit Adjustments History</h2>
        </div>
        
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
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {creditAdjustments.map((adjustment) => (
                <tr key={adjustment.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(adjustment.adjustment_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{adjustment.adjustment_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {adjustment.description || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Payment</h3>
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
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newPayment.date}
                  onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  max={remainingAmount}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter amount"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Maximum amount: ₹{remainingAmount.toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <input
                  type="text"
                  value={newPayment.description}
                  onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
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
                onClick={handleAddPayment}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Increase Credit Modal */}
      {showIncreaseCreditModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Increase Credit Limit</h3>
              <button
                onClick={() => setShowIncreaseCreditModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Increase Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={increaseCreditAmount}
                  onChange={(e) => setIncreaseCreditAmount(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter amount to increase"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <input
                  type="text"
                  value={increaseCreditDescription}
                  onChange={(e) => setIncreaseCreditDescription(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter description (optional)"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowIncreaseCreditModal(false)}
                className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleIncreaseCredit}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Increase Credit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditSaleDetails;
