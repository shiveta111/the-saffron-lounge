import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from './stores/auth-store';
import { ApiError } from './types';
import { env } from './env';

// FIXED: Direct backend API calls - bypass Next.js API routes for better performance and reliability
const API_URL = env.apiUrl;

// Smart URL construction to handle various configurations:
// 1. Already has /api/v1 → use as-is: https://example.com/api/v1
// 2. Ends with /api → append /v1: https://example.com/api → https://example.com/api/v1
// 3. No /api → append /api/v1: https://example.com → https://example.com/api/v1
let BASE_URL: string;
if (API_URL.endsWith('/api/v1')) {
  BASE_URL = API_URL;
} else if (API_URL.endsWith('/api')) {
  BASE_URL = `${API_URL}/v1`;
} else {
  BASE_URL = `${API_URL}/api/v1`;
}

// Note: All API calls now go directly to the backend server
// This ensures consistent behavior and avoids Next.js API route overhead

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to attach token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const { tokens } = useAuthStore.getState();
        if (tokens?.accessToken) {
          config.headers.Authorization = `Bearer ${tokens.accessToken}`;
        }
        // Don't set Content-Type for FormData - let browser set it with boundary
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling and token refresh
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Handle different HTTP status codes
        if (error.response) {
          const { status, data } = error.response;

          // Handle 401 - Unauthorized (token refresh)
          if (status === 401 && !originalRequest._retry) {
            if (this.isRefreshing) {
              // If already refreshing, add to queue
              return new Promise((resolve, reject) => {
                this.failedQueue.push({ resolve, reject });
              }).then(() => {
                return this.client(originalRequest);
              }).catch(err => {
                return Promise.reject(err);
              });
            }

            originalRequest._retry = true;
            this.isRefreshing = true;

            try {
              const { tokens } = useAuthStore.getState();
              if (tokens?.refreshToken) {
                const response = await axios.post(`${BASE_URL}/auth/refresh-token`, {
                  refreshToken: tokens.refreshToken,
                });

                const newTokens = response.data.data;
                useAuthStore.getState().setTokens(newTokens);

                // Process queued requests
                this.processQueue(null, newTokens.accessToken);

                // Retry original request
                originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
                return this.client(originalRequest);
              }
            } catch (refreshError) {
              this.processQueue(refreshError, null);
              useAuthStore.getState().logout();
              window.location.href = '/login';
              return Promise.reject(refreshError);
            } finally {
              this.isRefreshing = false;
            }
          }

          // Handle 409 - Conflict
          if (status === 409) {
            const errorData = data && typeof data === 'object' ? data : {};
            const customError = {
              ...error,
              response: {
                ...error.response,
                data: {
                  success: false,
                  message: (errorData as any)?.message || 'A conflict occurred. This resource may already exist or there\'s a data conflict.',
                  error: 'CONFLICT',
                  ...(errorData as object)
                }
              }
            };
            return Promise.reject(customError);
          }

          // Handle 400 - Bad Request
          if (status === 400) {
            const errorData = data && typeof data === 'object' ? data : {};
            const customError = {
              ...error,
              response: {
                ...error.response,
                data: {
                  success: false,
                  message: (errorData as any)?.message || 'Invalid request data. Please check your input.',
                  error: 'BAD_REQUEST',
                  ...(errorData as object)
                }
              }
            };
            return Promise.reject(customError);
          }

          // Handle 403 - Forbidden
          if (status === 403) {
            const errorData = data && typeof data === 'object' ? data : {};
            const customError = {
              ...error,
              response: {
                ...error.response,
                data: {
                  success: false,
                  message: (errorData as any)?.message || 'You don\'t have permission to perform this action.',
                  error: 'FORBIDDEN',
                  ...(errorData as object)
                }
              }
            };
            return Promise.reject(customError);
          }

          // Handle 404 - Not Found
          if (status === 404) {
            const errorData = data && typeof data === 'object' ? data : {};
            const customError = {
              ...error,
              response: {
                ...error.response,
                data: {
                  success: false,
                  message: (errorData as any)?.message || 'The requested resource was not found.',
                  error: 'NOT_FOUND',
                  ...(errorData as object)
                }
              }
            };
            return Promise.reject(customError);
          }

          // Handle 422 - Unprocessable Entity (validation errors)
          if (status === 422) {
            const errorData = data && typeof data === 'object' ? data : {};
            const customError = {
              ...error,
              response: {
                ...error.response,
                data: {
                  success: false,
                  message: (errorData as any)?.message || 'Validation failed. Please check your input.',
                  error: 'VALIDATION_ERROR',
                  ...(errorData as object)
                }
              }
            };
            return Promise.reject(customError);
          }

          // Handle 500 - Internal Server Error
          if (status === 500) {
            const errorData = data && typeof data === 'object' ? data : {};
            const customError = {
              ...error,
              response: {
                ...error.response,
                data: {
                  success: false,
                  message: 'Server error occurred. Please try again later.',
                  error: 'SERVER_ERROR',
                  ...(errorData as object)
                }
              }
            };
            return Promise.reject(customError);
          }
        }

        // Handle network errors
        if (!error.response) {
          const customError = {
            ...error,
            response: {
              data: {
                success: false,
                message: 'Network error. Please check your connection and try again.',
                error: 'NETWORK_ERROR'
              }
            }
          };
          return Promise.reject(customError);
        }

        return Promise.reject(error);
      }
    );
  }

  private processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token!);
      }
    });

    this.failedQueue = [];
  }

  // Health check endpoint
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      // If /health doesn't exist, try a simple ping to base URL
      try {
        const response = await axios.get(`${BASE_URL.replace('/api/v1', '')}/api/v1/health`, { timeout: 3000 });
        return { success: true, message: 'Server is responding' };
      } catch (err: any) {
        console.error('Backend health check failed:', err.message);
        return { 
          success: false, 
          message: 'Backend server is not responding. Please ensure the backend is running on port 8000.',
          error: err.message 
        };
      }
    }
  }

  // Test connectivity and check available endpoints
  async testConnectivity() {
    const results = {
      health: false,
      login: false,
      register: false,
      otpLogin: false,
      otpRegister: false,
      cors: false,
    };

    try {
      // Test health endpoint
      await this.healthCheck();
      results.health = true;
    } catch (error) {
      console.warn('Health check failed:', error);
    }

    try {
      // Test CORS with a simple OPTIONS request
      await axios.options(`${this.client.defaults.baseURL}/auth/login`, { timeout: 5000 });
      results.cors = true;
    } catch (error) {
      console.warn('CORS check failed:', error);
    }

    try {
      // Test login endpoint availability (without actual login)
      await axios.get(`${this.client.defaults.baseURL}/auth/login`, { timeout: 3000 });
      results.login = true;
    } catch (error: any) {
      // 404 means endpoint doesn't exist, 405 means method not allowed but endpoint exists
      if (error.response?.status === 405) {
        results.login = true;
      }
    }

    try {
      // Test register endpoint availability
      await axios.get(`${this.client.defaults.baseURL}/auth/register`, { timeout: 3000 });
      results.register = true;
    } catch (error: any) {
      if (error.response?.status === 405) {
        results.register = true;
      }
    }

    try {
      // Test OTP login endpoint availability
      await axios.get(`${this.client.defaults.baseURL}/auth/verify-login-otp`, { timeout: 3000 });
      results.otpLogin = true;
    } catch (error: any) {
      if (error.response?.status === 405) {
        results.otpLogin = true;
      }
    }

    try {
      // Test OTP register endpoint availability
      await axios.get(`${this.client.defaults.baseURL}/auth/verify-registration-otp`, { timeout: 3000 });
      results.otpRegister = true;
    } catch (error: any) {
      if (error.response?.status === 405) {
        results.otpRegister = true;
      }
    }

    return results;
  }

  // Auth endpoints - Direct backend calls
  async login(credentials: { email: string; password: string }) {
    const response = await this.client.post('/auth/login', credentials);
    return response.data;
  }

  async initiateRegistration(data: { email: string; password: string; name: string }) {
    const response = await this.client.post('/auth/initiate-registration', data);
    return response.data;
  }

  async completeRegistration(data: { email: string; otp: string }) {
    const response = await this.client.post('/auth/complete-registration', data);
    return response.data;
  }

  async register(data: { email: string; password: string; name: string; role?: string }) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async logout() {
    const response = await this.client.post('/auth/logout');
    return response.data;
  }

  async refreshToken(refreshToken: string) {
    const response = await this.client.post('/auth/refresh-token', { refreshToken });
    return response.data;
  }

  async getProfile(userId?: number) {
    const params = userId ? { userId } : {};
    const response = await this.client.get('/auth/profile', { params });
    return response.data;
  }

  async updateProfile(data: any) {
    const response = await this.client.put('/customer/profile', data);
    return response.data;
  }

  async forgotPassword(email: string) {
    const response = await this.client.post('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(data: { token: string; password: string }) {
    const response = await this.client.post('/auth/reset-password', data);
    return response.data;
  }

  async verifyRegistrationOtp(data: { email: string; otp: string }) {
    const response = await this.client.post('/auth/verify-registration-otp', data);
    return response.data;
  }

  async verifyLoginOtp(data: { email: string; otp: string }) {
    const response = await this.client.post('/auth/verify-login-otp', data);
    return response.data;
  }

  async resendOTP(data: { email: string; purpose?: 'registration' | 'login' }) {
    const response = await this.client.post('/auth/resend-otp', data);
    return response.data;
  }

  // Services endpoints - FIXED: Use Next.js API routes for consistency
  async getServices(params?: { page?: number; limit?: number; category?: string }) {
    const response = await this.client.get('/services', { params });
    return response.data;
  }

  async getService(id: number) {
    const response = await this.client.get(`/services/${id}`);
    return response.data;
  }

  async createService(data: any) {
    const response = await this.client.post('/services', data);
    return response.data;
  }

  async updateService(id: number, data: any) {
    const response = await this.client.put(`/services/${id}`, data);
    return response.data;
  }

  async deleteService(id: number) {
    const response = await this.client.delete(`/services/${id}`);
    return response.data;
  }


  // Product Management endpoints
  async createProduct(data: any) {
    const response = await this.client.post('/products', data);
    return response.data;
  }

  async getProducts(params?: { page?: number; limit?: number; search?: string; category?: string }) {
    try {
      const response = await this.client.get('/products', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching products:', error);
      // Return empty products array on error to prevent UI breakage
      return {
        success: false,
        data: [],
        count: 0,
        error: error.response?.data?.error || error.message || 'Failed to fetch products',
      };
    }
  }

  async getProduct(id: number) {
    const response = await this.client.get(`/products/${id}`);
    return response.data;
  }

  async getProductBySlug(slug: string) {
    const response = await this.client.get(`/products/by-slug/${slug}`);
    return response.data;
  }

  async updateProduct(id: number, data: any) {
    const response = await this.client.put(`/products/${id}`, data);
    return response.data;
  }

  async deleteProduct(id: number) {
    const response = await this.client.delete(`/products/${id}`);
    return response.data;
  }




  // Orders Management endpoints - FIXED: Use Next.js API routes
  async getOrders(params?: { page?: number; limit?: number; status?: string; customerId?: number; startDate?: string; endDate?: string }) {
    const response = await this.client.get('/orders', { params });
    return response.data;
  }

  async getOrder(id: number) {
    const response = await this.client.get(`/orders/${id}`);
    return response.data;
  }

  async updateOrderStatus(id: number, data: { status: string }) {
    const response = await this.client.patch(`/orders/${id}/status`, data);
    return response.data;
  }

  async createOrder(data: any) {
    const response = await this.client.post('/orders', data);
    return response.data;
  }

  // Reservations Management endpoints
  async checkSlotAvailability(params: { date: string; time: string; guests: number }) {
    const response = await this.client.get('/reservations/check-availability', { params });
    return response.data;
  }

  async getAvailableReservationSlots(params: { date: string; partySize: number }) {
    const response = await this.client.get('/reservations/available-slots', { params });
    return response.data;
  }

  async getReservations(params?: { page?: number; limit?: number; status?: string; date_from?: string; date_to?: string }) {
    const response = await this.client.get('/reservations', { params });
    return response.data;
  }

  async getReservation(id: number) {
    const response = await this.client.get(`/reservations/${id}`);
    return response.data;
  }

  async createReservation(data: {
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    partySize: number;
    reservationDate: string;
    reservationTime: string;
    tableId?: number;
    specialRequests?: string;
  }) {
    const response = await this.client.post('/reservations', data);
    return response.data;
  }

  async updateReservation(id: number, data: any) {
    const response = await this.client.put(`/reservations/${id}`, data);
    return response.data;
  }

  async updateReservationStatus(id: number, status: string) {
    const response = await this.client.patch(`/reservations/${id}/status`, { status });
    return response.data;
  }

  async assignTableToReservation(id: number, tableId: number) {
    const response = await this.client.post(`/reservations/${id}/assign-table`, { tableId });
    return response.data;
  }

  async cancelReservation(id: number) {
    const response = await this.client.post(`/reservations/${id}/cancel`);
    return response.data;
  }

  async confirmReservation(id: number) {
    const response = await this.client.post(`/reservations/${id}/confirm`);
    return response.data;
  }

  async rejectReservation(id: number, reason?: string) {
    const response = await this.client.post(`/reservations/${id}/reject`, { reason });
    return response.data;
  }

  async deleteReservation(id: number) {
    const response = await this.client.delete(`/reservations/${id}`);
    return response.data;
  }

  async adminCreateReservation(data: {
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    partySize: number;
    reservationDate: string;
    reservationTime: string;
    source: 'WHATSAPP' | 'PHONE' | 'WALK_IN' | 'MANUAL';
    tableId?: number;
    specialRequests?: string;
  }) {
    const response = await this.client.post('/admin/reservations', data);
    return response.data;
  }

  // Promotions endpoints - FIXED: Use Next.js API routes
  async getPromotions(params?: { isActive?: boolean; status?: string; type?: string; limit?: number; offset?: number }) {
    const response = await this.client.get('/promotions', { params });
    return response.data;
  }

  async getPromotion(id: number) {
    const response = await this.client.get(`/promotions/${id}`);
    return response.data;
  }

  async getActivePromotions() {
    const response = await this.client.get('/promotions/active');
    return response.data;
  }

  async getExpiredPromotions() {
    const response = await this.client.get('/promotions/expired');
    return response.data;
  }

  async createPromotion(data: any) {
    const response = await this.client.post('/promotions', data);
    return response.data;
  }

  async updatePromotion(id: number, data: any) {
    const response = await this.client.put(`/promotions/${id}`, data);
    return response.data;
  }

  async deletePromotion(id: number) {
    const response = await this.client.delete(`/promotions/${id}`);
    return response.data;
  }

  async togglePromotionActive(id: number) {
    const response = await this.client.patch(`/promotions/${id}/toggle`);
    return response.data;
  }

  async uploadPromotionBanner(id: number, file: File) {
    const formData = new FormData();
    formData.append('banner', file);
    const response = await this.client.post(`/promotions/${id}/banner`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async validateCartPromotions(cartId: number) {
    const response = await this.client.post('/promotions/validate-cart', { cartId });
    return response.data;
  }

  async getPromotionSettings() {
    try {
      const response = await this.client.get('/promotions/settings');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching promotion settings:', error);
      // Return default settings on error
      return {
        success: false,
        data: {
          enabled: false,
          globalMessage: '',
        },
        error: error.response?.data?.error || error.message || 'Failed to fetch promotion settings',
      };
    }
  }

  async togglePromotionsGlobally(enabled: boolean) {
    const response = await this.client.patch('/promotions/settings/toggle', { enabled });
    return response.data;
  }

  async validateCouponCode(code: string, orderTotal: number, items?: any[]) {
    const response = await this.client.post('/promotions/validate', {
      code,
      orderTotal,
      items,
    });
    return response.data;
  }



  // Notifications endpoints - FIXED: Use Next.js API routes
  async getNotifications(params?: { page?: number; limit?: number; type?: string; status?: string; booking_id?: number }) {
    const response = await this.client.get('/notifications', { params });
    return response.data;
  }

  async sendNotification(data: any) {
    const response = await this.client.post('/notifications', data);
    return response.data;
  }

  async getNotificationSettings() {
    const response = await this.client.get('/notifications/settings');
    return response.data;
  }

  async updateNotificationSettings(data: any) {
    const response = await this.client.put('/notifications/settings', data);
    return response.data;
  }

  // Blog Management endpoints - FIXED: Use Next.js API routes
  async getBlogPosts(params?: { page?: number; limit?: number; search?: string; category?: string; published_status?: boolean }) {
    const response = await this.client.get('/blog', { params });
    console.log('Fetched blog posts test:', response.data);
    return response.data;

  }

  async getBlogPost(id: number) {
    const response = await this.client.get(`/blog/${id}`);
    return response.data;
  }

  async getBlogPostBySlug(slug: string) {
    try {
      const response = await this.client.get(`/blog/slug/${encodeURIComponent(slug)}`);
      return response.data;
    } catch (error: any) {
      const routeError = error?.response?.data?.error;
      const isMissingSlugRoute =
        error?.response?.status === 404 &&
        typeof routeError === 'string' &&
        routeError.includes('Route not found: GET /api/v1/blog/slug/');

      // Some staging deployments may run an older backend build without /blog/slug/:slug.
      // Fallback to paginated blog listing and resolve by slug client-side.
      if (!isMissingSlugRoute) {
        throw error;
      }

      const normalizedSlug = decodeURIComponent(slug).toLowerCase();
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages && page <= 20) {
        const listResponse = await this.client.get('/blog', {
          params: {
            page,
            limit: 50,
          },
        });

        const data = listResponse.data?.data || {};
        const blogs = Array.isArray(data.blogs) ? data.blogs : [];
        const foundBlog = blogs.find((post: any) =>
          String(post?.slug || '').toLowerCase() === normalizedSlug
        );

        if (foundBlog) {
          return {
            success: true,
            data: {
              blog: foundBlog,
              relatedPosts: [],
            },
          };
        }

        totalPages = Number(data?.pagination?.totalPages) || 1;
        page += 1;
      }

      return {
        success: false,
        error: 'Blog post not found',
      };
    }
  }

  async createBlogPost(data: any) {
    // For FormData, don't set Content-Type header - browser will set it with boundary
    const config = data instanceof FormData ? {
      headers: {
        // Remove Content-Type to let browser set it automatically with boundary
      },
    } : {};
    const response = await this.client.post('/blog', data, config);
    return response.data;
  }

  async updateBlogPost(id: number, data: any) {
    // For FormData, don't set Content-Type header - browser will set it with boundary
    const config = data instanceof FormData ? {
      headers: {
        // Remove Content-Type to let browser set it automatically with boundary
      },
    } : {};
    const response = await this.client.put(`/blog/${id}`, data, config);
    return response.data;
  }

  async deleteBlogPost(id: number) {
    const response = await this.client.delete(`/blog/${id}`);
    return response.data;
  }

  // Blog Categories Management endpoints
  async getBlogCategories(params?: { page?: number; limit?: number; search?: string; isActive?: boolean; sort_by?: string; order?: string }) {
    const response = await this.client.get('/blog-categories', { params });
    return response.data;
  }

  async getBlogCategory(id: number) {
    const response = await this.client.get(`/blog-categories/${id}`);
    return response.data;
  }

  async createBlogCategory(data: any) {
    const response = await this.client.post('/blog-categories', data);
    return response.data;
  }

  async updateBlogCategory(id: number, data: any) {
    const response = await this.client.put(`/blog-categories/${id}`, data);
    return response.data;
  }

  async deleteBlogCategory(id: number) {
    const response = await this.client.delete(`/blog-categories/${id}`);
    return response.data;
  }

  // Team Management endpoints - FIXED: Use Next.js API routes
  async getTeamMembers(params?: { page?: number; limit?: number; sort_by?: string; order?: string }) {
    try {
      const response = await this.client.get('/team', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching team members:', error);
      // Return empty team members array on error to prevent UI breakage
      return {
        success: false,
        data: {
          members: [],
          pagination: {
            total: 0,
            page: params?.page || 1,
            limit: params?.limit || 10,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        },
        error: error.response?.data?.error || error.message || 'Failed to fetch team members',
      };
    }
  }

  async getTeamMember(id: number) {
    const response = await this.client.get(`/team/${id}`);
    return response.data;
  }

  async createTeamMember(data: any) {
    // For FormData, don't set Content-Type header - browser will set it automatically with boundary
    const config = data instanceof FormData ? {
      headers: {
        // Remove Content-Type to let browser set it automatically with boundary
      },
    } : {};
    const response = await this.client.post('/team', data, config);
    return response.data;
  }

  async updateTeamMember(id: number, data: any) {
    // For FormData, don't set Content-Type header - browser will set it automatically with boundary
    const config = data instanceof FormData ? {
      headers: {
        // Remove Content-Type to let browser set it automatically with boundary
      },
    } : {};
    const response = await this.client.put(`/team/${id}`, data, config);
    return response.data;
  }

  async deleteTeamMember(id: number) {
    const response = await this.client.delete(`/team/${id}`);
    return response.data;
  }



  // Testimonials endpoints - FIXED: Use Next.js API routes
  async getTestimonials(params?: { page?: number; limit?: number; status?: string; search?: string }) {
    const response = await this.client.get('/testimonials', { params });
    return response.data;
  }

  async getTestimonial(id: number) {
    const response = await this.client.get(`/testimonials/${id}`);
    return response.data;
  }

  async createTestimonial(data: any) {
    const response = await this.client.post('/testimonials', data);
    return response.data;
  }

  async updateTestimonial(id: number, data: any) {
    const response = await this.client.put(`/testimonials/${id}`, data);
    return response.data;
  }

  async deleteTestimonial(id: number) {
    const response = await this.client.delete(`/testimonials/${id}`);
    return response.data;
  }

  // FAQ endpoints - FIXED: Use Next.js API routes
  async getFAQs(params?: { page?: number; limit?: number; search?: string; category?: string }) {
    const response = await this.client.get('/faqs', { params });
    return response.data;
  }

  async getFAQ(id: number) {
    const response = await this.client.get(`/faqs/${id}`);
    return response.data;
  }

  async createFAQ(data: any) {
    const response = await this.client.post('/faqs', data);
    return response.data;
  }

  async updateFAQ(id: number, data: any) {
    const response = await this.client.put(`/faqs/${id}`, data);
    return response.data;
  }

  async deleteFAQ(id: number) {
    const response = await this.client.delete(`/faqs/${id}`);
    return response.data;
  }

  // Gallery endpoints - FIXED: Use Next.js API routes
  async getGalleryItems(params?: { page?: number; limit?: number; search?: string; category?: string; type?: string }) {
    const response = await this.client.get('/gallery', { params });
    return response.data;
  }

  async getGalleryItem(id: number) {
    const response = await this.client.get(`/gallery/${id}`);
    return response.data;
  }

  async createGalleryItem(data: any) {
    const response = await this.client.post('/gallery', data);
    return response.data;
  }

  async updateGalleryItem(id: number, data: any) {
    const response = await this.client.put(`/gallery/${id}`, data);
    return response.data;
  }

  async deleteGalleryItem(id: number) {
    const response = await this.client.delete(`/gallery/${id}`);
    return response.data;
  }

  // Users endpoints - FIXED: Use Next.js API routes
  async getUsers(params?: { page?: number; limit?: number; search?: string; role?: string; isActive?: boolean }) {
    const response = await this.client.get('/admin/users', { params });
    return response.data;
  }

  async getUser(id: number) {
    const response = await this.client.get(`/users/${id}`);
    return response.data;
  }

  async createUser(data: any) {
    const response = await this.client.post('/users', data);
    return response.data;
  }

  async updateUser(id: number, data: any) {
    const response = await this.client.put(`/users/${id}`, data);
    return response.data;
  }

  async updateUserStatus(id: number, isActive: boolean) {
    const response = await this.client.patch(`/admin/users/${id}/status`, { isActive });
    return response.data;
  }

  async deleteUser(id: number) {
    const response = await this.client.delete(`/users/${id}`);
    return response.data;
  }

  async resendUserCredentials(id: number, password?: string) {
    const response = await this.client.post(`/users/${id}/resend-credentials`, { password });
    return response.data;
  }

  // Admin Dashboard endpoint - FIXED: Use Next.js API route
  async getAdminDashboard() {
    const response = await this.client.get('/admin/dashboard');
    return response.data;
  }

  // Customer Management endpoints - Get all customers with order statistics
  async getCustomers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    orderBehavior?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const response = await this.client.get('/admin/customers', { params });
    return response.data;
  }

  async createCustomer(data: any) {
    const response = await this.client.post('/admin/customers', data);
    return response.data;
  }

  async getCustomerById(id: number) {
    const response = await this.client.get(`/admin/customers/${id}`);
    return response.data;
  }

  async getCustomer(id: number) {
    const response = await this.client.get(`/admin/customers/${id}`);
    return response.data;
  }

  async updateCustomer(id: number, data: {
    name?: string;
    phone?: string;
    address?: string;
    emailVerified?: boolean;
  }) {
    const response = await this.client.put(`/admin/customers/${id}`, data);
    return response.data;
  }

  async updateCustomerStatus(id: number, isActive: boolean) {
    const response = await this.client.patch(`/admin/customers/${id}/status`, { isActive });
    return response.data;
  }

  async deleteCustomer(id: number) {
    const response = await this.client.delete(`/admin/customers/${id}`);
    return response.data;
  }


  // WhatsApp Integration endpoints
  async getWhatsAppConfigStatus() {
    const response = await this.client.get('/whatsapp/config-status');
    return response.data;
  }

  async sendWhatsAppTest(phoneNumber: string) {
    const response = await this.client.post('/whatsapp/test', { phoneNumber });
    return response.data;
  }

  // Menu Management endpoints
  async getMenuItems(params?: { page?: number; limit?: number; category?: string; type?: string; isAvailable?: boolean; search?: string; sortBy?: string; sortOrder?: string }) {
    try {
      const response = await this.client.get('/menus', { params });
      // Backend returns: { success: true, data: [...], count: ... }
      // Return the full response structure for consistent handling
      return response.data;
    } catch (error: any) {
      console.error('Error fetching menu items:', error);
      // Return consistent error structure matching backend response format
      // This allows menuService to handle errors gracefully
      if (error.response?.status === 404) {
        // 404 means endpoint not found - return empty data
        return {
          success: false,
          data: [],
          count: 0,
          error: 'Menu endpoint not found',
        };
      }
      // For other errors, return empty data to prevent UI breakage
      return {
        success: false,
        data: [],
        count: 0,
        error: error.response?.data?.error || error.message || 'Failed to fetch menu items',
      };
    }
  }

  async getMenuItem(id: number) {
    const response = await this.client.get(`/menus/${id}`);
    return response.data;
  }

  async checkProductsAvailability() {
    const response = await this.client.get('/menus/check-products');
    return response.data;
  }

  async createMenu(data: any) {
    const response = await this.client.post('/menus', data);
    return response.data;
  }

  async createMenuItem(data: any) {
    const response = await this.client.post('/menu', data);
    return response.data;
  }

  async updateMenuItem(id: number, data: any) {
    const response = await this.client.put(`/menus/${id}`, data);
    return response.data;
  }

  async deleteMenuItem(id: number, force: boolean = true) {
    const response = await this.client.delete(`/menus/${id}`, {
      params: { force: force ? 'true' : 'false' }
    });
    return response.data;
  }

  // Menu Dynamic Management endpoints
  async updateMenuPrice(id: number, price: number, reason?: string) {
    const response = await this.client.patch(`/menu/${id}/price`, { price, reason });
    return response.data;
  }

  async toggleMenuAvailability(id: number, isAvailable: boolean) {
    const response = await this.client.patch(`/menu/${id}/availability`, { isAvailable });
    return response.data;
  }

  async getMenuPriceHistory(id: number, limit?: number) {
    const response = await this.client.get(`/menu/${id}/price-history`, { params: { limit } });
    return response.data;
  }

  async bulkUpdateMenuPrices(updates: Array<{ menuId: number; newPrice: number; reason?: string }>) {
    const response = await this.client.post('/menu/bulk/update-prices', { updates });
    return response.data;
  }

  // Category Management endpoints
  async getCategories(params?: { page?: number; limit?: number; search?: string; isActive?: boolean }) {
    try {
      const response = await this.client.get('/categories', { params });
      // Backend returns: { success: true, data: { categories: [...], pagination: {...} } }
      // Return the full response structure for consistent handling
      return response.data;
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      // Return consistent error structure matching backend response format
      // This allows menuService to handle errors gracefully
      if (error.response?.status === 404) {
        // 404 means endpoint not found - return empty data
        return {
          success: false,
          data: {
            categories: [],
            pagination: {
              total: 0,
              page: 1,
              limit: 10,
              totalPages: 0,
              hasNext: false,
              hasPrev: false,
            },
          },
          error: 'Categories endpoint not found',
        };
      }
      // For other errors, return empty data to prevent UI breakage
      return {
        success: false,
        data: {
          categories: [],
          pagination: {
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        },
        error: error.response?.data?.error || error.message || 'Failed to fetch categories',
      };
    }
  }

  async getCategory(id: number) {
    const response = await this.client.get(`/categories/${id}`);
    return response.data;
  }

  async createCategory(data: any) {
    const response = await this.client.post('/categories', data);
    return response.data;
  }

  async updateCategory(id: number, data: any) {
    const response = await this.client.put(`/categories/${id}`, data);
    return response.data;
  }

  async deleteCategory(id: number) {
    const response = await this.client.delete(`/categories/${id}`);
    return response.data;
  }

  // Discount Validation endpoint
  async validateDiscount(data: { code: string; orderTotal: number; items?: any[] }) {
    const response = await this.client.post('/promotions/validate', data);
    return response.data;
  }

  // Generic methods
  get instance() {
    return this.client;
  }

  // Payment Management endpoints
  async processPayment(orderId: number, data: { paymentMethod: string; paymentMethodId?: string }) {
    const response = await this.client.post(`/orders/${orderId}/pay`, data);
    return response.data;
  }

  async getPaymentStatus(paymentId: number) {
    const response = await this.client.get(`/payments/${paymentId}`);
    return response.data;
  }

  async getPaymentByOrderId(orderId: number) {
    const response = await this.client.get(`/payments/order/${orderId}`);
    return response.data;
  }

  async updatePaymentStatus(paymentId: number, data: { status: string; transactionId?: string }) {
    const response = await this.client.patch(`/payments/${paymentId}/status`, data);
    return response.data;
  }

  async processRefund(paymentId: number, data: { amount?: number; reason: string }) {
    const response = await this.client.post(`/refunds/${paymentId}`, data);
    return response.data;
  }

  async getAllPayments(params?: { status?: string; method?: string; customerId?: number; limit?: number; offset?: number }) {
    const response = await this.client.get('/payments', { params });
    return response.data;
  }

  // Customer stats endpoint
  async getCustomerStats() {
    const response = await this.client.get('/customers/stats');
    return response.data;
  }

  async getCustomerOrders(customerId: number, params?: { page?: number; limit?: number }) {
    const response = await this.client.get('/orders', { params: { ...params, customerId } });
    return response.data;
  }

  // Admin Orders endpoint
  async getAdminOrders(params?: { page?: number; limit?: number; status?: string; customerId?: number; startDate?: string; endDate?: string; search?: string }) {
    const response = await this.client.get('/admin/orders', { params });
    return response.data;
  }

  // Tables Management endpoints
  async getTables(params?: { page?: number; limit?: number; isActive?: boolean }) {
    const response = await this.client.get('/tables', { params });
    return response.data;
  }

  async getTable(id: number) {
    const response = await this.client.get(`/tables/${id}`);
    return response.data;
  }

  async createTable(data: { tableNumber: string; capacity: number; location?: string; isActive: boolean }) {
    const response = await this.client.post('/tables', data);
    return response.data;
  }

  async updateTable(id: number, data: { tableNumber: string; capacity: number; location?: string; isActive: boolean }) {
    const response = await this.client.put(`/tables/${id}`, data);
    return response.data;
  }

  async deleteTable(id: number) {
    const response = await this.client.delete(`/tables/${id}`);
    return response.data;
  }

  async regenerateQRCode(id: number) {
    const response = await this.client.post(`/tables/${id}/regenerate-qr`);
    return response.data;
  }

  async getTableQRDataURL(id: number) {
    const response = await this.client.get(`/tables/${id}/qr-data-url`);
    return response.data;
  }

  // Delivery Zones Management endpoints
  async getDeliveryZones(params?: { page?: number; limit?: number; isActive?: boolean }) {
    const response = await this.client.get('/delivery/zones', { params });
    return response.data;
  }

  async getDeliveryZone(id: number) {
    const response = await this.client.get(`/delivery/zones/${id}`);
    return response.data;
  }

  async createDeliveryZone(data: any) {
    const response = await this.client.post('/delivery/zones', data);
    return response.data;
  }

  async updateDeliveryZone(id: number, data: any) {
    const response = await this.client.put(`/delivery/zones/${id}`, data);
    return response.data;
  }

  async deleteDeliveryZone(id: number) {
    const response = await this.client.delete(`/delivery/zones/${id}`);
    return response.data;
  }

  async validateDeliveryAddress(data: { postcode: string }) {
    const response = await this.client.post('/delivery/validate-address', data);
    return response.data;
  }

  async calculateDeliveryFee(data: { postcode: string; orderTotal: number }) {
    const response = await this.client.post('/delivery/calculate-fee', data);
    return response.data;
  }

  // Cart Management endpoints
  async getCart() {
    const response = await this.client.get('/cart');
    return response.data;
  }

  async addToCart(data: { productId?: number; menuId?: number; quantity: number }) {
    const response = await this.client.post('/cart/items', data);
    return response.data;
  }

  async addMenuToCart(data: { menuId: number; quantity: number }) {
    const response = await this.client.post('/cart/items', { menuId: data.menuId, quantity: data.quantity });
    return response.data;
  }

  async updateCartItem(itemId: number, quantity: number) {
    const response = await this.client.put(`/cart/items/${itemId}`, { quantity });
    return response.data;
  }

  async removeFromCart(itemId: number) {
    const response = await this.client.delete(`/cart/items/${itemId}`);
    return response.data;
  }

  async clearCart() {
    const response = await this.client.delete('/cart');
    return response.data;
  }

  // Contact Management endpoints
  async getContacts(params?: { page?: number; limit?: number; status?: string; sort_by?: string; order?: string }) {
    const response = await this.client.get('/contact', { params });
    return response.data;
  }

  async getContact(id: number) {
    const response = await this.client.get(`/contact/${id}`);
    return response.data;
  }

  async createContact(data: { name: string; email: string; subject: string; message: string }) {
    const response = await this.client.post('/contact', data);
    return response.data;
  }

  async updateContact(id: number, data: { status: string }) {
    const response = await this.client.put(`/contact/${id}`, data);
    return response.data;
  }

  async deleteContact(id: number) {
    const response = await this.client.delete(`/contact/${id}`);
    return response.data;
  }

  // Media Library endpoints
  async uploadMedia(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.client.post('/media/upload', formData);
    return response.data;
  }

  async getAllMedia(params?: { page?: number; limit?: number; search?: string }) {
    const response = await this.client.get('/media', { params });
    return response.data;
  }

  async deleteMedia(id: number) {
    const response = await this.client.delete(`/media/${id}`);
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
