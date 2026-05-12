import { QueryClient } from '@tanstack/react-query';

/**
 * QueryClient configuration for Next.js 15 + React 19 compatibility.
 * 
 * Note: QueryClient instances should be created inside client components
 * using useState to avoid hydration mismatches. This config can be reused
 * when creating QueryClient instances.
 * 
 * Example:
 * const [queryClient] = useState(() => new QueryClient(getQueryClientConfig()));
 */
export function getQueryClientConfig(): ConstructorParameters<typeof QueryClient>[0] {
  return {
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 10, // 10 minutes
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors
          if (error?.response?.status >= 400 && error?.response?.status < 500) {
            return false;
          }
          return failureCount < 3;
        },
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: false,
        onError: (error: any) => {
          console.error('Mutation error:', error);
        },
      },
    },
  };
}

// Query keys for consistent caching
export const queryKeys = {
  categories: ['categories'] as const,
  category: (id: number) => ['categories', id] as const,
  menuItems: ['menuItems'] as const,
  menuItem: (id: number) => ['menuItems', id] as const,
  customers: ['customers'] as const,
  customer: (id: number) => ['customers', id] as const,
  customerOrders: (customerId: number) => ['customers', customerId, 'orders'] as const,
  users: ['users'] as const,
  user: (id: number) => ['users', id] as const,
  bookings: ['bookings'] as const,
  booking: (id: number) => ['bookings', id] as const,
  events: ['events'] as const,
  event: (id: number) => ['events', id] as const,
  promotions: ['promotions'] as const,
  promotion: (id: number) => ['promotions', id] as const,
  testimonials: ['testimonials'] as const,
  testimonial: (id: number) => ['testimonials', id] as const,
  blogPosts: ['blogPosts'] as const,
  blogPost: (id: number) => ['blogPosts', id] as const,
  teamMembers: ['teamMembers'] as const,
  teamMember: (id: number) => ['teamMembers', id] as const,
  orders: ['orders'] as const,
  order: (id: number) => ['orders', id] as const,
  notifications: ['notifications'] as const,
  notification: (id: number) => ['notifications', id] as const,
  dashboard: ['dashboard'] as const,
};