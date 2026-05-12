'use client';

import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
  iconColor?: string;
  iconBgColor?: string;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  loading = false,
  iconColor = 'text-primary',
  iconBgColor = 'bg-primary/10',
}: StatsCardProps) {
  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
            </div>
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
          {trend && <Skeleton className="h-4 w-20 mt-4" />}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1 flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={cn('p-3 rounded-lg', iconBgColor)}>
            <Icon className={cn('h-6 w-6', iconColor)} aria-hidden="true" />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center text-sm">
            <span
              className={cn(
                'font-medium',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
            <span className="text-gray-600 ml-2">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
