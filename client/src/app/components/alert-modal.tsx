"use client";
import Image from "next/image";

interface AlertModalProps {
  open: boolean;
  onClose: () => void;
  message: string;
  type?: 'success' | 'error' | 'info';
}

export function AlertModal({ open, onClose, message, type = 'info' }: AlertModalProps) {
  if (!open) return null;

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-[#02C060]';
      case 'error':
        return 'bg-red-500';
      case 'info':
      default:
        return 'bg-blue-500';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative bg-white rounded-2xl p-6 w-[95vw] max-w-xs mx-auto shadow-lg">
        <button
          className="absolute top-3 right-4 text-red-600 text-xl font-bold focus:outline-none cursor-pointer"
          onClick={onClose}
          aria-label="Close"
        >
          <Image src="/x.svg" alt="x" width={10} height={10} />
        </button>
        
        <div className="flex flex-col items-center">
          <div className={`w-12 h-12 rounded-full ${getBackgroundColor()} flex items-center justify-center text-white text-xl font-bold mb-4`}>
            {getIcon()}
          </div>
          
          <h2 className="text-center text-[#000000] mb-2"
            style={{
              fontFamily: 'Poppins',
              fontWeight: 500,
              fontStyle: 'medium',
              fontSize: '18px',
              lineHeight: '18px',
              letterSpacing: '0%',
              textAlign: 'center',
            }}
          >
            {type === 'success' ? 'Success!' : type === 'error' ? 'Error!' : 'Info'}
          </h2>
          
          <p className="text-center text-gray-600 mb-6"
            style={{
              fontFamily: 'Poppins',
              fontWeight: 400,
              fontStyle: 'regular',
              fontSize: '14px',
              lineHeight: '18px',
              letterSpacing: '0%',
              textAlign: 'center',
            }}
          >
            {message}
          </p>
          
          <button
            className={`${getBackgroundColor()} text-white font-bold py-2 px-6 rounded-lg w-[100px] cursor-pointer`}
            onClick={onClose}
            style={{
              fontFamily: 'Poppins',
              fontWeight: 600,
              fontStyle: 'semibold',
              fontSize: '14px',
              lineHeight: '18px',
              letterSpacing: '0%',
              textAlign: 'center',
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
} 