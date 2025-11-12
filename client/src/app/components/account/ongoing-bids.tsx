"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SuitIcon } from "../SuitIcon";
import { apiClient } from "../../../lib/api";
import { useAuthStore } from "../../../store/auth-store";
import { accountPageStyles, textStyles } from "./shared-styles";
import { useAlert } from "../../hooks";
import { AlertModal } from "../";

interface Bid {
  _id: string;
  cardName: string;
  cardType: string;
  cardSuit: string;
  quantity: number;
  totalAmount: number;
  cardPrice: number;
  createdAt: string;
  game?: {
    _id: string;
    status: string;
  } | null;
}

const suitSymbolMap: Record<string, string> = {
  'clubs': '♣',
  'diamonds': '♦',
  'spades': '♠',
  'hearts': '♥'
};

export function OngoingBidsContent() {
  const [bids, setBids] = useState<Bid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isLoggedIn } = useAuthStore();
  const router = useRouter();
  const hasFetchedRef = useRef(false);
  const scrollableContainerRef = useRef<HTMLDivElement>(null);
  const { alert, showError, closeAlert } = useAlert();

  useEffect(() => {
    // Reset ref when user logs out
    if (!isLoggedIn) {
      hasFetchedRef.current = false;
      setIsLoading(false);
      setBids([]);
      setError(null);
      return;
    }

    if (isLoggedIn && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      // Fetching ongoing bids...
      fetchOngoingBids();
    }
  }, [isLoggedIn]);

  const fetchOngoingBids = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.getOpenGameBids();
      if (response.data) {
        setBids(response.data);
      } else if (response.error) {
        setError(response.error);
      }
    } catch {
      // Failed to fetch ongoing bids
      setError('Failed to load ongoing bids');
    } finally {
      setIsLoading(false);
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

    return `${day}-${month}-${year} - ${displayHours}:${minutes}${ampm}`;
  };

  const getSuitSymbol = (suit: string) => {
    return suitSymbolMap[suit] || suit;
  };

  const handlePlayAgain = () => {
    if (!isLoggedIn) {
      router.push('/');
      return;
    }
    const user = useAuthStore.getState().user;
    if (user && user.status === 'banned') {
      showError('Your account has been banned. Please contact to admin support');
      return;
    }
    router.push('/game');
  };

  if (isLoading) {
    return (
      <div className={accountPageStyles.container}>
        <h2 className={accountPageStyles.header.title} style={textStyles.heading}>Ongoing Bids</h2>
        <div className={accountPageStyles.loading}>
          <div className="text-gray-500">Loading ongoing bids...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={accountPageStyles.container}>
        <h2 className={accountPageStyles.header.title} style={textStyles.heading}>Ongoing Bids</h2>
        <div className={accountPageStyles.loading}>
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={accountPageStyles.container}>
      <h2 className={accountPageStyles.header.title} style={textStyles.heading}>Ongoing Bids</h2>
      <div ref={scrollableContainerRef} className="overflow-y-auto max-h-[400px]">
        <div className={accountPageStyles.table.wrapper}>
          <table className={accountPageStyles.table.container}>
            <thead className="sticky top-0 z-10">
              <tr className={accountPageStyles.table.header}>
                <th className={accountPageStyles.table.headerCell} style={accountPageStyles.table.headerText}>Date & Time</th>
                <th className={`${accountPageStyles.table.headerCell} text-right`} style={accountPageStyles.table.headerText}>Bids</th>
              </tr>
            </thead>
            <tbody className={accountPageStyles.table.body}>
              {bids.length === 0 ? (
                <tr>
                  <td colSpan={2} className={accountPageStyles.table.emptyCell}>
                    {isLoading ? 'Loading ongoing bids...' : 'No ongoing bids found. Current game may be closed or no bids placed yet.'}
                  </td>
                </tr>
              ) : (
                bids.map((bid, idx) => (
                  <tr key={bid._id} className={idx % 2 === 0 ? "bg-white" : accountPageStyles.table.alternateRow}>
                    <td className={accountPageStyles.table.cell} style={accountPageStyles.table.cellText}>
                      {formatDateTime(bid.createdAt)}
                    </td>
                    <td className={`${accountPageStyles.table.cell} flex items-center justify-end gap-1 text-right`} style={{...accountPageStyles.table.cellText, color: '#000000'}}>
                      <span style={{...accountPageStyles.table.cellText, color: '#000000'}}>{bid.cardType}</span>
                      <SuitIcon suit={getSuitSymbol(bid.cardSuit)} size={20} />
                      <span className="mx-1" style={{...accountPageStyles.table.cellText, color: '#000000'}}>X</span>
                      <span style={{...accountPageStyles.table.cellText, color: '#000000'}}>{bid.quantity}</span>
                      <span className="mx-1" style={{...accountPageStyles.table.cellText, color: '#000000'}}>=</span>
                      <span style={{...accountPageStyles.table.cellText, color: '#000000'}}>&#8377;{bid.totalAmount}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <button
        type="button"
        onClick={handlePlayAgain}
        className="py-3 w-40 self-center mt-2 cursor-pointer hover:bg-yellow-500 transition-colors"
        style={{
          fontFamily: 'Poppins',
          fontWeight: 600,
          fontStyle: 'SemiBold',
          fontSize: '14px',
          color: '#222B44',
          backgroundColor: '#FFCD01',
          borderRadius: '4px',
          height: '40px',
        }}>Play Again</button>

      <AlertModal open={alert.open} onClose={closeAlert} message={alert.message} type={alert.type} />
    </div>
  );
} 