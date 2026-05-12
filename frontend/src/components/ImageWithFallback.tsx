'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  fill?: boolean;
  className?: string;
  fallbackSrc?: string;
  [key: string]: any;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  fill = false,
  className = '',
  fallbackSrc = '/assets-main/menu/coming-soon.png',
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      console.warn(`Failed to load image: ${imgSrc}, using fallback`);
      setImgSrc(fallbackSrc);
      setHasError(true);
    }
  };

  return (
    <Image
      src={imgSrc}
      alt={alt}
      fill={fill}
      className={className}
      onError={handleError}
      {...props}
    />
  );
};
