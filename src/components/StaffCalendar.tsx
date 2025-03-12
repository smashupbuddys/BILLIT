import React, { useMemo } from 'react';
import { Calendar, IndianRupee } from 'lucide-react';

interface StaffCalendarProps {
  staffId: string;
  name: string;
  salary: number;
  salaryDate: string;
  sundayBonus: number;
  holidays: Array<{
    date: string;
    type: 'weekly' | 'festival' | 'personal' | 'sick';
    isHalfDay?: boolean;
  }>;
  advances: Array<{
    id: string;
    amount: number;
    date: string;
    payments: Array<{
      amount: number;
      date: string;
    }>;
  }>;
  onAddHoliday?: (date: string) => void;
  onAddAdvance?: () => void;
}

const StaffCalendar: React.FC<StaffCalendarProps> = ({
  staffId,
  name,
  salary,
  salaryDate,
  sundayBonus,
  holidays,
  advances,
  onAddHoliday,
  onAddAdvance
}) => {
  // Calculate the current period's dates based on salary date
  const today = useMemo(() => new Date(), []);
  
  const currentPeriod = useMemo(() => {
    // Always start from 14th of the month
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();
    
    // If we're on or after the 14th, use current month's 14th
    // If we're before the 14th, use previous month's 14th
    let startDate = new Date(currentYear, currentMonth, 14);
    if (currentDay < 14) {
      startDate = new Date(currentYear, currentMonth - 1, 14);
    }
    
    // End date is 30 days after start date (inclusive)
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 29);
    
    const dates: Date[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return {
      startDate,
      endDate,
      dates
    };
  }, [today]);

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getHoliday = (date: string) => {
    return holidays.find(h => h.date === date);
  };

  const isSalaryDate = (date: Date) => {
    return date.getDate() === 14;
  };

  const isSunday = (date: Date) => {
    return date.getDay() === 0;
  };

  const getAdvancePayment = (date: string) => {
    return advances.flatMap(a => 
      a.payments.filter(p => p.date === date)
    )[0];
  };

  const handleDateClick = (date: Date) => {
    const dateStr = formatDate(date);
    const isToday = formatDate(today) === dateStr;
    
    if (!isToday) {
      alert('You can only mark attendance for today');
      return;
    }

    const now = new Date();
    const hour = now.getHours();
    const holiday = getHoliday(dateStr);

    if (hour >= 8 && hour <= 12) {
      // Morning attendance (8 AM - 12 PM)
      if (holiday) {
        const confirmHalfDay = window.confirm('Staff member already marked for this day. Did they leave half day?');
        if (confirmHalfDay) {
          onAddHoliday?.(dateStr + '?halfDay=true');
        }
      } else {
        if (isSunday(date)) {
          const confirmSunday = window.confirm('This is a Sunday. Mark as working day with bonus?');
          if (confirmSunday) {
            onAddHoliday?.(dateStr + '?sunday=true');
          }
        } else {
          onAddHoliday?.(dateStr);
        }
      }
    } else if (hour > 12 && hour <= 23) {
      // Late attendance (after 12 PM)
      const confirmHalfDay = window.confirm('Staff member arrived after 12 PM. Mark as half day?');
      if (confirmHalfDay) {
        onAddHoliday?.(dateStr + '?halfDay=true');
      } else {
        onAddHoliday?.(dateStr); // Mark as full day if confirmed
      }
    } else {
      alert('Attendance can only be marked between 8 AM and 11:59 PM');
    }
  };

  // Calculate salary details for the current period
  const salaryDetails = useMemo(() => {
    const daysInPeriod = 30; // Fixed 30-day period
    const perDaySalary = salary / daysInPeriod;
    
    let workingDays = 0;
    let sundayCount = 0;
    let holidayCount = 0;
    let halfDayCount = 0;

    currentPeriod.dates.forEach(date => {
      const dateStr = formatDate(date);
      const holiday = getHoliday(dateStr);
      const sunday = isSunday(date);
      
      if (sunday) {
        // Only count Sundays if they worked (have a holiday record marked as sunday)
        if (holiday?.type === 'weekly') {
          sundayCount++;
          workingDays++;
        }
      } else if (!holiday) {
        workingDays++;
      } else if (holiday.isHalfDay) {
        halfDayCount++;
        workingDays += 0.5;
      } else {
        holidayCount++;
      }
    });

    const baseSalary = workingDays * perDaySalary;
    const sundayBonusTotal = sundayCount * sundayBonus;
    const deductions = (holidayCount + (halfDayCount * 0.5)) * perDaySalary;
    const totalSalary = baseSalary + sundayBonusTotal - deductions;

    return {
      workingDays,
      sundayCount,
      holidayCount,
      halfDayCount,
      baseSalary,
      sundayBonus: sundayBonusTotal,
      deductions,
      totalSalary
    };
  }, [currentPeriod, salary, sundayBonus, holidays]);

  const formatPeriodDisplay = (startDate: Date, endDate: Date) => {
    const formatMonth = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short' });
    };

    if (startDate.getMonth() === endDate.getMonth()) {
      return `${formatMonth(startDate)} ${startDate.getDate()} - ${endDate.getDate()}, ${startDate.getFullYear()}`;
    } else {
      return `${formatMonth(startDate)} ${startDate.getDate()} - ${formatMonth(endDate)} ${endDate.getDate()}, ${startDate.getFullYear()}`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{name}</h3>
          <p className="text-sm text-gray-500">
            {formatPeriodDisplay(currentPeriod.startDate, currentPeriod.endDate)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onAddAdvance}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <IndianRupee className="w-4 h-4 mr-1" />
            Add Advance
          </button>
        </div>
      </div>

      {/* Salary Details */}
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Base Salary</p>
          <p className="text-lg font-semibold text-gray-900">
            ₹{Math.round(salaryDetails.baseSalary).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">
            {salaryDetails.workingDays} working days
            {salaryDetails.halfDayCount > 0 && ` (${salaryDetails.halfDayCount} half days)`}
          </p>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Sunday Bonus</p>
          <p className="text-lg font-semibold text-green-600">
            +₹{Math.round(salaryDetails.sundayBonus).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">
            {salaryDetails.sundayCount} Sundays worked
          </p>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Deductions</p>
          <p className="text-lg font-semibold text-red-600">
            -₹{Math.round(salaryDetails.deductions).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">
            {salaryDetails.holidayCount} full days + {salaryDetails.halfDayCount} half days
          </p>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Total Salary</p>
          <p className="text-lg font-semibold text-blue-600">
            ₹{Math.round(salaryDetails.totalSalary).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Advances Section */}
      {advances.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Active Advances</h4>
          <div className="space-y-2">
            {advances.map(advance => {
              const totalPaid = advance.payments.reduce((sum, p) => sum + p.amount, 0);
              const remaining = advance.amount - totalPaid;
              return (
                <div key={advance.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">₹{advance.amount.toLocaleString()}</span>
                    <span className="text-gray-500 mx-2">•</span>
                    <span className="text-gray-600">
                      Paid: ₹{totalPaid.toLocaleString()}
                    </span>
                  </div>
                  <span className={`font-medium ${
                    remaining > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    Remaining: ₹{remaining.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-xs font-medium text-gray-500 text-center p-1">
            {day}
          </div>
        ))}
        {currentPeriod.dates.map(date => {
          const dateStr = formatDate(date);
          const holiday = getHoliday(dateStr);
          const advancePayment = getAdvancePayment(dateStr);
          const isSalaryDay = isSalaryDate(date);
          const sunday = isSunday(date);

          return (
            <button
              key={dateStr}
              onClick={() => handleDateClick(date)}
              className={`
                relative p-2 rounded-lg text-center
                ${holiday ? 
                  holiday.isHalfDay ? 'bg-orange-50 hover:bg-orange-100' :
                  'bg-red-50 hover:bg-red-100' : 
                  isSalaryDay ? 'bg-green-50 hover:bg-green-100' :
                  sunday ? 'bg-yellow-50 hover:bg-yellow-100' :
                  'bg-gray-50 hover:bg-gray-100'
                }
                ${sunday ? 'font-medium text-yellow-600' : ''}
              `}
            >
              <div className="text-xs">
                {date.getDate()}
              </div>
              <>
                {holiday && (
                  <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                    holiday.isHalfDay ? 'bg-orange-500' : 'bg-red-500'
                  }`} />
                )}
                {isSalaryDay && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500" />
                )}
                {advancePayment && (
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-blue-500" />
                )}
              </>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600">
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-red-500 mr-2" />
          Full Day Off
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-orange-500 mr-2" />
          Half Day
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
          Salary Date
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
          Sunday
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
          Advance Payment
        </div>
      </div>
    </div>
  );
};

export default StaffCalendar;
