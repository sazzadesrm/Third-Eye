/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { MasterData } from './pages/MasterData';
import { Invoices } from './pages/Invoices';
import { NewInvoice } from './pages/NewInvoice';
import { AuditTrail } from './pages/AuditTrail';
import { Settings } from './pages/Settings';
import { Voucher } from './pages/Voucher';

import { ThemeProvider } from './components/ThemeProvider';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/voucher/:id" element={<Voucher />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/new" element={<NewInvoice />} />
            <Route path="/invoices/edit/:id" element={<NewInvoice />} />
            <Route path="/master-data" element={<MasterData />} />
            <Route path="/audit-trail" element={<AuditTrail />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
