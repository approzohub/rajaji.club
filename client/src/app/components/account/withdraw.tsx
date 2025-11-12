"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { IoMdTrash } from "react-icons/io";
import { apiClient } from "../../../lib/api";
import { useAuthStore } from "../../../store/auth-store";
import { useAlert } from "../../hooks";
import { useAppSettings } from "../../hooks/use-app-settings";
import { AlertModal } from "../";
import { accountPageStyles, textStyles } from "./shared-styles";

interface WithdrawContentProps {
  onAddUpiClick: () => void;
  onPaymentMethodAdded?: () => void;
  onPaymentMethodDeleted?: () => void;
}

interface Withdrawal {
  _id: string;
  amount: number;
  walletType: 'main'; // Only main wallet withdrawals allowed
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  note?: string;
  createdAt: string;
  updatedAt: string;
}

interface PaymentMethod {
  _id: string;
  name: string;
  upiId: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function WithdrawContent({ onAddUpiClick, onPaymentMethodAdded, onPaymentMethodDeleted }: WithdrawContentProps) {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingPayment, setIsDeletingPayment] = useState<string | null>(null);
  
  const { isLoggedIn, refreshBalance } = useAuthStore();
  const { alert, showSuccess, showError, closeAlert } = useAlert();
  const { settings } = useAppSettings();
  
  // Ref for scrollable container
  const scrollableContainerRef = useRef<HTMLDivElement>(null);

  // Expose the refresh function to parent component
  useEffect(() => {
    if (onPaymentMethodAdded) {
      onPaymentMethodAdded();
    }
  }, [onPaymentMethodAdded]);

  const fetchWithdrawals = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.getWithdrawals();
      if (response.data) {
        setWithdrawals(response.data);
      } else if (response.error) {
        setError(response.error);
      }
    } catch {
      // Failed to fetch withdrawals
      setError('Failed to load withdrawal history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      setIsLoadingPayments(true);
      const response = await apiClient.getPaymentMethods();
      if (response.data) {
        // Handle the response structure: { payments: [...] }
        const responseData = response.data as PaymentMethod[] | { payments: PaymentMethod[] };
        const payments = Array.isArray(responseData) 
          ? responseData 
          : responseData.payments || [];
        setPaymentMethods(payments);
        // Set the default payment method as selected
        const defaultPayment = payments.find((pm: PaymentMethod) => pm.isDefault);
        setSelectedPaymentMethod(defaultPayment || payments[0] || null);
      } else if (response.error) {
        setError(response.error);
      }
    } catch {
      // Failed to fetch payment methods
      setError('Failed to load payment methods');
    } finally {
      setIsLoadingPayments(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchWithdrawals();
      fetchPaymentMethods();
    }
  }, [isLoggedIn, fetchWithdrawals, fetchPaymentMethods]);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

  const handleDeleteClick = (paymentId: string) => {
    // Prevent deletion if this is the only payment method
    if (paymentMethods.length <= 1) {
      showError('Cannot delete the last payment method. Please add another one first.');
      return;
    }
    setPaymentToDelete(paymentId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!paymentToDelete) return;

    setIsDeletingPayment(paymentToDelete);
    try {
      const response = await apiClient.deletePaymentMethod(paymentToDelete);
      if (response.error) {
        showError(response.error);
      } else {
        showSuccess('Payment method deleted successfully');
        // Refresh payment methods
        await fetchPaymentMethods();
        // If the deleted payment was selected, clear selection
        if (selectedPaymentMethod?._id === paymentToDelete) {
          setSelectedPaymentMethod(null);
        }
        // Notify parent component to refresh payment count
        if (onPaymentMethodDeleted) {
          onPaymentMethodDeleted();
        }
      }
    } catch {
      // Failed to delete payment method
      showError('Failed to delete payment method');
    } finally {
      setIsDeletingPayment(null);
      setPaymentToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setPaymentToDelete(null);
  };

  const handleWhatsAppClick = () => {
    if (!settings?.whatsappNumber || !settings?.whatsappEnabled) return;
    window.open(`https://wa.me/91${settings.whatsappNumber}`, "_blank");
  };

  const handleAddUpiClick = () => {
    if (paymentMethods.length >= 5) {
      showError('Maximum 5 payment methods allowed. Please delete an existing payment method to add a new one.');
      return;
    }
    onAddUpiClick();
  };



  const handleWithdrawRequest = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      showError('Please enter a valid amount');
      return;
    }

    const paymentMethod = selectedPaymentMethod || paymentMethods[0];
    if (!paymentMethod) {
      showError('Please add a payment method first');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiClient.requestWithdrawal({
        amount: parseFloat(withdrawAmount),
        walletType: 'main',
        note: `Withdrawal to ${paymentMethod.name} (${paymentMethod.upiId})`,
        paymentMethodId: paymentMethod._id
      });

      if (response.error) {
        showError(response.error);
      } else {
        showSuccess('Withdrawal request submitted successfully!');
        setWithdrawAmount('');
        fetchWithdrawals(); // Refresh the list
        await refreshBalance(); // Refresh balance in header
      }
    } catch {
      // Failed to submit withdrawal
      showError('Failed to submit withdrawal request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    
    return `${day}-${month}-${year} ${displayHours}:${minutes}${ampm}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return '#02C060';
      case 'rejected':
        return '#C23331';
      case 'pending':
      default:
        return '#FFA500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'completed':
        return 'Completed';
      case 'rejected':
        return 'Rejected';
      case 'pending':
      default:
        return 'Pending';
    }
  };

  return (
    <div className={accountPageStyles.container}>
      {/* Title */}
      <div>
        <h2
          className={accountPageStyles.header.title}
          style={textStyles.heading}
        >
          Withdraw
        </h2>
        <p
          className={accountPageStyles.header.subtitle}
          style={textStyles.caption}
        >
          You can transfer your winning amount to your bank
        </p>
      </div>

      {/* Payment Methods */}
      <div className="flex items-center gap-3 mb-6 rounded-lg p-2 w-50">
        <div className="flex items-center gap-2  px-3 py-2">
          <Image src="/upi.svg" alt="UPI" width={50} height={44} />
          <Image src="/paytm.svg" alt="Paytm" width={70} height={44} className="ml-2" />
        </div>
        <button
          type="button"
          className="flex items-center justify-center w-8 h-8 rounded-full border-2 focus:outline-none transition-colors cursor-pointer hover:bg-gray-100"
          aria-label="Add UPI Account"
          onClick={handleAddUpiClick}
          title="Add UPI Account"
        >
          <Image src="/plus-circle.svg" alt="Add" width={30} height={30} />
        </button>
      </div>

      {/* Instructions */}
      <div className="mb-6">
        <h3
          className="font-bold text-gray-900 mb-2"
          style={{
            fontFamily: 'Poppins',
            fontWeight: 500,
            fontSize: '20px',
            color: '#000000',
          }}
        >
          Instructions
        </h3>
        <ul
          className=" list-none"
          style={{
            fontFamily: 'Poppins',
            fontWeight: 400,
            fontStyle: 'Regular',
            fontSize: '14px',
            color: '#FF0000',
          }}
        >
          <li className="flex items-start gap-2">
            <Image src="/play_arrow_filled.svg" alt="arrow" width={12} height={12} className="mt-1 flex-shrink-0" />
            <span>This form is for withdrawing the amount from the main wallet only.</span>
          </li>
          <li className="flex items-start gap-2">
            <Image src="/play_arrow_filled.svg" alt="arrow" width={12} height={12} className="mt-1 flex-shrink-0" />
            <span>The bonus wallet amount cannot be withdrawn by this form.</span>
          </li>
          <li className="flex items-start gap-2">
            <Image src="/play_arrow_filled.svg" alt="arrow" width={12} height={12} className="mt-1 flex-shrink-0" />
            <span>Do not put withdraw request without betting with deposit amount. Such activity may be identified as Suspicious.</span>
          </li>
          <li className="flex items-start gap-2">
            <Image src="/play_arrow_filled.svg" alt="arrow" width={12} height={12} className="mt-1 flex-shrink-0" />
            <span>If multiple users are using same withdraw account then all the linked users will be blocked.</span>
          </li>
          <li className="flex items-start gap-2">
            <Image src="/play_arrow_filled.svg" alt="arrow" width={12} height={12} className="mt-1 flex-shrink-0" />
            <span>Maximum Withdraw time is 1 hour then only complain on WhatsApp number is allowed.</span>
          </li>
        </ul>
      </div>

      <div className="border-2 text-[#E1E1E1]"> </div>
      {/* WhatsApp Help Button */}
      {settings?.whatsappEnabled && settings?.whatsappNumber && (
        <div className="mb-6 flex justify-start w-full md:w-[75%] h-[39px] md:mt-2 md:ml-[-2rem]">
          <Image
            src="withdraw-wp.svg"
            alt="WhatsApp"
            width={200}
            height={50}
            className="w-full h-full object-contain cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleWhatsAppClick}
          />
        </div>
      )}

            {/* Payment Methods List */}
      {isLoadingPayments ? (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
          <div className="text-center text-gray-500">Loading payment methods...</div>
        </div>
      ) : paymentMethods.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
          <div className="text-center text-gray-500">No payment methods found. Use the + button above to add a payment method.</div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
          <div className="mb-4">
            <h3
              className="font-bold text-gray-900 mb-3"
              style={{
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 600,
                fontSize: '18px',
                color: '#000000',
              }}
            >
              Payment Methods ({paymentMethods.length}/5)
            </h3>
            
            {/* Payment Methods List */}
            <div className="space-y-3 mb-4">
              {paymentMethods.map((payment) => (
                <div
                  key={payment._id}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedPaymentMethod?._id === payment._id
                      ? 'border-[#FFCD01] bg-yellow-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedPaymentMethod(payment)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="font-semibold text-gray-900"
                          style={{
                            fontFamily: 'Poppins, sans-serif',
                            fontWeight: 600,
                            fontSize: '16px',
                            color: '#000000',
                          }}
                        >
                          {payment.name}
                        </span>
                        {payment.isDefault && (
                          <span
                            className="px-2 py-1 text-xs rounded-full"
                            style={{
                              backgroundColor: '#02C060',
                              color: '#FFFFFF',
                              fontFamily: 'Poppins, sans-serif',
                              fontWeight: 500,
                              fontSize: '10px',
                            }}
                          >
                            Default
                          </span>
                        )}
                      </div>
                      <div
                        className="text-gray-600"
                        style={{
                          fontFamily: 'Poppins, sans-serif',
                          fontWeight: 500,
                          fontSize: '14px',
                          color: '#666666',
                        }}
                      >
                        UPI ID: {payment.upiId}
                      </div>
                    </div>
                    <button 
                      className="text-[#C23331] hover:text-red-700 transition-colors cursor-pointer ml-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(payment._id);
                      }}
                      disabled={isDeletingPayment === payment._id}
                      title="Delete payment method"
                    >
                      <IoMdTrash className="text-lg" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Withdrawal Form */}
          {selectedPaymentMethod ? (
            <>
              <div className="border-t border-gray-200 pt-4">
                <label className="text-[#000000] mb-2 block" style={{
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 600,
                  fontSize: '16px',
                  color: '#000000',
                }}>
                  Withdraw to: {selectedPaymentMethod.name}
                </label>
                <div className="text-gray-600 mb-4" style={{
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  color: '#666666',
                }}>
                  UPI ID: {selectedPaymentMethod.upiId}
                </div>
              </div>
              
              <label className="text-[#000000] mb-2 block" style={{
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 600,
                fontSize: '16px',
                color: '#000000',
              }}>
                Enter amount
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 bg-[#EDEDED] rounded focus:outline-none focus:ring-2 focus:ring-transparent focus:border-transparent mb-4"
                placeholder="Enter amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                style={{
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  color: '#000000',
                }}
              />

              <button
                className="w-full md:w-[40%] bg-[#FFCD01] text-black font-semibold py-2 rounded transition-colors disabled:opacity-50 hover:bg-yellow-500 cursor-pointer"
                onClick={handleWithdrawRequest}
                disabled={isSubmitting || !withdrawAmount}
                style={{
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                {isSubmitting ? 'Submitting...' : 'Send Withdraw Request'}
              </button>
            </>
          ) : (
            <div className="text-center text-gray-500 py-4">
              Please select a payment method to proceed with withdrawal
            </div>
          )}
        </div>
      )}

      {/* History Table */}
      <div>
        <div
          className="font-bold text-gray-900 mb-4"
          style={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 600,
            fontSize: '22px',
            color: '#000000',
            fontStyle: 'Semibold',

          }}
        >
          HISTORY
        </div>
        <div ref={scrollableContainerRef} className="overflow-y-auto max-h-[400px]">
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr
                  className="text-white text-left"
                  style={{
                    backgroundColor: '#232b3e',
                  }}
                >
                <th
                  className="px-4 py-3 font-bold"
                  style={{
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 600,
                    fontSize: '16px',
                    fontStyle: 'Semibold',
                  }}
                >
                  Amount
                </th>
                <th
                  className="px-4 py-3 font-bold"
                  style={{
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 600,
                    fontSize: '16px',
                    fontStyle: 'Semibold',
                  }}
                >
                  Status
                </th>
                <th
                  className="px-4 py-3 font-bold"
                  style={{
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 600,
                    fontSize: '16px',
                    fontStyle: 'Semibold',
                  }}
                >
                  Account
                </th>
                <th
                  className="px-4 py-3 font-bold"
                  style={{
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 600,
                    fontSize: '16px',
                    fontStyle: 'Semibold',
                  }}
                >
                  Date & Time
                </th>
                <th
                  className="px-4 py-3 font-bold"
                  style={{
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 600,
                    fontSize: '16px',
                    fontStyle: 'Semibold',
                  }}
                >
                  Note
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Loading withdrawal history...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              ) : withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No withdrawal history found
                  </td>
                </tr>
              ) : (
                withdrawals.map((withdrawal, idx) => (
                  <tr
                    key={withdrawal._id}
                    className={idx % 2 === 0 ? "bg-[#FFFFFF]" : "bg-[#F6F6F6]"}
                  >
                    <td
                      className="px-4 py-3"
                      style={{
                        fontFamily: 'Poppins, sans-serif',
                        fontWeight: 500,
                        fontStyle: 'Regular',
                        fontSize: '14px',
                        color: '#535353',
                      }}
                    >
                      ₹{withdrawal.amount}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-3 py-1"
                        style={{
                          backgroundColor: getStatusColor(withdrawal.status),
                          color: '#FFFFFF',
                          fontFamily: 'Poppins, sans-serif',
                          fontWeight: 600,
                          fontSize: '12px',
                          fontStyle: 'Regular',
                          borderRadius: '4px',
                        }}
                      >
                        {getStatusText(withdrawal.status)}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{
                        fontFamily: 'Poppins',
                        fontWeight: 400,
                        fontStyle: 'Regular',
                        fontSize: '14px',
                        color: '#535353',
                      }}
                    >
                      {withdrawal.walletType === 'main' ? 'Main Wallet' : 'Bonus Wallet'}
                    </td>
                    <td
                      className="px-4 py-3 whitespace-nowrap"
                      style={{
                        fontFamily: 'Poppins',
                        fontWeight: 400,
                        fontStyle: 'Regular',
                        fontSize: '14px',
                        color: '#535353',
                      }}
                    >
                      {formatDateTime(withdrawal.createdAt)}
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{
                        fontFamily: 'Poppins',
                        fontWeight: 400,
                        fontStyle: 'Regular',
                        fontSize: '14px',
                        color: '#535353',
                      }}
                    >
                      {withdrawal.note ? (
                        <span title={withdrawal.note} className="cursor-help">
                          {withdrawal.note.length > 30 
                            ? `${withdrawal.note.substring(0, 30)}...` 
                            : withdrawal.note
                          }
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>
      <AlertModal
        open={alert.open}
        onClose={closeAlert}
        message={alert.message}
        type={alert.type}
      />
      
      {/* Custom Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="relative bg-white rounded-2xl p-6 w-[95vw] max-w-xs mx-auto shadow-lg">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white text-xl font-bold mb-4">
                ⚠
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
                Confirm Delete
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
                Are you sure you want to delete this payment method?
              </p>
              
              <div className="flex gap-3">
                <button
                  className="bg-gray-300 text-gray-700 font-bold py-2 px-6 rounded-lg cursor-pointer"
                  onClick={handleDeleteCancel}
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
                  Cancel
                </button>
                <button
                  className="bg-red-500 text-white font-bold py-2 px-6 rounded-lg cursor-pointer"
                  onClick={handleDeleteConfirm}
                  disabled={!!isDeletingPayment}
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
                  {isDeletingPayment ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 