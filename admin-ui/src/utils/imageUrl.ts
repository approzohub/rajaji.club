/**
 * Transforms image URLs to use the correct base URL from VITE_API_URL
 * This handles cases where the backend returns localhost URLs in production
 */
export function getImageUrl(url: string): string {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  // If the URL is already a full URL (starts with http/https), return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // If it's a localhost URL and we have VITE_API_URL, replace with the correct base URL
    if (url.includes('localhost:4000') && apiUrl) {
      const baseUrl = apiUrl.replace('/api', '');
      return url.replace('http://localhost:4000', baseUrl);
    }
    return url;
  }
  
  // If it's a relative URL, construct the full URL using VITE_API_URL
  if (apiUrl) {
    const baseUrl = apiUrl.replace('/api', '');
    return `${baseUrl}${url}`;
  }
  
  // Fallback to relative URL if no VITE_API_URL is set
  return url;
}
