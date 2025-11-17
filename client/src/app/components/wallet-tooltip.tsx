"use client";
import { useState, useRef, useEffect } from 'react';

interface WalletTooltipProps {
  mainBalance: number;
  bonusBalance: number;
  children: React.ReactNode;
}

export function WalletTooltip({ mainBalance, bonusBalance, children }: WalletTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, right: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseEnter = () => {
    if (!isMobile) {
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setShowTooltip(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    // Clear any existing timeout
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
    }
    // Toggle tooltip on touch for mobile
    if (isMobile) {
      setShowTooltip(prev => !prev);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // For mobile, toggle on click as well
    if (isMobile) {
      e.preventDefault();
      setShowTooltip(prev => !prev);
    }
  };

  const updateTooltipPosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      setTooltipPosition({
        top: rect.bottom + 10, // Position below the balance card
        right: viewportWidth - rect.right // Distance from right edge of viewport
      });
    }
  };

  useEffect(() => {
    if (showTooltip) {
      updateTooltipPosition();
      
      // Handle window resize
      const handleResize = () => {
        updateTooltipPosition();
      };
      window.addEventListener('resize', handleResize);
      
      // Close tooltip when clicking outside on mobile
      const handleClickOutside = (e: MouseEvent | TouchEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          if (isMobile) {
            setShowTooltip(false);
          }
        }
      };
      
      if (isMobile) {
        document.addEventListener('click', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
      }
      
      return () => {
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [showTooltip, mainBalance, bonusBalance]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onClick={handleClick}
        className="cursor-help"
        style={{ touchAction: 'manipulation' }}
      >
        {children}
      </div>
      
      {showTooltip && (
        <div
          className="fixed z-9999 px-3 py-2 bg-white text-black text-xs rounded-lg shadow-lg pointer-events-auto whitespace-nowrap"
          style={{
            top: `${tooltipPosition.top}px`,
            right: `${tooltipPosition.right}px`,
            maxWidth: '200px',
          }}
        >
          <div className="absolute bottom-full right-4 w-0 h-0 border-b-4 border-l-4 border-r-4 border-transparent border-b-white mb-1"></div>
          <div className="text-center font-medium mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>Main Balance: ₹{mainBalance}</div>
          <div className="text-center font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>Bonus Balance: ₹{bonusBalance}</div>
        </div>
      )}
    </>
  );
} 