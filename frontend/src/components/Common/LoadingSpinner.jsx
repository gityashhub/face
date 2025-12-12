// components/Common/LoadingSpinner.js
import React from 'react';

const LoadingSpinner = ({ 
  message = "Loading...", 
  size = "large", 
  color = "neon-pink",
  showMessage = true 
}) => {
  const sizeClasses = {
    small: "w-6 h-6",
    medium: "w-12 h-12",
    large: "w-16 h-16"
  };

  const colorClasses = {
    'neon-pink': 'border-neon-pink',
    'neon-purple': 'border-neon-purple',
    'white': 'border-white',
    'gray': 'border-gray-400'
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px]">
      {/* Spinner */}
      <div className="relative">
        <div className={`${sizeClasses[size]} border-4 border-transparent border-t-4 ${colorClasses[color]} rounded-full animate-spin`}></div>
        <div className={`absolute inset-0 ${sizeClasses[size]} border-4 border-transparent border-r-4 ${colorClasses[color]} rounded-full animate-spin`} style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
      </div>
      
      {/* Message */}
      {showMessage && (
        <div className="mt-4 text-center">
          <p className="text-white text-lg font-medium">{message}</p>
          <div className="flex items-center justify-center mt-2 space-x-1">
            <div className="w-2 h-2 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadingSpinner;