import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { useCarouselImages, useHeroImages } from "../hooks/use-images";

interface Image {
  _id: string;
  url: string;
  altText?: string;
  title?: string;
  type: 'banner' | 'hero' | 'general';
  isCarousel?: boolean;
  carouselOrder?: number;
  carouselTitle?: string;
  carouselDescription?: string;
}

export function HeroSection() {
  const { images: carouselImages, loading: carouselLoading, error: carouselError } = useCarouselImages();
  const { images: heroImages, loading: heroLoading, error: heroError } = useHeroImages();
  
  // Use carousel images if available, otherwise fall back to hero images
  const images = carouselImages.length > 0 ? carouselImages : heroImages;
  const loading = carouselLoading || heroLoading;
  const error = carouselError || heroError;
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying, images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds of inactivity
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, [images.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds of inactivity
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, [images.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds of inactivity
    setTimeout(() => setIsAutoPlaying(true), 10000);
  }, []);

  // Show loading state
  if (loading) {
    return (
      <section
        className="relative w-full flex justify-center items-center bg-[#c00] min-h-[120px] md:min-h-[320px] rounded-xl overflow-hidden"
        aria-label="Hero Section - Loading"
      >
        <div className="relative w-full h-[120px] md:h-[320px] bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="text-gray-500">Loading hero images...</div>
        </div>
      </section>
    );
  }

  // Show error state or fallback
  if (error || images.length === 0) {
    return (
      <section
        className="relative w-full flex justify-center items-center bg-[#c00] min-h-[120px] md:min-h-[320px] rounded-xl overflow-hidden"
        aria-label="Hero Section"
      >
        <div className="relative w-full h-[120px] md:h-[320px]">
          <Image
            src="/herosection.svg"
            alt="Hero Section Cards and Money"
            fill
            className="object-cover opacity-90 rounded-xl w-full h-full transition-opacity duration-300 hover:opacity-100"
            priority
            aria-hidden
            sizes="100vw"
          />
        </div>
      </section>
    );
  }

  const currentImage = images[currentIndex];

  return (
    <section
      className="relative w-full flex justify-center items-center bg-[#c00] min-h-[120px] md:min-h-[320px] rounded-xl overflow-hidden"
      aria-label="Hero Section"
    >
      {/* Main Image */}
      <div className="relative w-full h-[120px] md:h-[320px]">
        <Image
          src={currentImage.url}
          alt={currentImage.altText || currentImage.title || "Hero Section Cards and Money"}
          fill
          className="object-cover opacity-90 rounded-xl w-full h-full transition-opacity duration-300 hover:opacity-100"
          priority
          aria-hidden
          sizes="100vw"
        />
      </div>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          {/* Previous Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Previous image"
          >
            <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Next Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Next image"
          >
            <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {images.map((_: Image, index: number) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                goToSlide(index);
              }}
              className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white ${
                index === currentIndex 
                  ? 'bg-white scale-125' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
} 