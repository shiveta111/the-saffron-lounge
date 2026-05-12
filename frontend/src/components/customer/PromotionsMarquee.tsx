'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { Tag, Percent } from 'lucide-react';

interface Promotion {
  id: number;
  name?: string;
  code?: string;
  discountType: string;
  discountValue: number;
  description?: string;
}

export function PromotionsMarquee() {
  const { data: settingsResponse } = useQuery({
    queryKey: ['promotion-settings'],
    queryFn: async () => {
      const response = await apiClient.getPromotionSettings();
      return response;
    },
  });

  const { data: promotionsResponse } = useQuery({
    queryKey: ['active-promotions'],
    queryFn: async () => {
      const response = await apiClient.getActivePromotions();
      return response;
    },
    enabled: settingsResponse?.data?.enabled !== false,
  });

  const promotionsEnabled = settingsResponse?.data?.enabled !== false;
  const promotions = promotionsResponse?.data?.promotions || [];

  if (!promotionsEnabled || promotions.length === 0) {
    return null;
  }

  // Duplicate promotions for seamless scrolling
  const duplicatedPromotions = [...promotions, ...promotions];

  return (
    <div className="bg-[#f36b24] text-white py-2 overflow-hidden relative">
      <div className="flex animate-scroll whitespace-nowrap">
        {duplicatedPromotions.map((promotion: Promotion, index: number) => (
          <div
            key={`${promotion.id}-${index}`}
            className="inline-flex items-center gap-3 mx-8"
          >
            <Tag className="h-4 w-4 flex-shrink-0" />
            <span className="font-semibold">
              {promotion.name || promotion.code || 'Special Offer'}
            </span>
            <span className="flex items-center gap-1">
              {promotion.discountType === 'PERCENTAGE' ? (
                <>
                  <Percent className="h-4 w-4" />
                  <span>{promotion.discountValue}% OFF</span>
                </>
              ) : (
                <span>€{promotion.discountValue} OFF</span>
              )}
            </span>
            {promotion.code && (
              <span className="font-mono bg-white/20 px-2 py-1 rounded">
                {promotion.code}
              </span>
            )}
            <span className="text-white/80">•</span>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

