'use client';

import { ShoppingBag, DollarSign, Calendar, Award } from 'lucide-react';
import { StatsCard } from './StatsCard';

interface StatsOverviewProps {
  stats: {
    totalOrders: number;
    totalSpent: number;
    activeReservations: number;
    loyaltyPoints: number;
  };
  loading?: boolean;
}

export function StatsOverview({ stats, loading = false }: StatsOverviewProps) {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const statsData = [
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: ShoppingBag,
      iconColor: 'text-blue-600',
      iconBgColor: 'bg-blue-100',
    },
    {
      title: 'Total Spent',
      value: formatCurrency(stats.totalSpent),
      icon: DollarSign,
      iconColor: 'text-green-600',
      iconBgColor: 'bg-green-100',
    },
    {
      title: 'Active Reservations',
      value: stats.activeReservations,
      icon: Calendar,
      iconColor: 'text-purple-600',
      iconBgColor: 'bg-purple-100',
    },
    {
      title: 'Loyalty Points',
      value: stats.loyaltyPoints,
      icon: Award,
      iconColor: 'text-amber-600',
      iconBgColor: 'bg-amber-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {statsData.map((stat) => (
        <StatsCard
          key={stat.title}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          iconColor={stat.iconColor}
          iconBgColor={stat.iconBgColor}
          loading={loading}
        />
      ))}
    </div>
  );
}
