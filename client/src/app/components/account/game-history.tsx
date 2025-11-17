"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { SuitIcon } from "../SuitIcon";
import { apiClient } from "../../../lib/api";
import { useAuthStore } from "../../../store/auth-store";
import { accountPageStyles, textStyles } from "./shared-styles";

interface GameHistoryItem {
  date: string;
  time: string;
  bid: {
    value: string;
    suit: string;
    count: number;
    amount: number;
  };
  result: "Win" | "Loss" | "Open";
}

export const GameHistoryContent = React.memo(function GameHistoryContent() {
  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1); // Track current page properly
  const { isLoggedIn } = useAuthStore();
  
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

  const fetchGameHistory = useCallback(async (page: number = 1, append: boolean = false) => {
    console.log('fetchGameHistory called:', { page, append, isLoggedIn }); // Debug log
    
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
      const response = await apiClient.getUserGameHistory(page, 10);
      
      if (response.error) {
        if (response.error === 'Page number exceeds available pages' && response.data?.pagination) {
          setHasMore(false);
          return;
        }
        
        setError(response.error);
        if (!append) {
          setHistory([]);
        }
        return;
      }
      
      if (response.data?.history) {
        if (response.data.history.length === 0 && page > 1) {
          setHasMore(false);
          return;
        }
        
        const formattedHistory = (response.data.history as unknown[]).map((item: unknown) => {
          const typedItem = item as {
            date: string;
            bid: {
              cardName: string;
              cardType: string;
              cardSuit: string;
              quantity: number;
              totalAmount: number;
            };
            result: string;
          };
          
          const gameDate = new Date(typedItem.date);
          const dateStr = gameDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          const timeStr = gameDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });

          const parseCardName = (cardName: string) => {
            const bidMatch = cardName.match(/^([A-Z0-9]+)\s*([♠♣♥♦])$/);
            if (bidMatch) {
              return { value: bidMatch[1], suit: bidMatch[2] };
            }
            
            const suitMap: Record<string, string> = {
              'clubs': '♣',
              'diamonds': '♦',
              'hearts': '♥',
              'spades': '♠'
            };
            
            const suitSymbol = suitMap[typedItem.bid.cardSuit] || '♦';
            return { value: typedItem.bid.cardType, suit: suitSymbol };
          };

          const { value, suit } = parseCardName(typedItem.bid?.cardName || '');
          const count = typedItem.bid?.quantity || 1;
          const amount = typedItem.bid?.totalAmount || 0;

          return {
            date: dateStr,
            time: timeStr,
            bid: {
              value,
              suit,
              count,
              amount
            },
            result: typedItem.result as "Win" | "Loss" | "Open"
          };
        });
        
        if (append) {
          setHistory(prev => [...prev, ...formattedHistory]);
        } else {
          setHistory(formattedHistory);
        }
        
        // Update current page and check if there's more data
        if (response.data.pagination) {
          setCurrentPage(response.data.pagination.currentPage);
          setHasMore(response.data.pagination.hasNextPage);
        } else {
          setCurrentPage(page);
          setHasMore(formattedHistory.length === 5);
        }
      } else {
        if (!append) {
          setHistory([]);
        }
        setHasMore(false);
      }
    } catch {
      setError('Failed to load game history. Please try again later.');
      if (!append) {
        setHistory([]);
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
  const fetchGameHistoryRef = useRef(fetchGameHistory);

  // Update the ref when fetchGameHistory changes
  useEffect(() => {
    fetchGameHistoryRef.current = fetchGameHistory;
  }, [fetchGameHistory]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchGameHistory(1, false);
    } else {
      setIsLoading(false);
      setHistory([]);
      setError(null);
      setHasMore(true);
    }
  }, [isLoggedIn, fetchGameHistory]);

  // Set up scroll listeners immediately on mount
  useEffect(() => {
    console.log('Setting up scroll listeners on mount'); // Debug log
    
    let handleScroll: (() => void) | null = null;
    let handleWindowScroll: (() => void) | null = null;
    
    // Function to set up scroll listeners
    const setupScrollListeners = () => {
      if (!scrollableContainerRef.current) {
        console.log('Container not ready, retrying in 100ms'); // Debug log
        setTimeout(setupScrollListeners, 100);
        return;
      }
      
      console.log('Container ready, setting up scroll listeners'); // Debug log
      
      // Add scroll event listener to detect when user reaches bottom
      handleScroll = () => {
        if (!scrollableContainerRef.current || !hasMoreRef.current || isLoadingMoreRef.current) {
          console.log('Scroll blocked - container:', !!scrollableContainerRef.current, 'hasMore:', hasMoreRef.current, 'isLoadingMore:', isLoadingMoreRef.current); // Debug log
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
          
          console.log('Scroll event - scrollTop:', scrollTop, 'scrollHeight:', scrollHeight, 'clientHeight:', clientHeight); // Debug log
          console.log('Scroll calculation:', scrollTop + clientHeight, 'vs', scrollHeight - 50); // Debug log
          
          // Check if user has scrolled to bottom (with 50px threshold)
          if (scrollTop + clientHeight >= scrollHeight - 50) {
            console.log('Scroll triggered - near bottom, loading next page:', currentPageRef.current + 1); // Debug log
            const nextPage = currentPageRef.current + 1;
            fetchGameHistoryRef.current(nextPage, true);
          }
        }, 100); // 100ms debounce
      };

      scrollableContainerRef.current.addEventListener('scroll', handleScroll);
      console.log('Scroll listener attached to container:', scrollableContainerRef.current); // Debug log

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
          
          console.log('Window scroll - container visible, checking scroll position'); // Debug log
          console.log('Window scroll - scrollTop:', scrollTop, 'scrollHeight:', scrollHeight, 'clientHeight:', clientHeight); // Debug log
          
          if (scrollTop + clientHeight >= scrollHeight - 50) {
            console.log('Window scroll triggered - loading next page:', currentPageRef.current + 1); // Debug log
            const nextPage = currentPageRef.current + 1;
            fetchGameHistoryRef.current(nextPage, true);
          }
        }
      };

      window.addEventListener('scroll', handleWindowScroll);
      console.log('Window scroll listener attached'); // Debug log
    };

    // Start setting up scroll listeners
    setupScrollListeners();

    return () => {
      const container = scrollableContainerRef.current;
      if (container && handleScroll) {
        container.removeEventListener('scroll', handleScroll);
      }
      if (handleWindowScroll) {
        window.removeEventListener('scroll', handleWindowScroll);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array - only run once on mount

  // Debug effect to log currentPage changes
  useEffect(() => {
    console.log('Game History - currentPage changed:', currentPage);
  }, [currentPage]);

  if (isLoading) {
    return (
      <div className={accountPageStyles.container}>
        <div className={accountPageStyles.header.title} style={textStyles.heading}>
          Game History
        </div>
        <div className={accountPageStyles.header.subtitle} style={textStyles.caption}>
          You can check all your game history here.
        </div>
        <div className="min-h-[450px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-500">Loading game history...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className={accountPageStyles.container}>
        <div className={accountPageStyles.header.title} style={textStyles.heading}>
          Game History
        </div>
        <div className={accountPageStyles.header.subtitle} style={textStyles.caption}>
          You can check all your game history here.
        </div>
        <div className="min-h-[450px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-500">Please login to view game history</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={accountPageStyles.container}>
        <div className={accountPageStyles.header.title} style={textStyles.heading}>
          Game History
        </div>
        <div className={accountPageStyles.header.subtitle} style={textStyles.caption}>
          You can check all your game history here.
        </div>
        <div className="min-h-[450px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 mb-2">Error loading game history</div>
            <div className="text-gray-500 text-sm mb-4">{error}</div>
            <button 
              onClick={() => fetchGameHistory(1, false)}
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
    <div className={accountPageStyles.container}>
      <div className={accountPageStyles.header.title} style={textStyles.heading}>
        Game History
      </div>
      <div className={accountPageStyles.header.subtitle} style={textStyles.caption}>
        You can check all your game history here.
      </div>
      
      {/* Fixed Table Header */}
      <div className={accountPageStyles.table.wrapper}>
        <table className={accountPageStyles.table.container} style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: '35%' }} />
            <col style={{ width: '45%' }} />
            <col style={{ width: '20%' }} />
          </colgroup>
          <thead>
            <tr className={accountPageStyles.table.header}>
              <th className={accountPageStyles.table.headerCell} style={{...accountPageStyles.table.headerText, textAlign: 'left'}}>Date & Time</th>
              <th className={accountPageStyles.table.headerCell} style={{...accountPageStyles.table.headerText, textAlign: 'left'}}>Bid</th>
              <th className={accountPageStyles.table.headerCell} style={{...accountPageStyles.table.headerText, textAlign: 'left'}}>Result</th>
            </tr>
          </thead>
        </table>
      </div>
      
      {/* Scrollable Table Body */}
      <div ref={scrollableContainerRef} className="overflow-y-auto max-h-[350px]">
        <div className={accountPageStyles.table.wrapper}>
          <table className={accountPageStyles.table.container} style={{ tableLayout: 'fixed', width: '100%' }}>
            <colgroup>
              <col style={{ width: '35%' }} />
              <col style={{ width: '45%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <tbody className={accountPageStyles.table.body}>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={3} className={accountPageStyles.table.emptyCell}>
                    No game history available
                  </td>
                </tr>
              ) : (
                history.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : accountPageStyles.table.alternateRow}>
                    <td className={`${accountPageStyles.table.cell} whitespace-nowrap`} style={{...accountPageStyles.table.cellText, textAlign: 'left'}}>
                      {row.date} - {row.time}
                    </td>
                    <td className={accountPageStyles.table.cell} style={{...accountPageStyles.table.cellText, color: '#000000', textAlign: 'left'}}>
                      <div className="flex flex-row items-center gap-x-1 justify-start">
                        <span className="whitespace-nowrap" style={{...accountPageStyles.table.cellText, color: '#000000'}}>{row.bid.value}</span>
                        <span className="flex-none p-1 flex items-center min-w-[20px]">
                          <SuitIcon suit={row.bid.suit} size={20} />
                        </span>
                        <span className="whitespace-nowrap" style={accountPageStyles.table.cellText}>X {row.bid.count} = ₹{row.bid.amount}</span>
                      </div>
                    </td>
                    <td className={accountPageStyles.table.cell} style={{...accountPageStyles.table.cellText, textAlign: 'left'}}>
                      <span className={
                        row.result === "Win" ? "text-[#02C060]" : 
                        row.result === "Loss" ? "text-[#C23331]" : 
                        "text-gray-500"
                      }>
                        {row.result}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {hasMore && (
          <div className="flex items-center justify-center py-4">
            {isLoadingMore && (
              <div className="text-gray-500">Loading more...</div>
            ) }
          </div>
        )}
        
        {!hasMore && history.length > 0 && (
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
                fetchGameHistory(currentPage + 1, true);
              }}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Load More
            </button>
          </div>
        )} */}
      </div>
    </div>
  );
}); 