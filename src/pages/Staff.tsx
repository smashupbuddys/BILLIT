import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, X, IndianRupee, Users, Briefcase, Trash2 } from 'lucide-react';
import db, { generateId } from '../lib/db';
import StaffCalendar from '../components/StaffCalendar';

interface Staff {
  id: string;
  name: string;
  role: string;
  salary: number;
  joining_date: string;
  current_advance: number;
  contact_number?: string;
  address?: string;
  created_at: string;
}

interface Holiday {
  date: string;
  type: 'weekly' | 'festival' | 'personal' | 'sick';
  isHalfDay?: boolean;
}

interface Advance {
  id: string;
  amount: number;
  date: string;
  payments: Array<{
    amount: number;
    date: string;
  }>;
}

const StaffPage: React.FC = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [holidays, setHolidays] = useState<Record<string, Holiday[]>>({});
  const [advances, setAdvances] = useState<Record<string, Advance[]>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    role: '',
    salary: '',
    joining_date: new Date().toISOString().split('T')[0],
    contact_number: '',
    address: ''
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStaff();
    loadHolidays();
    loadAdvances();
  }, []);

  const loadStaff = async () => {
    try {
      const dbInstance = await db.init();
      const result = dbInstance.exec(`
        SELECT * FROM staff 
        ORDER BY name
      `);
      
      if (result.length > 0) {
        const staffList = result[0].values.map((row: any[]) => ({
          id: row[0],
          name: row[1],
          role: row[2],
          salary: row[3],
          joining_date: row[4],
          current_advance: row[5],
          contact_number: row[6],
          address: row[7],
          created_at: row[8]
        }));
        setStaff(staffList);
      } else {
        setStaff([]);
      }
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHolidays = async () => {
    try {
      const dbInstance = await db.init();
      const result = dbInstance.exec(`
        SELECT staff_id, date, type, description
        FROM staff_holidays
        ORDER BY date DESC
      `);
      
      if (result.length > 0) {
        const holidayMap: Record<string, Holiday[]> = {};
        result[0].values.forEach(([staffId, date, type, description]) => {
          if (!holidayMap[staffId]) {
            holidayMap[staffId] = [];
          }
          holidayMap[staffId].push({
            date,
            type: type as Holiday['type'],
            isHalfDay: description?.includes('halfDay')
          });
        });
        setHolidays(holidayMap);
      }
    } catch (error) {
      console.error('Error loading holidays:', error);
    }
  };

  const loadAdvances = async () => {
    try {
      const dbInstance = await db.init();
      const advances = dbInstance.exec(`
        SELECT 
          a.id, a.staff_id, a.amount, a.date,
          p.amount as payment_amount, p.date as payment_date
        FROM staff_advances a
        LEFT JOIN staff_advance_payments p ON p.advance_id = a.id
        ORDER BY a.date DESC
      `);
      
      if (advances.length > 0) {
        const advanceMap: Record<string, Advance[]> = {};
        advances[0].values.forEach(([id, staffId, amount, date, paymentAmount, paymentDate]) => {
          if (!advanceMap[staffId]) {
            advanceMap[staffId] = [];
          }
          
          let advance = advanceMap[staffId].find(a => a.id === id);
          if (!advance) {
            advance = {
              id,
              amount,
              date,
              payments: []
            };
            advanceMap[staffId].push(advance);
          }
          
          if (paymentAmount && paymentDate) {
            advance.payments.push({
              amount: paymentAmount,
              date: paymentDate
            });
          }
        });
        setAdvances(advanceMap);
      }
    } catch (error) {
      console.error('Error loading advances:', error);
    }
  };

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.role || !newStaff.salary || !newStaff.joining_date) {
      alert('Name, role, salary, and joining date are required');
      return;
    }

    try {
      const dbInstance = await db.init();
      const id = generateId();

      dbInstance.exec(`
        INSERT INTO staff (
          id, name, role, salary, joining_date, contact_number, address
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        newStaff.name.trim(),
        newStaff.role.trim(),
        parseFloat(newStaff.salary),
        newStaff.joining_date,
        newStaff.contact_number.trim() || null,
        newStaff.address.trim() || null
      ]);

      setShowAddModal(false);
      setNewStaff({
        name: '',
        role: '',
        salary: '',
        joining_date: new Date().toISOString().split('T')[0],
        contact_number: '',
        address: ''
      });
      
      await loadStaff();
    } catch (error) {
      console.error('Error adding staff:', error);
      alert('Error adding staff member. Please try again.');
    }
  };

  const handleAddHoliday = async (staffId: string, date: string) => {
    try {
      const dbInstance = await db.init();
      
      // Parse query parameters if any
      const [baseDate, params] = date.split('?');
      const isHalfDay = params?.includes('halfDay=true');
      const isSunday = params?.includes('sunday=true');

      // Check if a holiday already exists for this date
      const existingHoliday = dbInstance.exec(`
        SELECT id FROM staff_holidays
        WHERE staff_id = ? AND date = ?
      `, [staffId, baseDate]);

      if (existingHoliday.length > 0 && existingHoliday[0].values.length > 0) {
        // Update existing holiday
        const holidayId = existingHoliday[0].values[0][0];
        dbInstance.exec(`
          UPDATE staff_holidays
          SET type = ?, description = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          isSunday ? 'weekly' : 'personal',
          isHalfDay ? 'halfDay' : null,
          holidayId
        ]);
      } else {
        // Insert new holiday
        const id = generateId();
        dbInstance.exec(`
          INSERT INTO staff_holidays (
            id, staff_id, date, type, description
          ) VALUES (?, ?, ?, ?, ?)
        `, [
          id,
          staffId,
          baseDate,
          isSunday ? 'weekly' : 'personal',
          isHalfDay ? 'halfDay' : null
        ]);
      }

      await loadHolidays();
    } catch (error) {
      console.error('Error adding holiday:', error);
      alert('Error marking attendance. Please try again.');
    }
  };

  const handleDeleteStaff = async (staffId: string, staffName: string) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to remove ${staffName}? This will delete all their records including attendance and advances.`
    );

    if (!confirmDelete) return;

    try {
      const dbInstance = await db.init();

      // Start transaction
      dbInstance.exec('BEGIN TRANSACTION;');

      try {
        // Delete staff holidays
        dbInstance.exec(`
          DELETE FROM staff_holidays
          WHERE staff_id = ?
        `, [staffId]);

        // Delete staff advance payments and advances
        const advances = dbInstance.exec(`
          SELECT id FROM staff_advances
          WHERE staff_id = ?
        `, [staffId]);

        if (advances.length > 0 && advances[0].values.length > 0) {
          const advanceIds = advances[0].values.map(([id]) => id);
          
          // Delete payments first (due to foreign key constraint)
          dbInstance.exec(`
            DELETE FROM staff_advance_payments
            WHERE advance_id IN (${advanceIds.map(() => '?').join(',')})
          `, advanceIds);

          // Then delete advances
          dbInstance.exec(`
            DELETE FROM staff_advances
            WHERE staff_id = ?
          `, [staffId]);
        }

        // Delete staff transactions
        dbInstance.exec(`
          DELETE FROM transactions
          WHERE staff_id = ?
        `, [staffId]);

        // Finally delete the staff member
        dbInstance.exec(`
          DELETE FROM staff
          WHERE id = ?
        `, [staffId]);

        // Commit transaction
        dbInstance.exec('COMMIT;');

        // Reload data
        await Promise.all([
          loadStaff(),
          loadHolidays(),
          loadAdvances()
        ]);

        alert('Staff member removed successfully');
      } catch (error) {
        // Rollback on error
        dbInstance.exec('ROLLBACK;');
        throw error;
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('Error removing staff member. Please try again.');
    }
  };

  const roles = Array.from(new Set(staff.map(s => s.role)));
  
  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || s.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const totalSalary = staff.reduce((sum, s) => sum + s.salary, 0);
  const totalAdvance = staff.reduce((sum, s) => sum + s.current_advance, 0);

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
        <h1 className="text-2xl font-semibold text-gray-900">Staff Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Staff
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
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Role Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            <select
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="all">All Roles</option>
              {roles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Total Salary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Salary</p>
              <p className="text-xl font-semibold text-gray-900">₹{totalSalary.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <IndianRupee className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Total Advance */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Advance</p>
              <p className="text-xl font-semibold text-red-600">₹{totalAdvance.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <IndianRupee className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Staff List with Calendars */}
      <div className="space-y-6">
        {filteredStaff.map(member => (
          <div key={member.id} className="relative">
            <button
              onClick={() => handleDeleteStaff(member.id, member.name)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
              title="Remove staff member"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <StaffCalendar
              staffId={member.id}
              name={member.name}
              salary={member.salary}
              salaryDate={member.joining_date}
              sundayBonus={500}
              holidays={holidays[member.id] || []}
              advances={advances[member.id] || []}
              onAddHoliday={(date) => handleAddHoliday(member.id, date)}
              onAddAdvance={() => {
                // TODO: Implement advance handling
                alert('Advance functionality coming soon!');
              }}
            />
          </div>
        ))}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add New Staff</h3>
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
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter staff name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Role <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter role"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Salary <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={newStaff.salary}
                  onChange={(e) => setNewStaff({ ...newStaff, salary: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter salary amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Joining Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newStaff.joining_date}
                  onChange={(e) => setNewStaff({ ...newStaff, joining_date: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Contact Number
                </label>
                <input
                  type="tel"
                  value={newStaff.contact_number}
                  onChange={(e) => setNewStaff({ ...newStaff, contact_number: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter contact number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <textarea
                  value={newStaff.address}
                  onChange={(e) => setNewStaff({ ...newStaff, address: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter address"
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
                onClick={handleAddStaff}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add Staff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffPage;
