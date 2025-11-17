"use client";
import { useState, useEffect, useRef } from "react";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { SuitIcon } from "../components/SuitIcon";
import { apiClient } from "../../lib/api";
import { WhatsAppFab } from "../components/whatsapp-fab";
import { ResultPanel } from "../components/result-panel";
import { DateRangePicker } from "../components/date-range-picker";
import { setPageTitle, PAGE_TITLES } from "../../lib/page-title";
import { LoginModal } from "../components/login-modal";
import { useAuthStore } from "../../store/auth-store";
import { socketService } from "../../lib/socket-service";

const GAME_SLOT_INTERVAL_MINUTES = parseInt(process.env.NEXT_PUBLIC_GAME_SLOT_INTERVAL || '10');


export default function ResultsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [chartData, setChartData] = useState<Array<{ time: string; results: string[] }>>([]);
  const [dateColumns, setDateColumns] = useState<string[]>([]);
  const [loginOpen, setLoginOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [balance, setBalance] = useState(0);
  const [currentDateRange, setCurrentDateRange] = useState<{ start: string; end: string } | null>(null);
  const { login, isLoggedIn, mainBalance, bonusBalance } = useAuthStore();
  
  // Format date for display (DD-MM-YYYY)
  const formatDateForDisplay = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
  };
  
  // Game status state for mobile sticky button
  const [gameStatus, setGameStatus] = useState<'open' | 'waiting_result' | 'result_declared'>('open');
  
  // Ref for scrollable container
  const scrollableContainerRef = useRef<HTMLDivElement>(null);

  // Set default date range to current month (1st to current date)
  useEffect(() => {
    const now = new Date();
    
    // Convert to IST timezone for proper date calculation
    const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    
    // Format dates as YYYY-MM-DD for API call using IST dates
    const startDate = `${istNow.getFullYear()}-${String(istNow.getMonth() + 1).padStart(2, '0')}-01`; // 1st of current month
    const endDate = `${istNow.getFullYear()}-${String(istNow.getMonth() + 1).padStart(2, '0')}-${String(istNow.getDate()).padStart(2, '0')}`; // Current date
    
    console.log('Setting default date range (current month):', { startDate, endDate });
    console.log('Current IST time:', istNow.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    
    setCurrentDateRange({ start: startDate, end: endDate });
    
    // Load results for current month
    fetchResultsByDateRange();
  }, []);

  // Fetch results when date range changes
  useEffect(() => {
    fetchResultsByDateRange();
  }, [currentDateRange]);

  // Set page title
  useEffect(() => {
    setPageTitle(PAGE_TITLES.RESULTS);
  }, []);

  // Subscribe to game status updates for mobile sticky button
  useEffect(() => {
    const unsubscribe = socketService.subscribeToStatusChange((data) => {
      console.log('📱 Mobile results page received status change:', data);
      setGameStatus(data.gameStatus);
    });

    // Also fetch initial game status
    const fetchInitialStatus = async () => {
      try {
        const response = await apiClient.getGameTimer();
        if (response.data) {
          console.log('📱 Mobile results page initial status:', response.data);
          setGameStatus(response.data.gameStatus);
        }
      } catch (error) {
        console.error('Failed to fetch initial game status:', error);
      }
    };

    fetchInitialStatus();

    return unsubscribe;
  }, []);

  // Fetch user balance when logged in
  useEffect(() => {
    if (isLoggedIn) {
      setBalance(mainBalance + bonusBalance);
    } else {
      setBalance(0);
    }
  }, [isLoggedIn, mainBalance, bonusBalance]);



  const fetchResultsByDateRange = async () => {
    // Clear previous data immediately when fetching new data - use functional updates to ensure clearing
    setChartData(() => []);
    setDateColumns(() => []);
    setIsLoading(true);
    
    try {
      let response;
      
      if (!currentDateRange) {
        // This should not happen since we set default date range
        console.log('No date range selected - this should not happen');
        setChartData(() => []);
        setDateColumns(() => []);
        setIsLoading(false);
        return;
      }
      
      // Fetch results for specific date range
      console.log('Fetching results for date range:', currentDateRange);
      response = await apiClient.getResultsByDateRange(currentDateRange.start, currentDateRange.end);

      console.log('Raw API response:', response);
      console.log('Response data type:', typeof response.data);
      console.log('Response data length:', Array.isArray(response.data) ? response.data.length : 'Not an array');

      // Check if response data exists and is an array
      if (!response.data || !Array.isArray(response.data)) {
        console.log('No data in response or data is not an array');
        console.log('Response data:', response.data);
        setChartData(() => []);
        setDateColumns(() => []);
        setIsLoading(false);
        return;
      }

      // Handle date range results
      const results = response.data as Array<{ time: string; result: string; date: string }>;
      console.log('Results received:', results.length, 'results');
      console.log('Full response data:', response.data);
      
      // If no results, clear data and show empty state immediately
      if (results.length === 0) {
        console.log('No results found for the selected date range - clearing all data');
        // Explicitly clear all state to ensure UI updates
        setChartData(() => []);
        setDateColumns(() => []);
        setIsLoading(false);
        return;
      }
      
      // Process results only if we have data
      if (results.length > 0) {
          // Create time intervals based on configured slot interval (default 10 minutes)
          const timeIntervals: string[] = [];
          const minutesInDay = 24 * 60;
          for (let minutes = 0; minutes < minutesInDay; minutes += GAME_SLOT_INTERVAL_MINUTES) {
            const hours = Math.floor(minutes / 60);
            const minuteOfHour = minutes % 60;
            const time = new Date(2024, 0, 1, hours, minuteOfHour);
              const timeString = time.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              });
              timeIntervals.push(timeString);
          }

          // Helper function to find the closest time interval for a given time string
          const findClosestTimeInterval = (timeString: string): string => {
            // Parse time string (e.g., "1:29 PM" or "11:50 PM")
            const timeMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (!timeMatch) return timeString; // Return original if parsing fails
            
            const hour = parseInt(timeMatch[1]);
            const minute = parseInt(timeMatch[2]);
            const period = timeMatch[3].toUpperCase();
            
            // Convert to 24-hour format
            let hour24 = hour;
            if (period === 'PM' && hour !== 12) {
              hour24 = hour + 12;
            } else if (period === 'AM' && hour === 12) {
              hour24 = 0;
            }
            
            // Calculate total minutes
            const totalMinutes = hour24 * 60 + minute;
            
            // Round to nearest interval
            const roundedMinutes = Math.round(totalMinutes / GAME_SLOT_INTERVAL_MINUTES) * GAME_SLOT_INTERVAL_MINUTES;
            
            // Convert back to time string
            const roundedHours = Math.floor(roundedMinutes / 60) % 24;
            const roundedMins = roundedMinutes % 60;
            
            const roundedDate = new Date(2024, 0, 1, roundedHours, roundedMins);
            return roundedDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });
          };

          // Generate all dates in the range first (to filter results)
          const allDates: string[] = [];
          if (currentDateRange) {
            // Parse dates in YYYY-MM-DD format and create dates in IST timezone
            const [startYear, startMonth, startDay] = currentDateRange.start.split('-').map(Number);
            const [endYear, endMonth, endDay] = currentDateRange.end.split('-').map(Number);
            
            const startDate = new Date(startYear, startMonth - 1, startDay);
            const endDate = new Date(endYear, endMonth - 1, endDay);
            
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
              // Format date to match backend format (DD-MM-YYYY)
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              const formattedDate = `${day}-${month}-${year}`;
              allDates.push(formattedDate);
            }
            
            // Sort dates in descending order (most recent first)
            allDates.sort((a, b) => {
              const dateA = new Date(a.split('-').reverse().join('-'));
              const dateB = new Date(b.split('-').reverse().join('-'));
              return dateB.getTime() - dateA.getTime();
            });
          } else {
            // Fallback: generate last 30 days even if no results
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            
            for (let d = new Date(thirtyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
              // Format date to match backend format (DD-MM-YYYY) using IST timezone
              const istDate = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
              const formattedDate = istDate.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              }).replace(/\//g, '-');
              allDates.push(formattedDate);
            }
            
            // Sort dates in descending order (most recent first)
            allDates.sort((a, b) => {
              const dateA = new Date(a.split('-').reverse().join('-'));
              const dateB = new Date(b.split('-').reverse().join('-'));
              return dateB.getTime() - dateA.getTime();
            });
          }
          
          console.log('All dates in range:', allDates);
          
          // Filter results to only include dates within the selected range
          const filteredResults = results.filter(result => {
            return allDates.includes(result.date);
          });
          
          console.log('Filtered results (only dates in range):', filteredResults.length, 'out of', results.length);
          
          // Group results by date and time (matching to closest time interval)
          const resultsByDateAndTime: { [date: string]: { [time: string]: string } } = {};
          
          console.log('Processing filtered results:', filteredResults.length, 'results');
          console.log('Sample filtered results:', filteredResults.slice(0, 3));
          
          filteredResults.forEach((result, index) => {
            const date = result.date;
            const time = result.time;
            const closestInterval = findClosestTimeInterval(time);
            
            console.log(`Processing result ${index + 1}:`, { date, time, closestInterval, result: result.result });
            
            if (!resultsByDateAndTime[date]) {
              resultsByDateAndTime[date] = {};
            }
            // Use closest interval as key, but if multiple results map to same interval, keep the most recent
            if (!resultsByDateAndTime[date][closestInterval]) {
              resultsByDateAndTime[date][closestInterval] = result.result;
            }
          });

          console.log('Results grouped by date and time:', resultsByDateAndTime);

          // Get unique dates and sort them
          const dates = Object.keys(resultsByDateAndTime).sort();
          console.log('Unique dates with results:', dates);
          
          // Create table data structure
          const tableData = timeIntervals.map(timeInterval => {
            const row: { time: string; results: string[] } = {
              time: timeInterval,
              results: []
            };
            
            // For each date, find the result for this time interval
            allDates.forEach(date => {
              const result = resultsByDateAndTime[date]?.[timeInterval] || '';
              row.results.push(result);
            });
            
            return row;
          });

          console.log('Final table data:', tableData.slice(0, 3));
          console.log('Date columns:', dateColumns);

          setChartData(tableData);
          setDateColumns(allDates);
          
          console.log('Transformed data:', {
            timeIntervals: timeIntervals.length,
            dates: dates.length,
            allDates: allDates.length,
            sampleDates: dates.slice(0, 5),
            sampleAllDates: allDates.slice(0, 5),
            sampleTimeIntervals: timeIntervals.slice(0, 5),
            sampleTableData: tableData.slice(0, 3),
            currentDateRange
          });
        }
    } catch (error) {
      console.error('Error fetching results:', error);
      setChartData(() => []);
      setDateColumns(() => []);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateRangeSelect = (start: string, end: string) => {
    setCurrentDateRange({ start, end });
    // fetchResultsByDateRange will be called automatically via useEffect when currentDateRange changes
    setShowDatePicker(false);
  };

  const handleResetFilter = () => {
    // Reset to current month (1st to current date)
    const now = new Date();
    
    // Convert to IST timezone for proper date calculation
    const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    
    // Format dates as YYYY-MM-DD for API call using IST dates
    const startDate = `${istNow.getFullYear()}-${String(istNow.getMonth() + 1).padStart(2, '0')}-01`; // 1st of current month
    const endDate = `${istNow.getFullYear()}-${String(istNow.getMonth() + 1).padStart(2, '0')}-${String(istNow.getDate()).padStart(2, '0')}`; // Current date
    
    console.log('Resetting to current month:', { startDate, endDate });
    
    setCurrentDateRange({ start: startDate, end: endDate });
    // fetchResultsByDateRange will be called automatically via useEffect when currentDateRange changes
  };

  async function handleLoginSubmit(gameId: string, password: string) {
    setIsLoggingIn(true);
    setLoginError("");
    
    try {
      const result = await login(gameId, password);
      if (result.success) {
        setLoginOpen(false);
        setLoginError("");
        // Balance will be updated automatically through the useEffect that watches isLoggedIn, mainBalance, and bonusBalance
      } else {
        setLoginError(result.error || "Login failed");
      }
    } catch {
      setLoginError("An unexpected error occurred");
    } finally {
      setIsLoggingIn(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0f1a] text-white" style={{
      backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.03) 0%, transparent 50%)',
      backgroundSize: '50px 50px'
    }}>
      <Header balance={balance} onLoginClick={() => setLoginOpen(true)} />

      {/* Main Content - Two Column Layout */}
      <main className="flex-1 w-full px-4 sm:px-6 pt-4 pb-20 md:pb-6">
        <div className="max-w-7xl mx-auto w-full">



          {/* Result, Timer, and Play Now Button - Horizontal Layout at Top */}
          <div className="mb-4 sm:mb-6">
            <ResultPanel isRmPlayNow={false} onLoginClick={() => setLoginOpen(true)} showOnlyResult={false} showOnlyTimer={false} horizontalMobileLayout={true} horizontalDesktopLayout={true} />
          </div>

          {/* Result Chart Heading - Above Calendar Buttons */}
          <div className="mb-4 sm:mb-6 flex justify-between items-center flex-wrap gap-2">
            <h1
              className="text-white font-bold text-xl sm:text-2xl"
              style={{
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 700,
                lineHeight: '20px',
                fontStyle: "inherit",
              }}
            >
              Result Chart
            </h1>
          </div>

          {/* Date Range Picker - Full Width */}
          <div className="mb-4 flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setShowDatePicker(true)}
              className="bg-[#222B44] hover:bg-[#2a3448] text-white font-medium py-2 px-3 sm:px-4 rounded-lg transition-colors cursor-pointer text-xs sm:text-sm whitespace-nowrap"
              style={{
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 500,
                lineHeight: '20px',
              }}
            >
              📅 <span className="hidden sm:inline">{currentDateRange ? 'Change Date Range' : 'Select Date Range'}</span>
              <span className="sm:hidden">Date</span>
            </button>
            
            {currentDateRange && (
              <>
                <button
                  onClick={handleResetFilter}
                  className="bg-[#222B44] hover:bg-[#2a3448] text-white font-medium py-2 px-3 sm:px-4 rounded-lg transition-colors cursor-pointer text-xs sm:text-sm whitespace-nowrap"
                  style={{
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 500,
                    lineHeight: '20px',
                  }}
                >
                  🔄 Reset
                </button>
                
                <span className="text-white text-xs sm:text-sm px-2 sm:px-3 py-2 bg-[#222B44] rounded-lg whitespace-nowrap">
                  {formatDateForDisplay(currentDateRange.start)} to {formatDateForDisplay(currentDateRange.end)}
                </span>
              </>
            )}
          </div>
          <DateRangePicker
            isOpen={showDatePicker}
            onClose={() => setShowDatePicker(false)}
            onDateRangeSelect={handleDateRangeSelect}
          />

          {/* Chart Table - Full Width */}
          <div className="w-full">
              <div className="w-full bg-white rounded-lg sm:rounded-xl shadow-2xl overflow-hidden border border-gray-200">
                {isLoading ? (
                  <div className="h-96 flex items-center justify-center">
                    <div className="text-gray-600 text-lg font-medium">Loading results...</div>
                  </div>
                ) : (!chartData || chartData.length === 0 || !dateColumns || dateColumns.length === 0) ? (
                  <div className="h-96 md:h-[32rem] xl:h-[40rem] flex flex-col items-center justify-center p-8">
                    <div className="text-center">
                      <div className="text-6xl mb-4">📅</div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2" style={{
                        fontFamily: 'Poppins, sans-serif',
                        fontWeight: 600,
                      }}>
                        No Results Found
                      </h3>
                      <p className="text-gray-600 mb-4" style={{
                        fontFamily: 'Poppins, sans-serif',
                        fontWeight: 400,
                        fontSize: '14px',
                      }}>
                        {currentDateRange ? (
                          <>
                            No game results available for the selected date range
                            <br />
                            <span className="text-gray-500 text-sm mt-2 block">
                              {formatDateForDisplay(currentDateRange.start)} to {formatDateForDisplay(currentDateRange.end)}
                            </span>
                          </>
                        ) : (
                          'No game results available for the selected period'
                        )}
                      </p>
                      <p className="text-gray-500 text-sm" style={{
                        fontFamily: 'Poppins, sans-serif',
                        fontWeight: 400,
                      }}>
                        Please try selecting a different date range
                      </p>
                    </div>
                  </div>
                ) : (
                  <div ref={scrollableContainerRef} className="h-96 md:h-[32rem] xl:h-[40rem] overflow-auto">
                    <table className="min-w-full text-xs sm:text-sm table">
                      <thead className="sticky top-0 bg-[#222B44] z-10">
                        <tr>
                          <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 font-semibold text-white text-left border-r border-white border-b border-white sticky left-0 bg-[#222B44] text-white z-9">
                            <span style={{
                              fontFamily: 'Poppins, sans-serif',
                              fontWeight: 600,
                              fontSize: '12px',
                              lineHeight: '1.5',
                            }} className="sm:text-sm">
                              Time
                            </span>
                          </th>
                          {dateColumns.map((date, index) => {
                            // Check if this date is today using IST timezone
                            const today = new Date();
                            const istToday = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
                            const todayFormatted = istToday.toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            }).replace(/\//g, '-');
                            
                            const isToday = date === todayFormatted;
                            
                            return (
                              <th key={index} className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 font-semibold text-white text-center border-r border-white border-b border-white">
                                <span style={{
                                  fontFamily: 'Poppins, sans-serif',
                                  fontWeight: 600,
                                  fontSize: '12px',
                                  lineHeight: '1.5',
                                  whiteSpace: 'nowrap',
                                }} className="sm:text-sm">
                                  {isToday ? "Today" : date}
                                </span>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {chartData.map((row, rowIndex) => (
                          <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-[#f8f9fa]" : "bg-white"}>
                            <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 font-medium text-white whitespace-nowrap border-r border-white border-b border-white bg-[#222B44] sticky left-0">
                              <span style={{
                                fontFamily: 'Poppins, sans-serif',
                                fontWeight: 500,
                                fontSize: '12px',
                                lineHeight: '1.5',
                              }} className="sm:text-sm">
                                {row.time}
                              </span>
                            </td>

                            {row.results.map((result, resultIndex) => {
                              if (!result || result === 'N/A') {
                                return (
                                  <td key={resultIndex} className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center border-r border-white border-b border-white">
                                    <span style={{
                                      fontFamily: 'Poppins, sans-serif',
                                      fontWeight: 500,
                                      fontSize: '12px',
                                      lineHeight: '1.5',
                                      color: '#6c757d'
                                    }} className="sm:text-sm">
                                      N/A
                                    </span>
                                  </td>
                                );
                              }

                              if (!result || typeof result !== 'string') {
                                return (
                                  <td key={resultIndex} className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center border-r border-white border-b border-white">
                                    <span style={{
                                      fontFamily: 'Poppins, sans-serif',
                                      fontWeight: 500,
                                      fontSize: '12px',
                                      lineHeight: '1.5',
                                      color: '#6c757d'
                                    }} className="sm:text-sm">
                                      N/A
                                    </span>
                                  </td>
                                );
                              }

                              const resultParts = result.trim().split(' ');
                              if (resultParts.length >= 2) {
                                const cardRank = resultParts[0];
                                const cardSuit = resultParts[1];

                                return (
                                  <td key={resultIndex} className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center border-r border-white border-b border-white">
                                    <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                                      <span style={{
                                        fontFamily: 'Poppins, serif',
                                        fontWeight: 500,
                                        fontSize: '12px',
                                        lineHeight: '1.5',
                                        color: '#000000'
                                      }} className="sm:text-sm">
                                        {cardRank}
                                      </span>
                                      <SuitIcon suit={cardSuit} size={18} />
                                    </div>
                                  </td>
                                );
                              }

                              return (
                                <td key={resultIndex} className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-center border-r border-white border-b border-white">
                                  <span style={{
                                    fontFamily: 'Poppins, serif',
                                    fontWeight: 500,
                                    fontSize: '12px',
                                    lineHeight: '1.5',
                                    color: '#6c757d'
                                  }} className="sm:text-sm">
                                    {result}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
          </div>
        </div>
      </main>

      <Footer />
      <WhatsAppFab />

      {/* Sticky Play Now/Timeout Button for Mobile - Always show */}
        <div 
          className="md:hidden fixed bottom-0 left-0 right-0 z-[9999] bg-[#0a0f1a] flex justify-center pointer-events-auto"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            pointerEvents: 'auto',
            WebkitTransform: 'translateZ(0)',
            transform: 'translateZ(0)',
          minHeight: '60px',
          }}
        >
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (gameStatus === 'open') {
              if (isLoggedIn) {
                console.log('Play now button clicked');
              window.location.href = '/game';
              } else {
                setLoginOpen(true);
              }
            }
          }}
          onTouchStart={(e) => {
            e.preventDefault();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            if (gameStatus === 'open') {
              if (isLoggedIn) {
              window.location.href = '/game';
              } else {
                setLoginOpen(true);
              }
            }
          }}
          className={`w-full max-w-md py-4 shadow transition-colors pointer-events-auto touch-manipulation block text-center ${
            gameStatus === 'open' || !isLoggedIn
              ? 'bg-[#FFCD01] text-black cursor-pointer hover:bg-yellow-400' 
              : 'bg-[#FFCD01] text-black cursor-not-allowed'
          }`}
          style={{
            fontFamily: 'Poppins',
            fontWeight: 500,
            fontStyle: 'SemiBold',
            fontSize: '30px',
            lineHeight: '18px',
            letterSpacing: '0%',
            textAlign: 'center',
            borderRadius: '4px',
            pointerEvents: 'auto',
            WebkitTapHighlightColor: 'transparent',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            touchAction: 'manipulation',
            border: 'none',
            outline: 'none',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
          }}
        >
          {!isLoggedIn ? 'PLAY NOW' : (gameStatus === 'open' ? 'PLAY NOW' : 'TIME OUT')}
        </button>
        </div>
      <LoginModal 
        open={loginOpen} 
        onClose={() => { setLoginOpen(false); setLoginError(""); }} 
        onSubmit={handleLoginSubmit} 
        error={loginError}
        isLoading={isLoggingIn}
      />
    </div>
  );
} 