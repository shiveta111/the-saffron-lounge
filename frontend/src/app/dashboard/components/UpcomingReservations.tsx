'use client';

import { useRouter } from 'next/navigation';
import { Calendar, Clock, Users, MapPin, CalendarPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from './EmptyState';
import { cn } from '@/lib/utils';
import type { Reservation, ReservationStatus } from '@/lib/types';

interface UpcomingReservationsProps {
  reservation: Reservation | null;
  loading?: boolean;
  onMakeReservation: () => void;
}

export function UpcomingReservations({
  reservation,
  loading = false,
  onMakeReservation,
}: UpcomingReservationsProps) {
  const router = useRouter();

  const getStatusColor = (status: ReservationStatus) => {
    const colors: Record<ReservationStatus, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      CONFIRMED: 'bg-green-100 text-green-800 border-green-200',
      SEATED: 'bg-blue-100 text-blue-800 border-blue-200',
      COMPLETED: 'bg-gray-100 text-gray-800 border-gray-200',
      CANCELLED: 'bg-red-100 text-red-800 border-red-200',
      NO_SHOW: 'bg-orange-100 text-orange-800 border-orange-200',
    };
    return colors[status] || colors.PENDING;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Upcoming Reservation</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!reservation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Upcoming Reservation</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={CalendarPlus}
            title="No upcoming reservations"
            description="Book a table at our restaurant for your next dining experience!"
            actionLabel="Make Reservation"
            onAction={onMakeReservation}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-primary" />
          <span>Upcoming Reservation</span>
        </CardTitle>
        <Badge variant="outline" className={cn('text-xs', getStatusColor(reservation.status))}>
          {reservation.status}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-lg font-semibold text-gray-900 mb-1">
              {formatDate(reservation.reservationDate)}
            </p>
            <p className="text-sm text-gray-600">Reservation #{reservation.id}</p>
            {reservation.table && (
              <p className="text-sm text-gray-600 mt-1">Table {reservation.table.tableNumber}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <Clock className="h-5 w-5 text-gray-600 mt-0.5" />
              <div>
                <p className="text-xs text-gray-600 mb-1">Time</p>
                <p className="font-semibold text-gray-900">{reservation.reservationTime}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <Users className="h-5 w-5 text-gray-600 mt-0.5" />
              <div>
                <p className="text-xs text-gray-600 mb-1">Party Size</p>
                <p className="font-semibold text-gray-900">{reservation.partySize} {reservation.partySize === 1 ? 'guest' : 'guests'}</p>
              </div>
            </div>
          </div>

          {reservation.specialRequests && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-600 font-medium mb-1">Special Requests</p>
              <p className="text-sm text-gray-700">{reservation.specialRequests}</p>
            </div>
          )}

          <div className="flex space-x-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => router.push(`/dashboard/reservations`)}
            >
              View Details
            </Button>
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => router.push(`/dashboard/reservations`)}
            >
              Manage
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
