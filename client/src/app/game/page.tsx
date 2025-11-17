"use client";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { ResultPanel } from "../components/result-panel";
import { DeckCard } from "../components/deck-card";
import { GameRules } from "../components/game-rules";
import React, { useState, useEffect, useMemo } from "react";
import { IoMdTrash } from "react-icons/io";
import { WhatsAppFab } from "../components/whatsapp-fab";
import { SuitIcon } from "../components/SuitIcon";
import Image from "next/image";
import { useAuthStore } from "../../store/auth-store";
import { apiClient, Card } from "../../lib/api";
import { useAlert } from "../hooks";
import { AlertModal } from "../components";
import { socketService } from "../../lib/socket-service";
import { ProtectedRoute } from "../../components/protected-route";
import { setPageTitle, PAGE_TITLES } from "../../lib/page-title";

// Use the Card type from the API
type ActiveCard = Card;

function ConfirmModal({ open, onClose, onConfirm, isLoading }: { open: boolean; onClose: () => void; onConfirm: () => void; isLoading: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative bg-white rounded-2xl p-6 w-[95vw] max-w-xs mx-auto shadow-lg">
        <button
          className="absolute top-3 right-4 text-red-600 text-xl font-bold focus:outline-none cursor-pointer"
          onClick={onClose}
          aria-label="Close"
        >
          <Image src="/x.svg" alt="x" width={10} height={10} />
        </button>
        <h2 className=" text-center text-[#000000]"
          style={{
            fontFamily: 'Poppins',
            fontWeight: 500,
            fontStyle: 'medium',
            fontSize: '18px',
            lineHeight: '18px',
            letterSpacing: '0%',
            textAlign: 'center',
          }}
        >Are you sure?</h2>
        <div className="flex justify-center gap-4 mt-4">
          <button
            className="bg-[#DFDFDF] text-black font-bold py-2 px-6 rounded-lg w-[100px] cursor-pointer"
            onClick={onClose}
            disabled={isLoading}
            style={{
              fontFamily: 'Poppins',
              fontWeight: 600,
              fontStyle: 'semibold',
              fontSize: '14px',
              lineHeight: '18px',
              letterSpacing: '0%',
              textAlign: 'center',
            }}
          >No</button>
          <button
            className="bg-[#02C060] w-[100px] text-white font-bold py-2 px-6 rounded-lg cursor-pointer flex items-center justify-center"
            onClick={onConfirm}
            disabled={isLoading}
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
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Placing...</span>
              </div>
            ) : (
              'Yes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function BidPlacedModal({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative bg-white rounded-2xl p-6 w-[95vw] max-w-xs mx-auto shadow-lg">
        <button
          className="absolute top-3 right-4 text-red-600 text-xl font-bold focus:outline-none cursor-pointer"
          onClick={onClose}
          aria-label="Close"
        >
          <Image src="/x.svg" alt="x" width={10} height={10} />
        </button>
        <span className=" flex text-center text-[#000000]"
          style={{
            fontFamily: 'Poppins',
            fontWeight: 500,
            fontStyle: 'medium',
            fontSize: '18px',
            lineHeight: '25px',
            letterSpacing: '0%',
            textAlign: 'center',
          }}
        >
          Congratulations!<br />
          Your bet has been placed successfully.</span>
        <div className="flex justify-center gap-4 mt-4">

          <button
            className="bg-[#02C060] w-[200px] text-white font-bold py-2 px-6 rounded-lg  cursor-pointer"
            onClick={onConfirm}
            style={{
              fontFamily: 'Poppins',
              fontWeight: 600,
              fontStyle: 'semibold',
              fontSize: '14px',
              lineHeight: '18px',
              letterSpacing: '0%',
              textAlign: 'center',
            }}
          >Check your Bets</button>
        </div>
      </div>
    </div>
  );
}

export default function GamePage() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [balance, setBalance] = useState(1250);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [bidPlacedOpen, setBidPlacedOpen] = useState(false);
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [apiCardPrices, setApiCardPrices] = useState<Record<string, number>>({});
  const [activeCards, setActiveCards] = useState<ActiveCard[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [isBidPlaced, setIsBidPlaced] = useState(false);
  const [isGameWaiting, setIsGameWaiting] = useState(false);
  
  // Auth and alert hooks
  const { isLoggedIn } = useAuthStore();
  const { user } = useAuthStore.getState();
  const { alert, showError, closeAlert } = useAlert();

  // Set page title
  useEffect(() => {
    setPageTitle(PAGE_TITLES.GAME);
  }, []);

  // Fetch active cards from API on component mount - only once to prevent loading during bid placement
  useEffect(() => {
    const fetchActiveCards = async () => {
      try {
        setIsLoadingCards(true);
        const cardsResponse = await apiClient.getCards();
        if (cardsResponse.data) {
          const prices: Record<string, number> = {};
          
          // Store full card data and create price mapping
          setActiveCards(cardsResponse.data);
          
          cardsResponse.data.forEach((card: Card) => {
            // Convert card name to frontend format (e.g., "jack_of_clubs" -> "J♣")
            const cardKey = `${card.card}${card.symbol}`;
            prices[cardKey] = card.currentPrice;
          });
          
          setApiCardPrices(prices);
        }
      } catch (error) {
        console.log(error);
        // Failed to fetch active cards
        // Failed to load cards. Please refresh the page.
      } finally {
        setIsLoadingCards(false);
      }
    };

    fetchActiveCards();
    // No automatic refresh to prevent loading state during bid placement
  }, []); // Empty dependency array - only run once on mount

  // Fetch user balance and subscribe to game updates
  useEffect(() => {
    if (isLoggedIn) {
      const fetchBalance = async () => {
        try {
          const response = await apiClient.getMyWallet();
          if (response.data) {
            setBalance(response.data.main + response.data.bonus);
          }
        } catch (error) {
          // Failed to fetch balance
          console.log(error);

        }
      };
      fetchBalance();
    }

    // Fetch initial game ID
    const fetchInitialGameId = async () => {
      try {
        const gameResponse = await apiClient.getGameTimer();
        if (gameResponse.data) {
          if (gameResponse.data.activeGameId) {
          setCurrentGameId(gameResponse.data.activeGameId);
          }
          setIsGameWaiting(
            !gameResponse.data.activeGameId ||
            gameResponse.data.isBreak ||
            gameResponse.data.gameStatus !== 'open'
          );
        }
      } catch (error) {
        console.log('Failed to fetch initial game ID:', error);
      }
    };

    fetchInitialGameId();

    // Subscribe to timer updates to get active game ID
    const unsubscribeTimer = socketService.subscribeToTimer((data) => {
      // Only update game ID when there's a new game (break time ends and new game starts)
      // Check if we have a new game ID that's different from current one
      setIsGameWaiting(!data.activeGameId || data.isBreak || data.gameStatus !== 'open');
      if (data.activeGameId && data.activeGameId !== currentGameId && !isBidPlaced) {
        console.log('🆕 New game detected, updating game ID:', data.activeGameId);
        setCurrentGameId(data.activeGameId);
      } else if (data.activeGameId) {

      }
    });

    return () => {
      unsubscribeTimer();
    };
  }, [isLoggedIn, currentGameId, isBidPlaced]);



  function handleCardClick(value: string, suit: string) {
    const key = `${value}${suit}`;
    setCart((prev) => {
      const count = prev[key] || 0;
      // Toggle: if not selected, set to 1; if selected, remove
      if (count === 0) {
        setIsBidPlaced(false); // Reset bid placed flag when user starts new bid
        return { ...prev, [key]: 1 };
      }
      const newCart = { ...prev };
      delete newCart[key];
      return newCart;
    });
  }

  function handleIncrement(value: string, suit: string) {
    const key = `${value}${suit}`;
    setCart((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
  }

  function handleDecrement(value: string, suit: string) {
    const key = `${value}${suit}`;
    setCart((prev) => {
      const count = prev[key] || 0;
      if (count <= 1) {
        const newCart = { ...prev };
        delete newCart[key];
        // Deselect if this was the selected card
        if (selectedKey === key) setSelectedKey(null);
        return newCart;
      }
      return { ...prev, [key]: count - 1 };
    });
  }

  // Prepare cart display using active cards data - useMemo to ensure reactivity
  const cartItems = useMemo(() => {
    return Object.entries(cart).map(([key, count]) => {
    // Find the card data from activeCards array
    const card = activeCards.find(c => `${c.card}${c.symbol}` === key);
    if (!card) {
      // Fallback if card not found
      const value = key.slice(0, key.length - 1);
      const suit = key.slice(-1);
      const price = apiCardPrices[key] || 0;
      return { value, suit, count, price };
    }
    
    return { 
      value: card.card, 
      suit: card.symbol, 
      count, 
        price: card.currentPrice || 0
    };
    }).filter(item => item.price > 0); // Filter out items with invalid prices
  }, [cart, activeCards, apiCardPrices]);
  
  const total = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.price * item.count, 0);
  }, [cartItems]);
  
  // Format number in Indian Rupees format (e.g., 100000 -> 1,00,000)
  const formatIndianRupees = (amount: number): string => {
    return amount.toLocaleString('en-IN');
  };

  // Calculate winning amount based on highest total bid amount (price × count) per card type
  const maxTotalAmount = useMemo(() => {
    if (cartItems.length === 0) return 0;
    const totalAmounts = cartItems.map(item => item.price * item.count).filter(amount => amount > 0);
    if (totalAmounts.length === 0) return 0;
    return Math.max(...totalAmounts);
  }, [cartItems]);
  
  const winningAmount = useMemo(() => {
    return maxTotalAmount > 0 ? maxTotalAmount * 10 : 0;
  }, [maxTotalAmount]);

  function handlePayNow() {
    if (isGameWaiting) {
      showError('Game has not started yet. Please wait for the next round to begin.');
      return;
    }
    // Prevent banned users from attempting to play
    if (user && user.status === 'banned') {
      showError('Your account has been banned. Please contact to admin support');
      return;
    }
    setConfirmOpen(true);
  }

  async function handleConfirmYes() {
    // Extra guard at confirm
    if (user && user.status === 'banned') {
      setConfirmOpen(false);
      showError('Your account has been banned. Please contact to admin support');
      return;
    }
    if (total > balance) {
      setConfirmOpen(false);
      showError("Insufficient balance");
      return;
    }

    if (!isLoggedIn) {
      setConfirmOpen(false);
      showError("Please login to place bids");
      return;
    }

    // Prevent multiple rapid calls
    if (isPlacingBid) {
      return;
    }

    setIsPlacingBid(true);
    try {
      // Use cached game ID if available, otherwise fetch it
      let activeGameId = currentGameId;
      
  
      
      if (!activeGameId) {
        console.log('🔄 No cached game ID, fetching from API...');
        // Get the current active game ID
        const gameResponse = await apiClient.getGameTimer();
        if (!gameResponse.data?.activeGameId) {
          setConfirmOpen(false);
          showError("No active game found. Please refresh the page.");
          setIsPlacingBid(false);
          return;
        }
        activeGameId = gameResponse.data.activeGameId;
        setCurrentGameId(activeGameId); // Cache the game ID

      } else {

      }
      
      // Validate game ID
      if (!activeGameId || activeGameId === 'null' || activeGameId === 'undefined') {
        setConfirmOpen(false);
        showError("Invalid game ID. Please refresh the page.");
        setIsPlacingBid(false);
        return;
      }

      // Use existing activeCards data instead of making another API call
      if (!activeCards.length) {
        throw new Error('No active cards available');
      }

      // Create a map of card name to card ID using existing data
      const cardNameToIdMap: Record<string, string> = {};
      activeCards.forEach((card) => {
        const cardKey = `${card.card}${card.symbol}`;
        cardNameToIdMap[cardKey] = card._id;
      });

      // Prepare bids data for the /bids endpoint
      const bids = Object.entries(cart)
        .filter(([, count]) => count > 0)
        .map(([cardKey, count]) => {
          const cardId = cardNameToIdMap[cardKey];
          if (!cardId) {
            throw new Error(`Card not found: ${cardKey}`);
          }
          return {
            cardId: cardId,
            quantity: count
          };
        });

      // Validate that we have bids to place
      if (bids.length === 0) {
        setConfirmOpen(false);
        showError("No cards selected for bidding.");
        setIsPlacingBid(false);
        return;
      }

      // Place all bids in a single request with retry logic for rapid placement
      let response;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          response = await apiClient.placeBid({
            gameId: activeGameId,
            bids: bids
          });

          if (response.error) {
            // If it's a "Bid placement in progress" error, retry after a short delay
            if (response.error.includes('Bid placement in progress') || response.error.includes('Please wait a moment')) {
              retryCount++;
              if (retryCount < maxRetries) {
                // Wait with exponential backoff: 200ms, 400ms, 600ms
                await new Promise(resolve => setTimeout(resolve, 200 * retryCount));
                continue;
              }
            }
            throw new Error(response.error);
          }
          break; // Success, exit retry loop
        } catch (error) {
          if (error instanceof Error && (error.message.includes('Bid placement in progress') || error.message.includes('Please wait a moment'))) {
            retryCount++;
            if (retryCount < maxRetries) {
              // Wait with exponential backoff: 200ms, 400ms, 600ms
              await new Promise(resolve => setTimeout(resolve, 200 * retryCount));
              continue;
            }
          }
          throw error; // Re-throw if not a retryable error or max retries reached
        }
      }

      // Success - update UI first
      setConfirmOpen(false);
      setBidPlacedOpen(true);
      setBalance((b) => b - total);
      setCart({});
      setIsBidPlaced(true); // Mark that a bid was placed
      
      // Refresh balance after successful bid (don't let this fail the whole operation)
      try {
        const walletResponse = await apiClient.getMyWallet();
        if (walletResponse.data) {
          setBalance(walletResponse.data.main + walletResponse.data.bonus);
        }
              } catch {
 
          // Don't throw error here - bid was successful
        }
    } catch (error) {
      setConfirmOpen(false);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Bid placement in progress') || error.message.includes('Please wait a moment')) {
          showError("Please wait a moment before placing another bid.");
        } else if (error.message.includes('409') || error.message.includes('Conflict')) {
          showError("Please wait a moment before placing another bid.");
        } else if (error.message.includes('No active game found') || error.message.includes('Invalid game ID')) {
          showError("Game session expired. Please refresh the page.");
          // Reset game ID to force a fresh fetch on next attempt
          setCurrentGameId(null);
        } else if (error.message.includes('Insufficient balance')) {
          showError("Insufficient balance to place this bid.");
        } else if (error.message.includes('TIME OUT')) {
          showError("Game is currently closed. Please wait for the next round.");
        } else {
          showError("Failed to place bid. Please try again.");
        }
      } else {
        showError("Failed to place bid. Please try again.");
      }
    } finally {
      setIsPlacingBid(false);
    }
  }

  function handleBidPlaced() {
    setBidPlacedOpen(false);
    // Redirect to Ongoing Bids page after success acknowledgement
    if (typeof window !== 'undefined') {
      window.location.href = '/account';
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-[#0a0f1a] text-white">
        <Header balance={balance} />
      {/* Result and Timer Container - 2 Column Layout for Mobile Only - Outside main container for full width */}
      <div className="md:hidden grid grid-cols-2  w-full">
        {/* Left Column - Result Container */}
        <div>
          <ResultPanel isRmPlayNow={true} showOnlyResult={true} />
        </div>
        {/* Right Column - Game Timer */}
        <div>
          <ResultPanel isRmPlayNow={true} showOnlyTimer={true} />
        </div>
      </div>

      <main className="flex flex-col items-center flex-1 w-full px-5 sm:px-0 pt-6">
        <h2 className="text-[20px] font-medium leading-[24px] tracking-[0px] mb-4 md:block hidden font-poppins">
          Play Game
        </h2>
        
        <div className="flex flex-col md:flex-row w-full max-w-7xl md:gap-6 md:mt-0">
          <div className="flex-1 flex flex-col items-center gap-4 md:order-1">
            {/* Desktop: grid, Mobile: horizontal scroll */}
            <div className="hidden md:grid w-full grid-cols-4 gap-x-0 gap-y-0.5 min-h-[600px] auto-rows-fr" style={{ gridTemplateRows: `repeat(${Math.ceil(activeCards.length / 4)}, 1fr)` }}>
              {isLoadingCards ? (
                // Loading state
                <div className="col-span-4 row-span-5 flex items-center justify-center">
                  <div className="text-white text-lg">Loading cards...</div>
                </div>
              ) : (
                activeCards.map((card) => {
                  const key = `${card.card}${card.symbol}`;
                  const count = cart[key] || 0;
                  
                  return (
                    <div key={card._id} className="flex flex-col items-center justify-center w-full h-full p-5 mx-auto">
                      <DeckCard
                        value={card.card}
                        suit={card.symbol}
                        selected={!!count}
                        imageWidth={96}
                        imageHeight={192}
                        onClick={() => handleCardClick(card.card, card.symbol)}
                      />
                      {count > 0 && (
                        <div className="hidden md:flex items-center bg-white rounded-xl shadow px-6 py-2 gap-4 mt-2">
                          <button
                            className="w-3 h-8 flex items-center justify-center text-2xl font-bold bg-white rounded focus:outline-none text-black cursor-pointer"
                            onClick={() => handleDecrement(card.card, card.symbol)}
                            disabled={count <= 0}
                            aria-label="Decrease quantity"
                            style={{
                              fontFamily: 'Poppins',
                              fontWeight: 400,
                              fontSize: '20px',
                              lineHeight: '18px',
                              letterSpacing: '0%',
                              textAlign: 'center',
                              color: '#000000',
                              fontStyle: 'normal',
                            }}
                          >
                            -
                          </button>

                          <span
                            className="w-8 text-center uppercase"
                            style={{
                              fontFamily: 'Poppins',
                              fontWeight: 400,
                              fontSize: '20px',
                              lineHeight: '18px',
                              letterSpacing: '0%',
                              textAlign: 'center',
                              color: '#000000',
                            }}
                          >
                            {count}
                          </span>

                          <button
                            className="w-8 h-8 flex items-center justify-center text-2xl font-bold bg-white rounded focus:outline-none  cursor-pointer"
                            onClick={() => handleIncrement(card.card, card.symbol)}
                            aria-label="Increase quantity"
                            style={{
                              fontFamily: 'Poppins',
                              fontWeight: 400,
                              fontSize: '20px',
                              lineHeight: '18px',
                              letterSpacing: '0%',
                              textAlign: 'center',
                              color: '#000000',
                              fontStyle: 'normal',
                            }}
                          >+</button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="flex flex-col gap-4 w-full md:w-[340px] md:order-2">
            {/* Desktop/tablet version - Result Panel */}
            <div className="hidden md:block">
              <ResultPanel isRmPlayNow={true} />
            </div>
            {/* Desktop/tablet version */}
            <div className="hidden md:block">
              <div className="bg-white rounded-lg p-4 text-black shadow-md md:static fixed bottom-20 left-0 right-0 md:bottom-auto md:left-auto md:right-auto z-30 md:max-h-none max-h-60 overflow-y-auto">
                <h3
                  className="font-bold text-lg mb-2"
                  style={{
                    fontFamily: 'Poppins',
                    fontWeight: 400,
                    fontStyle: 'normal',
                    fontSize: '22px',
                    lineHeight: '18px',
                    letterSpacing: '0%',
                    textAlign: 'center',
                    textTransform: 'uppercase',
                  }}
                >
                  YOUR GAME INFORMATION
                </h3>
                <div className="flex flex-col gap-2 mb-2 py-6">
                  {cartItems.length === 0 && <span className="text-gray-400"
                    style={{
                      fontFamily: 'Poppins, sans-serif',
                      fontWeight: 400,
                      fontStyle: 'normal',
                      fontSize: '20px',
                      lineHeight: '18px',
                      letterSpacing: '0%',
                      textAlign: 'center',
                    }}>No cards selected</span>}
                  {cartItems.map((item) => (
                    <div key={item.value + item.suit} className="flex items-center justify-between gap-2 py-1">
                      <span className="flex items-center text-xl  gap-1"
                        style={{
                          fontFamily: 'Poppins, sans-serif',
                          fontWeight: 500,
                          fontStyle: 'medium',
                          fontSize: '24px',
                          lineHeight: '18px',
                          letterSpacing: '0%',
                          textAlign: 'center',

                        }}>
                        {item.value}
                        <SuitIcon suit={item.suit} size={20} />
                        <span className="mx-1"
                          style={{
                            fontFamily: 'Poppins, sans-serif',
                            fontWeight: 500,
                            fontStyle: 'medium',
                            fontSize: '24px',
                            lineHeight: '18px',
                            letterSpacing: '0%',
                            textAlign: 'center',
                            color: '#000000',
                          }}>X</span>
                        {item.count}
                      </span>
                      <span className="text-xl ml-auto"
                        style={{
                          fontFamily: 'Poppins, sans-serif',
                          fontWeight: 500,
                          fontStyle: 'medium',
                          fontSize: '24px',
                          lineHeight: '18px',
                          letterSpacing: '0%',
                          textAlign: 'center',
                          color: '#000000',
                        }}>= ₹{item.price * item.count}</span>

                      <button
                        className="ml-2 text-[#C23331] hover:text-red-700 p-1 flex items-center justify-center cursor-pointer"
                        onClick={() => handleDecrement(item.value, item.suit)}
                        aria-label="Remove card"
                        title="Remove card"
                      >
                        <IoMdTrash className="text-lg align-middle" />
                      </button>
                    </div>
                  ))}
                </div>
                {cartItems.length > 0 && total > balance && (
                  <div className="text-center text-[#C23331] font-bold mb-2">Insufficient balance</div>
                )}
                <div className="flex justify-between  pt-4 mt-2"
                  style={{
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 400,
                    fontStyle: 'normal',
                    fontSize: '22px',
                    lineHeight: '18px',
                    letterSpacing: '0%',
                    textAlign: 'center',
                    background: '#F2F2F2',
                    borderRadius: '4px',
                    padding: '10px 16px 10px 16px',
                    color: '#000000',
                  }}>
                  <span>TOTAL</span>
                  <span>₹{total}</span>
                </div>
                {cartItems.length > 0 && winningAmount > 0 && (
                  <div className="mt-3 text-center">
                    <span
                      style={{
                        fontFamily: 'Poppins, sans-serif',
                        fontWeight: 600,
                        fontStyle: 'normal',
                        fontSize: '16px',
                        lineHeight: '20px',
                        letterSpacing: '0%',
                    color: '#02C060',
                      }}
                    >
                      Winning amount can be up to ₹{formatIndianRupees(winningAmount)}
                    </span>
                  </div>
                )}
                <button
                  className="mt-4 w-full bg-[#FFCD01] text-black font-bold py-3 rounded-lg text-lg shadow transition-colors disabled:opacity-50 cursor-pointer"
                  onClick={handlePayNow}
                  disabled={cartItems.length === 0 || total > balance || isGameWaiting}
                >
                  PLAY NOW
                </button>
              </div>
            </div>
            {/* Mobile version - Cart section only, Result/Timer shown at top */}
            <div className="md:hidden w-full max-w-md mx-auto flex flex-col gap-3 mt-2">
              <h4 className="text-2xl font-bold mt-4 mb-[-10px] line-height-[25px] text-left">Play Game</h4>
              <div className="w-full overflow-x-auto pb-5">
                {isLoadingCards ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-white text-lg">Loading cards...</div>
                  </div>
                ) : (
                  <div className="flex flex-row gap-4 md:gap-3 min-w-max snap-x snap-mandatory px-4">
                    {activeCards.map((card) => {
                      const key = `${card.card}${card.symbol}`;
                      const count = cart[key] || 0;
                      
                      return (
                        <div
                          key={card._id}
                          className={`flex flex-col items-center justify-center w-32 md:w-24 h-64 md:h-48 rounded-xl snap-center cursor-pointer
                            ${count > 0 ? 'shadow-lg' : ''}
                          `}
                          onClick={() => {
                            if (count === 0) {
                              setCart((prev) => ({ ...prev, [key]: 1 }));
                            }
                          }}
                        >
                          <DeckCard
                            value={card.card}
                            suit={card.symbol}
                            selected={count > 0}
                            imageWidth={200}
                            imageHeight={256}
                            onClick={() => {
                              if (count === 0) {
                                setCart((prev) => ({ ...prev, [key]: 1 }));
                              }
                            }}
                          />
                          {count > 0 && (
                            <div className="flex items-center gap-1 mt-3 bg-white rounded-lg px-3 py-2 shadow z-10 relative">
                              <button
                                className="px-1 py-0 rounded bg-gray-200 text-black font-bold disabled:opacity-50 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDecrement(card.card, card.symbol);
                                }}
                                disabled={count <= 0}
                                aria-label="Decrease quantity"
                              >-</button>
                              <span className="w-6 text-center text-black">{count}</span>
                              <button
                                className="px-1 py-0 rounded bg-gray-200 text-black font-bold cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleIncrement(card.card, card.symbol);
                                }}
                                aria-label="Increase quantity"
                              >+</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {/* YOUR GAME INFORMATION - Now after Play Game */}
              <div className="bg-white rounded-t-lg text-black shadow-md flex flex-col h-100">
                <h3 className="font-bold text-lg p-4">YOUR GAME INFORMATION</h3>
                <div className="flex-1 overflow-y-auto p-4">
                  {cartItems.length === 0 && <span className="text-gray-400">No cards selected</span>}
                  {cartItems.map((item) => (
                    <div key={item.value + item.suit} className="flex items-center justify-between py-2 border-b border-gray-200 w-full">
                      <span className="flex items-center text-lg gap-1">
                        {item.value}
                        <SuitIcon suit={item.suit} size={18} />
                        <span className="mx-1">×</span>
                        {item.count}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">= ₹{item.price * item.count}</span>
                        <button
                          className="text-red-500 hover:text-red-700 p-1 flex items-center justify-center cursor-pointer"
                          onClick={() => handleDecrement(item.value, item.suit)}
                          aria-label="Remove card"
                          title="Remove card"
                        >
                          <IoMdTrash className="text-base" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {cartItems.length > 0 && total > balance && (
                  <div className="text-center text-red-600 font-bold mb-2">Insufficient balance</div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 mt-2 bg-[#F2F2F2] px-3 py-2 shrink-0 w-full">
                  <span>TOTAL</span>
                  <span>₹{total}</span>
                </div>
              </div>
              
              {/* Sticky PAY NOW/TIME OUT button for mobile */}
              <div 
                className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0a0f1a] flex flex-col items-center pointer-events-auto"
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
                {cartItems.length > 0 && winningAmount > 0 && !isBidPlaced && (
                  <div className="w-full max-w-md text-center pt-2 pb-1" style={{ minHeight: '28px' }}>
                    <span
                      style={{
                        fontFamily: 'Poppins, sans-serif',
                        fontWeight: 600,
                        fontStyle: 'normal',
                        fontSize: '16px',
                        lineHeight: '20px',
                        letterSpacing: '0%',
                        color: '#02C060',
                      }}
                    >
                      Winning amount can be up to ₹{formatIndianRupees(winningAmount)}
                    </span>
                  </div>
                )}
                {(!cartItems.length || isBidPlaced) && (
                  <div className="w-full max-w-md text-center pt-2 pb-1" style={{ minHeight: '28px' }}></div>
                )}
                <button
                  className={`w-full max-w-md py-4 shadow transition-colors pointer-events-auto touch-manipulation block text-center ${
                    !isGameWaiting && cartItems.length > 0 && total <= balance
                      ? 'bg-[#FFCD01] text-black cursor-pointer hover:bg-yellow-400' 
                      : 'bg-[#FFCD01] text-black cursor-not-allowed'
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isGameWaiting && cartItems.length > 0 && total <= balance) {
                      console.log('Pay now button clicked');
                      handlePayNow();
                    }
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    console.log('Pay now button touch start');
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    if (!isGameWaiting && cartItems.length > 0 && total <= balance) {
                      console.log('Pay now button touch end');
                      handlePayNow();
                    }
                  }}
                  disabled={cartItems.length === 0 || total > balance || isGameWaiting}
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
                  {isGameWaiting ? 'TIME OUT' : 'PLAY NOW'}
                </button>
              </div>
            </div>  
          </div>
        </div>
        
        <GameRules />
      </main>
      <Footer />
      <WhatsAppFab />
              <ConfirmModal open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleConfirmYes} isLoading={isPlacingBid} />
      <BidPlacedModal open={bidPlacedOpen} onClose={() => setBidPlacedOpen(false)} onConfirm={handleBidPlaced} />
      <AlertModal
        open={alert.open}
        onClose={closeAlert}
        message={alert.message}
        type={alert.type}
      />
      </div>
    </ProtectedRoute>
  );
} 