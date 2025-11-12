import { useState, useEffect } from 'react';

interface Image {
  _id: string;
  url: string;
  altText?: string;
  title?: string;
  type: 'banner' | 'hero' | 'general';
  // Carousel fields
  isCarousel?: boolean;
  carouselOrder?: number;
  carouselTitle?: string;
  carouselDescription?: string;
  // Banner specific fields
  bannerType?: 'desktop' | 'mobile';
  mobileText?: string;
}

export function useImages(type?: 'banner' | 'hero' | 'general') {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchImages() {
      try {
        setLoading(true);
        const params = type ? `?type=${type}` : '';
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/images/public${params}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch images');
        }
        
        const data = await response.json();
        setImages(data);
      } catch (err) {
        console.error('Error fetching images:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setImages([]);
      } finally {
        setLoading(false);
      }
    }

    fetchImages();
  }, [type]);

  return { images, loading, error };
}

export function useBannerImages() {
  return useImages('banner');
}

export function useHeroImages() {
  return useImages('hero');
}

export function useCarouselImages() {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCarouselImages() {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/images/carousel/public`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch carousel images');
        }
        
        const data = await response.json();
        setImages(data);
      } catch (err) {
        console.error('Error fetching carousel images:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setImages([]);
      } finally {
        setLoading(false);
      }
    }

    fetchCarouselImages();
  }, []);

  return { images, loading, error };
} 