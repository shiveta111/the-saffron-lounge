export type UserRole = 'ADMIN' | 'SELLER' | 'CUSTOMER';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

export interface ApiError {
  success: boolean;
  message: string;
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface UserProfile {
  user: User;
  preferences?: {
    theme?: 'light' | 'dark';
    notifications?: boolean;
    language?: string;
    currency?: string;
  };
}

export interface AdminDashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalAdmins: number;
  totalSellers: number;
  totalCustomers: number;
}

export interface AdminDashboard {
  success: boolean;
  data: AdminDashboardStats;
}

export interface PaginatedUsers {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  categoryId: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductData {
  name: string;
  description?: string;
  price: number;
  categoryId: number;
  stock?: number;
}

// Menu Management Types
export interface MenuItem {
  id: number;
  name: string;
  description?: string;
  price: number;
  categoryId: number; // Changed from category: string
  category?: MenuCategory; // Optional populated category object
  imageUrl?: string;
  isAvailable: boolean;
  inventory?: {
    quantity: number;
    minThreshold: number;
    supplier?: string;
    lastRestocked?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MenuItemResponse {
  id: number;
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  isAvailable: boolean;
  inventory?: {
    quantity: number;
    minThreshold: number;
    supplier?: string;
    lastRestocked?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateMenuItemData {
  name: string;
  description?: string;
  price: number;
  categoryId: number; // Changed from category: string
  imageUrl?: string;
  isAvailable?: boolean;
  productIds?: number[]; // Optional array of product IDs to link to this menu
}

export interface ProductsAvailabilityCheck {
  hasProducts: boolean;
  productCount: number;
  message: string;
}

export interface MenuCategory {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
}

// Order Management Types
export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';

export interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  price: number;
  specialRequests?: string;
  product?: {
    id: number;
    name: string;
    price: number;
  };
}

export interface Order {
  id: number;
  customerId: number;
  status: OrderStatus;
  total: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: number;
    email: string;
    name: string;
  };
  items: OrderItem[];
  payment?: {
    id: number;
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
    method: 'STRIPE' | 'PAYPAL' | 'CASH' | 'CARD';
  };
}

export interface CreateOrderData {
  items: Array<{
    productId: number;
    quantity: number;
    specialRequests?: string;
  }>;
  notes?: string;
}

export interface OrderStatusUpdate {
  status: OrderStatus;
}

// Booking Management Types
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface TimeSlot {
  id: number;
  time: string;
  capacity: number;
  available: boolean;
}

export interface Booking {
  id: number;
  customerId: number;
  customer: {
    id: number;
    name: string;
    email: string;
  };
  date: string;
  timeSlot: string;
  type: string;
  status: BookingStatus;
  notes?: string;
  orderId?: number;
  createdAt: string;
  updatedAt: string;
}

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'SEATED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface Reservation {
  id: number;
  userId: number;
  tableId?: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  partySize: number;
  reservationDate: string;
  reservationTime: string;
  status: ReservationStatus;
  specialRequests?: string;
  createdAt: string;
  updatedAt: string;
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

export interface CreateBookingData {
  customerId: number;
  date: string;
  timeSlot: string;
  type: string;
  notes?: string;
  orderId?: number;
}

// Promotions & Discounts Types
export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface Promotion {
  id: number;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  expiryDate: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  usageLimit?: number;
  usageCount: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromotionData {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  expiryDate: string;
  usageLimit?: number;
}

// Customer Management Types
export interface Customer {
  id: number;
  email: string;
  name: string;
  phone?: string;
  totalOrders: number;
  lastOrderDate?: string;
  loyaltyPoints: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export interface CustomerOrder {
  id: number;
  orderId: number;
  date: string;
  total: number;
  status: OrderStatus;
  items: OrderItem[];
}

export interface CreateCustomerData {
  email: string;
  name: string;
  phone?: string;
  tags?: string[];
}

// Notifications Types
export type NotificationType = 'EMAIL' | 'SMS' | 'WHATSAPP';
export type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';

export interface Notification {
  id: number;
  type: NotificationType;
  recipient: string;
  subject?: string;
  message: string;
  status: NotificationStatus;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  errorMessage?: string;
  template?: string;
  attachments?: string[];
  createdAt: string;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  orderNotifications: boolean;
  bookingNotifications: boolean;
  promotionalNotifications: boolean;
}

export interface SendNotificationData {
  type: NotificationType;
  recipient: string;
  subject?: string;
  message: string;
  template?: string;
  attachments?: File[];
}

// Blog Management Types
export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  isActive: boolean;
  sortOrder: number;
  blogCount?: number;
  created_at: string;
  updated_at: string;
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  featured_image?: string;
  tags: string[];
  published_status: boolean;
  meta_title?: string;
  meta_description?: string;
  category_id?: number;
  category?: BlogCategory;
  author: {
    id: number;
    username: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateBlogPostData {
  title: string;
  slug: string;
  content: string;
  featured_image?: string;
  tags: string[];
  published_status?: boolean;
  meta_title?: string;
  meta_description?: string;
  author_id?: number;
  category_id?: number;
}

export interface CreateBlogCategoryData {
  name: string;
  slug?: string;
  description?: string;
  color?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface BlogCategory {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
}

// Team Management Types
export interface TeamMember {
  id: number;
  name: string;
  role: string;
  bio?: string;
  photo?: string;
  social_links: Array<{
    platform: string;
    url: string;
  }>;
  email: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTeamMemberData {
  name: string;
  role: string;
  bio?: string;
  photo?: string;
  social_links?: Array<{
    platform: string;
    url: string;
  }>;
  email: string;
  phone?: string;
}

// Testimonials Types
export interface Testimonial {
  id: number;
  clientName: string;
  rating: number;
  feedback: string;
  photoUrl?: string;
  source: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: number;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestimonialData {
  clientName: string;
  rating: number;
  feedback: string;
  photo?: File;
  source: string;
}


// Pagination and Response Types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// Dashboard Analytics Types
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  todayOrders: number;
  totalBookings: number;
  pendingBookings: number;
  totalMenuItems: number;
  activePromotions: number;
  totalBlogPosts: number;
  publishedBlogPosts: number;
}

// FAQ Management Types
export interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  tags?: string[];
  viewCount?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateFAQData {
  question: string;
  answer: string;
  category: string;
  tags?: string[];
}

// Audit Log Types
export interface AuditLog {
  id: number;
  userId: number;
  user: User;
  action: string;
  resource: string;
  resourceId?: number;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// Contact Management Types
export interface Contact {
  id: number;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'PENDING' | 'RESPONDED' | 'CLOSED';
  respondedBy?: number;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

// Event Management Types
export interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
  registeredCount: number;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventData {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
}

// Gallery Management Types
export interface GalleryItem {
  id: number;
  title: string;
  description?: string;
  imageUrl: string;
  category: string;
  tags?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGalleryItemData {
  title: string;
  description?: string;
  imageUrl: string;
  category: string;
  tags?: string[];
  isActive?: boolean;
}

// Inventory Management Types
export interface InventoryItem {
  id: number;
  name: string;
  description?: string;
  quantity: number;
  minThreshold: number;
  unit: string;
  supplier?: string;
  lastRestocked?: string;
  location?: string;
  clientName: string;
  rating: number;
  feedback: string;
  photoUrl?: string;
  source: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: number;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestimonialData {
  clientName: string;
  rating: number;
  feedback: string;
  photo?: File;
  source: string;
}


// Pagination and Response Types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// Dashboard Analytics Types
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  todayOrders: number;
  totalBookings: number;
  pendingBookings: number;
  totalMenuItems: number;
  activePromotions: number;
  totalBlogPosts: number;
  publishedBlogPosts: number;
}

// FAQ Management Types
export interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  tags?: string[];
  viewCount?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateFAQData {
  question: string;
  answer: string;
  category: string;
  tags?: string[];
}

// Audit Log Types
export interface AuditLog {
  id: number;
  userId: number;
  user: User;
  action: string;
  resource: string;
  resourceId?: number;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// Contact Management Types
export interface Contact {
  id: number;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'PENDING' | 'RESPONDED' | 'CLOSED';
  respondedBy?: number;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

// Event Management Types
export interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
  registeredCount: number;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventData {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
}

// Gallery Management Types
export interface GalleryItem {
  id: number;
  title: string;
  description?: string;
  imageUrl: string;
  category: string;
  tags?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGalleryItemData {
  title: string;
  description?: string;
  imageUrl: string;
  category: string;
  tags?: string[];
  isActive?: boolean;
}

// Inventory Management Types
export interface InventoryItem {
  id: number;
  name: string;
  description?: string;
  quantity: number;
  minThreshold: number;
  unit: string;
  supplier?: string;
  lastRestocked?: string;
  location?: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryData {
  name: string;
  description?: string;
  quantity: number;
  minThreshold: number;
  unit: string;
  supplier?: string;
  location?: string;
  category: string;
}

// Services Management Types
export interface Service {
  id: number;
  title: string;
  description: string;
  price?: number;
  duration?: string;
  category: string;
  isActive: boolean;
  icon?: string;
  features?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceData {
  title: string;
  description: string;
  price?: number;
  duration?: string;
  category: string;
  isActive?: boolean;
  icon?: string;
  features?: string[];
}

// Subscribers Management Types
export interface Subscriber {
  id: number;
  email: string;
  name?: string;
  status: 'ACTIVE' | 'UNSUBSCRIBED' | 'BOUNCED';
  subscribedAt: string;
  unsubscribedAt?: string;
  source?: string;
  tags?: string[];
}

export interface CreateSubscriberData {
  email: string;
  name?: string;
  source?: string;
  tags?: string[];
}