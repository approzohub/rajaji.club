"use client";
import { useState, useRef, useEffect } from 'react';

interface WalletTooltipProps {
  mainBalance: number;
  bonusBalance: number;
  children: React.ReactNode;
}

export function WalletTooltip({ mainBalance, bonusBalance, children }: WalletTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const updateTooltipPosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.bottom + 10, // Position below the element
        left: rect.left + rect.width / 2
      });
    }
  };

  useEffect(() => {
    if (showTooltip) {
      updateTooltipPosition();
    }
  }, [showTooltip, mainBalance, bonusBalance]);

  return (
    <>
      <div
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="cursor-help"
      >
        {children}
      </div>
      
      {showTooltip && (
        <div
          className="fixed z-[9999] px-3 py-2 bg-white text-black text-xs rounded-lg shadow-lg pointer-events-none whitespace-nowrap"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            transform: 'translate(-50%, 0%)'
          }}
        >
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-b-4 border-l-4 border-r-4 border-transparent border-b-black mb-1"></div>
          <div className="text-center font-medium">Main Balance: ₹{mainBalance}</div>
          <div className="text-center font-medium">Bonus Balance: ₹{bonusBalance}</div>
        </div>
      )}
    </>
  );
} 