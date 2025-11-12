import Image from "next/image";
import { useBannerImages } from "../hooks/use-images";

interface MobileBannerProps {
  onBannerClick: () => void;
}

export function MobileBanner({ onBannerClick }: MobileBannerProps) {
  const { images, loading, error } = useBannerImages();

  // Show loading state
  if (loading) {
    return (
      <div className="w-full mt-4">
        <div className="relative w-full h-48 rounded-xl overflow-hidden shadow-lg bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="text-gray-500">Loading banner...</div>
        </div>
      </div>
    );
  }

  // Show error state or fallback
  if (error || images.length === 0) {
    return (
      <div className="w-full mt-4">
        <div 
          className="relative w-full h-48 rounded-xl overflow-hidden cursor-pointer shadow-lg"
          onClick={onBannerClick}
          onTouchEnd={() => {
            onBannerClick();
          }}
          tabIndex={0}
          role="button"
          style={{ pointerEvents: 'auto' }}
        >
          <Image
            src="/mobile-banner.svg"
            alt="Mobile promotional banner"
            width={400}
            height={192}
            className="w-full h-full object-contain"
            priority
          />
          
          {/* Default Text Overlay - Only for fallback banner */}
          <div
            className="absolute inset-0 flex flex-col mb-5 justify-center items-end pr-4"
            onClick={onBannerClick}
            onTouchEnd={() => onBannerClick()}
            role="button"
            aria-label="Scroll to rules"
            style={{ pointerEvents: 'auto' }}
          >
            <div className="text-right">
              <div className="text-black font-bold text-[25px] mb-1">
                किसी भी कार्ड पर <span style={{ color: '#FF0400' }}>₹10</span>
              </div>
              <div className="text-black font-bold text-[25px]">
                लगाकर <span style={{ color: '#FF0400' }}>₹100</span> कमाएं
              </div>
            </div>
            <div className="bg-white rounded-lg px-4 mt-7 shadow-md">
              <span className="text-black font-bold text-[18px]">
                खेल के नियम
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filter for mobile banners only - be more strict
  const mobileBanners = images.filter(img => img.bannerType === 'mobile');
  const bannerImage = mobileBanners[0]; // Only show mobile banners, no fallback to desktop

  // If no mobile banner is available, use fallback banner
  if (!bannerImage) {
    return (
      <section
        className="relative w-full h-[120px] md:hidden rounded-lg overflow-hidden flex items-center bg-gradient-to-r shadow-lg cursor-pointer"
        aria-label="Mobile Promo Banner"
        onClick={onBannerClick}
        tabIndex={0}
        role="button"
      >
        <Image
          src="/mobile-banner.svg"
          alt="Mobile promotional banner"
          fill
          priority
          aria-hidden
        />
      </section>
    );
  }

  // Validate and get the image URL
  const getImageUrl = () => {
    const url = bannerImage.url;
    if (!url) return "/mobile-banner.svg";
    
    // Check if it's a valid URL
    try {
      new URL(url);
      return url;
    } catch {
      return "/mobile-banner.svg";
    }
  };

  return (
    <div className="w-full mt-4">
      <div 
        className="relative w-full h-48 rounded-xl overflow-hidden cursor-pointer shadow-lg"
        onClick={onBannerClick}
        onTouchEnd={() => {
          onBannerClick();
        }}
        tabIndex={0}
        role="button"
        style={{ pointerEvents: 'auto' }}
      >
        <Image
          src={getImageUrl()}
          alt={bannerImage.altText || bannerImage.title || "Mobile promotional banner"}
          width={400}
          height={192}
          className="w-full h-full object-contain"
          priority
        />
        
        {/* Custom Text Overlay - Only show if mobileText is provided */}
        {bannerImage.mobileText && (
          <div
            className="absolute inset-0 flex flex-col mb-5 justify-center items-end pr-4"
            onClick={onBannerClick}
            onTouchEnd={() => onBannerClick()}
            role="button"
            aria-label="Scroll to rules"
            style={{ pointerEvents: 'auto' }}
          >
            <div className="text-right">
              <div 
                className="text-black font-bold text-[25px] mb-1"
                dangerouslySetInnerHTML={{ __html: bannerImage.mobileText }}
              />
            </div>
            <div className="bg-white rounded-lg px-4 mt-7 shadow-md">
              <span className="text-black font-bold text-[18px]">
                खेल के नियम
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
