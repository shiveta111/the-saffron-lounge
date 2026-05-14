"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnUrl?: string;
}

const RegistrationModal: React.FC<RegistrationModalProps> = ({ 
  isOpen, 
  onClose,
  returnUrl 
}) => {
  const router = useRouter();

  if (!isOpen) return null;

  const handleRegister = () => {
    const url = returnUrl 
      ? `/auth/register?returnUrl=${encodeURIComponent(returnUrl)}`
      : '/auth/register';
    router.push(url);
  };

  const handleLogin = () => {
    const url = returnUrl 
      ? `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`
      : '/auth/login';
    router.push(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#18181c] rounded-lg shadow-2xl max-w-md w-full mx-4 border border-[#23232a]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-[#f36b24] bg-opacity-20 rounded-full flex items-center justify-center">
              <svg 
                className="w-8 h-8 text-[#f36b24]" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" 
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white text-center mb-3">
            Login Required
          </h2>

          {/* Message */}
          <p className="text-gray-300 text-center mb-8">
            Please create an account or log in to start ordering from our delicious menu.
          </p>

          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleRegister}
              className="w-full py-3 px-6 bg-[#f36b24] text-white font-semibold rounded-lg hover:bg-[#d45a1f] transition-colors duration-300"
            >
              Create Account
            </button>
            
            <button
              onClick={handleLogin}
              className="w-full py-3 px-6 bg-[#23232a] text-white font-semibold rounded-lg hover:bg-[#2a2a32] transition-colors duration-300 border border-[#3a3a42]"
            >
              Log In
            </button>
          </div>

          {/* Additional info */}
          <p className="text-sm text-gray-400 text-center mt-6">
            Creating an account is quick and easy!
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationModal;
