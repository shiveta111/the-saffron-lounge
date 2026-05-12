'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getImageUrl } from '../../lib/image-utils';

export function PromotionBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  const { data: promotionsResponse } = useQuery({
    queryKey: ['active-promotions'],
    queryFn: async () => {
      const response = await apiClient.getActivePromotions();
      return response;
    },
  });

  const promotions = promotionsResponse?.data?.promotions || [];

  // Filter promotions with banners
  const promotionsWithBanners = promotions.filter((p: any) => p.bannerImageUrl);

  useEffect(() => {
    if (!autoPlay || promotionsWithBanners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % promotionsWithBanners.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [autoPlay, promotionsWithBanners.length]);

  if (promotionsWithBanners.length === 0) {
    return null;
  }

  const currentPromotion = promotionsWithBanners[currentIndex];

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % promotionsWithBanners.length);
    setAutoPlay(false);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + promotionsWithBanners.length) % promotionsWithBanners.length);
    setAutoPlay(false);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setAutoPlay(false);
  };

  return (
    <div className="relative w-full h-[400px] md:h-[500px] rounded-lg overflow-hidden group">
      {/* Banner Image */}
      <div className="relative w-full h-full">
        <img
          src={getImageUrl(currentPromotion.bannerImageUrl) || ''}
          alt={currentPromotion.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
        
        {/* Promotion Content */}
        <div className="absolute inset-0 flex items-center p-8 md:p-12">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              {currentPromotion.name}
            </h2>
            {currentPromotion.description && (
              <p className="text-lg md:text-xl text-white/90 mb-6">
                {currentPromotion.description}
              </p>
            )}
            <div className="flex items-center gap-4">
              <div className="text-4xl md:text-5xl font-bold text-white">
                {currentPromotion.discountType === 'PERCENTAGE'
                  ? `${currentPromotion.discountValue}%`
                  : `€${currentPromotion.discountValue}`}
                <span className="text-xl md:text-2xl ml-2">OFF</span>
              </div>
            </div>
            <div className="mt-6 flex gap-4">
              <Link href="/deals">
                <Button size="lg" className="bg-white text-black hover:bg-gray-100">
                  View All Deals
                </Button>
              </Link>
              {currentPromotion.code && (
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  Use Code: {currentPromotion.code}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {promotionsWithBanners.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Next slide"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {promotionsWithBanners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {promotionsWithBanners.map((_: any, index: number) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'w-8 bg-white'
                  : 'w-2 bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

