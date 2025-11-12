"use client";
import { useRef, useState } from "react";
import Image from 'next/image';
import { useAuthStore } from "../../store/auth-store";

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const oldPasswordRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<{ 
    oldPassword?: string; 
    newPassword?: string; 
    confirmPassword?: string;
    general?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { updatePassword } = useAuthStore();

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const oldPassword = oldPasswordRef.current?.value || "";
    const newPassword = newPasswordRef.current?.value || "";
    const confirmPassword = confirmPasswordRef.current?.value || "";
    
    // Reset errors
    setErrors({});
    setSuccess(false);

    // Validation
    const newErrors: typeof errors = {};
    if (!oldPassword.trim()) newErrors.oldPassword = "Current password is required.";
    if (!newPassword.trim()) newErrors.newPassword = "New password is required.";
    if (newPassword.length < 6) newErrors.newPassword = "New password must be at least 6 characters.";
    if (newPassword !== confirmPassword) newErrors.confirmPassword = "Passwords do not match.";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await updatePassword(newPassword);
      if (result.success) {
        setSuccess(true);
        // Clear form
        if (oldPasswordRef.current) oldPasswordRef.current.value = "";
        if (newPasswordRef.current) newPasswordRef.current.value = "";
        if (confirmPasswordRef.current) confirmPasswordRef.current.value = "";
        
        // Close modal after 2 seconds
        setTimeout(() => {
          onClose();
          setSuccess(false);
        }, 2000);
      } else {
        setErrors({ general: result.error || "Failed to change password" });
      }
    } catch {
      setErrors({ general: "An unexpected error occurred" });
    } finally {
      setIsLoading(false);
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
          Change Password
        </h2>
        
        {success && (
          <div className="text-green-600 text-center mb-2 font-semibold">
            Password changed successfully!
          </div>
        )}
        
        {errors.general && (
          <div className="text-red-600 text-center mb-2 font-semibold">
            {errors.general}
          </div>
        )}
        
        <form className="flex flex-col gap-2 p-4" onSubmit={handleSubmit}>
          <label
            className="text-black"
            htmlFor="oldPassword"
            style={{
              fontWeight: 400,
              fontStyle: 'normal',
              fontSize: '18px',
              lineHeight: '27px',
              letterSpacing: 0,
              color: '#000000'
            }}
          >
            Current Password
          </label>
          <input
            id="oldPassword"
            ref={oldPasswordRef}
            type="password"
            disabled={isLoading}
            className={`rounded px-4 py-2 text-lg outline-none border-none text-black ${errors.oldPassword ? 'border border-red-500' : ''}`}
            autoComplete="current-password"
            style={{
              backgroundColor: '#EDEDED'
            }}
          />
          {errors.oldPassword && <span className="text-red-500 text-sm mt-2">{errors.oldPassword}</span>}
          
          <label
            className="text-black pt-2"
            htmlFor="newPassword"
            style={{
              fontWeight: 400,
              fontStyle: 'normal',
              fontSize: '18px',
              lineHeight: '27px',
              letterSpacing: 0,
              color: '#000000'
            }}
          >
            New Password
          </label>
          <input
            id="newPassword"
            ref={newPasswordRef}
            type="password"
            disabled={isLoading}
            className={`rounded px-4 py-2 text-lg outline-none border-none text-black ${errors.newPassword ? 'border border-red-500' : ''}`}
            autoComplete="new-password"
            style={{
              backgroundColor: '#EDEDED'
            }}
          />
          {errors.newPassword && <span className="text-red-500 text-sm mt-2">{errors.newPassword}</span>}
          
          <label
            className="text-black pt-2"
            htmlFor="confirmPassword"
            style={{
              fontWeight: 400,
              fontStyle: 'normal',
              fontSize: '18px',
              lineHeight: '27px',
              letterSpacing: 0,
              color: '#000000'
            }}
          >
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            ref={confirmPasswordRef}
            type="password"
            disabled={isLoading}
            className={`rounded px-4 py-2 text-lg outline-none border-none text-black ${errors.confirmPassword ? 'border border-red-500' : ''}`}
            autoComplete="new-password"
            style={{
              backgroundColor: '#EDEDED'
            }}
          />
          {errors.confirmPassword && <span className="text-red-500 text-sm mt-2">{errors.confirmPassword}</span>}
          
          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 bg-[#02C060] text-white rounded-lg py-4 w-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              fontWeight: 600,
              fontStyle: 'normal',
              fontSize: '18px',
              lineHeight: '10px',
              letterSpacing: 0,
              height: '50px'
            }}
          >
            {isLoading ? 'Changing Password...' : 'Change Password'}
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