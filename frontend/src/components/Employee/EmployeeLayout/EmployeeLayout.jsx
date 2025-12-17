import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  LayoutDashboard,
  User,
  Calendar,
  Clock,
  FileText,
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
import { authAPI } from '../../../utils/api';
import { allowedKeysForDepartment, normalizeDepartment } from '../../../utils/departmentAccess';

const getInitialEmployeeData = () => {
  const storedDepartment = localStorage.getItem('userDepartment');
  const storedName = localStorage.getItem('userName');
  const storedEmail = localStorage.getItem('userEmail');
  const storedEmployeeId = localStorage.getItem('employeeId');
  
  if (storedDepartment || storedName || storedEmail) {
    return {
      personalInfo: {
        firstName: storedName?.split(' ')[0] || 'Unknown',
        lastName: storedName?.split(' ')[1] || 'User',
      },
      workInfo: {
        position: 'Employee',
        department: storedDepartment || 'N/A',
      },
      employeeId: storedEmployeeId || 'N/A',
      contactInfo: {
        personalEmail: storedEmail || 'user@company.com',
      },
    };
  }
  return null;
};

const EmployeeLayout = ({ children, employeeData }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [notificationDropdown, setNotificationDropdown] = useState(false);
  const [fetchedEmployeeData, setFetchedEmployeeData] = useState(() => employeeData || getInitialEmployeeData());
  const [loading, setLoading] = useState(!employeeData && !getInitialEmployeeData());
  const [notifications, setNotifications] = useState([
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
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  // Fetch employee data on mount if not provided via props
  // This runs in the background to get fresh data, but doesn't block the UI
  useEffect(() => {
    const fetchEmployeeData = async () => {
      // If employeeData is already provided via props, use it and don't fetch
      if (employeeData) {
        setFetchedEmployeeData(employeeData);
        setLoading(false);
        return;
      }

      // Check if we have initial data from localStorage - don't show loading if we do
      const hasInitialData = getInitialEmployeeData() !== null;
      
      // Only show loading spinner if we have no data at all
      if (!hasInitialData && !fetchedEmployeeData) {
        setLoading(true);
      }

      try {
        const response = await authAPI.getProfile();

        if (response.data.success) {
          const userData = response.data.data.user;
          const employeeDataFromAPI = response.data.data.employee;

          // Combine user and employee data
          const combinedData = {
            personalInfo: {
              firstName: employeeDataFromAPI?.personalInfo?.firstName || userData.name?.split(' ')[0] || 'Unknown',
              lastName: employeeDataFromAPI?.personalInfo?.lastName || userData.name?.split(' ')[1] || 'User',
            },
            workInfo: {
              position: employeeDataFromAPI?.workInfo?.position || 'Employee',
              department: employeeDataFromAPI?.workInfo?.department?.name || 'N/A',
            },
            employeeId: userData.employeeId || employeeDataFromAPI?.employeeId || 'N/A',
            contactInfo: {
              personalEmail: userData.email || employeeDataFromAPI?.contactInfo?.personalEmail || localStorage.getItem("userEmail") || 'user@company.com',
            },
            user: userData,
          };

          setFetchedEmployeeData(combinedData);

          // Update localStorage with fresh data including department
          if (userData.name) localStorage.setItem('userName', userData.name);
          if (userData.email) localStorage.setItem('userEmail', userData.email);
          if (userData.employeeId) localStorage.setItem('employeeId', userData.employeeId);
          if (combinedData.workInfo?.department) localStorage.setItem('userDepartment', combinedData.workInfo.department);
        }
      } catch (error) {
        console.error('Error fetching employee data in layout:', error);
        // Only set fallback if we don't already have data
        if (!fetchedEmployeeData) {
          setFetchedEmployeeData({
            personalInfo: {
              firstName: localStorage.getItem('userName')?.split(' ')[0] || 'Unknown',
              lastName: localStorage.getItem('userName')?.split(' ')[1] || 'User',
            },
            workInfo: {
              position: 'Employee',
              department: localStorage.getItem('userDepartment') || 'N/A',
            },
            employeeId: localStorage.getItem('employeeId') || 'N/A',
            contactInfo: {
              personalEmail: localStorage.getItem("userEmail") || 'user@company.com',
            },
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, [employeeData]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

// Navigation catalog keyed for reuse in department-based filtering
const NAV_CATALOG = {
  dashboard: { name: "Dashboard", icon: LayoutDashboard, path: "/employee/dashboard" },
  attendance: { name: "Attendance", icon: Clock, path: "/employee/attendance" },
  leaves: { name: "Leave Requests", icon: Calendar, path: "/employee/leaves" },
  tasks: { name: "Tasks", icon: FileText, path: "/employee/tasks" },
  problems: { name: "Problem Statement", icon: AlertCircle, path: "/employee/problems" },
  sales: { name: "Sales", icon: TrendingUp, path: "/employee/sales" },
};

  // Use fetched data, passed employeeData prop, or fallback
  const emp = fetchedEmployeeData || employeeData || {
    personalInfo: { firstName: "Unknown", lastName: "User" },
    workInfo: { position: "Employee", department: "N/A" },
    employeeId: "N/A",
    contactInfo: {
      personalEmail: localStorage.getItem("userEmail") || "user@company.com",
    },
  };

  // Pick nav items based on department (fallback to full list if not matched)
  const deptKey = normalizeDepartment(
    emp.workInfo?.department?.name || emp.workInfo?.department
  );
  const allowedKeys = allowedKeysForDepartment(deptKey);
  const sidebarItems = allowedKeys.map((key) => NAV_CATALOG[key]).filter(Boolean);

  const handleLogout = () => {
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("token");
    toast.success("Logged out successfully!");
    navigate("/login");
  };

  const markAsRead = (notificationId) => {
    setNotifications(notifications.map(n =>
      n.id === notificationId ? { ...n, unread: false } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
    toast.success('All notifications marked as read');
  };

  const unreadNotifications = notifications.filter((n) => n.unread).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-900 via-secondary-800 to-secondary-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-neon-pink border-t-transparent rounded-full animate-spin"></div>
          <p className="text-secondary-400 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

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
                  Employee Portal
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
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => setNotificationDropdown(!notificationDropdown)}
                  className="relative p-2 text-secondary-400 hover:text-white transition-colors"
                >
                  <Bell className="w-6 h-6" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-neon-pink rounded-full text-xs text-white flex items-center justify-center animate-pulse">
                      {unreadNotifications}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {notificationDropdown && (
                  <div className="absolute right-0 mt-2 w-80 glass-morphism rounded-lg border border-secondary-600 shadow-lg z-50 max-h-96 overflow-hidden">
                    <div className="p-4 border-b border-secondary-600 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">Notifications</h3>
                      {unreadNotifications > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-neon-pink hover:text-neon-purple transition-colors"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            onClick={() => markAsRead(notification.id)}
                            className={`p-4 border-b border-secondary-700 hover:bg-secondary-700/30 cursor-pointer transition-colors ${
                              notification.unread ? 'bg-neon-pink/5' : ''
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                notification.unread ? 'bg-neon-pink' : 'bg-secondary-600'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${
                                  notification.unread ? 'text-white font-medium' : 'text-secondary-300'
                                }`}>
                                  {notification.message}
                                </p>
                                <p className="text-xs text-secondary-500 mt-1">
                                  {notification.time}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <Bell className="w-12 h-12 text-secondary-600 mx-auto mb-3" />
                          <p className="text-secondary-400 text-sm">No notifications</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Dropdown */}
              <div className="relative" ref={profileRef}>
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
