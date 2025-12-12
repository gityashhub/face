import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../Siderbar/Sidebar";
import Header from "../Header/Header";

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const sidebarItems = [
    { name: "Dashboard", path: "/admin/dashboard" },
    { name: "Employee Management", path: "/admin/employees" },
    { name: "Leave Management", path: "/admin/leaves" },
    { name: "Attendance", path: "/admin/attendance" },
    { name: "Department", path: "/admin/department" },
    { name: "Task Management", path: "/admin/tasks" },
  ];

  return (
    <div className="min-h-screen flex bg-secondary-900 relative">
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-64"> {/* 👈 Push content right by sidebar width */}
        {/* Header */}
        <Header
          sidebarItems={sidebarItems}
          location={location}
          setSidebarOpen={setSidebarOpen}
        />
        
        {/* Main Content (with top padding to avoid header overlap) */}
        <main className="p-4 sm:p-6 pt-16 lg:pt-6 flex-1 overflow-y-auto"> {/* 👈 Add pt-16 to avoid header overlap */}
          {children}
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default AdminLayout;