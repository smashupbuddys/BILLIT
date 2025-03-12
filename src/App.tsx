import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Expenses from './pages/Expenses';
import Parties from './pages/Parties';
import AddParty from './pages/AddParty';
import PartyDetails from './pages/PartyDetails';
import BulkEntry from './pages/BulkEntry';
import CreditSales from './pages/CreditSales';
import CreditSaleDetails from './pages/CreditSaleDetails';
import Staff from './pages/Staff';
import PendingOrders from './pages/PendingOrders';
import Report from './pages/Report';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/parties" element={<Parties />} />
          <Route path="/parties/add" element={<AddParty />} />
          <Route path="/parties/:id" element={<PartyDetails />} />
          <Route path="/bulk-entry" element={<BulkEntry />} />
          <Route path="/credit-sales" element={<CreditSales />} />
          <Route path="/credit-sales/:id" element={<CreditSaleDetails />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/pending-orders" element={<PendingOrders />} />
          <Route path="/report" element={<Report />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
