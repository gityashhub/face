// components/Dashboard/UpcomingEvents.js
import React from 'react';
import { Calendar } from 'lucide-react';

const UpcomingEvents = ({ events = [], loading = false }) => {
  const formatEventDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const isToday = date.toDateString() === today.toDateString();
      const isTomorrow = date.toDateString() === tomorrow.toDateString();
      
      if (isToday) return 'Today';
      if (isTomorrow) return 'Tomorrow';
      
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      return dateString || 'Unknown date';
    }
  };

  const getDepartmentColor = (department) => {
    const colors = {
      'HR': 'bg-pink-500/20 text-pink-400',
      'IT': 'bg-blue-500/20 text-blue-400',
      'Finance': 'bg-green-500/20 text-green-400',
      'Marketing': 'bg-purple-500/20 text-purple-400',
      'Operations': 'bg-orange-500/20 text-orange-400',
      'Sales': 'bg-yellow-500/20 text-yellow-400'
    };
    return colors[department] || 'bg-gray-500/20 text-gray-400';
  };

  const isEventSoon = (dateString, timeString) => {
    try {
      const eventDate = new Date(`${dateString} ${timeString}`);
      const now = new Date();
      const diffInHours = (eventDate - now) / (1000 * 60 * 60);
      return diffInHours <= 24 && diffInHours > 0;
    } catch (error) {
      return false;
    }
  };

  if (loading) {
    return (
      <div className="glass-morphism neon-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Upcoming Events</h2>
          <Calendar className="w-5 h-5 text-neon-purple animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="p-4 rounded-lg border border-secondary-600">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-4 bg-gray-600 rounded w-3/4"></div>
                  <div className="h-6 bg-gray-700 rounded-full w-16"></div>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="h-3 bg-gray-700 rounded w-20"></div>
                  <div className="h-3 bg-gray-700 rounded w-16"></div>
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
        <h2 className="text-xl font-bold text-white">Upcoming Events</h2>
        <Calendar className="w-5 h-5 text-neon-purple" />
      </div>
      <div className="space-y-4 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600">
        {events.length > 0 ? (
          events.map((event, index) => (
            <div 
              key={event.id || index} 
              className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer group ${
                isEventSoon(event.date, event.time)
                  ? 'border-neon-pink/50 bg-neon-pink/5 hover:border-neon-pink'
                  : 'border-secondary-600 hover:border-neon-purple/30 hover:bg-secondary-700/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-medium group-hover:text-neon-purple transition-colors truncate flex-1">
                  {event.title}
                </h4>
                {event.department && (
                  <span className={`text-xs px-2 py-1 rounded-full ml-2 flex-shrink-0 ${getDepartmentColor(event.department)}`}>
                    {event.department}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-sm text-secondary-400">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatEventDate(event.date)}
                  </span>
                  {event.time && (
                    <span className="flex items-center">
                      🕐 {event.time}
                    </span>
                  )}
                </div>
                {isEventSoon(event.date, event.time) && (
                  <span className="text-xs px-2 py-1 bg-neon-pink/20 text-neon-pink rounded-full animate-pulse">
                    Soon
                  </span>
                )}
              </div>
              {event.description && (
                <p className="text-secondary-400 text-xs mt-2 line-clamp-2">
                  {event.description}
                </p>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-secondary-500 mx-auto mb-4" />
            <p className="text-secondary-400 text-lg">No upcoming events</p>
            <p className="text-secondary-500 text-sm mt-2">Events will be displayed here when scheduled</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default UpcomingEvents;