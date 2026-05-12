'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { apiClient } from '../../lib/api-client';
import { useWebSocket } from '../../lib/hooks/useWebSocket';
import { toast } from 'sonner';
import {
  DashboardHeader,
  RecentOrders,
  UpcomingReservations,
  QuickActions,
  ProfileSection,
} from './components';
import type { UserProfile, Order, Reservation } from '@/lib/types';

export default function DashboardPage() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const { on, off } = useWebSocket();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reservation, setReservation] = useState<Reservation | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // WebSocket listener for real-time order updates
  useEffect(() => {
    const handleOrderStatusUpdate = (data: { orderId: number; status: string; order?: Order }) => {
      console.log('[WebSocket] Order status updated:', data);
      
      setOrders((prevOrders) => {
        const updatedOrders = prevOrders.map((order) => {
          if (order.id === data.orderId) {
            return {
              ...order,
              status: data.status as Order['status'],
              ...(data.order && data.order),
            };
          }
          return order;
        });
        return updatedOrders;
      });
    };

    const handleOrderCreated = (data: { order: Order }) => {
      console.log('[WebSocket] New order created:', data);
      
      setOrders((prevOrders) => [data.order, ...prevOrders]);
      
      toast.success('New order placed', {
        description: `Order #${data.order.id} has been created`,
      });
    };

    // Listen for custom orderCreated event (from checkout page)
    const handleCustomOrderCreated = (event: CustomEvent) => {
      console.log('[Custom Event] Order created:', event.detail);
      // Refresh orders list
      fetchDashboardData();
    };

    // Subscribe to WebSocket events
    on('ORDER_STATUS_UPDATED', handleOrderStatusUpdate);
    on('ORDER_CREATED', handleOrderCreated);
    
    // Subscribe to custom events
    window.addEventListener('orderCreated', handleCustomOrderCreated as EventListener);

    // Cleanup on unmount
    return () => {
      off('ORDER_STATUS_UPDATED', handleOrderStatusUpdate);
      off('ORDER_CREATED', handleOrderCreated);
      window.removeEventListener('orderCreated', handleCustomOrderCreated as EventListener);
    };
  }, [on, off]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // Fetch profile
      const profileResponse = await apiClient.getProfile();
      if (profileResponse.success && profileResponse.data) {
        setProfile(profileResponse.data);
      }

      // Fetch real orders from API
      try {
        const ordersResponse = await apiClient.getOrders({ limit: 10 });
        if (ordersResponse.success && ordersResponse.data?.orders) {
          setOrders(ordersResponse.data.orders);
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error);
        // Set empty array if API fails
        setOrders([]);
      }

      // Fetch real reservations from API
      try {
        const reservationsResponse = await apiClient.getReservations({ limit: 10, status: 'CONFIRMED' });
        if (reservationsResponse.success && reservationsResponse.data?.reservations) {
          const reservations = reservationsResponse.data.reservations;
          // Find the next upcoming reservation
          const now = new Date();
          const upcomingReservation = reservations.find((r: Reservation) => {
            const reservationDate = new Date(r.reservationDate);
            const [hours, minutes] = r.reservationTime.split(':').map(Number);
            reservationDate.setHours(hours, minutes, 0, 0);
            return reservationDate > now && r.status !== 'CANCELLED' && r.status !== 'COMPLETED';
          });
          setReservation(upcomingReservation || null);
        }
      } catch (error) {
        console.error('Failed to fetch reservations:', error);
        setReservation(null);
      }

    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data', {
        description: error.message || 'Please try refreshing the page',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = async (data: any) => {
    try {
      const response = await apiClient.updateProfile(data);
      
      if (response.success) {
        toast.success('Profile updated successfully', {
          description: 'Your changes have been saved',
        });
        await refreshProfile();
        await fetchDashboardData();
      } else {
        throw new Error(response.message || 'Update failed');
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile', {
        description: error.message || 'Please try again',
      });
      throw error;
    }
  };

  const handleViewAllOrders = () => {
    router.push('/orders');
  };

  const handleMakeReservation = () => {
    router.push('/reserve-table');
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <DashboardHeader
        userName={user?.name || 'User'}
        userEmail={user?.email || ''}
        notificationCount={0}
      />

      {/* Quick Actions */}
      <section aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <QuickActions />
      </section>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <section aria-labelledby="recent-orders-heading">
          <h2 id="recent-orders-heading" className="sr-only">Recent Orders</h2>
          <RecentOrders
            orders={orders}
            loading={isLoading}
            onViewAll={handleViewAllOrders}
          />
        </section>

        {/* Upcoming Reservations */}
        <section aria-labelledby="upcoming-reservations-heading">
          <h2 id="upcoming-reservations-heading" className="sr-only">Upcoming Reservations</h2>
          <UpcomingReservations
            reservation={reservation}
            loading={isLoading}
            onMakeReservation={handleMakeReservation}
          />
        </section>
      </div>

      {/* Profile Section */}
      <section aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="sr-only">Profile Information</h2>
        <ProfileSection
          profile={profile}
          onUpdate={handleProfileUpdate}
          loading={isLoading}
        />
      </section>
    </div>
  );
}
