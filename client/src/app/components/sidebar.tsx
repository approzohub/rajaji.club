import { FaTimes } from "react-icons/fa";
import { FiLogOut } from "react-icons/fi";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "../../store/auth-store";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onMenuSelect: (menu: string) => void;
  activeMenu: string;
}

interface MenuItem {
  label: string;
  href?: string;
}

const menuItems: MenuItem[] = [
  { label: "Ongoing Bids" },
  { label: "Withdraw" },
  { label: "Game History" },
  { label: "Payment History" },
  { label: "Change Password" },
];

export function Sidebar({ open, onClose, onMenuSelect, activeMenu }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user } = useAuthStore();
  if (!open) return null;
  return (
    <aside
      className={`fixed inset-0 z-50 flex justify-start bg-black/40 transition-opacity duration-300 ease-out ${open?"z-70": "z-50"}`}
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
    >
      <div className="relative w-[85vw] max-w-xs h-full bg-white shadow-lg flex flex-col animate-slidein-left">
        {/* Header */}
        <div className="bg-[#232b3e] px-6 py-5">
          <h2 className="text-2xl font-bold mb-1 text-white font-poppins" 
          style={{fontFamily: 'Poppins', fontWeight: '600', fontStyle: 'semibold', fontSize: '24px'}}>
            <span className="md:hidden">{activeMenu}</span>
            <span className="hidden md:inline">My Account</span>
          </h2>
          <span className="text-white text-base font-normal font-poppins"
          style={{fontFamily: 'Poppins', fontWeight: '400', fontStyle: 'regular', fontSize: '16px'}}>Hi {user?.fullName || 'User'}</span>
          <button
            className="absolute top-4 right-4 text-gray-300 text-2xl focus:outline-none cursor-pointer"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <FaTimes />
          </button>
        </div>
        {/* Menu */}
        <nav className="flex flex-col gap-2 px-4 py-6 bg-white flex-1">
          {menuItems.map((item) => {
            const isActive = activeMenu === item.label;
            return (
              <button
                key={item.label}
                onClick={() => {
                  if (item.href) {
                    router.push(item.href);
                    onClose();
                    return;
                  }
                  if (pathname !== "/account") {
                    router.push(`/account?section=${encodeURIComponent(item.label)}`);
                    onClose();
                    return;
                  }
                  if (onMenuSelect) onMenuSelect(item.label);
                  onClose();
                }}
                className={`flex items-center justify-between w-full px-4 py-3  rounded-lg transition-colors focus:outline-none cursor-pointer ${isActive ? "bg-[#4ECB71] text-white" : "bg-transparent text-black hover:bg-gray-100"}`}
                aria-current={isActive ? "page" : undefined}
                tabIndex={0}
                role="menuitem"
                style={{fontFamily: 'Poppins', fontWeight: '400', fontStyle: 'regular', fontSize: '18px'}}
              >
                <span>{item.label}</span>
                <Image 
                  className="ml-2 text-xl" 
                  src="/right-chervolet.svg" 
                  alt="arrow-right" 
                  width={8} 
                  height={13}
                  style={{
                    filter: isActive ? 'brightness(0) invert(1)' : 'brightness(0)',
                  }}
                />
              </button>
            );
          })}
          
          {/* Logout Button */}
          <button
            onClick={() => {
              logout();
              router.push("/");
              onClose();
            }}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg transition-colors border border-red-600 cursor-pointer bg-red-600 text-white hover:bg-red-700 mt-4"
            style={{
              fontFamily: 'Poppins', fontWeight: 500,
              fontStyle: 'normal', fontSize: 14, lineHeight: '24px',
              letterSpacing: 0,
            }}
          >
            Logout
            <FiLogOut size={16} />
          </button>
        </nav>
      </div>
      <style jsx global>{`
        @keyframes slidein-left {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .animate-slidein-left {
          animation: slidein-left 0.25s cubic-bezier(0.4,0,0.2,1);
        }
      `}</style>
    </aside>
  );
} 