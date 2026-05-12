import { z } from 'zod';

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'SELLER', 'CUSTOMER']),
});

export const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d{6}$/, 'OTP must contain only digits'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().min(6, 'OTP must be 6 digits').max(6, 'OTP must be 6 digits'),
});

// User profile schemas
export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  preferences: z.object({
    theme: z.enum(['light', 'dark']).optional(),
    notifications: z.boolean().optional(),
    language: z.string().optional(),
    currency: z.string().optional(),
  }).optional(),
});

export const createServiceSchema = z.object({
  title: z.string().min(1, 'Service title is required'),
  description: z.string().min(1, 'Description is required'),
  price: z.number().optional(),
  duration: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  isActive: z.boolean().default(true),
  icon: z.string().optional(),
  features: z.array(z.string()).optional(),
});


// Product schemas
export const createProductSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  categoryId: z.number().min(1, 'Category is required'),
  stock: z.number().min(0, 'Stock must be non-negative'),
});

// Admin schemas
export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

// API Response schemas
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['ADMIN', 'SELLER', 'CUSTOMER']),
  emailVerified: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const authResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    user: userSchema,
    accessToken: z.string(),
    refreshToken: z.string(),
  }),
});

export const apiErrorSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  error: z.string().optional(),
});

export const paginatedUsersSchema = z.object({
  success: z.boolean(),
  data: z.object({
    users: z.array(userSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      pages: z.number(),
    }),
  }),
});

export const adminDashboardSchema = z.object({
  success: z.boolean(),
  data: z.object({
    totalUsers: z.number(),
    activeUsers: z.number(),
    totalAdmins: z.number(),
    totalSellers: z.number(),
    totalCustomers: z.number(),
  }),
});

export const userProfileSchema = z.object({
  success: z.boolean(),
  data: z.object({
    user: userSchema,
    preferences: z.object({
      theme: z.string().optional(),
      notifications: z.boolean().optional(),
      language: z.string().optional(),
      currency: z.string().optional(),
    }).optional(),
  }),
});

export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional(),
  price: z.number(),
  categoryId: z.number(),
  stock: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Menu Management Schemas
export const menuItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional(),
  price: z.number(),
  category: z.string(),
  availability: z.boolean(),
  imageUrl: z.string().optional(),
  lastUpdated: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Custom validation for imageUrl that accepts empty strings, relative URLs, and absolute URLs
const imageUrlSchema = z.string().refine(
  (val) => {
    // Allow empty string
    if (!val || val === '') return true;
    // Allow relative URLs (starting with /)
    if (val.startsWith('/')) return true;
    // Allow absolute URLs (http:// or https://)
    if (val.startsWith('http://') || val.startsWith('https://')) {
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    }
    // Allow data URLs
    if (val.startsWith('data:')) return true;
    return false;
  },
  { message: 'Invalid URL format' }
).optional().or(z.literal(''));

export const createMenuItemSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  categoryId: z.number().min(1, 'Category is required'),
  imageUrl: imageUrlSchema,
  isAvailable: z.boolean().optional(),
  productIds: z.array(z.number()).optional(), // Optional array of product IDs to link to menu
});

export const updateMenuItemSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be positive').optional(),
  categoryId: z.number().min(1, 'Category is required').optional(),
  imageUrl: imageUrlSchema.optional(),
  isAvailable: z.boolean().optional(),
});

export const menuCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
});

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
  description: z.string().min(1, 'Description cannot be empty').optional(),
});

// Order Management Schemas
export const orderItemSchema = z.object({
  id: z.number(),
  menuItemId: z.number(),
  menuItem: menuItemSchema,
  quantity: z.number().min(1),
  price: z.number(),
  specialInstructions: z.string().optional(),
});

export const orderSchema = z.object({
  id: z.number(),
  customerId: z.number(),
  customer: z.lazy(() => customerSchema),
  items: z.array(orderItemSchema),
  status: z.enum(['RECEIVED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED']),
  type: z.enum(['PICKUP', 'DELIVERY']),
  total: z.number(),
  tax: z.number(),
  discount: z.number().optional(),
  deliveryAddress: z.string().optional(),
  paymentMethod: z.string(),
  paymentStatus: z.enum(['PENDING', 'PAID', 'REFUNDED']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  createdAt: z.string(),
  updatedAt: z.string(),
  deliveredAt: z.string().optional(),
});

export const orderStatusUpdateSchema = z.object({
  status: z.enum(['RECEIVED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED']),
  notes: z.string().optional(),
});

// Booking Management Schemas
export const timeSlotSchema = z.object({
  id: z.number(),
  time: z.string(),
  capacity: z.number(),
  available: z.boolean(),
  date: z.string(),
});

export const bookingSchema = z.object({
  id: z.number(),
  customerId: z.number(),
  customer: z.lazy(() => customerSchema),
  date: z.string(),
  timeSlot: z.string(),
  type: z.string(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']),
  notes: z.string().optional(),
  orderId: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createBookingSchema = z.object({
  customerId: z.number(),
  date: z.string(),
  timeSlot: z.string(),
  type: z.string().min(1, 'Type is required'),
  notes: z.string().optional(),
  orderId: z.number().optional(),
});

// Promotions Schemas
export const promotionSchema = z.object({
  id: z.number(),
  code: z.string(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.number(),
  expiryDate: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'EXPIRED']),
  usageLimit: z.number().optional(),
  usageCount: z.number(),
  createdBy: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createPromotionSchema = z.object({
  code: z.string().min(3, 'Code must be at least 3 characters'),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.number().min(0, 'Discount value must be positive'),
  expiryDate: z.string(),
  usageLimit: z.number().min(1).optional(),
});

// Customer Management Schemas
export const customerSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  phone: z.string().optional(),
  totalOrders: z.number(),
  lastOrderDate: z.string().optional(),
  loyaltyPoints: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  tags: z.array(z.string()).optional(),
});

export const customerOrderSchema = z.object({
  id: z.number(),
  orderId: z.number(),
  date: z.string(),
  total: z.number(),
  status: z.enum(['RECEIVED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED']),
  items: z.array(orderItemSchema),
});

export const createCustomerSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Notifications Schemas
export const notificationSchema = z.object({
  id: z.number(),
  type: z.enum(['EMAIL', 'SMS', 'WHATSAPP']),
  recipient: z.string(),
  subject: z.string().optional(),
  message: z.string(),
  status: z.enum(['PENDING', 'SENT', 'DELIVERED', 'FAILED']),
  sentAt: z.string().optional(),
  deliveredAt: z.string().optional(),
  failedAt: z.string().optional(),
  errorMessage: z.string().optional(),
  template: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  createdAt: z.string(),
});

export const notificationSettingsSchema = z.object({
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  whatsappEnabled: z.boolean(),
  orderNotifications: z.boolean(),
  bookingNotifications: z.boolean(),
  promotionalNotifications: z.boolean(),
});

export const sendNotificationSchema = z.object({
  type: z.enum(['EMAIL', 'SMS', 'WHATSAPP']),
  recipient: z.string(),
  subject: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
  template: z.string().optional(),
});

// Blog Management Schemas
export const blogPostSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string(),
  excerpt: z.string().optional(),
  category: z.string(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  featuredImage: z.string().optional(),
  tags: z.array(z.string()),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.array(z.string()).optional(),
  authorId: z.number(),
  author: userSchema,
  publishedAt: z.string().optional(),
  viewCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createBlogCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().max(20).optional(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export const createBlogPostSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  excerpt: z.string().optional(),
  category: z.string().optional(),
  category_id: z.number().int().optional().nullable(),
  tags: z.array(z.string()),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.array(z.string()).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  publishedAt: z.string().optional(),
});

export const blogCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
});

// Team Management Schemas
export const teamMemberSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.string(),
  bio: z.string().optional(),
  photoUrl: z.string().optional(),
  socialLinks: z.object({
    linkedin: z.string().optional(),
    twitter: z.string().optional(),
    github: z.string().optional(),
    website: z.string().optional(),
  }).optional(),
  isActive: z.boolean(),
  hireDate: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createTeamMemberSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  role: z.string().min(1, 'Role is required'),
  bio: z.string().optional(),
  social_links: z.array(z.object({
    platform: z.string(),
    url: z.string().url(),
  })).optional(),
  hire_date: z.string().optional(),
}).transform((data) => ({
  ...data,
  social_links: data.social_links || [],
}));

// Testimonials Schemas
export const testimonialSchema = z.object({
  id: z.number(),
  clientName: z.string(),
  rating: z.number().min(1).max(5),
  feedback: z.string(),
  photoUrl: z.string().optional(),
  source: z.string(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  approvedBy: z.number().optional(),
  approvedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createTestimonialSchema = z.object({
  clientName: z.string().min(2, 'Client name must be at least 2 characters'),
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  feedback: z.string().min(10, 'Feedback must be at least 10 characters'),
  source: z.string().min(1, 'Source is required'),
});


// Pagination and Response Schemas
export const paginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) => z.object({
  data: z.array(itemSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pages: z.number(),
  }),
});

export const apiResponseSchema = <T extends z.ZodType>(dataSchema: T) => z.object({
  success: z.boolean(),
  message: z.string(),
  data: dataSchema,
});

// Dashboard Analytics Schemas
export const dashboardStatsSchema = z.object({
  totalUsers: z.number(),
  activeUsers: z.number(),
  totalOrders: z.number(),
  totalRevenue: z.number(),
  pendingOrders: z.number(),
  todayOrders: z.number(),
  totalBookings: z.number(),
  pendingBookings: z.number(),
  totalMenuItems: z.number(),
  activePromotions: z.number(),
  totalBlogPosts: z.number(),
  publishedBlogPosts: z.number(),
});

// Audit Log Schemas
export const auditLogSchema = z.object({
  id: z.number(),
  userId: z.number(),
  user: userSchema,
  action: z.string(),
  resource: z.string(),
  resourceId: z.number().optional(),
  oldValues: z.record(z.string(), z.unknown()).optional(),
  newValues: z.record(z.string(), z.unknown()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.string(),
});

// Type exports
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type VerifyOtpFormData = z.infer<typeof verifyOtpSchema>;
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
export type CreateProductFormData = z.infer<typeof createProductSchema>;
export type UpdateUserStatusFormData = z.infer<typeof updateUserStatusSchema>;

export type User = z.infer<typeof userSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type PaginatedUsers = z.infer<typeof paginatedUsersSchema>;
export type AdminDashboard = z.infer<typeof adminDashboardSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type Product = z.infer<typeof productSchema>;

// New type exports for admin modules
export type MenuItem = z.infer<typeof menuItemSchema>;
export type CreateMenuItemData = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemData = z.infer<typeof updateMenuItemSchema>;
export type CreateCategoryData = z.infer<typeof createCategorySchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type OrderStatusUpdate = z.infer<typeof orderStatusUpdateSchema>;
export type Booking = z.infer<typeof bookingSchema>;
export type CreateBookingData = z.infer<typeof createBookingSchema>;
export type TimeSlot = z.infer<typeof timeSlotSchema>;
export type Promotion = z.infer<typeof promotionSchema>;
export type CreatePromotionData = z.infer<typeof createPromotionSchema>;
export type Customer = z.infer<typeof customerSchema>;
export type CreateCustomerData = z.infer<typeof createCustomerSchema>;
export type CustomerOrder = z.infer<typeof customerOrderSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type SendNotificationData = z.infer<typeof sendNotificationSchema>;
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export type BlogPost = z.infer<typeof blogPostSchema>;
export type CreateBlogPostData = z.infer<typeof createBlogPostSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type CreateTeamMemberData = z.infer<typeof createTeamMemberSchema>;
export type Testimonial = z.infer<typeof testimonialSchema>;
export type CreateTestimonialData = z.infer<typeof createTestimonialSchema>;
export type DashboardStats = z.infer<typeof dashboardStatsSchema>;
export type AuditLog = z.infer<typeof auditLogSchema>;

// FAQ Schemas
export const faqSchema = z.object({
  id: z.number(),
  question: z.string(),
  answer: z.string(),
  category: z.string(),
  tags: z.array(z.string()).optional(),
  viewCount: z.number().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const createFAQSchema = z.object({
  question: z.string().min(5, 'Question must be at least 5 characters'),
  answer: z.string().min(10, 'Answer must be at least 10 characters'),
  category: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()).optional(),
});

export type FAQ = z.infer<typeof faqSchema>;
export type CreateFAQData = z.infer<typeof createFAQSchema>;

// Enhanced Product Schemas (with menu linkage)
export const createProductWithMenuSchema = z.object({
  menuId: z.number().min(1, 'Menu item is required'),
  name: z.string().min(2, 'Product name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  price: z.number().min(0, 'Price must be positive').max(999999.99),
  category: z.string().min(2).max(50),
  categoryId: z.number().min(1).optional(),
  type: z.enum(['Vegetarian', 'Non-Vegetarian', 'All', 'Vegan']).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  availability: z.number().int().min(0, 'Availability must be non-negative'),
  sku: z.string().max(50).optional(),
  dietaryNotes: z.array(z.string()).optional(),
  allergenCodes: z.array(z.number().int()).optional(),
  isAvailable: z.boolean().optional().default(true),
});

export const updateProductWithMenuSchema = z.object({
  menuId: z.number().min(1).optional(),
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  price: z.number().min(0).max(999999.99).optional(),
  category: z.string().min(2).max(50).optional(),
  categoryId: z.number().min(1).optional(),
  type: z.enum(['Vegetarian', 'Non-Vegetarian', 'All', 'Vegan']).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  availability: z.number().int().min(0).optional(),
  sku: z.string().max(50).optional(),
  dietaryNotes: z.array(z.string()).optional(),
  allergenCodes: z.array(z.number().int()).optional(),
  isAvailable: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// Cart Schemas
export const addToCartSchema = z.object({
  productId: z.number().min(1, 'Product is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(99, 'Quantity cannot exceed 99'),
  notes: z.string().max(500).optional(),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(99, 'Quantity cannot exceed 99'),
  notes: z.string().max(500).optional(),
});

// Order Schemas (Enhanced)
export const createOrderSchema = z.object({
  orderType: z.enum(['DINE_IN', 'PICKUP', 'DELIVERY', 'ONLINE']),
  tableId: z.number().min(1).optional(),
  deliveryAddress: z.string().max(500).optional(),
  deliveryPostcode: z.string().regex(/^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i, 'Invalid UK postcode').optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'STRIPE', 'PAYPAL']),
  notes: z.string().max(1000).optional(),
  discountCode: z.string().max(50).optional(),
}).refine((data) => {
  if (data.orderType === 'DELIVERY') {
    return !!data.deliveryAddress && !!data.deliveryPostcode;
  }
  return true;
}, {
  message: 'Delivery address and postcode are required for delivery orders',
  path: ['deliveryAddress'],
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'PREPARING', 'READY', 'DELIVERED', 'COMPLETED', 'CANCELLED']),
});

// Category Schemas (Enhanced)
export const createCategoryEnhancedSchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').max(50),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  type: z.string().max(50).optional(),
  sortOrder: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const updateCategoryEnhancedSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  type: z.string().max(50).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// Customer Schemas (Enhanced)
export const updateCustomerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().regex(/^(\+44|0)[1-9]\d{9,10}$/, 'Invalid UK phone number').optional(),
  address: z.string().max(500).optional(),
});

export const updateCustomerStatusSchema = z.object({
  isActive: z.boolean(),
});

// Reservation Schemas (Enhanced)
export const createReservationSchema = z.object({
  guestName: z.string().min(2, 'Guest name must be at least 2 characters').max(100),
  guestEmail: z.string().email('Invalid email address'),
  guestPhone: z.string().regex(/^(\+44|0)[1-9]\d{9,10}$/, 'Invalid UK phone number'),
  partySize: z.number().int().min(1, 'Party size must be at least 1').max(20, 'Party size cannot exceed 20'),
  reservationDate: z.string().refine((date) => new Date(date) > new Date(), {
    message: 'Reservation date must be in the future',
  }),
  reservationTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  specialRequests: z.string().max(1000).optional(),
});

export const updateReservationStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED']),
});

export const assignTableSchema = z.object({
  tableId: z.number().min(1, 'Table is required'),
});

// Table Schemas
export const createTableSchema = z.object({
  tableNumber: z.string().min(1, 'Table number is required').max(20),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(20, 'Capacity cannot exceed 20'),
  location: z.string().max(100).optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateTableSchema = z.object({
  tableNumber: z.string().min(1).max(20).optional(),
  capacity: z.number().int().min(1).max(20).optional(),
  location: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// Delivery Zone Schemas
export const createDeliveryZoneSchema = z.object({
  name: z.string().min(2, 'Zone name must be at least 2 characters').max(100),
  postcodes: z.string().min(1, 'At least one postcode is required'),
  deliveryFee: z.number().min(0, 'Delivery fee must be non-negative').max(999.99),
  minOrderValue: z.number().min(0).max(999999.99).optional().default(0),
  freeDeliveryThreshold: z.number().min(0).max(999999.99).optional(),
  estimatedTime: z.number().int().min(0, 'Estimated time must be non-negative'),
  isActive: z.boolean().optional().default(true),
});

export const updateDeliveryZoneSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  postcodes: z.string().optional(),
  deliveryFee: z.number().min(0).max(999.99).optional(),
  minOrderValue: z.number().min(0).max(999999.99).optional(),
  freeDeliveryThreshold: z.number().min(0).max(999999.99).optional(),
  estimatedTime: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const validateAddressSchema = z.object({
  postcode: z.string().regex(/^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i, 'Invalid UK postcode'),
});

// Promotion Schemas (Enhanced)
export const createPromotionEnhancedSchema = z.object({
  code: z.string().min(3, 'Code must be at least 3 characters').max(50).toUpperCase(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.number().min(0, 'Discount value must be positive').max(999999.99),
  validFrom: z.string().refine((date) => new Date(date) >= new Date(), {
    message: 'Valid from date must be today or in the future',
  }),
  validTo: z.string(),
  usageLimit: z.number().int().min(0).optional(),
  userLimit: z.number().int().min(0).optional(),
  minOrderValue: z.number().min(0).max(999999.99).optional(),
  maxDiscount: z.number().min(0).max(999999.99).optional(),
  firstOrderOnly: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
}).refine((data) => new Date(data.validTo) > new Date(data.validFrom), {
  message: 'Valid to date must be after valid from date',
  path: ['validTo'],
});

export const updatePromotionEnhancedSchema = z.object({
  code: z.string().min(3).max(50).toUpperCase().optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
  discountValue: z.number().min(0).max(999999.99).optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  usageLimit: z.number().int().min(0).optional(),
  userLimit: z.number().int().min(0).optional(),
  minOrderValue: z.number().min(0).max(999999.99).optional(),
  maxDiscount: z.number().min(0).max(999999.99).optional(),
  firstOrderOnly: z.boolean().optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const validatePromotionCodeSchema = z.object({
  code: z.string().min(1, 'Promotion code is required'),
  orderTotal: z.number().min(0),
});

// Payment Schemas
export const createPaymentSchema = z.object({
  orderId: z.number().min(1, 'Order is required'),
  amount: z.number().min(0, 'Amount must be positive').max(999999.99),
  method: z.enum(['CASH', 'CARD', 'STRIPE', 'PAYPAL']),
});

export const updatePaymentStatusSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']),
});

// Type exports for new schemas
export type CreateProductWithMenuData = z.infer<typeof createProductWithMenuSchema>;
export type UpdateProductWithMenuData = z.infer<typeof updateProductWithMenuSchema>;
export type AddToCartData = z.infer<typeof addToCartSchema>;
export type UpdateCartItemData = z.infer<typeof updateCartItemSchema>;
export type CreateOrderData = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusData = z.infer<typeof updateOrderStatusSchema>;
export type CreateCategoryEnhancedData = z.infer<typeof createCategoryEnhancedSchema>;
export type UpdateCategoryEnhancedData = z.infer<typeof updateCategoryEnhancedSchema>;
export type UpdateCustomerData = z.infer<typeof updateCustomerSchema>;
export type UpdateCustomerStatusData = z.infer<typeof updateCustomerStatusSchema>;
export type CreateReservationData = z.infer<typeof createReservationSchema>;
export type UpdateReservationStatusData = z.infer<typeof updateReservationStatusSchema>;
export type AssignTableData = z.infer<typeof assignTableSchema>;
export type CreateTableData = z.infer<typeof createTableSchema>;
export type UpdateTableData = z.infer<typeof updateTableSchema>;
export type CreateDeliveryZoneData = z.infer<typeof createDeliveryZoneSchema>;
export type UpdateDeliveryZoneData = z.infer<typeof updateDeliveryZoneSchema>;
export type ValidateAddressData = z.infer<typeof validateAddressSchema>;
export type CreatePromotionEnhancedData = z.infer<typeof createPromotionEnhancedSchema>;
export type UpdatePromotionEnhancedData = z.infer<typeof updatePromotionEnhancedSchema>;
export type ValidatePromotionCodeData = z.infer<typeof validatePromotionCodeSchema>;
export type CreatePaymentData = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentStatusData = z.infer<typeof updatePaymentStatusSchema>;
