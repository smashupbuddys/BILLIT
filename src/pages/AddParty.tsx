import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Phone, User, FileText, IndianRupee, MapPin, Scale, Calendar } from 'lucide-react';
import db from '../lib/db';
import { generateId } from '../lib/db';
import { format } from 'date-fns';

const AddParty: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    credit_limit: '',
    contact_person: '',
    phone: '',
    address: '',
    gst_number: ''
  });

  // Add opening balance state
  const [hasOpeningBalance, setHasOpeningBalance] = useState(false);
  const [openingBalance, setOpeningBalance] = useState({
    amount: '',
    type: 'debit', // debit = we owe them, credit = they owe us
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!formData.name.trim()) {
    alert('Manufacturer name is required');
    return;
  }

  try {
    setIsSubmitting(true);
    const dbInstance = await db.init();
    const partyId = generateId();
    
    await dbInstance.run('BEGIN TRANSACTION');

    try {
      // Insert party
      await dbInstance.run(`
        INSERT INTO parties (
          id, name, credit_limit, contact_person, phone, address, gst_number,
          current_balance, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        partyId,
        formData.name.trim(),
        formData.credit_limit ? parseFloat(formData.credit_limit) : 0,
        formData.contact_person.trim() || null,
        formData.phone.trim() || null,
        formData.address.trim() || null,
        formData.gst_number.trim() || null
      ]);

      // Handle opening balance if exists
      if (hasOpeningBalance && openingBalance.amount) {
        const transactionId = generateId();
        const amount = parseFloat(openingBalance.amount);
        const balanceAmount = openingBalance.type === 'debit' ? amount : -amount;

        // Add opening balance transaction
        await dbInstance.run(`
          INSERT INTO transactions (
            id, date, type, amount, party_id, description,
            expense_category, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
          transactionId,
          openingBalance.date,
          openingBalance.type === 'debit' ? 'bill' : 'expense',
          amount,
          partyId,
          'Opening Balance',
          openingBalance.type === 'credit' ? 'party_payment' : null
        ]);

        // Update party's current balance
        await dbInstance.run(`
          UPDATE parties 
          SET current_balance = current_balance + ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [balanceAmount, partyId]);
      }

      await dbInstance.run('COMMIT');
      db.save();
      navigate('/parties');
    } catch (error) {
      await dbInstance.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error adding manufacturer:', error);
    alert('Error adding manufacturer. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
};
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Add New Manufacturer</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-6">
          {/* Existing form fields... */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Manufacturer Name <span className="text-red-500">*</span>
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building2 className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter manufacturer name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Credit Limit
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <IndianRupee className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="number"
                value={formData.credit_limit}
                onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter credit limit"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Contact Person
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter contact person name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              GST Number
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FileText className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={formData.gst_number}
                onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter GST number"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Address
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter address"
              />
            </div>
          </div>

          {/* Opening Balance Section */}
          <div className="pt-6 border-t">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="hasOpeningBalance"
                checked={hasOpeningBalance}
                onChange={(e) => setHasOpeningBalance(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="hasOpeningBalance" className="ml-2 block text-sm font-medium text-gray-900">
                Set Opening Balance
              </label>
            </div>

            {hasOpeningBalance && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Balance Type
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Scale className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      value={openingBalance.type}
                      onChange={(e) => setOpeningBalance({ ...openingBalance, type: e.target.value as 'debit' | 'credit' })}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="debit">Debit (DR) - We owe them</option>
                      <option value="credit">Credit (CR) - They owe us</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Opening Balance Amount
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <IndianRupee className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      value={openingBalance.amount}
                      onChange={(e) => setOpeningBalance({ ...openingBalance, amount: e.target.value })}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter opening balance amount"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    As of Date
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      value={openingBalance.date}
                      onChange={(e) => setOpeningBalance({ ...openingBalance, date: e.target.value })}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/parties')}
            className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add Manufacturer'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddParty;