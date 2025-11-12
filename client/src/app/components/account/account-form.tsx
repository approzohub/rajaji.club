"use client";
import Image from "next/image";
import { FiEye } from "react-icons/fi";
import { accountPageStyles, textStyles } from "./shared-styles";

interface AccountFormContentProps {
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  showConfirm: boolean;
  setShowConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  newPassword: string;
  setNewPassword: React.Dispatch<React.SetStateAction<string>>;
  confirmPassword: string;
  setConfirmPassword: React.Dispatch<React.SetStateAction<string>>;
  handleSubmit: (e: React.FormEvent) => void;
  error?: string;
  isLoading?: boolean;
}

export function AccountFormContent({ 
  showPassword, 
  setShowPassword, 
  showConfirm, 
  setShowConfirm, 
  newPassword, 
  setNewPassword, 
  confirmPassword, 
  setConfirmPassword, 
  handleSubmit,
  error,
  isLoading
}: AccountFormContentProps) {
  return (
    <form onSubmit={handleSubmit} className={accountPageStyles.container}>
      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <div className="flex flex-col gap-2">
        <label htmlFor="new-password" style={textStyles.body}>New Password</label>
        <div className="relative">
          <input
            id="new-password"
            type={showPassword ? "text" : "password"}
            className="w-full px-4 py-3 text-lg outline-none border-none text-black"
            style={{
              backgroundColor: '#EDEDED',
              borderRadius: '4px',
              height: '40px',
            }}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer"
            onClick={() => setShowPassword((v: boolean) => !v)}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <Image src="/eye-flash.svg" alt="eye-flash" width={20} height={20} /> : <FiEye className="text-[#000000] w-[20px] h-[20px]" />}
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="confirm-password" style={textStyles.body}>Confirm Password</label>
        <div className="relative">
          <input
            id="confirm-password"
            type={showConfirm ? "text" : "password"}
            className="w-full px-4 py-3 text-lg outline-none border-none text-black"
            style={{
              backgroundColor: '#EDEDED',
              borderRadius: '4px',
              height: '40px',
            }}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer"
            onClick={() => setShowConfirm((v: boolean) => !v)}
            tabIndex={-1}
            aria-label={showConfirm ? "Hide password" : "Show password"}
          >
            {showConfirm ? <Image src="/eye-flash.svg" alt="eye-flash" width={20} height={20} /> : <FiEye className="text-[#000000] w-[20px] h-[20px]" />}
          </button>
        </div>
      </div>
      <button type="submit" 
      className="py-3 w-32 self-start mt-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      style={{
        fontFamily: 'Poppins',
        fontWeight: 600,
        fontStyle: 'SemiBold',
        fontSize: '14px',
        lineHeight: '18px',
        letterSpacing: '0%',
        color: '#000000',
        backgroundColor: '#FFCD01',
        borderRadius: '4px',
        height: '40px',
      }}
      disabled={isLoading}
      >{isLoading ? 'Changing...' : 'Submit'}</button>
    </form>
  );
} 