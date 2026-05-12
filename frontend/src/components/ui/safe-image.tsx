'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ImageIcon } from 'lucide-react';
import { getImageUrlWithFallback, getFallbackImage, FallbackType } from '@/lib/image-utils';
import { cn } from '@/lib/utils';

interface SafeImageProps {
  src: string | null | undefined;
  alt: string;
  fallbackType?: FallbackType;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  showMessage?: boolean;
  message?: string;
  priority?: boolean;
  onError?: () => void;
}

export function SafeImage({
  src,
  alt,
  fallbackType = 'default',
  className,
  width,
  height,
  fill = false,
  objectFit = 'cover',
  showMessage = true,
  message = 'Coming soon',
  priority = false,
  onError,
}: SafeImageProps) {
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(
    src ? getImageUrlWithFallback(src, fallbackType) : getFallbackImage(fallbackType)
  );

  const handleError = () => {
    if (!imageError) {
      setImageError(true);
      const fallback = getFallbackImage(fallbackType);
      setImageSrc(fallback);
      onError?.();
    }
  };

  // If image failed to load and we should show message
  if (imageError && showMessage) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center bg-gray-100 text-gray-400',
          className
        )}
        style={fill ? undefined : { width, height }}
      >
        <ImageIcon className="w-8 h-8 mb-2" />
        <span className="text-xs font-medium">{message}</span>
      </div>
    );
  }

  // Use Next.js Image component for optimization
  if (fill) {
    return (
      <Image
        src={imageSrc || getFallbackImage(fallbackType)}
        alt={alt}
        fill
        className={cn('object-cover', className)}
        onError={handleError}
        priority={priority}
        unoptimized={imageSrc?.startsWith('http')} // Cloudinary URLs are already optimized
      />
    );
  }

  return (
    <Image
      src={imageSrc || getFallbackImage(fallbackType)}
      alt={alt}
      width={width || 300}
      height={height || 300}
      className={cn(`object-${objectFit}`, className)}
      onError={handleError}
      priority={priority}
      unoptimized={imageSrc?.startsWith('http')} // Cloudinary URLs are already optimized
    />
  );
}

// Standard img element version (for non-Next.js Image cases)
interface SafeImgProps {
  src: string | null | undefined;
  alt: string;
  fallbackType?: FallbackType;
  className?: string;
  width?: number | string;
  height?: number | string;
  showMessage?: boolean;
  message?: string;
  onError?: () => void;
}

export function SafeImg({
  src,
  alt,
  fallbackType = 'default',
  className,
  width,
  height,
  showMessage = true,
  message = 'Coming soon',
  onError,
}: SafeImgProps) {
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>(
    src ? getImageUrlWithFallback(src, fallbackType) : getFallbackImage(fallbackType)
  );

  const handleError = () => {
    if (!imageError) {
      setImageError(true);
      const fallback = getFallbackImage(fallbackType);
      setImageSrc(fallback);
      onError?.();
    }
  };

  // If image failed to load and we should show message
  if (imageError && showMessage) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center bg-gray-100 text-gray-400',
          className
        )}
        style={{ width, height }}
      >
        <ImageIcon className="w-8 h-8 mb-2" />
        <span className="text-xs font-medium">{message}</span>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      width={width}
      height={height}
      onError={handleError}
    />
  );
}
