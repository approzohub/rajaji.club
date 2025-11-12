import Image from "next/image";
import { useBannerImages } from "../hooks/use-images";

export function Banner() {
  const { images, loading, error } = useBannerImages();

  function handleBannerClick() {
    const rulesSection = document.getElementById("game-rules");
    if (rulesSection) {
      rulesSection.scrollIntoView({ behavior: "smooth" });
    }
  }

  // Show loading state
  if (loading) {
    return (
      <section
        className="relative w-full h-full md:h-[240px] rounded-lg overflow-hidden flex items-center bg-gradient-to-r shadow-lg"
        aria-label="Promo Banner"
      >
        <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="text-gray-500">Loading banner...</div>
        </div>
      </section>
    );
  }

  // Show error state or fallback
  if (error || images.length === 0) {
    return (
      <section
        className="relative w-full h-full md:h-[240px] rounded-lg overflow-hidden flex items-center bg-gradient-to-r shadow-lg cursor-pointer"
        aria-label="Promo Banner"
        onClick={handleBannerClick}
        tabIndex={0}
        role="button"
      >
        <Image
          src="/banner.svg"
          alt="Woman holding cards"
          fill
          priority
          aria-hidden
        />
      </section>
    );
  }

  // Filter for desktop banners only - be more strict
  const desktopBanners = images.filter(img => img.bannerType === 'desktop');
  const bannerImage = desktopBanners[0]; // Only show desktop banners, no fallback to mobile

  // If no desktop banner is available, use fallback banner
  if (!bannerImage) {
    return (
      <section
        className="relative w-full h-full md:h-[240px] rounded-lg overflow-hidden flex items-center bg-gradient-to-r shadow-lg cursor-pointer"
        aria-label="Promo Banner"
        onClick={handleBannerClick}
        tabIndex={0}
        role="button"
      >
        <Image
          src="/banner.svg"
          alt="Woman holding cards"
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
    if (!url) return "/banner.svg";
    
    // Check if it's a valid URL
    try {
      new URL(url);
      return url;
    } catch {
      return "/banner.svg";
    }
  };

  return (
    <section
      className="relative w-full h-full md:h-[240px] rounded-lg overflow-hidden flex items-center bg-gradient-to-r shadow-lg cursor-pointer"
      aria-label="Promo Banner"
      onClick={handleBannerClick}
      tabIndex={0}
      role="button"
    >
      <Image
        src={getImageUrl()}
        alt={bannerImage.altText || bannerImage.title || "Promotional banner"}
        fill
        className="object-cover"
        priority
        aria-hidden
      />
    </section>
  );
} 