import Image from "next/image";
import Link from "next/link";
import { FaUser } from "react-icons/fa";
import { useAuthStore } from "../../store/auth-store";
import { useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { WalletTooltip } from "./wallet-tooltip";

interface HeaderProps {
  onLoginClick?: () => void;
  balance?: number;
  activeMenu?: string;
  onMenuSelect?: (menu: string) => void;
  isSidebarOpen?: boolean;
  onProfileClick?: () => void;
  onSidebarClose?: () => void;
}

export function Header({ onLoginClick, balance, activeMenu, onMenuSelect, isSidebarOpen, onProfileClick, onSidebarClose }: HeaderProps) {
  const { isLoggedIn, mainBalance, bonusBalance, refreshBalance } = useAuthStore();
  const [internalSidebarOpen, setInternalSidebarOpen] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  
  // Fallback logic: use internal state if props not provided
  const sidebarOpen = typeof isSidebarOpen === 'boolean' ? isSidebarOpen : internalSidebarOpen;
  
  function handleSidebarOpen() {
    if (onProfileClick) {
      // Header: using parent onProfileClick
      return onProfileClick();
    }
    // Header: using internal sidebar open
    setInternalSidebarOpen(true);
  }
  
  function handleSidebarClose() {
    if (onSidebarClose) {
      // Header: using parent onSidebarClose
      return onSidebarClose();
    }
    // Header: using internal sidebar close
    setInternalSidebarOpen(false);
  }
  
  // Fetch user balance when logged in
  useEffect(() => {
    if (isLoggedIn && !balance && (mainBalance === 0 && bonusBalance === 0)) {
      const fetchBalance = async () => {
        setIsLoadingBalance(true);
        try {
          await refreshBalance(); // Use the store's refresh function
            } catch {
      // Failed to fetch balance
    } finally {
          setIsLoadingBalance(false);
        }
      };
      fetchBalance();
    }
  }, [isLoggedIn, balance, mainBalance, bonusBalance, refreshBalance]);

  // Calculate total balance
  const totalBalance = balance ?? (mainBalance + bonusBalance);

  // Debug log (commented out to prevent infinite logging)
  // if (activeMenu !== undefined) {
  //   console.log("Header props activeMenu:", activeMenu);
  // }
  // console.log('sidebarOpen:', sidebarOpen, 'isSidebarOpen:', isSidebarOpen, 'internalSidebarOpen:', internalSidebarOpen);
  
  return (
    <div>
      {/* Mobile Header - Completely Separate */}
      <header className="w-full bg-[#222B44] px-4 py-2 flex items-center justify-between md:hidden" role="banner">
        {/* Left - Hamburger + Logo */}
        <div className="flex items-center">
          {isLoggedIn && (
            <button
              aria-label="Open sidebar menu"
              onClick={handleSidebarOpen}
              className="p-2 rounded focus:outline-none cursor-pointer"
              style={{ background: 'transparent', border: 'none' }}
            >
              <Image src="/mobileHunberger.svg" alt="Sidebar Logo" width={29} height={26} className="object-contain" priority />
            </button>
          )}
          <Link href="/" aria-label="Go to home page">
            <div className={`${isLoggedIn ? 'ml-2' : 'ml-0'} relative w-22 h-[59px] cursor-pointer flex items-center`}>
              <Image src="/logo.svg" alt="PlayWin Logo" fill className="object-contain" priority />
            </div>
          </Link>
        </div>

        {/* Right - Balance or Login */}
        {isLoggedIn ? (
          <WalletTooltip mainBalance={mainBalance} bonusBalance={bonusBalance}>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1">
                <Image src="/wallet.svg" alt="Wallet" width={20} height={20} />
                <span style={{ 
                  fontFamily: 'Poppins', 
                  fontWeight: 400, 
                  fontSize: '12px', 
                  color: '#FFFFFF'
                }}>My Balance</span>
              </div>
              <div className="flex justify-center w-full">
                <span style={{ 
                  fontFamily: 'Poppins', 
                  fontWeight: 600, 
                  fontSize: '28px', 
                  color: '#FFE064'
                }}>{isLoadingBalance ? '...' : totalBalance}</span>
              </div>
            </div>
          </WalletTooltip>
        ) : (
          <button
            className="flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-4 rounded-lg transition-colors text-sm shadow-sm font-poppins cursor-pointer"
            aria-label="Login"
            onClick={onLoginClick}
            style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}
          >
            <FaUser className="text-sm" />
            Login
          </button>
        )}
      </header>

      {/* Desktop Header - Original Design */}
      <header className="w-full bg-[#222B44] px-6 py-2 flex flex-row items-center justify-between hidden md:flex" role="banner">
        <div className="flex flex-row items-center gap-1 ml-12">
          <Link href="/" aria-label="Go to home page">
            <div className="relative w-[100px] h-[57px] cursor-pointer flex items-center">
              <Image src="/logo.svg" alt="PlayWin Logo" fill className="object-contain" priority />
            </div>
          </Link>
        </div>
        <div className={`flex items-center gap-4 mr-12`}>
          {isLoggedIn && (
            <>
              {/* Desktop Balance Section */}
              <WalletTooltip mainBalance={mainBalance} bonusBalance={bonusBalance}>
                <div className="flex flex-row items-center gap-1 mr-4">
                  <Image src="/wallet.svg" alt="Wallet" width={45} height={45} />
                  <div className="flex flex-col items-start justify-center gap-1">
                    <span
                      style={{ fontFamily: 'Poppins', 
                        fontWeight: 400, fontStyle: 'regular', 
                        fontSize: '12px', lineHeight: '12px', 
                        letterSpacing: 0, color: '#FFFFFF'
                      }}
                    >My Balance</span>
                    <span 
                      style={{ fontFamily: 'Poppins', 
                        fontWeight: 600, fontStyle: 'SemiBold', 
                        fontSize: '24px', lineHeight: '24px', 
                        letterSpacing: 0, color: '#FFE064',
                      }}
                    >{isLoadingBalance ? '...' : totalBalance}</span>
                  </div>
                </div>
              </WalletTooltip>
            </>
          )}
          {isLoggedIn ? (
            <>
              {/* Desktop: show profile icon only on desktop */}
              <Link href="/account" aria-label="Go to account page">
                <Image src="/profile.svg" alt="Profile" width={45} height={45} className="rounded-full" />
              </Link>
            </>
          ) : (
            <button
              className="flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-5 rounded-lg transition-colors text-base shadow-sm w-auto font-poppins cursor-pointer"
              aria-label="Login"
              onClick={onLoginClick}
              style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}
            >
              <FaUser className="text-lg" />
              Login
            </button>
          )}
        </div>
      </header>
      {/* Only render sidebar on mobile if props provided */}
      {activeMenu !== undefined && onMenuSelect !== undefined && (
        <div className="md:hidden">
          <Sidebar open={sidebarOpen} onClose={handleSidebarClose} onMenuSelect={onMenuSelect} activeMenu={activeMenu} />
        </div>
      )}
      {/* Render sidebar for internal state (home, game, etc.) */}
      {activeMenu === undefined && onMenuSelect === undefined && (
        <div className="md:hidden">
          <Sidebar open={sidebarOpen} onClose={handleSidebarClose} onMenuSelect={() => { }} activeMenu={"Ongoing Bids"} />
        </div>
      )}
    </div>
  );
} 