'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Users, ArrowLeft, CalendarPlus, Edit, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '../components/EmptyState';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { useWebSocket } from '@/lib/useWebSocket';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Reservation, ReservationStatus } from '@/lib/types';

export default function ReservationsPage() {
  const router = useRouter();
  const { user, hasAnyRole } = useAuth();
  const { on, off, subscribe, isConnected } = useWebSocket();
  const canModify = hasAnyRole(['ADMIN', 'SELLER']);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modifyDialog, setModifyDialog] = useState<Reservation | null>(null);
  const [modifyForm, setModifyForm] = useState({
    reservationDate: '',
    reservationTime: '',
    partySize: '',
    specialRequests: '',
  });

  useEffect(() => {
    fetchReservations();
    
    // Subscribe to customer reservation updates
    if (isConnected) {
      subscribe('customer-reservations');
    }
  }, [isConnected]);

  // WebSocket listeners for real-time updates
  useEffect(() => {
    const handleReservationConfirmed = (data: any) => {
      console.log('[WebSocket] Reservation confirmed:', data);
      toast.success('Reservation Confirmed!', {
        description: 'Your reservation has been confirmed by the restaurant.',
      });
      fetchReservations();
    };

    const handleReservationRejected = (data: any) => {
      console.log('[WebSocket] Reservation rejected:', data);
      toast.error('Reservation Rejected', {
        description: data.reason || 'Your reservation has been rejected.',
      });
      fetchReservations();
    };

    const handleReservationStatusUpdated = (data: any) => {
      console.log('[WebSocket] Reservation status updated:', data);
      setReservations((prev) =>
        prev.map((r) =>
          r.id === data.reservation.id ? { ...r, ...data.reservation } : r
        )
      );
      toast.success('Reservation Updated', {
        description: `Status changed to ${data.newStatus}`,
      });
    };

    const handleReservationCancelled = (data: any) => {
      console.log('[WebSocket] Reservation cancelled:', data);
      fetchReservations();
    };

    if (isConnected) {
      on('RESERVATION_CONFIRMED', handleReservationConfirmed);
      on('RESERVATION_REJECTED', handleReservationRejected);
      on('RESERVATION_STATUS_UPDATED', handleReservationStatusUpdated);
      on('RESERVATION_CANCELLED', handleReservationCancelled);
    }

    return () => {
      off('RESERVATION_CONFIRMED', handleReservationConfirmed);
      off('RESERVATION_REJECTED', handleReservationRejected);
      off('RESERVATION_STATUS_UPDATED', handleReservationStatusUpdated);
      off('RESERVATION_CANCELLED', handleReservationCancelled);
    };
  }, [isConnected, on, off]);

  const fetchReservations = async () => {
    try {
      setIsLoading(true);
      
      // Fetch real reservations from API
      const response = await apiClient.getReservations({ limit: 100 });
      
      if (response.success && response.data?.reservations) {
        setReservations(response.data.reservations);
      } else {
        setReservations([]);
      }
    } catch (error) {
      console.error('Failed to fetch reservations:', error);
      toast.error('Failed to load reservations', {
        description: 'Please try refreshing the page',
      });
      setReservations([]);
    } finally {
      setIsLoading(false);
    }
  };

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

  const isUpcoming = (reservation: Reservation) => {
    const reservationDate = new Date(reservation.reservationDate);
    const [hours, minutes] = reservation.reservationTime.split(':').map(Number);
    reservationDate.setHours(hours, minutes, 0, 0);
    return reservationDate > new Date() && reservation.status !== 'CANCELLED' && reservation.status !== 'COMPLETED';
  };

  const upcomingReservations = reservations.filter(isUpcoming);
  const pastReservations = reservations.filter(r => !isUpcoming(r));

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">My Reservations</h1>
          <p className="text-gray-600 mt-2">Manage your table bookings</p>
        </div>
        <Button onClick={() => router.push('/reserve-table')}>
          <CalendarPlus className="h-4 w-4 mr-2" />
          New Reservation
        </Button>
      </div>

      {/* Upcoming Reservations */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming</h2>
        {upcomingReservations.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No upcoming reservations"
            description="You don't have any upcoming reservations. Book a table now!"
            actionLabel="Make Reservation"
            onAction={() => router.push('/reserve-table')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingReservations.map((reservation) => (
              <Card key={reservation.id} className="border-primary/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Reservation #{reservation.id}</CardTitle>
                    <Badge variant="outline" className={cn('text-xs', getStatusColor(reservation.status))}>
                      {reservation.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatDate(reservation.reservationDate)}
                    </p>
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
                    {canModify && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => {
                          setModifyDialog(reservation);
                          setModifyForm({
                            reservationDate: reservation.reservationDate.split('T')[0],
                            reservationTime: reservation.reservationTime,
                            partySize: reservation.partySize.toString(),
                            specialRequests: reservation.specialRequests || '',
                          });
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Modify
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={canModify ? "flex-1 text-red-600 hover:text-red-700" : "w-full text-red-600 hover:text-red-700"}
                      onClick={async () => {
                        if (confirm('Are you sure you want to cancel this reservation?')) {
                          try {
                            await apiClient.cancelReservation(reservation.id);
                            toast.success('Reservation cancelled');
                            fetchReservations();
                          } catch (error: any) {
                            toast.error(error.response?.data?.error || 'Failed to cancel reservation');
                          }
                        }
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Past Reservations */}
      {pastReservations.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Past Reservations</h2>
          <div className="space-y-3">
            {pastReservations.map((reservation) => (
              <Card key={reservation.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <p className="font-semibold text-gray-900">
                          {formatDate(reservation.reservationDate)}
                        </p>
                        <Badge variant="outline" className={cn('text-xs', getStatusColor(reservation.status))}>
                          {reservation.status}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {reservation.reservationTime}
                        </span>
                        <span className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {reservation.partySize} {reservation.partySize === 1 ? 'guest' : 'guests'}
                        </span>
                        {reservation.table && (
                          <span className="flex items-center">
                            Table {reservation.table.tableNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Modify Reservation Dialog */}
      <Dialog open={!!modifyDialog} onOpenChange={() => setModifyDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modify Reservation</DialogTitle>
            <DialogDescription>
              Update your reservation details. Changes are subject to availability.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={modifyForm.reservationDate}
                onChange={(e) => setModifyForm({ ...modifyForm, reservationDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label>Time</Label>
              <Input
                type="time"
                value={modifyForm.reservationTime}
                onChange={(e) => setModifyForm({ ...modifyForm, reservationTime: e.target.value })}
              />
            </div>
            <div>
              <Label>Party Size</Label>
              <Select
                value={modifyForm.partySize}
                onValueChange={(value) => setModifyForm({ ...modifyForm, partySize: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? 'guest' : 'guests'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Special Requests (Optional)</Label>
              <Textarea
                value={modifyForm.specialRequests}
                onChange={(e) => setModifyForm({ ...modifyForm, specialRequests: e.target.value })}
                placeholder="Any special requests or dietary requirements..."
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setModifyDialog(null)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!modifyDialog) return;
                  try {
                    await apiClient.updateReservation(modifyDialog.id, {
                      reservationDate: modifyForm.reservationDate,
                      reservationTime: modifyForm.reservationTime,
                      partySize: parseInt(modifyForm.partySize),
                      specialRequests: modifyForm.specialRequests || undefined,
                    });
                    toast.success('Reservation updated successfully');
                    setModifyDialog(null);
                    fetchReservations();
                  } catch (error: any) {
                    toast.error(error.response?.data?.error || 'Failed to update reservation');
                  }
                }}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
