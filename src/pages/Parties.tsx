import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, ArrowUpRight, ArrowDownRight, IndianRupee } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, subMonths, subDays } from 'date-fns';
import db from '../lib/db';

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
  type: string;
  amount: number;
  party_id: string;
  expense_category: string;
  created_at: string;
}

const Parties: React.FC = () => {
  const navigate = useNavigate();
  const [parties, setParties] = useState<Party[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'week' | 'month' | 'quarter'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const dbInstance = await db.init();
      
      // Load parties
      const partiesResult = await dbInstance.exec(`
        SELECT 
          id, name, credit_limit, current_balance, 
          contact_person, phone, address, gst_number, 
          created_at, updated_at
        FROM parties 
        ORDER BY name
      `);

      if (partiesResult.length > 0) {
        const partiesData = partiesResult[0].values.map((row: any[]) => ({
          id: row[0],
          name: row[1],
          credit_limit: row[2],
          current_balance: row[3],
          contact_person: row[4],
          phone: row[5],
          address: row[6],
          gst_number: row[7],
          created_at: row[8],
          updated_at: row[9]
        }));
        setParties(partiesData);
      }

      // Load party-related transactions
      const transactionsResult = await dbInstance.exec(`
        SELECT 
          t.id,
          t.date,
          t.type,
          t.amount,
          t.party_id,
          t.expense_category,
          t.created_at
        FROM transactions t
        WHERE t.party_id IS NOT NULL 
        AND (
          (t.type = 'bill') OR 
          (t.type = 'expense' AND t.expense_category = 'party_payment')
        )
        ORDER BY t.date DESC, t.created_at DESC
      `);

      if (transactionsResult.length > 0) {
        const transactionsData = transactionsResult[0].values.map((row: any[]) => ({
          id: row[0],
          date: row[1],
          type: row[2],
          amount: row[3],
          party_id: row[4],
          expense_category: row[5],
          created_at: row[6]
        }));
        setTransactions(transactionsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateFilter = (filter: 'all' | 'week' | 'month' | 'quarter') => {
    setActiveFilter(filter);
    const today = new Date();

    switch (filter) {
      case 'week':
        setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case 'month':
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);
        setStartDate(format(monthStart, 'yyyy-MM-dd'));
        setEndDate(format(monthEnd, 'yyyy-MM-dd'));
        break;
      case 'quarter':
        const quarterStart = startOfMonth(subMonths(today, 2));
        setStartDate(format(quarterStart, 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case 'all':
      default:
        setStartDate('');
        setEndDate('');
        break;
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const isInDateRange = (!startDate || transaction.date >= startDate) && 
                           (!endDate || transaction.date <= endDate);
      return isInDateRange;
    });
  }, [transactions, startDate, endDate]);

  const { totalCredit, totalDebit } = useMemo(() => {
    return filteredTransactions.reduce((acc, transaction) => {
      if (transaction.type === 'bill') {
        // Bills from parties increase our credit
        acc.totalCredit += transaction.amount;
      } else if (transaction.type === 'expense' && transaction.expense_category === 'party_payment') {
        // Payments to parties increase our debit
        acc.totalDebit += transaction.amount;
      }
      return acc;
    }, { totalCredit: 0, totalDebit: 0 });
  }, [filteredTransactions]);

  const filteredParties = useMemo(() => {
    return parties.filter(party =>
      party.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [parties, searchTerm]);

  const getFilterLabel = () => {
    switch (activeFilter) {
      case 'week':
        return 'Last 7 days';
      case 'month':
        return format(new Date(), 'MMMM yyyy');
      case 'quarter':
        return 'Last 3 months';
      default:
        return 'All time';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Manufacturers</h1>
        <button
          onClick={() => navigate('/parties/add')}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Manufacturer
        </button>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'All Time' },
          { id: 'week', label: 'This Week' },
          { id: 'month', label: 'This Month' },
          { id: 'quarter', label: 'Last 3 Months' }
        ].map((filter) => (
          <button
            key={filter.id}
            onClick={() => handleDateFilter(filter.id as 'all' | 'week' | 'month' | 'quarter')}
            className={`px-3 py-1.5 border rounded-md text-sm hover:bg-gray-50 transition-colors
              ${activeFilter === filter.id 
                ? 'bg-blue-50 text-blue-700 border-blue-200 font-medium' 
                : 'text-gray-600 border-gray-200'
              }`}
          >
            {filter.label}
          </button>
        ))}
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
              placeholder="Search manufacturers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Total Bills */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Bills Received</p>
              <p className="text-xs text-gray-500">{getFilterLabel()}</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">
                ₹{totalCredit.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <ArrowUpRight className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Total Payments */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Payments Made</p>
              <p className="text-xs text-gray-500">{getFilterLabel()}</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">
                ₹{totalDebit.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <ArrowDownRight className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Manufacturers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Manufacturer Name
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Person
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credit Limit
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Balance
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GST Number
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredParties.map((party) => (
                <tr 
                  key={party.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/parties/${party.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{party.name}</div>
                    {party.address && (
                      <div className="text-sm text-gray-500">{party.address}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {party.contact_person || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {party.phone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{party.credit_limit.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        party.current_balance > 0
                          ? 'bg-green-100 text-green-800'
                          : party.current_balance < 0
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      ₹{Math.abs(party.current_balance).toLocaleString()}
                      {party.current_balance !== 0 && (
                        <span className="ml-1">
                          {party.current_balance > 0 ? 'CR' : 'DR'}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {party.gst_number || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* No Results Message */}
        {filteredParties.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">
              {searchTerm ? 'No manufacturers found matching your search.' : 'No manufacturers added yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Parties;