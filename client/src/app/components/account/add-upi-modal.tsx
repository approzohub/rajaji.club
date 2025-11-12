"use client";
import { useRef } from "react";
import { textStyles } from "./shared-styles";

interface AddUpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  upiName: string;
  setUpiName: React.Dispatch<React.SetStateAction<string>>;
  upiNumber: string;
  setUpiNumber: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting?: boolean;
  currentPaymentCount?: number;
}

export function AddUpiModal({ 
  isOpen, 
  onClose, 
  upiName, 
  setUpiName, 
  upiNumber, 
  setUpiNumber, 
  onSubmit,
  isSubmitting = false,
  currentPaymentCount = 0
}: AddUpiModalProps) {
  const upiNameRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 transition-opacity duration-300 ease-out animate-fadein">
      <div className="relative bg-white rounded-2xl p-6 w-[85vw] max-w-md mx-auto shadow-lg transform transition-all duration-300 ease-out animate-modalin">
        <button
          className="absolute top-4 right-4 focus:outline-none cursor-pointer"
          onClick={onClose}
          aria-label="Close"
        >
          <span className="text-[#FF0000]" 
          style={{ fontSize: '16px', fontWeight: 500, fontStyle: 'normal', lineHeight: '24px', letterSpacing: 0 }}>X</span>
        </button>
        <div className="mt-4 mb-2 ps-4" style={textStyles.subheading}>
          Add UPI Account
        </div>
        <form className="flex flex-col gap-2 p-4" onSubmit={onSubmit}>
          <label className="text-black" htmlFor="upiName" style={textStyles.body}>
            Name
          </label>
          <input
            id="upiName"
            ref={upiNameRef}
            type="text"
            className="rounded px-4 py-2 text-lg outline-none border-none text-black"
            value={upiName}
            onChange={e => setUpiName(e.target.value)}
            autoComplete="off"
            required
            disabled={currentPaymentCount >= 5}
            style={{
              backgroundColor: '#EDEDED'
            }}
          />
          <label className="text-black pt-2" htmlFor="upiNumber" style={textStyles.body}>
          Paytm / PhonePe / G-Pay ID
          </label>
          <input
            id="upiNumber"
            type="text"
            className="rounded px-4 py-2 text-lg outline-none border-none text-black"
            value={upiNumber}
            onChange={e => setUpiNumber(e.target.value)}
            autoComplete="off"
            required
            disabled={currentPaymentCount >= 5}
            style={{
              backgroundColor: '#EDEDED'
            }}
          />
          <button
            type="submit"
            className="mt-4 bg-[#02C060] text-white rounded-lg py-4 w-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              fontWeight: 600,
              fontStyle: 'normal',
              fontSize: '18px',
              lineHeight: '10px',
              letterSpacing: 0,
              height: '50px'
            }}
            disabled={isSubmitting || currentPaymentCount >= 5}
          >
            {isSubmitting ? 'Adding Account...' : 'Add Account'}
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