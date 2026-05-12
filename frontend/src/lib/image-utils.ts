/**
 * Utility functions for handling image URLs
 */

import { FALLBACK_IMAGES, FallbackType, getFallbackImage } from './image-validation';
import { env } from './env';

/**
 * Converts relative image URLs to absolute URLs pointing to the backend server
 * @param url - The image URL (can be relative, absolute, or data URL)
 * @returns The absolute URL pointing to the backend, or the original URL if already absolute
 */
export function getImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  const localBackendBase = env.apiUrl.replace(/\/api\/v1$/, '').replace(/\/api$/, '');
  
  // If it's already a full URL (http/https) or data URL, return as is
  if (url.startsWith('data:')) {
    return url;
  }

  // When frontend runs locally, force backend assets/API image paths to local backend
  // even if DB contains absolute staging/prod URLs.
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsedUrl = new URL(url);
      const isFrontendLocalhost = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const isAssetPath = parsedUrl.pathname.startsWith('/assets/') || parsedUrl.pathname.startsWith('/api/');
      const isRemoteHost = parsedUrl.hostname !== 'localhost' && parsedUrl.hostname !== '127.0.0.1';

      if (isFrontendLocalhost && isAssetPath && isRemoteHost) {
        return `${localBackendBase}${parsedUrl.pathname}${parsedUrl.search}`;
      }
    } catch {
      // Fall through to returning original URL when parsing fails
    }

    return url;
  }
  
  // /assets-main paths are static assets served directly by Next.js from public folder
  // Don't convert them to backend URLs - return as-is for Next.js to serve
  if (url.startsWith('/assets-main')) {
    return url;
  }
  
  // API routes (like /api/v1/images/) should be prepended with base URL
  // Uploaded images are now served via: /api/v1/images/products/filename.webp
  if (url.startsWith('/api/')) {
    return `${localBackendBase}${url}`;
  }
  
  // Legacy /assets paths (for backward compatibility)
  // Backend serves static files at /assets via express.static('public/assets')
  if (url.startsWith('/assets')) {
    return `${localBackendBase}${url}`;
  }
  
  // If it's a relative URL starting with /, prepend the backend base URL
  return `${localBackendBase}${url.startsWith('/') ? url : `/${url}`}`;
}

/**
 * Get image URL with fallback for null/undefined values
 * @param url - The image URL
 * @param fallbackType - Type of fallback image to use
 * @returns The image URL or a fallback
 */
export function getImageUrlWithFallback(
  url: string | null | undefined,
  fallbackType: FallbackType = 'default'
): string {
  const imageUrl = getImageUrl(url);
  return imageUrl || getFallbackImage(fallbackType);
}

/**
 * Safe image URL getter that never returns null
 * @param url - The image URL
 * @param defaultFallback - Custom fallback URL (optional)
 * @returns The image URL or fallback
 */
export function getSafeImageUrl(
  url: string | null | undefined,
  defaultFallback: string = FALLBACK_IMAGES.default
): string {
  const imageUrl = getImageUrl(url);
  return imageUrl || defaultFallback;
}

/**
 * Check if an image URL is from an external source
 */
export function isExternalImage(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Check if an image URL is a local asset
 */
export function isLocalImage(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith('/') && !url.startsWith('//');
}

/**
 * Get the backend API URL for image uploads
 */
export function getBackendImageUrl(path: string): string {
  if (!path) return FALLBACK_IMAGES.default;
  const localBackendBase = env.apiUrl.replace(/\/api\/v1$/, '').replace(/\/api$/, '');
  
  // If already absolute, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      const parsedUrl = new URL(path);
      const isFrontendLocalhost = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const isAssetPath = parsedUrl.pathname.startsWith('/assets/') || parsedUrl.pathname.startsWith('/api/');
      const isRemoteHost = parsedUrl.hostname !== 'localhost' && parsedUrl.hostname !== '127.0.0.1';

      if (isFrontendLocalhost && isAssetPath && isRemoteHost) {
        return `${localBackendBase}${parsedUrl.pathname}${parsedUrl.search}`;
      }
    } catch {
      // Ignore parse errors and return original path
    }

    return path;
  }
  
  // /assets-main paths are static assets served directly by Next.js from public folder
  // Don't convert them to backend URLs - return as-is for Next.js to serve
  if (path.startsWith('/assets-main')) {
    return path;
  }
  
  // env.apiUrl is http://localhost:8000/api/v1, so remove /api/v1 to get base URL
  return `${localBackendBase}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Create an onError handler for standard img elements
 */
export function createImgErrorHandler(fallbackType: FallbackType = 'default') {
  return (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    const fallback = getFallbackImage(fallbackType);
    
    // Prevent infinite loop
    if (target.src === fallback || target.src.endsWith(fallback)) {
      return;
    }
    
    target.src = fallback;
  };
}

// Re-export types and functions from image-validation for convenience
export type { FallbackType };
export { getFallbackImage, FALLBACK_IMAGES };
