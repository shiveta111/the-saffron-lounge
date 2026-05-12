'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { Tag, Percent } from 'lucide-react';
import { useLanguage } from '../../lib/language';

export function ActivePromotionsDisplay() {
  const { t } = useLanguage();
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

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <Tag className="h-5 w-5 text-[#f36b24]" />
        {t('Available Offers')}
      </h3>
      <div className="space-y-2">
        {promotions.slice(0, 3).map((promotion: any) => (
          <div
            key={promotion.id}
            className="p-3 bg-[#23232a] rounded-lg border border-[#2d2d35] flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              {promotion.discountType === 'PERCENTAGE' && (
                <Percent className="h-4 w-4 text-[#f36b24]" />
              )}
              <span className="text-sm text-white">
                {t(promotion.name || promotion.code || 'Special Offer')}
              </span>
              {promotion.code && (
                <span className="text-xs text-[#bdbdbd] font-mono">({promotion.code})</span>
              )}
            </div>
            <div className="text-sm font-bold text-[#f36b24]">
              {promotion.discountType === 'PERCENTAGE' 
                ? `${promotion.discountValue}% ${t('OFF')}`
                : `€${promotion.discountValue} ${t('OFF')}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

