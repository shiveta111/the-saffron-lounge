'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Badge } from '../../ui/badge';
import { format } from 'date-fns';
import { Separator } from '../../ui/separator';
import { env } from '@/lib/env';

interface PromotionDetailModalProps {
  promotion: any;
  open: boolean;
  onClose: () => void;
}

export function PromotionDetailModal({ promotion, open, onClose }: PromotionDetailModalProps) {
  if (!promotion) return null;

  const getStatusBadge = () => {
    const now = new Date();
    const validFrom = new Date(promotion.validFrom);
    const validTo = promotion.validTo ? new Date(promotion.validTo) : null;

    if (!promotion.isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }

    if (now < validFrom) {
      return <Badge variant="outline">Upcoming</Badge>;
    }

    if (validTo && now > validTo) {
      return <Badge variant="destructive">Expired</Badge>;
    }

    return <Badge variant="default">Active</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      PERCENTAGE: 'bg-blue-100 text-blue-800',
      FIXED: 'bg-green-100 text-green-800',
      BOGO: 'bg-purple-100 text-purple-800',
      PRODUCT_BASED: 'bg-orange-100 text-orange-800',
      CATEGORY_BASED: 'bg-yellow-100 text-yellow-800',
      HAPPY_HOURS: 'bg-pink-100 text-pink-800',
      FIRST_ORDER: 'bg-indigo-100 text-indigo-800',
    };
    return (
      <Badge className={colors[type] || 'bg-gray-100 text-gray-800'}>
        {type.replace(/_/g, ' ')}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{promotion.name}</span>
            {getStatusBadge()}
          </DialogTitle>
          <DialogDescription>
            Promotion details and usage statistics
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="font-semibold mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="font-medium">{getTypeBadge(promotion.type)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Code</p>
                <p className="font-medium">{promotion.code || 'No code'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Discount</p>
                <p className="font-medium">
                  {promotion.discountType === 'PERCENTAGE'
                    ? `${promotion.discountValue}%`
                    : `₹${promotion.discountValue}`}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Priority</p>
                <p className="font-medium">{promotion.priority}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Validity Period */}
          <div>
            <h3 className="font-semibold mb-3">Validity Period</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Start Date</p>
                <p className="font-medium">
                  {format(new Date(promotion.validFrom), 'PPpp')}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">End Date</p>
                <p className="font-medium">
                  {promotion.validTo
                    ? format(new Date(promotion.validTo), 'PPpp')
                    : 'No end date'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Usage Statistics */}
          <div>
            <h3 className="font-semibold mb-3">Usage Statistics</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Times Used</p>
                <p className="font-medium">{promotion.usedCount || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Usage Limit</p>
                <p className="font-medium">
                  {promotion.usageLimit ? `${promotion.usedCount} / ${promotion.usageLimit}` : 'Unlimited'}
                </p>
              </div>
              {promotion._count && (
                <div>
                  <p className="text-muted-foreground">Unique Users</p>
                  <p className="font-medium">{promotion._count.usages || 0}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Settings */}
          <div>
            <h3 className="font-semibold mb-3">Settings</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Applicable To</p>
                <p className="font-medium">{promotion.applicableType?.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Minimum Order</p>
                <p className="font-medium">
                  {promotion.minOrderValue ? `₹${promotion.minOrderValue}` : 'No minimum'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Max Discount</p>
                <p className="font-medium">
                  {promotion.maxDiscount ? `₹${promotion.maxDiscount}` : 'Unlimited'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">First Order Only</p>
                <p className="font-medium">{promotion.firstOrderOnly ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Requires Code</p>
                <p className="font-medium">{promotion.requiresCouponCode ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Auto-Apply</p>
                <p className="font-medium">{promotion.autoApply ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {promotion.description && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Description</h3>
                <p className="text-sm text-muted-foreground">{promotion.description}</p>
              </div>
            </>
          )}

          {/* Banner */}
          {promotion.bannerImageUrl && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Banner</h3>
                <img
                  src={promotion.bannerImageUrl.startsWith('/') 
                    ? `${env.apiUrl}${promotion.bannerImageUrl}`
                    : promotion.bannerImageUrl}
                  alt="Promotion banner"
                  className="w-full h-auto rounded-lg"
                />
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}



