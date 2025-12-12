// components/Dashboard/StatCard.js
import React from 'react';

const StatCard = ({ stat, index }) => {
  const getChangeStyles = (changeType) => {
    const styles = {
      positive: 'text-green-400 bg-green-400/10',
      negative: 'text-red-400 bg-red-400/10',
      neutral: 'text-gray-400 bg-gray-400/10'
    };
    return styles[changeType] || styles.neutral;
  };

  return (
    <div className="glass-morphism neon-border rounded-2xl p-6 hover-glow transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-lg flex items-center justify-center shadow-lg`}>
          <stat.icon className="w-6 h-6 text-white" />
        </div>
        {stat.change && (
          <span className={`text-sm font-medium px-2 py-1 rounded-full transition-colors ${getChangeStyles(stat.changeType)}`}>
            {stat.change}
          </span>
        )}
      </div>
      <div>
        <h3 className="text-2xl font-bold text-white mb-1 transition-colors">
          {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
        </h3>
        <p className="text-secondary-400 text-sm">{stat.title}</p>
      </div>
    </div>
  );
};

export default StatCard;