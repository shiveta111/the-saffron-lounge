'use client';

import { useRouter } from 'next/navigation';
import { ShoppingCart, CalendarPlus, Menu, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface QuickActionsProps {
  onAction?: (action: string) => void;
}

const actions = [
  {
    id: 'order',
    label: 'Order Now',
    description: 'Browse menu & order',
    icon: ShoppingCart,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    borderColor: 'border-blue-200',
    path: '/menu/restaurant',
  },
  {
    id: 'reservation',
    label: 'Make Reservation',
    description: 'Book a table',
    icon: CalendarPlus,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
    borderColor: 'border-purple-200',
    path: '/reserve-table',
  },
  {
    id: 'menu',
    label: 'View Menu',
    description: 'See all dishes',
    icon: Menu,
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100',
    borderColor: 'border-green-200',
    path: '/menu/restaurant',
  },
  {
    id: 'support',
    label: 'Contact Support',
    description: 'Get help',
    icon: MessageCircle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 hover:bg-amber-100',
    borderColor: 'border-amber-200',
    path: '/contact',
  },
];

export function QuickActions({ onAction }: QuickActionsProps) {
  const router = useRouter();

  const handleAction = (action: typeof actions[0]) => {
    if (onAction) {
      onAction(action.id);
    }
    router.push(action.path);
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Card
            key={action.id}
            className={cn(
              'cursor-pointer transition-all duration-200 border-2',
              action.borderColor,
              action.bgColor
            )}
            onClick={() => handleAction(action)}
          >
            <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center space-y-2">
              <div className={cn('p-3 rounded-full bg-white shadow-sm')}>
                <Icon className={cn('h-6 w-6', action.color)} aria-hidden="true" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm sm:text-base">
                  {action.label}
                </p>
                <p className="text-xs text-gray-600 mt-1 hidden sm:block">
                  {action.description}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
