"use client";
import { useRef } from "react";
import { FaRegCopy } from "react-icons/fa";
import { accountPageStyles, textStyles } from "./shared-styles";

export function ReferAndEarnContent() {
  const referLink = "www.playwinwin.com/refer?code=YOURUNIQUECODE";
  const scrollableContainerRef = useRef<HTMLDivElement>(null);
  const referHistory = [
    { name: "ShivA Sharma", date: "25-1-2025", link: referLink },
    { name: "Sunil kumar", date: "21-1-2025", link: referLink },
    { name: "Ayush Rastogi", date: "18-1-2025", link: referLink },
    { name: "Arvind Kumar", date: "11-12-2024", link: referLink },
    { name: "Pawan Jain", date: "6-12-2024", link: referLink },
    { name: "Subhash Kohli", date: "10-11-2024", link: referLink },
    { name: "Abhinav Dhingra", date: "25-10-2024", link: referLink },
    { name: "Anna", date: "8-9-2024", link: referLink },
  ];

  function handleCopy() {
    navigator.clipboard.writeText(referLink);
  }

  return (
    <div className={accountPageStyles.container}>
      <h2 className={accountPageStyles.header.title} style={textStyles.heading}>Refer & Earn</h2>
      <div className="mb-2">
        <h3 className="font-bold text-gray-900 mb-1">How It Works</h3>
        <ol className="list-decimal pl-5 text-base text-gray-800 space-y-1 mb-2">
          <li>
            <span className="font-bold">Share Your Unique Link</span> – Invite friends to join using your referral link.
          </li>
          <li>
            <span className="font-bold">Friends Sign Up & Participate</span> – They create an account & make a purchase or complete an action.
          </li>
          <li>
            <span className="font-bold">You Earn Rewards</span> – Get cash, discounts, or bonus credits for every successful referral!
          </li>
        </ol>
        <hr className="my-4 border-gray-200" />
        <div className="mb-2">
          <span className="font-bold text-gray-900">Referral link</span>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="text"
              value={referLink}
              readOnly
              className="rounded-md bg-gray-100 px-4 py-2 text-base outline-none border border-gray-300 text-black w-full max-w-md"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="bg-white border border-gray-300 rounded-md p-2 hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Copy referral link"
            >
              <FaRegCopy className="text-green-600 text-lg" />
            </button>
          </div>
        </div>
      </div>
      <div>
        <h3 className="font-bold text-gray-900 mb-2">Refer History</h3>
        <div ref={scrollableContainerRef} className="overflow-y-auto max-h-[400px]">
          <div className={accountPageStyles.table.wrapper}>
            <table className={accountPageStyles.table.container}>
              <thead className="sticky top-0 z-10">
                <tr className={accountPageStyles.table.header}>
                  <th className={accountPageStyles.table.headerCell} style={accountPageStyles.table.headerText}>Name</th>
                  <th className={accountPageStyles.table.headerCell} style={accountPageStyles.table.headerText}>Date</th>
                  <th className={accountPageStyles.table.headerCell} style={accountPageStyles.table.headerText}>Link</th>
                </tr>
              </thead>
              <tbody className={accountPageStyles.table.body}>
                {referHistory.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : accountPageStyles.table.alternateRow}>
                    <td className={`${accountPageStyles.table.cell} whitespace-nowrap`} style={accountPageStyles.table.cellText}>
                      {row.name}
                    </td>
                    <td className={accountPageStyles.table.cell} style={{...accountPageStyles.table.cellText, color: '#000000'}}>
                      {row.date}
                    </td>
                    <td className={`${accountPageStyles.table.cell} text-blue-700 truncate max-w-xs`} style={accountPageStyles.table.cellText}>
                      {row.link}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 