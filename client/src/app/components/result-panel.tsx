"use client";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/auth-store";
import { SuitIcon } from "./SuitIcon";
import { useState, useEffect } from "react";
import { socketService, type TimerUpdate, type ResultDeclared } from "../../lib/socket-service";
import { apiClient } from "../../lib/api";
import { formatTimeForDisplay } from "../../lib/timezone";
import { useAlert } from "../hooks";
import { AlertModal } from ".";

const DEFAULT_BIDDING_DURATION_MINUTES = parseInt(process.env.NEXT_PUBLIC_BIDDING_DURATION || '9');

export function ResultPanel({ 
  isRmPlayNow = false, 
  onLoginClick,
  showOnlyResult = false,
  showOnlyTimer = false
}: { 
  isRmPlayNow?: boolean; 
  onLoginClick?: () => void;
  showOnlyResult?: boolean;
  showOnlyTimer?: boolean;
}) {
  const router = useRouter();
  const { isLoggedIn } = useAuthStore();
  const { alert, showError, closeAlert } = useAlert();

  // Timer state from Socket.IO
  const [timerData, setTimerData] = useState<TimerUpdate>({
    currentTime: DEFAULT_BIDDING_DURATION_MINUTES * 60,
    isBreak: false,
    gameStatus: 'open',
    activeGameId: null,
    resultTime: ""
  });


  // Last declared result state
  const [lastResult, setLastResult] = useState<{
    time: string | null;
    result: string | null;
  }>({
    time: null,
    result: null
  });

  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Socket.IO connection and subscriptions
  useEffect(() => {
    // Fetch initial game timer status
    const fetchInitialTimer = async () => {
      try {
        const response = await apiClient.getGameTimer();
        if (response.data) {
          console.log('📊 ResultPanel initial timer status:', response.data);
          const data = response.data;
          setTimerData(prev => ({
            ...prev,
            currentTime: data.currentTime || prev.currentTime,
            isBreak: data.isBreak ?? prev.isBreak,
            gameStatus: data.gameStatus || prev.gameStatus,
            activeGameId: data.activeGameId || prev.activeGameId,
            resultTime: data.resultTime || prev.resultTime
          }));
        }
      } catch (error) {
        console.error('Failed to fetch initial game timer:', error);
      }
    };

    fetchInitialTimer();

    // Subscribe to timer updates
    const unsubscribeTimer = socketService.subscribeToTimer((data) => {
      setTimerData(data);
    });

    // Subscribe to game created events
    const unsubscribeGameCreated = socketService.subscribeToGameCreated((data) => {
      // Update timer data with new result time
      setTimerData(prev => ({
        ...prev,
        resultTime: data.resultTime
      }));
    });

    // Subscribe to status changes
    const unsubscribeStatusChange = socketService.subscribeToStatusChange((data) => {
      setTimerData(prev => ({
        ...prev,
        ...data
      }));
    });

    // Subscribe to result declared events
    const unsubscribeResultDeclared = socketService.subscribeToResultDeclared((data: ResultDeclared) => {
      console.log('🎉 Result declared event received in result-panel:', data);
      console.log('🎉 Setting last result:', { time: data.time, result: data.result });
      setLastResult({
        time: data.time,
        result: data.result
      });
    });

    return () => {
      unsubscribeTimer();
      unsubscribeGameCreated();
      unsubscribeStatusChange();
      unsubscribeResultDeclared();
    };
  }, []);



  // Fetch last declared result
  useEffect(() => {
    const fetchLastResult = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.getLastDeclaredResult();
        if (response.data) {
          setLastResult(response.data);
        }
      } catch {
        // Failed to fetch last declared result
      } finally {
        setIsLoading(false);
      }
    };

    fetchLastResult();
  }, []);

  function handlePlayNow() {
    if (!isLoggedIn) {
      onLoginClick?.();
      return;
    }
    const user = useAuthStore.getState().user;
    if (user && user.status === 'banned') {
      showError('Your account has been deactivated. Please contact to admin support');
      return;
    }
    router.push("/game");
  }

  // Format timer display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `00:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Parse winning card from result string
  const parseWinningCard = (result: string | null) => {
    if (!result) return null; // Return null for no result

    // Split result into value and suit (e.g., "10 ♥" -> value: "10", suit: "♥")
    const match = result.match(/^(J|K|Q|A|10)\s*([\u2660-\u2667])/);
    if (match) {
      return { value: match[1], suit: match[2] };
    }

    // Fallback: try to extract from any format
    const parts = result.split(/\s+/);
    return { value: parts[0] || "J", suit: parts[1] || "♠" };
  };

  // Only parse the card if we have data and are not loading
  const cardData = isLoading ? null : parseWinningCard(lastResult.result);
  const hasResult = cardData !== null;

  return (
    <>
      {/* Desktop View - Horizontal Layout for Results Page */}
      <aside className={`hidden md:flex w-full mt-2 flex-row gap-4 rounded-2xl p-0 items-stretch`} aria-label="Result Panel" style={{ flexWrap: 'nowrap' }}>
        {/* Result Card - Show if not showOnlyTimer */}
        {!showOnlyTimer && (
        <div className="bg-white rounded-lg shadow-lg flex items-center justify-between px-4 sm:px-6 flex-1 shrink-0" style={{ minHeight: 81, marginBottom: 0 }}>
          <div className="flex flex-col items-start justify-center gap-0.5">
            <span
              className="text-black font-normal"
              style={{
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 400,
                fontStyle: 'normal',
                fontSize: 22,
                lineHeight: '10px',
                letterSpacing: 0,
              }}
            >
              Result
            </span>
            <span
              className={hasResult ? "text-black" : "text-gray-400"}
              style={{
                fontWeight: 600, // SemiBold
                fontStyle: 'normal',
                fontSize: 22,
                lineHeight: '10px',
                letterSpacing: 0,
                marginTop: 15, // mt-1 in Tailwind is 0.25rem = 4px
              }}
            >
              {isLoading ? "Loading..." : (hasResult ? formatTimeForDisplay(lastResult.time!) : "N/A")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {hasResult ? (
              <>
                <span
                  className="text-black"
                  style={{
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 500, // Medium
                    fontStyle: 'normal',
                    fontSize: 63,
                    lineHeight: '1.2',
                    letterSpacing: 0,
                    textAlign: 'center',
                    display: 'inline-block',
                  }}
                >
                  {cardData?.value}
                </span>
                <SuitIcon suit={cardData?.suit || "♠"} size={44} />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <span
                  className="text-gray-400"
                  style={{
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 400,
                    fontStyle: 'normal',
                    fontSize: 16,
                    lineHeight: '1.2',
                    letterSpacing: 0,
                    textAlign: 'center',
                  }}
                >
                  N/A
                </span>
                <span
                  className="text-gray-300"
                  style={{
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 300,
                    fontStyle: 'normal',
                    fontSize: 14,
                    lineHeight: '1.2',
                    letterSpacing: 0,
                    textAlign: 'center',
                    marginTop: 4,
                  }}
                >
                  Check back later
                </span>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Game Timer with Connection Status - Show if not showOnlyResult */}
        {!showOnlyResult && (
        <div className="relative flex-1 shrink-0">
          <div className={`rounded-lg flex flex-col items-center justify-center px-4 sm:px-6 p-2 w-full h-full relative overflow-visible ${timerData.isBreak ? 'bg-orange-500' : 'bg-[#16c25f]'}`} style={{ minHeight: 81 }}>
            <div className="w-full flex items-center justify-center relative">
              <span
                className="text-white font-bold text-center mx-auto"
                style={{
                  fontWeight: 600,
                  fontStyle: 'normal',
                  fontSize: 16,
                  lineHeight: '10px',
                  letterSpacing: 0,
                  textAlign: 'center',
                  marginTop: 10,
                }}
              >
                {timerData.isBreak ? 'Starting In' : 'Game Timer'}
              </span>

            </div>
            <span
              className="text-white font-bold text-center uppercase mx-auto"
              style={{
                fontWeight: 600,
                fontStyle: 'normal',
                fontSize: 'clamp(24px, 3vw, 44px)',
                lineHeight: '34px',
                letterSpacing: 0,
                textAlign: 'center',
                textTransform: 'uppercase',
                marginTop: 10,
              }}
            >
              {formatTime(timerData.currentTime)}
            </span>
          </div>
        </div>
        )}

        {/* Play Now Button - Only show when logged in and not in split view */}
        {!isRmPlayNow && !showOnlyResult && !showOnlyTimer && (
          <button
            style={{
              backgroundColor: '#FFCD01',
            }}
            onClick={handlePlayNow}
            className={`hidden md:block text-black font-bold py-4 rounded shadow-lg text-xl sm:text-2xl flex-1 shrink-0 cursor-pointer ${
              timerData.gameStatus === 'open' && !timerData.isBreak && timerData.activeGameId ? 'hover:bg-yellow-500' : 'cursor-not-allowed'
            }`}
            aria-label="Play Now"
            disabled={timerData.gameStatus !== 'open' || timerData.isBreak || !timerData.activeGameId}
          >
            <span
              style={{
                fontWeight: 600,
                fontStyle: 'normal',
                fontSize: 'clamp(18px, 2vw, 30px)',
                letterSpacing: 0,
                textAlign: 'center',
                textTransform: 'uppercase',
              }}
            >
              {timerData.gameStatus === 'open' && !timerData.isBreak && timerData.activeGameId ? 'PLAY NOW' : 'TIME OUT'}
            </span>
          </button>
        )}
      </aside>

      {/* Mobile View - Hidden on desktop */}
      <aside className={`md:hidden w-full ${showOnlyResult || showOnlyTimer ? '' : 'flex flex-col gap-3'} ${showOnlyResult || showOnlyTimer ? '' : 'mt-2'}`} aria-label="Mobile Result Panel">
        {/* Result Card - Mobile */}
        {!showOnlyTimer && (
        <div className={`bg-white ${showOnlyResult ? '' : 'rounded-lg'} shadow-lg flex items-center justify-between ${showOnlyResult ? 'px-3 py-2' : 'px-4 py-4'} w-full`} style={{ minHeight: 70, height: 70 }}>
          <div className="flex flex-col items-start justify-center">
            <span
              className={`text-black font-semibold ${showOnlyResult ? 'text-[14px]' : 'text-[22px]'} leading-tight tracking-[0%]`}
              style={{
                fontFamily: 'Poppins',
                fontWeight: 600,
                fontStyle: 'SemiBold',
              }}
            >
              {showOnlyResult ? 'Result' : `Result: ${isLoading ? "Loading..." : (hasResult ? formatTimeForDisplay(lastResult.time!) : "N/A")}`}
            </span>
            {showOnlyResult && (
              <span
                className="text-gray-500 text-[12px] leading-tight mt-0.5"
                style={{
                  fontFamily: 'Poppins',
                  fontWeight: 400,
                }}
              >
                {isLoading ? "Loading..." : (hasResult ? formatTimeForDisplay(lastResult.time!) : "N/A")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {hasResult ? (
              <>
                  <span
                  className={`text-black font-normal ${showOnlyResult ? 'text-[28px]' : 'text-[48px]'} leading-none tracking-[0%]`}
                    style={{
                      fontFamily: 'Poppins',
                      fontWeight: 400,
                      fontStyle: 'Regular',
                    }}
                  >
                    {cardData?.value}
                  </span>
                <SuitIcon suit={cardData?.suit || "♠"} size={showOnlyResult ? 28 : 48} />
              </>
            ) : (
              <span
                className={`text-gray-400 font-normal ${showOnlyResult ? 'text-[14px]' : 'text-[22px]'} leading-tight tracking-[0%]`}
                style={{
                  fontFamily: 'Poppins',
                  fontWeight: 400,
                  fontStyle: 'Regular',
                }}
              >
                N/A
              </span>
            )}
          </div>
        </div>
        )}

        {/* Game Timer - Mobile */}
        {!showOnlyResult && (
        <div className={`${showOnlyTimer ? '' : 'rounded-lg'} flex items-center justify-between ${showOnlyTimer ? 'px-3 py-2' : 'px-4 py-4'} w-full ${timerData.isBreak ? 'bg-orange-500' : 'bg-[#16c25f]'}`} style={{ minHeight: 70, height: 70 }}>
          <span
            className={`text-white font-normal ${showOnlyTimer ? 'text-[12px]' : 'text-[22px]'} leading-tight tracking-[0%]`}
            style={{
              fontFamily: 'Poppins',
              fontWeight: 400,
              fontStyle: 'Regular',
            }}
          >
            {timerData.isBreak ? 'Starting In' : 'Game Timer'}
          </span>
          <span
            className={`text-white font-normal ${showOnlyTimer ? 'text-[20px]' : 'text-[32px]'} leading-tight tracking-[0%]`}
            style={{
              fontFamily: 'Poppins',
              fontWeight: 400,
              fontStyle: 'Regular',
            }}
          >
            {formatTime(timerData.currentTime)}
          </span>
        </div>
        )}

        {/* Play Now Button - Mobile - Hidden since we have sticky button */}
        {/* {!isRmPlayNow && (
          <button 
            style={{
              backgroundColor: timerData.gameStatus === 'open' ? '#FFCD01' : '#6B7280',
            }}
            onClick={handlePlayNow} 
            className={`text-black font-bold py-3 rounded shadow-lg text-lg w-full cursor-pointer ${timerData.gameStatus === 'open' ? 'hover:bg-yellow-500' : 'cursor-not-allowed'}`}
            aria-label="Play Now"
            disabled={timerData.gameStatus !== 'open'}
          >
            <span
              style={{
                fontWeight: 600,
                fontStyle: 'normal',
                fontSize: 18,
                letterSpacing: 0,
                textAlign: 'center',
                textTransform: 'uppercase',
              }}
            >
              {timerData.gameStatus === 'open' ? 'PLAY NOW' : 'GAME CLOSED'}
            </span>
          </button>
        )} */}
      </aside>
      {/* Alert modal for banned users */}
      <AlertModal open={alert.open} onClose={closeAlert} message={alert.message} type={alert.type} />
    </>
  );
} 