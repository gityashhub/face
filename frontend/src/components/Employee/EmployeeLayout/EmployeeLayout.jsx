import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  LayoutDashboard,
  User,
  Calendar,
  Clock,
  FileText,
  Settings,
  Bell,
  LogOut,
  ChevronDown,
  Menu,
  X,
  CreditCard,
  Phone,
  MapPin,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";

const EmployeeLayout = ({ children, employeeData }) => {
  // 👈 Accept prop
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [notifications] = useState([
    {
      id: 1,
      message: "Welcome to the company!",
      time: "1 hour ago",
      unread: true,
    },
    {
      id: 2,
      message: "Please complete your profile",
      time: "2 hours ago",
      unread: true,
    },
    {
      id: 3,
      message: "Team meeting scheduled for tomorrow",
      time: "1 day ago",
      unread: false,
    },
  ]);

  const location = useLocation();
  const navigate = useNavigate();

 // In EmployeeLayout.js
const sidebarItems = [
  { name: "Dashboard", icon: LayoutDashboard, path: "/employee/dashboard" },
  { name: "Attendance", icon: Clock, path: "/employee/attendance" },
  { name: "Leave Requests", icon: Calendar, path: "/employee/leaves" },
  { name: "Tasks", icon: FileText, path: "/employee/tasks" },
  { name: "Problem Statement", icon: AlertCircle, path: "/employee/problems" },
  { name: "Sales", icon: TrendingUp, path: "/employee/sales" },
];
  // Use passed employeeData or fallback
  const emp = employeeData || {
    personalInfo: { firstName: "Unknown", lastName: "User" },
    workInfo: { position: "Employee", department: "N/A" },
    employeeId: "N/A",
    contactInfo: {
      personalEmail: localStorage.getItem("userEmail") || "user@company.com",
    },
  };

  const handleLogout = () => {
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("token");
    toast.success("Logged out successfully!");
    navigate("/login");
  };

  const unreadNotifications = notifications.filter((n) => n.unread).length;

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-secondary-900 via-secondary-800 to-secondary-900 relative">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-10 -left-10 w-72 h-72 bg-neon-pink opacity-5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-neon-purple opacity-5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="glass-morphism h-full border-r border-secondary-700">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-secondary-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-neon-pink to-neon-purple rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Taruna Technology</h1>
                <p className="text-xs text-secondary-400">Employee Portal</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-secondary-400 hover:text-white"
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
    <header className="bg-gray-900 border-b border-secondary-700 h-16 z-40 sticky top-0">
      <div className="flex items-center justify-between h-full px-6">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-secondary-400 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Page Title */}
            <div className="hidden lg:block">
              <h2 className="text-xl font-semibold text-white">
                {sidebarItems.find((item) => item.path === location.pathname)
                  ?.name || "Dashboard"}
              </h2>
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button className="relative p-2 text-secondary-400 hover:text-white transition-colors">
                  <Bell className="w-6 h-6" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-neon-pink rounded-full text-xs text-white flex items-center justify-center animate-pulse">
                      {unreadNotifications}
                    </span>
                  )}
                </button>
              </div>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileDropdown(!profileDropdown)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-secondary-700/50 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-neon-pink to-neon-purple rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-white">
                      {emp.personalInfo?.firstName} {emp.personalInfo?.lastName}
                    </p>
                    <p className="text-xs text-secondary-400">
                      {emp.contactInfo?.personalEmail || emp.user?.email}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-secondary-400" />
                </button>

                {/* Dropdown Menu */}
                {profileDropdown && (
                  <div className="absolute right-0 mt-2 w-64 glass-morphism rounded-lg border border-secondary-600 shadow-lg z-50">
                    <div className="p-4 border-b border-secondary-600">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-neon-pink to-neon-purple rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {emp.personalInfo?.firstName}{" "}
                            {emp.personalInfo?.lastName}
                          </p>
                          <p className="text-xs text-neon-pink">
                            {emp.workInfo?.position}
                          </p>
                          <p className="text-xs text-secondary-400">
                            {emp.employeeId}
                          </p>{" "}
                          {/* ✅ REAL ID */}
                        </div>
                      </div>
                    </div>

                    <div className="py-2">
                      <Link
                        to="/employee/profile"
                        className="flex items-center px-4 py-2 text-sm text-secondary-300 hover:text-white hover:bg-secondary-700/50"
                        onClick={() => setProfileDropdown(false)}
                      >
                        <User className="w-4 h-4 mr-3" />
                        Profile Information
                      </Link>
                      <Link
                        to="/employee/settings"
                        className="flex items-center px-4 py-2 text-sm text-secondary-300 hover:text-white hover:bg-secondary-700/50"
                        onClick={() => setProfileDropdown(false)}
                      >
                        <Settings className="w-4 h-4 mr-3" />
                        Settings
                      </Link>
                      <Link
                        to="/employee/attendance"
                        className="flex items-center px-4 py-2 text-sm text-secondary-300 hover:text-white hover:bg-secondary-700/50"
                        onClick={() => setProfileDropdown(false)}
                      >
                        <Clock className="w-4 h-4 mr-3" />
                        My Attendance
                      </Link>
                      <hr className="my-2 border-secondary-600" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-secondary-700/50"
                      >
                        <LogOut className="w-4 h-4 mr-3" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 relative z-10">{children}</main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default EmployeeLayout;
