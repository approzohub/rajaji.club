"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "../../../lib/api";
import { useAuthStore } from "../../../store/auth-store";
import { useAlert } from "../../hooks";
import { AlertModal } from "../";
import { accountPageStyles, textStyles } from "./shared-styles";

interface PaymentTransaction {
  _id: string;
  type: 'wallet_transaction' | 'bid' | 'withdrawal';
  amount: number;
  transactionType: string;
  walletType: 'main' | 'bonus';
  paymentMode: 'UPI' | 'Wallet';
  note?: string;
  status?: string;
  processedBy?: {
    _id: string;
    fullName: string;
    email: string;
    gameId: string;
    role: string;
  };
  createdAt: string;
  updatedAt?: string;
  // Bid specific fields
  gameId?: string;
  gameStatus?: string;
  cardName?: string;
  cardType?: string;
  cardSuit?: string;
  quantity?: number;
  cardPrice?: number;
}



export function PaymentHistoryContent() {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { isLoggedIn } = useAuthStore();
  const { alert, closeAlert } = useAlert();
  
  // Ref for scrollable container
  const scrollableContainerRef = useRef<HTMLDivElement>(null);
  
  // Refs to store current state values for scroll handlers
  const currentPageRef = useRef(currentPage);
  const hasMoreRef = useRef(hasMore);
  const isLoadingMoreRef = useRef(isLoadingMore);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update refs when state changes
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore;
  }, [isLoadingMore]);

  const fetchPaymentHistory = useCallback(async (page: number = 1, append: boolean = false) => {
    console.log('fetchPaymentHistory called:', { page, append, isLoggedIn }); // Debug log
    
    if (!isLoggedIn) {
      setIsLoading(false);
      setError(null);
      return;
    }

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await apiClient.getPaymentHistory(page, 10);
      if (response.data?.transactions) {
        if (append) {
          setTransactions(prev => [...prev, ...response.data!.transactions]);
        } else {
          setTransactions(response.data!.transactions);
        }
        if (response.data?.pagination) {
          setHasMore(response.data.pagination.hasNextPage);
          setCurrentPage(response.data.pagination.currentPage);
        }
      } else if (response.error) {
        setError(response.error);
        if (!append) {
          setTransactions([]);
        }
      }
    } catch {
      setError('Failed to load payment history');
      if (!append) {
        setTransactions([]);
      }
    } finally {
      if (append) {
        setIsLoadingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [isLoggedIn]);

  // Ref to store the fetch function
  const fetchPaymentHistoryRef = useRef(fetchPaymentHistory);

  // Update the ref when fetchPaymentHistory changes
  useEffect(() => {
    fetchPaymentHistoryRef.current = fetchPaymentHistory;
  }, [fetchPaymentHistory]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchPaymentHistory(1, false);
    } else {
      setIsLoading(false);
      setTransactions([]);
      setError(null);
      setHasMore(true);
    }
  }, [isLoggedIn, fetchPaymentHistory]);

  // Set up scroll listeners immediately on mount
  useEffect(() => {
    console.log('Payment History - Setting up scroll listeners on mount'); // Debug log
    
    let handleScroll: (() => void) | null = null;
    let handleWindowScroll: (() => void) | null = null;
    
    // Function to set up scroll listeners
    const setupScrollListeners = () => {
      if (!scrollableContainerRef.current) {
        console.log('Payment History - Container not ready, retrying in 100ms'); // Debug log
        setTimeout(setupScrollListeners, 100);
        return;
      }
      
      console.log('Payment History - Container ready, setting up scroll listeners'); // Debug log
      
      // Remove existing listeners if they exist
      if (handleScroll && scrollableContainerRef.current) {
        scrollableContainerRef.current.removeEventListener('scroll', handleScroll);
      }
      if (handleWindowScroll) {
        window.removeEventListener('scroll', handleWindowScroll);
      }
      
      // Add scroll event listener to detect when user reaches bottom
      handleScroll = () => {
        if (!scrollableContainerRef.current || !hasMoreRef.current || isLoadingMoreRef.current) {
          console.log('Payment History - Scroll blocked - container:', !!scrollableContainerRef.current, 'hasMore:', hasMoreRef.current, 'isLoadingMore:', isLoadingMoreRef.current); // Debug log
          return;
        }
        
        // Clear existing timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        
        // Debounce scroll events
        scrollTimeoutRef.current = setTimeout(() => {
          const container = scrollableContainerRef.current;
          if (!container) return;
          
          const scrollTop = container.scrollTop;
          const scrollHeight = container.scrollHeight;
          const clientHeight = container.clientHeight;
          
          console.log('Payment History - Scroll event - scrollTop:', scrollTop, 'scrollHeight:', scrollHeight, 'clientHeight:', clientHeight); // Debug log
          console.log('Payment History - Scroll calculation:', scrollTop + clientHeight, 'vs', scrollHeight - 50); // Debug log
          
          // Check if user has scrolled to bottom (with 50px threshold)
          if (scrollTop + clientHeight >= scrollHeight - 50) {
            console.log('Payment History - Scroll triggered - near bottom, loading next page:', currentPageRef.current + 1); // Debug log
            const nextPage = currentPageRef.current + 1;
            fetchPaymentHistoryRef.current(nextPage, true);
          }
        }, 100); // 100ms debounce
      };

      scrollableContainerRef.current.addEventListener('scroll', handleScroll);
      console.log('Payment History - Scroll listener attached to container:', scrollableContainerRef.current); // Debug log

      // Also add window scroll listener as fallback
      handleWindowScroll = () => {
        if (!scrollableContainerRef.current || !hasMoreRef.current || isLoadingMoreRef.current) return;
        
        const container = scrollableContainerRef.current;
        const rect = container.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        
        if (isVisible) {
          const scrollTop = container.scrollTop;
          const scrollHeight = container.scrollHeight;
          const clientHeight = container.clientHeight;
          
          console.log('Payment History - Window scroll - container visible, checking scroll position'); // Debug log
          console.log('Payment History - Window scroll - scrollTop:', scrollTop, 'scrollHeight:', scrollHeight, 'clientHeight:', clientHeight); // Debug log
          
          if (scrollTop + clientHeight >= scrollHeight - 50) {
            console.log('Payment History - Window scroll triggered - loading next page:', currentPageRef.current + 1); // Debug log
            const nextPage = currentPageRef.current + 1;
            fetchPaymentHistoryRef.current(nextPage, true);
          }
        }
      };

      window.addEventListener('scroll', handleWindowScroll);
      console.log('Payment History - Window scroll listener attached'); // Debug log
    };

    // Start setting up scroll listeners
    setupScrollListeners();

    return () => {
      if (scrollableContainerRef.current && handleScroll) {
        scrollableContainerRef.current.removeEventListener('scroll', handleScroll);
      }
      if (handleWindowScroll) {
        window.removeEventListener('scroll', handleWindowScroll);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array - only run once on mount since we use refs for current state

  // Debug effect to log currentPage changes
  useEffect(() => {
    console.log('Payment History - currentPage changed:', currentPage);
  }, [currentPage]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;

    return `${day}-${month}-${year} - ${displayHours}:${minutes}${ampm}`;
  };

  if (isLoading) {
    return (
      <div className={accountPageStyles.containerCompact} style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <h2 className={accountPageStyles.header.title} style={textStyles.heading}>Payment History</h2>
        <p className={accountPageStyles.header.subtitle} style={textStyles.caption}>Here you can check your deposit & Bidding payment history.</p>
        <div className="min-h-[450px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-500">Loading payment history...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={accountPageStyles.containerCompact} style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <h2 className={accountPageStyles.header.title} style={textStyles.heading}>Payment History</h2>
        <p className={accountPageStyles.header.subtitle} style={textStyles.caption}>Here you can check your deposit & Bidding payment history.</p>
        <div className="min-h-[450px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 mb-2">Error loading payment history</div>
            <div className="text-gray-500 text-sm mb-4">{error}</div>
            <button 
              onClick={() => fetchPaymentHistory(1, false)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={accountPageStyles.containerCompact} style={{ maxHeight: 'calc(100vh - 200px)' }}>
      <h2 className={accountPageStyles.header.title} style={textStyles.heading}>Payment History</h2>
      <p className={accountPageStyles.header.subtitle} style={textStyles.caption}>Here you can check your deposit & Bidding payment history.</p>
      
      {/* Fixed Table Header */}
      <div className={accountPageStyles.table.wrapper}>
        <table className={accountPageStyles.table.container}>
          <thead>
            <tr className={accountPageStyles.table.header}>
              <th className={accountPageStyles.table.headerCell} style={accountPageStyles.table.headerText}>Date & Time</th>
              <th className={accountPageStyles.table.headerCell} style={accountPageStyles.table.headerText}>Amount</th>
              <th className={`${accountPageStyles.table.headerCell} text-right`} style={accountPageStyles.table.headerText}>Payment Mode</th>
            </tr>
          </thead>
        </table>
      </div>
      
      {/* Scrollable Table Body */}
      <div ref={scrollableContainerRef} className="overflow-y-auto max-h-[350px]">
        <div className={accountPageStyles.table.wrapper}>
          <table className={accountPageStyles.table.container}>
            <tbody className={accountPageStyles.table.body}>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={3} className={accountPageStyles.table.emptyCell}>
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((transaction, idx) => {
                  const isCredit = transaction.amount > 0;
                  const displayAmount = Math.abs(transaction.amount);
                  const amountColor = isCredit ? '#02C060' : '#C23331';
                  const amountPrefix = isCredit ? '+' : '-';
                  
                  return (
                    <tr key={`${transaction._id}_${idx}`} className={idx % 2 === 0 ? "bg-white" : accountPageStyles.table.alternateRow}>
                      <td className={`${accountPageStyles.table.cell} whitespace-nowrap`} style={accountPageStyles.table.cellText}>
                        {formatDateTime(transaction.createdAt)}
                      </td>
                      <td className={accountPageStyles.table.cell} style={{...accountPageStyles.table.cellText, color: amountColor}}>
                        {amountPrefix}₹{displayAmount}
                      </td>
                      <td className={`${accountPageStyles.table.cell} text-right`} style={{...accountPageStyles.table.cellText, color: '#000000'}}>
                        {transaction.paymentMode === 'UPI' 
                          ? (transaction.amount > 0 ? 'Deposit' : 'Withdraw')
                          : transaction.paymentMode
                        }
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {hasMore && (
          <div className="flex items-center justify-center py-4">
            {isLoadingMore && (
              <div className="text-gray-500">Loading more...</div>
            )}
          </div>
        )}
        
        {!hasMore && transactions.length > 0 && (
          <div className="flex items-center justify-center py-4">
            <div className="text-gray-400 text-sm">No more data to load</div>
          </div>
        )}
        
        {/* Debug button for testing */}
        {/* {hasMore && !isLoadingMore && (
          <div className="flex items-center justify-center py-2">
            <button 
              onClick={() => {
                console.log('Manual load triggered');
                fetchPaymentHistory(currentPage + 1, true);
              }}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
            >
             Load More
            </button>
          </div>
        )} */}
      </div>

      <AlertModal
        open={alert.open}
        onClose={closeAlert}
        message={alert.message}
        type={alert.type}
      />
    </div>
  );
} 