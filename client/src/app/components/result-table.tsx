interface ResultRow {
  time: string;
  result: string;
}

// Empty fallback data - will show loading or empty state
// Removed unused fallbackResults

import { SuitIcon } from "./SuitIcon";
import { useState, useEffect } from "react";
import { apiClient } from "../../lib/api";
import { socketService } from "../../lib/socket-service";

export function ResultTable() {
  const [results, setResults] = useState<ResultRow[]>([]);

  useEffect(() => {
    const fetchTodayResults = async () => {
      try {
        const response = await apiClient.getTodayResults();
        if (response.data && response.data.length > 0) {
          setResults(response.data);
        } else {
          // If no results from API, show empty array
          setResults([]);
        }
      } catch {
        // Failed to fetch today's results
        // Show empty array on error
        setResults([]);
      }
    };

    fetchTodayResults();

    // Subscribe to real-time result updates
    const unsubscribeResultDeclared = socketService.subscribeToResultDeclared((newResult) => {
      // Add new result to the beginning of the list
      setResults(prevResults => [newResult, ...prevResults]);
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribeResultDeclared();
    };
  }, []);
  return (
    <section className="w-full">
      <div className="flex items-center justify-between w-full mb-4 mt-4">
        <h2
          className="text-white font-medium"
          style={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 500,
            fontStyle: 'normal',
            fontSize: 20,
            lineHeight: '24px',
            letterSpacing: 0
          }}
        >
          Today Result
        </h2>
        <a
          href="/results"
          className="text-center uppercase font-semibold underline decoration-solid cursor-pointer hover:text-yellow-300 transition-colors"
          style={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 600,
            fontStyle: 'normal',
            fontSize: 14,
            lineHeight: '10px',
            letterSpacing: 0,
            textDecorationLine: 'underline',
            textDecorationStyle: 'solid',
            textDecorationThickness: 0,
            textUnderlineOffset: 0,
            color: '#FFCD01'
          }}
        >
          RESULT CHART
        </a>
      </div>
      <div className="w-full bg-white rounded-lg shadow-md overflow-hidden">
        <div className="h-80 md:h-[32rem] xl:h-[40rem] overflow-y-auto">
          <table className="min-w-full text-sm text-left rounded-lg overflow-hidden">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="bg-white text-black border-b border-gray-200">
                <th
                  className="px-6 py-3"
                  style={{
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 500,
                    fontStyle: 'normal',
                    fontSize: 18,
                    lineHeight: '24px',
                    letterSpacing: 0
                  }}
                >
                  Time
                </th>
                <th
                  className="px-6 py-3"
                  style={{
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 500,
                    fontStyle: 'normal',
                    fontSize: 18,
                    lineHeight: '24px',
                    letterSpacing: 0,
                    textAlign: 'right'
                  }}
                >
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((row, idx) => {
                // Split result into value and suit
                const match = row.result.match(/^(J|K|Q|A|10)\s*([\u2660-\u2667])/);
                let value = row.result;
                let suit = "";
                if (match) {
                  value = match[1];
                  suit = match[2];
                } else {
                  // fallback for any other format
                  const parts = row.result.split(/\s+/);
                  value = parts[0];
                  suit = parts[1] || "";
                }
                return (
                  <tr
                    key={`${row.time}-${idx}`}
                    className={
                      idx % 2 === 0 ? "bg-[#EFEFEF]" : "bg-[#F6F6F6]"
                    }
                  >
                    <td 
                      className="px-6 py-3 whitespace-nowrap"
                      style={{
                        fontWeight: 500,
                        fontStyle: 'normal',
                        fontSize: 16,
                        lineHeight: '24px',
                        letterSpacing: 0,
                        color: '#535353'
                      }}
                    >
                      {row.time}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span
                        style={{
                          fontWeight: 500,
                          fontStyle: 'medium',
                          fontSize: 26,
                          lineHeight: '1.2',
                          letterSpacing: 0,
                          color: '#000000'
                        }}>{value}</span>
                        <SuitIcon suit={suit} size={22} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
} 