import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from "./pages/Common/login";
import ForgotPassword from './components/Common/ForgotPassword';
import AdminDashboardPage from './pages/Admin/AdminDashboardPage';
import EmployeeManagement from './pages/Admin/EmployeeManagement';
import EmployeeDashboard from './pages/Employee/EmployeeDashboard';
import ProtectedRoute from './routes/ProtectedRoute';
import './App.css';
import AdminLeaveManagement from './pages/Admin/AdminLeaveManagement';
import AdminTaskManagement from './pages/Admin/AdminTaskManagement';
import EmployeeLeaveRequests from './pages/Employee/EmployeeLeaveRequests';
import EmployeeTasks from './pages/Employee/EmployeeTasks';
import AdminAttendance from './pages/Admin/AdminAttendance';
import EmployeeAttendance from './pages/Employee/EmployeeAttendance';
import AdminFaceRegistration from './pages/Admin/AdminFaceRegistration';
import DepartmentManagementPage from './pages/Admin/DepartmentManagement';
import LeadManagement from './pages/Sales/LeadManagement';
import ProblemStatementPage from './pages/Employee/ProblemStatementPage';
import SalesPage from './pages/Employee/Sales';
import AdminSalesDashboard from './pages/Admin/AdminSalesDashboard';
import PurchaseOrders from './pages/Admin/PurchaseOrders';
import AdminProfile from './pages/Admin/AdminProfile';
import AdminSettings from './pages/Admin/AdminSettings';
import EmployeeProfile from './pages/Employee/EmployeeProfile';
import EmployeeSettings from './pages/Employee/EmployeeSettings';

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          {/* Auth Routes */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute role="admin">
              <AdminDashboardPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/employees" element={
            <ProtectedRoute role="admin">
              <EmployeeManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin/attendance" element={
            <ProtectedRoute role="admin">
              <AdminAttendance/>
            </ProtectedRoute>
          } />
          <Route path="/admin/leaves" element={
            <ProtectedRoute role="admin">
              <AdminLeaveManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin/department" element={
            <ProtectedRoute role="admin">
              <DepartmentManagementPage/>
            </ProtectedRoute>
          } />
          <Route path="/admin/tasks" element={
            <ProtectedRoute role="admin">
              <AdminTaskManagement/>
            </ProtectedRoute>
          } />
          <Route path="/admin/face-registration" element={
            <ProtectedRoute role="admin">
              <AdminFaceRegistration/>
            </ProtectedRoute>
          } />
          <Route path="/admin/sales" element={
            <ProtectedRoute role="admin">
              <AdminSalesDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/purchase-orders" element={
            <ProtectedRoute role="admin">
              <PurchaseOrders />
            </ProtectedRoute>
          } />
          <Route path="/admin/profile" element={
            <ProtectedRoute role="admin">
              <AdminProfile />
            </ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute role="admin">
              <AdminSettings />
            </ProtectedRoute>
          } />
          
          {/* Employee Routes */}
          <Route path="/employee/dashboard" element={
            <ProtectedRoute role="employee">
              <EmployeeDashboard />
            </ProtectedRoute>
          } />
          <Route path="/employee/leaves" element={
            <ProtectedRoute role="employee">
              <EmployeeLeaveRequests />
            </ProtectedRoute>
          } />
          <Route path="/employee/attendance" element={
            <ProtectedRoute role="employee">
              <EmployeeAttendance/>
            </ProtectedRoute>
          } />
          <Route path="/employee/tasks" element={
            <ProtectedRoute role="employee">
              <EmployeeTasks />
            </ProtectedRoute>
          } />
          <Route path="/employee/leads" element={
            <ProtectedRoute role="employee">
              <LeadManagement/>
            </ProtectedRoute>
          } />
          <Route path="/employee/problems" element={
            <ProtectedRoute role="employee">
              <ProblemStatementPage />
            </ProtectedRoute>
          } />
          <Route path="/employee/sales" element={
            <ProtectedRoute role="employee">
              <SalesPage />
            </ProtectedRoute>
          } />
          <Route path="/employee/profile" element={
            <ProtectedRoute role="employee">
              <EmployeeProfile />
            </ProtectedRoute>
          } />
          <Route path="/employee/settings" element={
            <ProtectedRoute role="employee">
              <EmployeeSettings />
            </ProtectedRoute>
          } />
        </Routes>
        <Toaster position="top-right" />
      </Router>
    </div>
  );
}

export default App;