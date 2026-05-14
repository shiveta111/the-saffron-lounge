'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { X, Tag, Percent, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { env } from '@/lib/env';
import { useLanguage } from '../../lib/language';

interface Promotion {
  id: number;
  name?: string;
  code?: string;
  discountType: string;
  discountValue: number;
  validFrom: string;
  validTo?: string;
  description?: string;
  bannerImageUrl?: string;
}

function OffersModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };
  const { data: settingsResponse, isLoading: settingsLoading } = useQuery({
    queryKey: ['promotion-settings'],
    queryFn: async () => {
      const response = await apiClient.getPromotionSettings();
      return response;
    },
  });

  const { data: promotionsResponse, isLoading: promotionsLoading, error: promotionsError } = useQuery({
    queryKey: ['all-promotions'],
    queryFn: async () => {
      try {
        const response = await apiClient.getPromotions();
        console.log('Promotions API Response:', response);
        
        // Ensure response has the expected structure
        if (!response || typeof response !== 'object') {
          // Return empty promotions structure
          return {
            success: false,
            data: {
              promotions: [],
              pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
            },
          };
        }
        
        // If response has success: false, return empty structure instead of throwing
        if (response.success === false) {
          return {
            success: false,
            data: {
              promotions: response.data?.promotions || [],
              pagination: response.data?.pagination || { total: 0, limit: 20, offset: 0, hasMore: false },
            },
            error: response.error || response.message || 'Failed to load promotions',
          };
        }
        
        return response;
      } catch (error: any) {
        console.error('Error fetching promotions:', error);
        // Re-throw with better error message
        const errorMessage = error?.response?.data?.error || 
                            error?.response?.data?.message ||
                            error?.message ||
                            'Failed to load promotions';
        throw new Error(errorMessage);
      }
    },
    enabled: (settingsResponse?.success !== false && settingsResponse?.data?.enabled !== false) && open,
    retry: 1,
  });

  const promotionsEnabled = settingsResponse?.success !== false && settingsResponse?.data?.enabled !== false;
  const allPromotions = promotionsResponse?.success !== false && Array.isArray(promotionsResponse?.data?.promotions)
    ? promotionsResponse.data.promotions 
    : [];
  const isLoading = settingsLoading || promotionsLoading;
  
  // Filter active promotions client-side
  const now = new Date();
  const activePromotions = allPromotions.filter((p: any) => {
    // Check if promotion is active (isActive can be 1, true, or "1")
    const isActive = p.isActive === 1 || p.isActive === true || p.isActive === "1";
    if (!isActive) return false;
    
    // Check if promotion is within valid date range
    const validFrom = p.validFrom ? new Date(p.validFrom) : null;
    const validTo = p.validTo ? new Date(p.validTo) : null;
    
    if (validFrom && now < validFrom) return false;
    if (validTo && now > validTo) return false;
    
    return true;
  });
  
  // Ensure promotions have name field
  const promotionsWithName = activePromotions.map((p: Promotion) => ({
    ...p,
    name: p.name || p.description || p.code || t('Special Offer'),
  }));

  // Debug logging
  useEffect(() => {
    if (open) {
      console.log('OffersModal Debug:', {
        open,
        promotionsEnabled,
        isLoading,
        allPromotionsCount: allPromotions.length,
        activePromotionsCount: activePromotions.length,
        promotionsWithNameCount: promotionsWithName.length,
        allPromotions,
        activePromotions,
        promotionsWithName,
        promotionsResponse,
        promotionsError,
        settingsResponse,
      });
      
      // Also log the raw API response
      if (promotionsResponse) {
        console.log('Raw API Response:', JSON.stringify(promotionsResponse, null, 2));
      }
    }
  }, [open, promotionsEnabled, isLoading, allPromotions, activePromotions, promotionsWithName, promotionsResponse, promotionsError, settingsResponse]);

  // Don't render modal if not open
  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#18181c] border-[#23232a] text-white" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-el-messiri)' }}>
            {t('Special Offers & Promotions')}
          </DialogTitle>
          <DialogDescription className="text-[#bdbdbd]">
            {t("Don't miss out on these amazing deals!")}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f36b24] mx-auto mb-4"></div>
            <p className="text-[#bdbdbd]">{t('Loading offers...')}</p>
          </div>
        ) : !promotionsEnabled ? (
          <div className="text-center py-12">
            <Tag className="h-12 w-12 text-[#bdbdbd] mx-auto mb-4" />
            <p className="text-[#bdbdbd]">{t('Promotions are currently disabled.')}</p>
          </div>
        ) : promotionsError ? (
          <div className="text-center py-12">
            <Tag className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 font-semibold">{t('Failed to load promotions.')}</p>
            <p className="text-sm text-[#bdbdbd] mt-2">
              {promotionsError instanceof Error 
                ? promotionsError.message
                : (promotionsError as any)?.response?.data?.error || 
                  (promotionsError as any)?.response?.data?.details ||
                  t('Please try refreshing the page or contact support if the issue persists.')}
            </p>
            {process.env.NODE_ENV === 'development' && (
              <pre className="text-xs text-[#888] mt-4 text-left bg-[#111115] p-2 rounded overflow-auto max-h-32">
                {JSON.stringify(promotionsError, null, 2)}
              </pre>
            )}
          </div>
        ) : !promotionsResponse ? (
          <div className="text-center py-12">
            <Tag className="h-12 w-12 text-[#bdbdbd] mx-auto mb-4" />
            <p className="text-[#bdbdbd]">{t('Loading promotions...')}</p>
          </div>
        ) : promotionsError ? (
          <div className="text-center py-12">
            <Tag className="h-12 w-12 text-[#bdbdbd] mx-auto mb-4" />
            <p className="text-[#bdbdbd]">{t('Unable to load promotions at the moment.')}</p>
            <p className="text-sm text-[#888] mt-2">{t('Please try again later.')}</p>
          </div>
        ) : promotionsWithName.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="h-12 w-12 text-[#bdbdbd] mx-auto mb-4" />
            <p className="text-[#bdbdbd]">{t('No active promotions at the moment.')}</p>
            <p className="text-sm text-[#888] mt-2">{t('Check back soon for exciting offers!')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 mt-4">
            {promotionsWithName.map((promotion: Promotion) => (
              <div
                key={promotion.id}
                className="relative bg-gradient-to-br from-[#23232a] to-[#1a1a1f] rounded-xl p-6 border border-[#2d2d35] hover:border-[#f36b24] transition-all duration-300 shadow-lg hover:shadow-[#f36b24]/20"
              >
                {/* Banner Image */}
                {promotion.bannerImageUrl && (
                  <div className="mb-4 -mx-6 -mt-6">
                    <img
                      src={`${env.apiUrl}${promotion.bannerImageUrl}`}
                      alt={t(promotion.name || promotion.code || 'Promotion')}
                      className="w-full h-40 object-cover rounded-t-xl"
                    />
                  </div>
                )}

                {/* Discount Badge */}
                <div className="flex justify-end mb-3">
                  <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#f36b24] to-[#d65a18] text-white px-4 py-2 rounded-full shadow-lg">
                    {promotion.discountType === 'PERCENTAGE' ? (
                      <>
                        <Percent className="h-4 w-4" />
                        <span className="font-bold text-sm">{promotion.discountValue}% {t('OFF')}</span>
                      </>
                    ) : (
                      <>
                        <span className="font-bold text-sm">€{promotion.discountValue} {t('OFF')}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Promotion Title */}
                <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                  {t(promotion.name || promotion.code || 'Special Offer')}
                </h3>

                {/* Description */}
                {promotion.description && (
                  <p className="text-sm text-[#bdbdbd] mb-4 leading-relaxed">{promotion.description}</p>
                )}

                {/* Coupon Code Section */}
                {promotion.code && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-[#18181c] to-[#111115] rounded-lg border border-[#f36b24]/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="h-4 w-4 text-[#f36b24]" />
                      <span className="text-xs font-semibold text-[#bdbdbd] uppercase tracking-wide">{t('Coupon Code')}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span 
                          className="font-mono font-bold text-xl text-[#f36b24] bg-[#0a0a0d] px-4 py-2 rounded-lg border-2 border-[#f36b24]/50 flex-1 text-center"
                        >
                          {promotion.code}
                        </span>
                        <button
                          onClick={() => handleCopyCode(promotion.code || '')}
                          className="p-2 bg-[#f36b24] hover:bg-[#d65a18] text-white rounded-lg transition-colors"
                          title={t('Copy code')}
                        >
                          {copiedCode === promotion.code ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-[#888] text-center mt-1">{t('Use this code at checkout')}</p>
                    </div>
                  </div>
                )}

                {/* Validity Dates */}
                <div className="mt-4 pt-4 border-t border-[#2d2d35]">
                  <div className="flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#888]">{t('Valid from:')}</span>
                      <span className="text-[#bdbdbd] font-medium">{format(new Date(promotion.validFrom), 'MMM dd, yyyy')}</span>
                    </div>
                    {promotion.validTo && (
                      <div className="flex items-center justify-between">
                        <span className="text-[#888]">{t('Until:')}</span>
                        <span className="text-[#bdbdbd] font-medium">{format(new Date(promotion.validTo), 'MMM dd, yyyy')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button
            onClick={onClose}
            className="bg-[#f36b24] hover:bg-[#d65a18] text-white"
          >
            {t('Close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Named export for direct imports
export { OffersModal };// Default export for lazy loading
export default OffersModal;
