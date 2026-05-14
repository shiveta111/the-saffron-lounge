'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Tag, Search } from 'lucide-react';
import { format } from 'date-fns';
import { getImageUrl } from '../../lib/image-utils';
import { useState } from 'react';
import Link from 'next/link';

export default function DealsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: promotionsResponse, isLoading } = useQuery({
    queryKey: ['active-promotions'],
    queryFn: async () => {
      const response = await apiClient.getActivePromotions();
      return response;
    },
  });

  const promotions = promotionsResponse?.data?.promotions || [];

  const filteredPromotions = promotions.filter((promo: any) => {
    if (searchTerm && !promo.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (typeFilter !== 'all' && promo.type !== typeFilter) {
      return false;
    }
    return true;
  });

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
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Deals & Offers</h1>
        <p className="text-muted-foreground">
          Discover amazing promotions and discounts available now
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search deals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border rounded-md"
        >
          <option value="all">All Types</option>
          <option value="PERCENTAGE">Percentage</option>
          <option value="FIXED">Fixed</option>
          <option value="BOGO">BOGO</option>
          <option value="HAPPY_HOURS">Happy Hours</option>
          <option value="FIRST_ORDER">First Order</option>
        </select>
      </div>

      {/* Promotions Grid */}
      {isLoading ? (
        <div className="text-center py-12">Loading deals...</div>
      ) : filteredPromotions.length === 0 ? (
        <div className="text-center py-12">
          <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No deals available</h3>
          <p className="text-muted-foreground">
            Check back soon for exciting promotions!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPromotions.map((promotion: any) => (
            <Card key={promotion.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {promotion.bannerImageUrl && (
                <div className="relative h-48 w-full">
                  <img
                    src={getImageUrl(promotion.bannerImageUrl) || ''}
                    alt={promotion.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4">
                    {getTypeBadge(promotion.type)}
                  </div>
                </div>
              )}
              <CardHeader>
                <CardTitle>{promotion.name}</CardTitle>
                <CardDescription>
                  {promotion.description || 'Special promotion available now'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">
                      {promotion.discountType === 'PERCENTAGE'
                        ? `${promotion.discountValue}%`
                        : `₹${promotion.discountValue}`}
                    </span>
                    <span className="text-muted-foreground">OFF</span>
                  </div>

                  {promotion.minOrderValue && (
                    <p className="text-sm text-muted-foreground">
                      Minimum order: ₹{promotion.minOrderValue}
                    </p>
                  )}

                  <div className="text-sm text-muted-foreground">
                    <p>
                      Valid from: {format(new Date(promotion.validFrom), 'MMM dd, yyyy')}
                    </p>
                    {promotion.validTo && (
                      <p>
                        Valid until: {format(new Date(promotion.validTo), 'MMM dd, yyyy')}
                      </p>
                    )}
                  </div>

                  {promotion.code && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-1">Coupon Code</p>
                      <p className="text-lg font-mono font-bold">{promotion.code}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {promotion.autoApply && (
                      <Badge variant="secondary">Auto-Applied</Badge>
                    )}
                    {promotion.firstOrderOnly && (
                      <Badge variant="outline">First Order Only</Badge>
                    )}
                  </div>

                  <Link href="/menu/restaurant">
                    <Button className="w-full">Shop Now</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}



