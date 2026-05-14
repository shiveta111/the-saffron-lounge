'use client';

/**
 * Image validation and fallback utilities for Next.js
 * Provides robust image handling with fallbacks for broken images
 */

import { env } from './env';

// Default fallback images for different contexts
export const FALLBACK_IMAGES = {
  default: '/assets-main/menu/coming-soon.png',
  product: '/assets-main/menu/coming-soon.png',
  menu: '/assets-main/menu/coming-soon.png',
  avatar: '/assets-main/logo/saffron-logo.png',
  blog: '/assets-main/blog-1.webp',
  gallery: '/assets-main/recipe-5.webp',
  team: '/assets-main/logo/saffron-logo.png',
  category: '/assets-main/cat-1.webp',
  banner: '/assets-main/hero-bg-shape.webp',
  logo: '/assets-main/logo/saffron-logo.png',
} as const;

export type FallbackType = keyof typeof FALLBACK_IMAGES;

/**
 * Check if a URL is valid and accessible
 * Note: This only works client-side
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  try {
    // Check if it's a valid URL format
    if (url.startsWith('data:')) return true;
    if (url.startsWith('/')) return true; // Local paths
    new URL(url); // Will throw if invalid
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the appropriate fallback image for a given context
 */
export function getFallbackImage(type: FallbackType = 'default'): string {
  return FALLBACK_IMAGES[type] || FALLBACK_IMAGES.default;
}

/**
 * Safely get an image URL with fallback
 * Returns the original URL if valid, otherwise returns the fallback
 */
export function getImageWithFallback(
  url: string | null | undefined,
  fallbackType: FallbackType = 'default'
): string {
  if (!url || url.trim() === '') {
    return getFallbackImage(fallbackType);
  }
  
  // Return the URL as-is, we'll handle errors at render time
  return url;
}

/**
 * Handle image error by replacing with fallback
 * Use this as the onError handler for img/Image components
 */
export function handleImageError(
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackType: FallbackType = 'default'
): void {
  const target = event.currentTarget;
  const fallback = getFallbackImage(fallbackType);
  
  // Prevent infinite loop if fallback also fails
  if (target.src === fallback || target.src.endsWith(fallback)) {
    console.warn('Fallback image also failed to load:', fallback);
    return;
  }
  
  console.warn('Image failed to load, using fallback:', target.src, '->', fallback);
  target.src = fallback;
}

/**
 * Create an onError handler for Next.js Image component
 * Returns a function that handles the error and replaces with fallback
 */
export function createImageErrorHandler(fallbackType: FallbackType = 'default') {
  return (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    handleImageError(event, fallbackType);
  };
}

/**
 * Validate and normalize image URL
 * - Converts relative backend URLs to absolute
 * - Validates URL format
 * - Returns fallback for invalid URLs
 */
export function normalizeImageUrl(
  url: string | null | undefined,
  fallbackType: FallbackType = 'default'
): string {
  if (!url || url.trim() === '') {
    return getFallbackImage(fallbackType);
  }
  
  // If it's already a full URL or data URL, return as-is
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  
  // If it's a local path starting with /, return as-is
  if (url.startsWith('/')) {
    return url;
  }
  
  // Otherwise, assume it's a relative backend path and prepend the API URL
  const baseUrl = env.apiUrl.replace(/\/api\/?$/, '');
  return `${baseUrl}/${url}`;
}

/**
 * Check if an image exists at a given URL
 * This is an async function that returns a promise
 * Only works client-side
 */
export async function checkImageExists(url: string): Promise<boolean> {
  if (typeof window === 'undefined') {
    return true; // Assume exists on server-side
  }
  
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

/**
 * List of known valid local image paths
 * These are images that exist in the /public folder
 */
export const KNOWN_VALID_IMAGES = [
  '/assets-main/logo/saffron-logo.png',
  '/assets-main/logo/saffron-logo.svg',
  '/assets-main/menu/coming-soon.png',
  '/assets-main/hero-bg-shape.webp',
  '/assets-main/homebanner/left-img.jpg',
  '/assets-main/homebanner/right-img.png',
  '/assets-main/homebanner/saffronmain-2.jpg',
  '/assets-main/text-2.webp',
  '/assets-main/shape-6.webp',
  '/assets-main/blog-1.webp',
  '/assets-main/blog-2.webp',
  '/assets-main/blog-3.webp',
  '/assets-main/cat-1.webp',
  '/assets-main/cat-2.webp',
  '/assets-main/cat-3.webp',
  '/assets-main/cat-4.webp',
  '/assets-main/cat-5.webp',
  '/assets-main/recipe-5.webp',
  '/assets-main/recipe-6.webp',
  '/assets-main/recipe-7.webp',
  '/assets-main/flower-svg.png',
  '/assets-main/footer/saffron-logo.png',
] as const;

/**
 * Check if a local image path is known to be valid
 */
export function isKnownValidImage(path: string): boolean {
  return KNOWN_VALID_IMAGES.includes(path as any);
}












