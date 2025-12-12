import React, { useState, useRef, useEffect } from "react";
import { Bell, RefreshCw, CheckCheck, Clock, User, Settings, AlertTriangle, X } from "lucide-react";

const NotificationBell = ({ unreadCount, notifications = [], onNotificationRead, onRefresh }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef(null);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      
      // Prevent body scroll on mobile when dropdown is open
      if (isMobile) {
        document.body.style.overflow = 'hidden';
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [dropdownOpen, isMobile]);

  // Handle refresh notifications
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setRefreshing(false), 1000);
    }
  };

  // Mark all as read
  const handleMarkAllRead = () => {
    notifications.filter(n => n.unread).forEach(n => onNotificationRead(n.id));
  };

  // Get notification icon based on type
  const getNotificationIcon = (type, category) => {
    const iconProps = { className: "w-4 h-4 flex-shrink-0" };
    
    switch (category) {
      case 'employee':
        return <User {...iconProps} className="w-4 h-4 text-blue-400 flex-shrink-0" />;
      case 'leave':
      case 'leaves':
        return <Clock {...iconProps} className="w-4 h-4 text-yellow-400 flex-shrink-0" />;
      case 'task':
        return <Settings {...iconProps} className="w-4 h-4 text-green-400 flex-shrink-0" />;
      case 'tasks':
        return type === 'error' 
          ? <AlertTriangle {...iconProps} className="w-4 h-4 text-red-400 flex-shrink-0" />
          : <Settings {...iconProps} className="w-4 h-4 text-yellow-400 flex-shrink-0" />;
      default:
        return <Bell {...iconProps} className="w-4 h-4 text-gray-400 flex-shrink-0" />;
    }
  };

  // Get notification color based on type
  const getNotificationColor = (type, unread) => {
    if (!unread) return 'text-secondary-400';
    
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      case 'info':
        return 'text-blue-400';
      default:
        return 'text-white';
    }
  };

  // Close dropdown
  const closeDropdown = () => {
    setDropdownOpen(false);
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="relative p-1.5 sm:p-2 text-secondary-400 hover:text-white transition-colors rounded-md"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-neon-pink rounded-full text-xs text-white flex items-center justify-center animate-pulse font-medium">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {dropdownOpen && !isMobile && (
          // Desktop dropdown
          <div className="absolute right-0 mt-2 w-80 xl:w-96 glass-morphism rounded-lg border border-secondary-600 shadow-xl z-50 max-h-96 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-secondary-600">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-white flex-shrink-0" />
                <h3 className="text-lg font-semibold text-white">Notifications</h3>
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-secondary-400 hover:text-white transition-colors flex items-center space-x-1 px-2 py-1 rounded hover:bg-secondary-700/30"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3 h-3" />
                    <span className="hidden sm:inline">Mark all read</span>
                  </button>
                )}
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="text-secondary-400 hover:text-white transition-colors disabled:opacity-50 p-1 rounded hover:bg-secondary-700/30"
                  title="Refresh notifications"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-secondary-600 mx-auto mb-3" />
                  <p className="text-secondary-400 text-sm">No notifications yet</p>
                  <p className="text-secondary-500 text-xs mt-1">
                    You'll see updates about activities here
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => {
                      if (notification.unread) {
                        onNotificationRead(notification.id);
                      }
                    }}
                    className={`p-4 border-b border-secondary-700 last:border-b-0 cursor-pointer transition-colors hover:bg-secondary-700/30 ${
                      notification.unread ? 'bg-secondary-800/30' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="mt-1 flex-shrink-0">
                        {getNotificationIcon(notification.type, notification.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${getNotificationColor(notification.type, notification.unread)} break-words`}>
                          {notification.message}
                        </p>
                        {notification.user && (
                          <p className="text-xs text-secondary-500 mt-1 truncate">
                            {notification.user}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-secondary-500">
                            {notification.time}
                          </span>
                          {notification.unread && (
                            <div className="w-2 h-2 bg-neon-pink rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-secondary-600 bg-secondary-800/20">
                <button className="w-full text-xs text-secondary-400 hover:text-white transition-colors text-center py-1">
                  View All Notifications
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Modal */}
      {dropdownOpen && isMobile && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeDropdown}
          />
          
          {/* Modal */}
          <div className="fixed bottom-0 left-0 right-0 max-h-[80vh] bg-gray-900 rounded-t-2xl border-t border-secondary-600 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-secondary-600">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-white" />
                <h3 className="text-lg font-semibold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-neon-pink text-white text-xs px-2 py-1 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-secondary-400 hover:text-white transition-colors flex items-center space-x-1 px-3 py-2 rounded-lg hover:bg-secondary-700/30"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Mark all read</span>
                  </button>
                )}
                <button
                  onClick={closeDropdown}
                  className="text-secondary-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-secondary-700/30"
                  aria-label="Close notifications"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[60vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-16 h-16 text-secondary-600 mx-auto mb-4" />
                  <p className="text-secondary-400 text-base mb-2">No notifications yet</p>
                  <p className="text-secondary-500 text-sm">
                    You'll see updates about activities here
                  </p>
                </div>
              ) : (
                <>
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => {
                        if (notification.unread) {
                          onNotificationRead(notification.id);
                        }
                      }}
                      className={`p-4 border-b border-secondary-700 last:border-b-0 active:bg-secondary-700/50 transition-colors ${
                        notification.unread ? 'bg-secondary-800/30' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="mt-1 flex-shrink-0">
                          {getNotificationIcon(notification.type, notification.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${getNotificationColor(notification.type, notification.unread)} leading-relaxed`}>
                            {notification.message}
                          </p>
                          {notification.user && (
                            <p className="text-sm text-secondary-500 mt-1">
                              {notification.user}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-sm text-secondary-500">
                              {notification.time}
                            </span>
                            {notification.unread && (
                              <div className="w-3 h-3 bg-neon-pink rounded-full flex-shrink-0"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Refresh Button for Mobile */}
                  <div className="p-4 border-t border-secondary-600">
                    <button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="w-full py-3 text-secondary-400 hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 rounded-lg hover:bg-secondary-700/30"
                    >
                      <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                      <span>{refreshing ? 'Refreshing...' : 'Refresh Notifications'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationBell;