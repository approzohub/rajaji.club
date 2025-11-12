"use client";
import { useRef, useState } from "react";
import Image from 'next/image';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (identifier: string, password: string) => Promise<void>;
  error?: string;
  isLoading?: boolean;
}

export function LoginModal({ open, onClose, onSubmit, error, isLoading = false }: LoginModalProps) {
  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});

  if (!open) return null;

  // Handle numeric input for mobile number
  function handleMobileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    // Only allow digits
    if (value === '' || /^\d+$/.test(value)) {
      e.target.value = value;
    } else {
      e.target.value = value.replace(/\D/g, '');
    }
  }

  // Validate mobile number format
  function validateMobileNumber(mobile: string): boolean {
    return /^\d{10}$/.test(mobile);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const identifier = identifierRef.current?.value || "";
    const password = passwordRef.current?.value || "";
    const newErrors: { identifier?: string; password?: string } = {};
    
    if (!identifier.trim()) {
      newErrors.identifier = "Mobile number is required.";
    } else if (!validateMobileNumber(identifier)) {
      newErrors.identifier = "Please enter a valid 10-digit mobile number.";
    }
    
    if (!password.trim()) {
      newErrors.password = "Password is required.";
    }
    
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    
    try {
      await onSubmit(identifier, password);
    } catch {
      // Login submission error
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 transition-opacity duration-300 ease-out animate-fadein">
      <div className="relative bg-white rounded-2xl p-6 w-[85vw] max-w-md mx-auto shadow-lg transform transition-all duration-300 ease-out animate-modalin">
        <button
          className="absolute top-4 right-4 focus:outline-none cursor-pointer"
          onClick={onClose}
          disabled={isLoading}
          aria-label="Close"
        >
          <Image src="/x.svg" alt="Close" width={15} height={15} style={{ display: 'block' }} />
        </button>
        <h2
          className="mt-4 mb-2 ps-4"
          style={{
            fontWeight: 500,
            fontStyle: 'normal',
            fontSize: '22px',
            lineHeight: '18px',
            letterSpacing: 0,
            color: '#000000'
          }}
        >
          Sign In
        </h2>
        {error && <div className="text-red-600 text-center mb-2 font-semibold">{error}</div>}
        <form className="flex flex-col gap-2 p-4" onSubmit={handleSubmit}>
          <label
            className= "text-black"
            htmlFor="identifier"
            style={{
              fontWeight: 400,
              fontStyle: 'normal',
              fontSize: '18px',
              lineHeight: '27px',
              letterSpacing: 0,
              color: '#000000'
            }}
          >
            Mobile Number
          </label>
          <input
            id="identifier"
            ref={identifierRef}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={10}
            disabled={isLoading}
            className={`rounded px-4 py-2 text-lg outline-none border-none text-black ${errors.identifier ? 'border border-red-500' : ''}`}
            autoComplete="tel"
            placeholder="Enter 10-digit mobile number"
            onChange={handleMobileInput}
            style={{
              backgroundColor: '#EDEDED'
            }}
          />
          {errors.identifier && <span className="text-red-500 text-sm mt-2">{errors.identifier}</span>}
          <label    className= "text-black pt-2"
            htmlFor="password"
            style={{
              fontWeight: 400,
              fontStyle: 'normal',
              fontSize: '18px',
              lineHeight: '27px',
              letterSpacing: 0,
              color: '#000000'
            }}>Password</label>
          <input
            id="password"
            ref={passwordRef}
            type="password"
            disabled={isLoading}
            className={`rounded px-4 py-2 text-lg outline-none border-none text-black ${errors.password ? 'border border-red-500' : ''}`}
            autoComplete="current-password"
            style={{
              backgroundColor: '#EDEDED'
            }}
          />
          {errors.password && <span className="text-red-500 text-sm -mt-2">{errors.password}</span>}
          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 bg-[#02C060] text-white rounded-lg py-4 w-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#02A050]"
            style={{
              fontWeight: 600,
              fontStyle: 'normal',
              fontSize: '18px',
              lineHeight: '10px',
              letterSpacing: 0,
              height: '50px'
            }}
          >
            {isLoading ? 'Logging In...' : 'Log In'}
          </button>
        </form>
      </div>
      <style jsx global>{`
        @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadein { animation: fadein 0.3s ease; }
        @keyframes modalin { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-modalin { animation: modalin 0.3s cubic-bezier(0.4,0,0.2,1); }
      `}</style>
    </div>
  );
} 