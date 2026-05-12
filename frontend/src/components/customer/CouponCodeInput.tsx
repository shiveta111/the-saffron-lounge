'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tag, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../../lib/language';

interface CouponCodeInputProps {
  orderTotal: number;
  items?: any[];
  onCouponApplied?: (discountAmount: number, code: string) => void;
  onCouponRemoved?: () => void;
}

export function CouponCodeInput({ orderTotal, items, onCouponApplied, onCouponRemoved }: CouponCodeInputProps) {
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  const validateMutation = useMutation({
    mutationFn: async (couponCode: string) => {
      const response = await apiClient.validateCouponCode(couponCode, orderTotal, items);
      return response;
    },
    onSuccess: (data) => {
      if (data.success && data.data?.valid) {
        const discount = data.data.discountAmount || 0;
        const appliedCouponCode = code.toUpperCase();
        setAppliedCode(appliedCouponCode);
        setDiscountAmount(discount);
        setCode('');
        toast.success(`${t('Coupon')} "${appliedCouponCode}" ${t('applied successfully!')} ${t('Discount:')} €${discount.toFixed(2)}`);
        onCouponApplied?.(discount, appliedCouponCode);
      } else {
        toast.error(data.error || t('Invalid coupon code'));
      }
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error || error.message || t('Failed to validate coupon code');
      toast.error(errorMsg);
      console.error('Coupon validation error:', error);
    },
  });

  const handleApply = () => {
    if (!code.trim()) {
      toast.error(t('Please enter a coupon code'));
      return;
    }
    validateMutation.mutate(code.toUpperCase());
  };

  const handleRemove = () => {
    setAppliedCode(null);
    setDiscountAmount(0);
    setCode('');
    onCouponRemoved?.();
    toast.success(t('Coupon removed'));
  };

  return (
    <div className="space-y-2">
      <Label className="text-white flex items-center gap-2">
        <Tag className="h-4 w-4" />
        {t('Coupon Code')}
      </Label>
      
      {appliedCode ? (
        <div className="flex items-center gap-2 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-green-400">{t('Coupon Applied:')} {appliedCode}</div>
            <div className="text-xs text-green-300">{t('Discount:')} €{discountAmount.toFixed(2)}</div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="text-red-400 hover:text-red-300"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder={t('Enter coupon code')}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleApply();
              }
            }}
            className="bg-[#23232a] border-[#2d2d35] text-white placeholder:text-[#bdbdbd]"
          />
          <Button
            type="button"
            onClick={handleApply}
            disabled={validateMutation.isPending}
            className="bg-[#f36b24] hover:bg-[#d65a18] text-white"
          >
            {validateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t('Apply')
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

