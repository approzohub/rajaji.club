import Image from "next/image";
import { FaWhatsapp } from "react-icons/fa";
import { useAppSettings } from "../hooks/use-app-settings";

export function Footer() {
  const { settings, loading } = useAppSettings();

  function handleWhatsappClick() {
    if (!settings?.whatsappNumber || !settings?.whatsappEnabled) return;
    window.open(`https://wa.me/91${settings.whatsappNumber}`, "_blank");
  }

  // Show loading state or fallback
  if (loading) {
    return (
      <footer
        className="w-full bg-[#152234] py-8 px-0 flex flex-col justify-center items-center shadow-lg border-t border-[#101a29]"
        role="contentinfo"
      >
        <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-6xl mx-auto gap-8 md:gap-0 px-4">
          <div className="flex-1 flex justify-center md:justify-start mb-6 md:mb-0 items-center">
            <Image src="/logo.svg" alt="PlayWin Logo" width={120} height={36} />
          </div>
          <div className="flex-1 flex flex-col items-center">
            <div className="animate-pulse bg-gray-600 h-4 w-32 rounded"></div>
          </div>
          <div className="flex-1 flex flex-col items-center">
            <div className="animate-pulse bg-gray-600 h-4 w-24 rounded"></div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer
      className="w-full bg-[#152234] py-2 md:py-8 px-0 flex flex-col justify-center items-center shadow-lg border-t border-[#101a29]"
      role="contentinfo"
    >
      <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-6xl mx-auto gap-2 md:gap-0 px-4">
        {/* Logo */}
        <div className="flex-1 flex justify-center md:justify-start mb-2 md:mb-0 items-center">
          <Image src="/logo.svg" alt="PlayWin Logo" width={120} height={36} />
        </div>
        {/* Contact Info */}
        <div className="flex-1 flex flex-col ">
          <span
         
            style={{
              fontWeight: 700,
              // fontStyle: 'normal',
              fontSize: '12px',
              letterSpacing: '0px',
              textTransform: 'uppercase',
              color: '#FFFFFF',
            }}
          >
            Contact Us
          </span>
          {settings?.whatsappEnabled && settings?.whatsappNumber && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleWhatsappClick}
                aria-label="Contact on WhatsApp"
                className="bg-[#25D366] w-7 h-7 rounded-[6px] flex items-center justify-center focus:outline-none shadow-md hover:bg-green-600 transition-colors cursor-pointer"
                style={{ minWidth: 20, minHeight: 20 }}
              >
                <FaWhatsapp className="text-white text-2xl" />
              </button>
              <button
                type="button"
                onClick={handleWhatsappClick}
                className="text-[#FFFFFF] focus:outline-none hover:underline cursor-pointer"
                aria-label={`WhatsApp number: ${settings.whatsappNumber}`}
                style={{
                  fontWeight: 500,
                  fontStyle: 'normal',
                  fontSize: '23px',
                  lineHeight: '35px',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                }}
              >
                {settings.whatsappNumber}
              </button>
            </div>
          )}
        </div>
        {/* Copyright */}
        <div className="flex-1 flex flex-col items-center gap-1 text-xs text-[#FFFFFF] mt-6 md:mt-0" 
        style={{
          fontWeight: 400,
          fontStyle: 'normal',
          fontSize: '12px',
          letterSpacing: '0px',
        }}>
          <span className="text-center">Copyright © {new Date().getFullYear()} RajaJi</span>
        </div>
      </div>
    </footer>
  );
} 