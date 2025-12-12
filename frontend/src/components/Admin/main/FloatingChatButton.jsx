import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';

const FloatingChatButton = ({ isAdmin, onClick }) => {
  if (!isAdmin) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 bg-neon-purple hover:bg-neon-purple/80 text-white p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 z-50"
      aria-label="Open Admin AI Chatbot"
    >
      <MessageCircle size={24} />
    </button>
  );
};

export default FloatingChatButton;
