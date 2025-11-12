import Image from "next/image";
import { useAppSettings } from "../hooks/use-app-settings";
import { useAuthStore } from "../../store/auth-store";

export function WhatsAppFab() {
  const { settings, loading } = useAppSettings();
  const { isLoggedIn } = useAuthStore();

  function handleWhatsappClick() {
    if (!settings?.whatsappNumber || !settings?.whatsappEnabled) return;
    
    // Default message for new ID creation
    const defaultMessage = "I want to create new ID";
    const encodedMessage = encodeURIComponent(defaultMessage);
    
    window.open(`https://wa.me/91${settings.whatsappNumber}?text=${encodedMessage}`, "_blank");
  }

  // Don't render if WhatsApp is disabled, still loading, or user is logged in
  if (loading || !settings?.whatsappEnabled || !settings?.whatsappNumber || isLoggedIn) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-6 z-40"
      style={{ height: 120 }}
      aria-label="WhatsApp Floating Action Button"
    >
      <Image
        src="/whatsapp.svg"
        alt="WhatsApp"
        width={180}
        height={70}
        className="w-[180px] h-[60px] cursor-pointer hover:scale-105 transition-transform"
        onClick={handleWhatsappClick}
        priority
      />
    </div>
  );
} 