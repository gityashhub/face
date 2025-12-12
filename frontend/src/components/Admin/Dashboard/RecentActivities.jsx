// components/Dashboard/RecentActivities.js
import React from 'react';
import { Clock } from 'lucide-react';

const RecentActivities = ({ activities = [], loading = false }) => {
  const getActivityTypeStyles = (type) => {
    const styles = {
      success: 'bg-green-400',
      warning: 'bg-yellow-400',
      info: 'bg-blue-400',
      error: 'bg-red-400'
    };
    return styles[type] || styles.info;
  };

  const formatActivityTime = (timeString) => {
    try {
      const time = new Date(timeString);
      const now = new Date();
      const diffInMinutes = Math.floor((now - time) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
      
      return time.toLocaleDateString();
    } catch (error) {
      return timeString || 'Unknown time';
    }
  };

  if (loading) {
    return (
      <div className="glass-morphism neon-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Recent Activities</h2>
          <Clock className="w-5 h-5 text-neon-pink animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start space-x-3 p-3 rounded-lg">
                <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-600 rounded mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2 mb-1"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-morphism neon-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Recent Activities</h2>
        <Clock className="w-5 h-5 text-neon-pink" />
      </div>
      <div className="space-y-4 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600">
        {activities.length > 0 ? (
          activities.map((activity, index) => (
            <div 
              key={activity.id || index} 
              className="flex items-start space-x-3 p-3 rounded-lg hover:bg-secondary-700/30 transition-all duration-200 cursor-pointer group"
            >
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getActivityTypeStyles(activity.type)} shadow-sm`}></div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm leading-relaxed group-hover:text-neon-pink transition-colors">
                  {activity.action || activity.description}
                </p>
                {activity.user && (
                  <p className="text-neon-pink text-sm font-medium mt-1">
                    {activity.user}
                  </p>
                )}
                <p className="text-secondary-400 text-xs mt-1">
                  {formatActivityTime(activity.time || activity.timestamp || activity.createdAt)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-secondary-500 mx-auto mb-4" />
            <p className="text-secondary-400 text-lg">No recent activities</p>
            <p className="text-secondary-500 text-sm mt-2">Activities will appear here as they happen</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivities;