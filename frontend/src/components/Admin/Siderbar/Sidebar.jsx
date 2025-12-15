import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Building2, LayoutDashboard, Users, Calendar, Clock, FileText, Settings, X, DollarSign, CreditCard } from "lucide-react";

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation();

  const sidebarItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
    { name: "Employee Management", icon: Users, path: "/admin/employees" },
    { name: "Leave Management", icon: Calendar, path: "/admin/leaves" },
            { name: "Attendance",icon:Clock, path: "/admin/attendance" },
                        { name: "Department",icon:FileText, path: "/admin/department" },
 

        { name: "Task Management", icon: Calendar, path: "/admin/tasks" },
        { name: "Sales", icon: DollarSign, path: "/admin/sales" },
        { name: "Purchase Orders", icon: FileText, path: "/admin/purchase-orders" },
        { name: "Payslips", icon: CreditCard, path: "/admin/payslips" },

    // { name: "Reports", icon: FileText, path: "/admin/reports" },
    // { name: "Settings", icon: Settings, path: "/admin/settings" },
  ];

  return (
    <div
      className={`fixed inset-y-0 left-0 z-50 w-64 transform ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } transition-transform duration-300 ease-in-out lg:translate-x-0`}
    >
      <div className="glass-morphism h-full border-r border-secondary-700">
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-secondary-700">
          <div className="flex items-center space-x-3">
            {/* Logo Container - Fixed aspect ratio */}
            <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center bg-gradient-to-br from-neon-pink/10 to-neon-purple/10 border border-neon-pink/20 flex-shrink-0">
              <img
                src="/src/assets/logo.jpg"
                alt="Taruna Technology Logo"
                className="w-full h-full object-contain p-1"
              />
            </div>

            {/* Text Container */}
            <div className="flex flex-col justify-center min-w-0">
              <h1 className="text-base font-bold text-white leading-tight tracking-wide">
                Taruna Technology
              </h1>
              <p className="text-xs text-secondary-400 leading-tight mt-0.5">
                Admin Panel
              </p>
            </div>
          </div>

          {/* Close button for mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-secondary-400 hover:text-white transition-colors flex-shrink-0"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-8 px-4">
          <div className="space-y-2">
            {sidebarItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-r from-neon-pink/20 to-neon-purple/20 border border-neon-pink/30 text-white"
                      : "text-secondary-400 hover:text-white hover:bg-secondary-700/50"
                  }`}
                >
                  <item.icon
                    className={`w-5 h-5 ${isActive ? "text-neon-pink" : ""}`}
                  />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
