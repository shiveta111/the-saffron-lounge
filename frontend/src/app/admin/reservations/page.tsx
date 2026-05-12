'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { Button } from '../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { MoreHorizontal, Calendar, Users, Clock, MapPin, Mail, Phone, RefreshCw, CheckCircle, XCircle, User, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminWebSocket } from '../../../lib/hooks/useAdminWebSocket';
import Link from 'next/link';

interface ReservationData {
  id: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  partySize: number;
  reservationDate: string;
  reservationTime: string;
  status: string;
  specialRequests?: string;
  table?: {
    id: number;
    tableNumber: string;
    capacity: number;
    location?: string;
  };
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export default function ReservationsManagementPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReservation, setSelectedReservation] = useState<ReservationData | null>(null);
  const [assignTableDialog, setAssignTableDialog] = useState<ReservationData | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [deleteDialog, setDeleteDialog] = useState<ReservationData | null>(null);

  const queryClient = useQueryClient();

  // WebSocket for real-time updates
  useAdminWebSocket('reservations', () => {
    queryClient.invalidateQueries({ queryKey: ['reservations'] });
  });

  // Queries
  const { data: reservationsResponse, isLoading } = useQuery({
    queryKey: ['reservations', statusFilter],
    queryFn: () => apiClient.getReservations(statusFilter !== 'all' ? { status: statusFilter } : undefined),
    refetchInterval: 30000,
  });

  const { data: tablesResponse } = useQuery({
    queryKey: ['tables'],
    queryFn: () => apiClient.getTables({ isActive: true }),
  });

  const reservations = reservationsResponse?.data?.reservations || [];
  const tables = tablesResponse?.data?.tables || [];

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiClient.updateReservationStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Reservation status updated');
      setSelectedReservation(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update status');
    },
  });

  const assignTableMutation = useMutation({
    mutationFn: ({ id, tableId }: { id: number; tableId: number }) =>
      apiClient.assignTableToReservation(id, tableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Table assigned successfully');
      setAssignTableDialog(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to assign table');
    },
  });

  const cancelReservationMutation = useMutation({
    mutationFn: (id: number) => apiClient.cancelReservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Reservation cancelled');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to cancel reservation');
    },
  });

  const confirmReservationMutation = useMutation({
    mutationFn: (id: number) => apiClient.confirmReservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Reservation confirmed. Confirmation email sent to customer.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to confirm reservation');
    },
  });

  const rejectReservationMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => apiClient.rejectReservation(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Reservation rejected. Cancellation email sent to customer.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to reject reservation');
    },
  });

  const deleteReservationMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteReservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Reservation deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete reservation');
    },
  });

  const getSourceFromSpecialRequests = (specialRequests?: string) => {
    if (!specialRequests) return null;
    const match = specialRequests.match(/\[SOURCE:([^\]]+)\]/);
    return match ? match[1] : null;
  };

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      'WhatsApp': 'bg-green-100 text-green-700',
      'Phone Call': 'bg-blue-100 text-blue-700',
      'Walk-in': 'bg-purple-100 text-purple-700',
      'Manual Entry': 'bg-gray-100 text-gray-700',
    };
    return colors[source] || 'bg-gray-100 text-gray-700';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-green-100 text-green-800',
      SEATED: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800',
      NO_SHOW: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const stats = {
    total: reservations.length,
    pending: reservations.filter((r: ReservationData) => r.status === 'PENDING').length,
    confirmed: reservations.filter((r: ReservationData) => r.status === 'CONFIRMED').length,
    today: reservations.filter((r: ReservationData) => {
      const today = new Date().toDateString();
      return new Date(r.reservationDate).toDateString() === today;
    }).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Reservations Management</h2>
          <p className="text-gray-600 mt-1">
            Manage table reservations and bookings
            <span className="ml-2 text-blue-600 font-medium">({stats.total} reservations)</span>
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['reservations'] })}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/admin/reservations/create">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Reservation
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Reservations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Today's Reservations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.today}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Reservations Alert */}
      {reservations.filter((r: ReservationData) => r.status === 'PENDING').length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-yellow-800 mb-1">
                  ⚠️ {reservations.filter((r: ReservationData) => r.status === 'PENDING').length} Pending Reservation(s) Require Action
                </h3>
                <p className="text-sm text-yellow-700">
                  Please review and confirm or reject pending reservations below.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setStatusFilter('PENDING')}
                className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
              >
                View Pending
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending ({reservations.filter((r: ReservationData) => r.status === 'PENDING').length})</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="SEATED">Seated</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="NO_SHOW">No Show</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reservations Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">S.No</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Total Guests</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading reservations...
                  </TableCell>
                </TableRow>
              ) : reservations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No reservations found
                  </TableCell>
                </TableRow>
              ) : (
                reservations.map((reservation: ReservationData, index: number) => (
                  <TableRow key={reservation.id}>
                    <TableCell className="text-center font-medium text-gray-600">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          {reservation.guestName}
                        </div>
                        {(() => {
                          const source = getSourceFromSpecialRequests(reservation.specialRequests);
                          const notes = reservation.specialRequests
                            ?.replace(/\[SOURCE:[^\]]+\]\s*\|?\s*/, '')
                            .trim();
                          return (
                            <div className="mt-1 space-y-0.5">
                              {source && (
                                <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${getSourceColor(source)}`}>
                                  {source}
                                </span>
                              )}
                              {notes && (
                                <div className="text-xs text-gray-500">{notes}</div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          {new Date(reservation.reservationDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="w-3 h-3 mr-1" />
                          {reservation.reservationTime}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-2" />
                        {reservation.partySize}
                      </div>
                    </TableCell>
                    <TableCell>
                      {reservation.table ? (
                        <div>
                          <div className="font-medium">{reservation.table.tableNumber}</div>
                          {reservation.table.location && (
                            <div className="text-xs text-gray-500 flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {reservation.table.location}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAssignTableDialog(reservation)}
                        >
                          Assign Table
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge className={getStatusColor(reservation.status)}>
                          {reservation.status}
                        </Badge>
                        {reservation.status === 'CANCELLED' && reservation.specialRequests?.includes('[CANCELLED_BY:CUSTOMER]') && (
                          <div className="text-xs text-gray-500 italic">
                            Cancelled by customer
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                          {reservation.guestEmail}
                        </div>
                        <div className="flex items-center text-gray-500">
                          <Phone className="w-3 h-3 mr-1" />
                          {reservation.guestPhone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {reservation.status === 'PENDING' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => confirmReservationMutation.mutate(reservation.id)}
                                className="text-green-600"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                ✅ Confirm Reservation
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => rejectReservationMutation.mutate({ id: reservation.id })}
                                className="text-red-600"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                ❌ Reject Reservation
                              </DropdownMenuItem>
                            </>
                          )}
                          {reservation.status === 'CONFIRMED' && (
                            <DropdownMenuItem
                              onClick={() => updateStatusMutation.mutate({ id: reservation.id, status: 'SEATED' })}
                            >
                              <Users className="mr-2 h-4 w-4" />
                              Mark as Seated
                            </DropdownMenuItem>
                          )}
                          {reservation.status === 'SEATED' && (
                            <DropdownMenuItem
                              onClick={() => updateStatusMutation.mutate({ id: reservation.id, status: 'COMPLETED' })}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark as Completed
                            </DropdownMenuItem>
                          )}
                          {!['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(reservation.status) && (
                            <DropdownMenuItem
                              onClick={() => cancelReservationMutation.mutate(reservation.id)}
                              className="text-red-600"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel
                            </DropdownMenuItem>
                          )}
                          {!reservation.table && reservation.status === 'PENDING' && (
                            <DropdownMenuItem onClick={() => setAssignTableDialog(reservation)}>
                              <MapPin className="mr-2 h-4 w-4" />
                              Assign Table
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => setDeleteDialog(reservation)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Reservation
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assign Table Dialog */}
      <Dialog open={!!assignTableDialog} onOpenChange={() => setAssignTableDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Table to Reservation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm mb-2">
                <strong>Guest:</strong> {assignTableDialog?.guestName}<br />
                <strong>Party Size:</strong> {assignTableDialog?.partySize}<br />
                <strong>Date:</strong> {assignTableDialog?.reservationDate ? new Date(assignTableDialog.reservationDate).toLocaleDateString() : ''}<br />
                <strong>Time:</strong> {assignTableDialog?.reservationTime}
              </p>
            </div>
            
            <div>
              <Label>Select Table</Label>
              <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a table" />
                </SelectTrigger>
                <SelectContent>
                  {tables
                    .filter((t: any) => t.capacity >= (assignTableDialog?.partySize || 0))
                    .map((table: any) => (
                      <SelectItem key={table.id} value={table.id.toString()}>
                        {table.tableNumber} ({table.capacity} seats) {table.location && `- ${table.location}`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setAssignTableDialog(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (assignTableDialog && selectedTableId) {
                    assignTableMutation.mutate({
                      id: assignTableDialog.id,
                      tableId: parseInt(selectedTableId),
                    });
                  }
                }}
                disabled={!selectedTableId}
              >
                Assign Table
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Reservation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm mb-2">
                Are you sure you want to permanently delete this reservation? This action cannot be undone.
              </p>
              <div className="bg-gray-50 p-3 rounded-md mt-3">
                <p className="text-sm">
                  <strong>Guest:</strong> {deleteDialog?.guestName}<br />
                  <strong>Date:</strong> {deleteDialog?.reservationDate ? new Date(deleteDialog.reservationDate).toLocaleDateString() : ''}<br />
                  <strong>Time:</strong> {deleteDialog?.reservationTime}<br />
                  <strong>Party Size:</strong> {deleteDialog?.partySize}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setDeleteDialog(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deleteDialog) {
                    deleteReservationMutation.mutate(deleteDialog.id);
                    setDeleteDialog(null);
                  }
                }}
                disabled={deleteReservationMutation.isPending}
              >
                {deleteReservationMutation.isPending ? 'Deleting...' : 'Delete Reservation'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}