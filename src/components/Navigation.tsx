import React, { useState, useRef, useEffect } from 'react';
    import { useLocation, useNavigate } from 'react-router-dom';
    import { LayoutDashboard, IndianRupee, Users, FileSpreadsheet, Menu, Receipt, CreditCard, UserCircle, Package, FileText } from 'lucide-react';

    interface NavigationProps {
      isMobileMenuOpen: boolean;
    }

    const Navigation: React.FC<NavigationProps> = ({ isMobileMenuOpen }) => {
      const location = useLocation();
      const navigate = useNavigate();
      const navRef = useRef<HTMLDivElement>(null);

      const navItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard, file: 'src/pages/Dashboard.tsx' },
        { path: '/sales', label: 'Sales', icon: IndianRupee, file: 'src/pages/Sales.tsx' },
        { path: '/credit-sales', label: 'Credit Buyers', icon: CreditCard, file: 'src/pages/CreditSales.tsx', badge: 'notifications' },
        { path: '/expenses', label: 'Expenses', icon: Receipt, file: 'src/pages/Expenses.tsx' },
        { path: '/parties', label: 'Manufacturers', icon: Users, file: 'src/pages/Parties.tsx' },
        { path: '/staff', label: 'Staff', icon: UserCircle, file: 'src/pages/Staff.tsx' },
        { path: '/bulk-entry', label: 'Bulk Transactions', icon: FileSpreadsheet, file: 'src/pages/BulkEntry/index.tsx' },
        { path: '/pending-orders', label: 'Pending Orders', icon: Package, file: 'src/pages/PendingOrders.tsx' },
        { path: '/report', label: 'Report', icon: FileText, file: 'src/pages/Report.tsx' }
      ].map(item => ({ ...item, url: item.path }));

      const handleNavigation = (path: string) => {
        navigate(path);
      };

      return (
        <nav className={`
          lg:block
          ${isMobileMenuOpen ? 'block' : 'hidden'}
        `}>
          <div className="px-2 py-2">
            <div
              ref={navRef}
              className="flex overflow-x-auto scrollbar-hide lg:overflow-x-visible lg:flex-row lg:items-center lg:space-x-1"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={`
                      flex items-center px-3 py-2 rounded-lg whitespace-nowrap
                      transition-colors duration-200 relative
                      ${isActive
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="ml-3 text-sm font-medium">{item.label}</span>
                    {item.badge === 'notifications' && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      );
    };

    export default Navigation;
