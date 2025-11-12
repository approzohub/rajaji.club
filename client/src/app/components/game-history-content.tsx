"use client";

import { useState, useEffect } from "react";
import { SuitIcon } from "./SuitIcon";
import { apiClient } from "../../lib/api";
import { useAuthStore } from "../../store/auth-store";

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

export function GameHistoryContent() {
  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isLoggedIn } = useAuthStore();

  useEffect(() => {
    const fetchGameHistory = async () => {
      if (!isLoggedIn) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiClient.getUserGameHistory(1, 50);
        if (response.data?.history) {
          const formattedHistory = response.data.history.map((item: {
            date: string;
            bid: {
              cardName: string;
              quantity: number;
              totalAmount: number;
            };
            result: string;
          }) => {
            // Parse the date
            const gameDate = new Date(item.date);
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

            // Parse bid information from cardName (e.g., "A♠", "J♥", "10♦")
            const bidMatch = item.bid?.cardName?.match(/^([A-Z0-9]+)\s*([♠♣♥♦])$/);
            const value = bidMatch ? bidMatch[1] : "A";
            const suit = bidMatch ? bidMatch[2] : "♦";
            const count = item.bid?.quantity || 1;
            const amount = item.bid?.totalAmount || 0;

            return {
              date: dateStr,
              time: timeStr,
              bid: {
                value,
                suit,
                count,
                amount
              },
              result: item.result as "Win" | "Loss" | "Open"
            };
          });

          setHistory(formattedHistory);
        }
      } catch {
        // Failed to fetch game history
        setHistory([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGameHistory();
  }, [isLoggedIn]);

  if (isLoading) {
    return (
      <div className="w-full flex-1 h-full bg-white rounded-lg shadow-lg p-0 flex flex-col gap-0">
        <div className="text-[20px] md:ml-5 leading-[18px] tracking-normal px-4 pt-4 pb-2 text-[#666666] md:text-[#000000]"
          style={{ fontFamily: 'Poppins', fontWeight: 500, 
            fontStyle: 'medium', fontSize: 20, lineHeight: '24px', 
            letterSpacing: 0 }}>
          Game History
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading game history...</div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="w-full flex-1 h-full bg-white rounded-lg shadow-lg p-0 flex flex-col gap-0">
        <div className="text-[20px] md:ml-5 leading-[18px] tracking-normal px-4 pt-4 pb-2 text-[#666666] md:text-[#000000]"
          style={{ fontFamily: 'Poppins', fontWeight: 500, 
            fontStyle: 'medium', fontSize: 20, lineHeight: '24px', 
            letterSpacing: 0 }}>
          Game History
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Please login to view game history</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 h-full bg-white rounded-lg shadow-lg p-0 flex flex-col gap-0">
    <div className=" text-[20px] md:ml-5 leading-[18px] tracking-normal px-4 pt-4 pb-2 text-[#666666] md:text-[#000000]"
      style={{ fontFamily: 'Poppins', fontWeight: 500, 
        fontStyle: 'medium', fontSize: 20, lineHeight: '24px', 
        letterSpacing: 0 }}>
        Game History
      </div>
      <div className="overflow-x-auto  md:p-8 md:pt-0">
        <table className="w-full rounded-lg overflow-hidden border border-gray-200">
          <thead>
            <tr className="bg-[#222B44] text-white text-left">
              <th className="px-4 py-3 font-semibold text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, 
                fontStyle: 'semibold', fontSize: 14, lineHeight: '24px', 
                letterSpacing: 0 }}>Date & Time</th>
              <th className="px-4 py-3 md:ml-[55px] md:text-center" style={{ fontFamily: 'Poppins', fontWeight: 500, 
                fontStyle: 'semibold', fontSize: 14, lineHeight: '24px', 
                letterSpacing: 0 }}>Bid</th>
              <th className="px-4 py-3 font-semibold text-sm md:flex md:justify-end" style={{ fontFamily: 'Poppins', fontWeight: 500, 
                fontStyle: 'semibold', fontSize: 14, lineHeight: '24px', 
                letterSpacing: 0 }}>Result</th>
            </tr>
          </thead>
          <tbody className="border-2 border-[#D8D8D8] border-t-0">
            {history.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                  No game history available
                </td>
              </tr>
            ) : (
              history.map((row, idx) => (
                <tr
                  key={idx}
                  className={`${idx % 2 === 0 ? "bg-[#FFFFFF]" : "bg-[#F6F6F6]"}`}
                >
                  <td className="px-4 py-[-1] text-[#535353]  whitespace-nowrap" 
                  style={{ fontFamily: 'Poppins', fontWeight: 500, 
                    fontStyle: 'medium', fontSize: 14, lineHeight: '24px', 
                    letterSpacing: 0 }}>{row.date} - {row.time}</td>
                  <td className="px-1 py-[-1] md:ml-[55px] md:text-center" 
                  style={{ fontFamily: 'Poppins', fontWeight: 500, 
                    fontStyle: 'medium', fontSize: 14, lineHeight: '24px', 
                    letterSpacing: 0, color: '#000000' }}>
                    <div className="flex flex-row items-center w-full md:gap-x-1 lg:gap-x-1 justify-center  md:ml-[55px] md:text-center">
                      <span className="font-sans font-medium text-[14px] leading-6 tracking-normal whitespace-nowrap"
                      style={{ fontFamily: 'Poppins', fontWeight: 500, 
                        fontStyle: 'medium', fontSize: 16, lineHeight: '24px', 
                        letterSpacing: 0, color: '#000000' }}>{row.bid.value}</span>
                      <span className="flex-none lg:p-1 p-2 flex justify-center min-w-[20px] md:min-w-[20px] lg:min-w-[20px]">
                        <SuitIcon suit={row.bid.suit} size={20} />
                      </span>
                      <span className="font-sans font-medium text-[14px] leading-6 tracking-normal whitespace-nowrap">X {row.bid.count} = ₹{row.bid.amount}</span>
                    </div>
                  </td>
                  <td className="px-4 py-[-1] md:flex md:justify-end" style={{ fontFamily: 'Poppins', fontWeight: 500, 
                    fontStyle: 'medium', fontSize: 14, lineHeight: '24px', 
                    letterSpacing: 0 }}>
                    <span
                      className={
                        row.result === "Win"
                          ? "text-[#02C060]"
                          : row.result === "Loss"
                          ? "text-[#C23331]"
                          : "text-gray-500"
                      }
                    >
                      {row.result}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 