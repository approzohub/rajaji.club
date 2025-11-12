"use client";
import { useState, useEffect } from "react";

import { Banner } from "./components/banner";
import { MobileBanner } from "./components/mobile-banner";
import { ResultPanel } from "./components/result-panel";
import { Footer } from "./components/footer";
import { ResultTable } from "./components/result-table";
import { HeroSection } from "./components/hero-section";
import { Header } from "./components/header";
import { LoginModal } from "./components/login-modal";
import { GameRules } from "./components/game-rules";
import { useAuthStore } from "../store/auth-store";
import { WhatsAppFab } from "./components/whatsapp-fab";
import { setPageTitle, PAGE_TITLES } from "../lib/page-title";
import { socketService } from "../lib/socket-service";
import { apiClient } from "../lib/api";
import { AlertModal } from "./components";
import { useAlert } from "./hooks";

export default function Home() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login, isLoggedIn } = useAuthStore();
  const [loginError, setLoginError] = useState("");
  const { alert, showError, closeAlert } = useAlert();
  
  // Game status state for mobile sticky button
  const [gameStatus, setGameStatus] = useState<'open' | 'waiting_result' | 'result_declared'>('open');

  // Set page title
  useEffect(() => {
    setPageTitle(PAGE_TITLES.HOME);
  }, []);

  // Subscribe to game status updates for mobile sticky button
  useEffect(() => {
    const unsubscribe = socketService.subscribeToStatusChange((data) => {
      
      setGameStatus(data.gameStatus);
    });

    // Also fetch initial game status
    const fetchInitialStatus = async () => {
      try {
        const response = await apiClient.getGameTimer();
        if (response.data) {
  
          setGameStatus(response.data.gameStatus);
        }
      } catch (error) {
        console.error('Failed to fetch initial game status:', error);
      }
    };

    fetchInitialStatus();

    return unsubscribe;
  }, []);

  async function handleLoginSubmit(gameId: string, password: string) {
    setIsLoggingIn(true);
    setLoginError("");
    
    try {
      const result = await login(gameId, password);
      if (result.success) {
        // Always close on successful login; banned is handled on Play Now
        setLoginOpen(false);
        setLoginError("");
      } else {
        setLoginError(result.error || "Login failed");
      }
    } catch {
      setLoginError("An unexpected error occurred");
    } finally {
      setIsLoggingIn(false);
    }
  }

  function handlePlayNowClick() {
    if (!isLoggedIn) {
      setLoginOpen(true);
      return;
    }
    const user = useAuthStore.getState().user;
    if (user && user.status === 'banned') {
      showError('Your account has been banned. Please contact to admin support');
      return;
    }
    if (gameStatus === 'open') {
      window.location.href = '/game';
    }
  }

  function scrollToRules() {
    const el = document.getElementById('game-rules');
    if (!el) return;
    const doc = document.documentElement;
    const currentY = window.pageYOffset;
    const bottomOfEl = el.getBoundingClientRect().bottom + window.pageYOffset + 20; // 20px padding
    const maxScroll = Math.max(0, doc.scrollHeight - window.innerHeight);
    const target = Math.min(bottomOfEl, maxScroll);
    // Ensure we don't scroll upward; if computed target is above current, nudge to current
    const y = Math.max(target, currentY + 700);
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  return (
    <>
      {/* Desktop Layout */}
      <div
        className="hidden md:flex flex-col h-screen text-white"
        style={{
          backgroundColor: "#091222",
          backgroundImage: "url('/bg.svg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <Header onLoginClick={() => setLoginOpen(true)} />
        <main className="flex flex-col items-center flex-1 w-full p-6 px-4 md:px-8">
          <HeroSection />
          <div className="flex flex-col lg:flex-row md:gap-6 w-full max-w-7xl md:mt-6 mt-0">
            <div className="flex-1 flex flex-col gap-4 pt-2 md:p-0">
              <Banner />
              <ResultTable />
            </div>
            <ResultPanel onLoginClick={() => setLoginOpen(true)} isRmPlayNow={false} />
          </div>
          <hr className="w-full border-t border-gray-700 mt-10"  aria-hidden="true" />
          <GameRules />
      
        </main>
        <Footer />
        <WhatsAppFab />
        <LoginModal 
          open={loginOpen} 
          onClose={() => { setLoginOpen(false); setLoginError(""); }} 
          onSubmit={handleLoginSubmit} 
          error={loginError}
          isLoading={isLoggingIn}
        />
        <AlertModal open={alert.open} onClose={closeAlert} message={alert.message} type={alert.type} />
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden flex flex-col min-h-screen text-white bg-[#0a0f1a]">
        <Header onLoginClick={() => setLoginOpen(true)} />
        
        <main className="flex-1 w-full px-4 py-6">
          {/* Result Panel */}
          <ResultPanel onLoginClick={() => setLoginOpen(true)} />
          
          {/* Mobile Banner */}
          <MobileBanner onBannerClick={scrollToRules} />
          
          {/* Result Table */}
          <div className="mt-6">
            <ResultTable />
          </div>
          
          {/* Game Rules */}
          <div className="mt-6">
            <GameRules />
          </div>
        </main>
        
        <Footer />
        <WhatsAppFab />
        
        {/* Sticky Play Now Button for Mobile - Always show */}
        <div 
          className="fixed bottom-0 left-0 right-0 z-[99999] bg-[#0a0f1a] flex justify-center pointer-events-auto"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 99999,
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
            handlePlayNowClick();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handlePlayNowClick();
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
        <AlertModal open={alert.open} onClose={closeAlert} message={alert.message} type={alert.type} />
      </div>
    </>
  );
}
