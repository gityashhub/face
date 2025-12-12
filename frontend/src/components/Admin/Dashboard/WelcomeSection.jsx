// components/Dashboard/WelcomeSection.js
import React, { useMemo } from 'react';

const WelcomeSection = ({ userName = 'Admin' }) => {
  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }, []);

  const currentTime = useMemo(() => {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  return (
    <div className="glass-morphism neon-border rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, <span className="neon-text">{userName}!</span>
          </h1>
          <p className="text-secondary-400">Here's what's happening in your company today.</p>
        </div>
        <div className="hidden md:flex items-center space-x-6">
          <div className="text-right">
            <p className="text-sm text-secondary-400">Today's Date</p>
            <p className="text-lg font-semibold text-white">
              {formattedDate}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-secondary-400">Current Time</p>
            <p className="text-lg font-semibold text-neon-pink">
              {currentTime}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeSection;