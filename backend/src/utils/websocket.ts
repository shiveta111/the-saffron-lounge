import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { dbManager } from './database';
import { cacheManager, cacheKeys } from './cache';
import { env } from '../config/env';

interface ConnectedClient {
  id: string;
  userId?: number | undefined;
  role?: string | undefined;
  lastActivity: Date;
}

class WebSocketManager {
  private io: SocketIOServer | null = null;
  private connectedClients: Map<string, ConnectedClient> = new Map();

  /**
   * Initialize WebSocket server
   */
  initialize(server: HTTPServer): void {
    // Parse frontend URLs for WebSocket CORS
    const parseFrontendUrls = (frontendUrl: string): string | string[] => {
      const urls = frontendUrl
        .split(',')
        .map(url => url.trim().replace(/^["']|["']$/g, ''))
        .filter(url => url.length > 0);
      return urls.length === 1 ? (urls[0] || '*') : urls;
    };

    const wsOrigin = env.urls.frontend ? parseFrontendUrls(env.urls.frontend) : '*';
    
    this.io = new SocketIOServer(server, {
      cors: {
        origin: wsOrigin,
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupEventHandlers();
    this.startPeriodicCleanup();
    console.log('🔌 WebSocket server initialized');
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      // Handle authentication
      socket.on('authenticate', (data: { token?: string; userId?: number; role?: string }) => {
        this.handleAuthentication(socket, data);
      });

      // Handle real-time data requests
      socket.on('subscribe:admin', () => this.handleAdminSubscription(socket));
      socket.on('subscribe:dashboard', () => this.handleDashboardSubscription(socket));
      socket.on('subscribe:users', () => this.handleUsersSubscription(socket));
      socket.on('subscribe:customers', () => this.handleCustomersSubscription(socket));
      socket.on('subscribe:orders', () => this.handleOrdersSubscription(socket));
      socket.on('subscribe:inventory', () => this.handleInventorySubscription(socket));
      socket.on('subscribe:cms', () => this.handleCMSSubscription(socket));
      socket.on('subscribe:blogs', () => this.handleBlogsSubscription(socket));
      socket.on('subscribe:testimonials', () => this.handleTestimonialsSubscription(socket));
      socket.on('subscribe:contacts', () => this.handleContactsSubscription(socket));
      socket.on('subscribe:events', () => this.handleEventsSubscription(socket));
      socket.on('subscribe:menu', () => this.handleMenuSubscription(socket));
      socket.on('subscribe:products', () => this.handleProductsSubscription(socket));
      socket.on('subscribe:categories', () => this.handleCategoriesSubscription(socket));
      socket.on('subscribe:reservations', () => this.handleReservationsSubscription(socket));
      socket.on('subscribe:customer-reservations', () => this.handleCustomerReservationsSubscription(socket));
      socket.on('subscribe:tables', () => this.handleTablesSubscription(socket));
      socket.on('subscribe:delivery-zones', () => this.handleDeliveryZonesSubscription(socket));
      socket.on('subscribe:promotions', () => this.handlePromotionsSubscription(socket));

      // Handle data updates
      socket.on('user:updated', (data: any) => this.handleUserUpdate(socket, data));
      socket.on('order:updated', (data: any) => this.handleOrderUpdate(socket, data));
      socket.on('inventory:updated', (data: any) => this.handleInventoryUpdate(socket, data));
      socket.on('blog:updated', (data: any) => this.handleBlogUpdate(socket, data));
      socket.on('testimonial:updated', (data: any) => this.handleTestimonialUpdate(socket, data));
      socket.on('contact:updated', (data: any) => this.handleContactUpdate(socket, data));
      socket.on('event:updated', (data: any) => this.handleEventUpdate(socket, data));

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });

      // Handle ping/pong for activity tracking
      socket.on('ping', () => {
        socket.emit('pong');
        this.updateClientActivity(socket.id);
      });
    });
  }

  /**
   * Handle client authentication
   */
  private handleAuthentication(socket: Socket, data: { token?: string; userId?: number; role?: string }): void {
    const client: ConnectedClient = {
      id: socket.id,
      userId: data.userId,
      role: data.role,
      lastActivity: new Date()
    };

    this.connectedClients.set(socket.id, client);
    
    // Join user to their personal room for user-specific events
    if (data.userId) {
      this.joinUserRoom(socket, data.userId);
    }
    
    socket.emit('authenticated', { success: true });
    console.log(`🔐 Client authenticated: ${socket.id} (User: ${data.userId}, Role: ${data.role})`);
  }

  /**
   * Handle dashboard data subscription
   */
  private async handleDashboardSubscription(socket: Socket): Promise<void> {
    const client = this.connectedClients.get(socket.id);
    if (!client || !['ADMIN', 'SELLER'].includes(client.role || '')) {
      socket.emit('subscription:error', { message: 'Unauthorized' });
      return;
    }

    socket.join('dashboard');

    // Send initial dashboard data
    try {
      const dashboardData = await this.getDashboardData();
      socket.emit('dashboard:data', dashboardData);
    } catch (error) {
      socket.emit('dashboard:error', { message: 'Failed to load dashboard data' });
    }
  }

  /**
   * Handle users data subscription
   */
  private async handleUsersSubscription(socket: Socket): Promise<void> {
    const client = this.connectedClients.get(socket.id);
    if (!client || client.role !== 'ADMIN') {
      socket.emit('subscription:error', { message: 'Unauthorized' });
      return;
    }

    socket.join('users');

    // Send initial users data
    try {
      const usersData = await this.getUsersData();
      socket.emit('users:data', usersData);
    } catch (error) {
      socket.emit('users:error', { message: 'Failed to load users data' });
    }
  }

  /**
   * Handle customers data subscription
   */
  private async handleCustomersSubscription(socket: Socket): Promise<void> {
    const client = this.connectedClients.get(socket.id);
    if (!client || client.role !== 'ADMIN') {
      socket.emit('subscription:error', { message: 'Unauthorized' });
      return;
    }

    socket.join('customers');
    console.log(`👥 Admin subscribed to customer updates: ${socket.id}`);

    // Send initial customers data
    try {
      const customersData = await this.getCustomersData();
      socket.emit('customers:data', customersData);
    } catch (error) {
      socket.emit('customers:error', { message: 'Failed to load customers data' });
    }
  }

  /**
   * Handle orders data subscription
   */
  private async handleOrdersSubscription(socket: Socket): Promise<void> {
    const client = this.connectedClients.get(socket.id);
    if (!client || !['ADMIN', 'SELLER'].includes(client.role || '')) {
      socket.emit('subscription:error', { message: 'Unauthorized' });
      return;
    }

    socket.join('orders');

    // Send initial orders data
    try {
      const ordersData = await this.getOrdersData();
      socket.emit('orders:data', ordersData);
    } catch (error) {
      socket.emit('orders:error', { message: 'Failed to load orders data' });
    }
  }

  /**
   * Handle inventory data subscription
   */
  private async handleInventorySubscription(socket: Socket): Promise<void> {
    const client = this.connectedClients.get(socket.id);
    if (!client || !['ADMIN', 'SELLER'].includes(client.role || '')) {
      socket.emit('subscription:error', { message: 'Unauthorized' });
      return;
    }

    socket.join('inventory');

    // Send initial inventory data
    try {
      const inventoryData = await this.getInventoryData();
      socket.emit('inventory:data', inventoryData);
    } catch (error) {
      socket.emit('inventory:error', { message: 'Failed to load inventory data' });
    }
  }

  /**
   * Handle user data updates
   */
  private handleUserUpdate(socket: Socket, data: any): void {
    // Invalidate cache and broadcast update
    cacheManager.del(cacheKeys.userList(1, 50, {}));
    cacheManager.del(cacheKeys.userCount);

    // Broadcast to all admin clients
    this.io?.to('users').emit('users:updated', data);
    this.io?.to('dashboard').emit('dashboard:refresh', { section: 'users' });
  }

  /**
   * Handle order data updates
   */
  private handleOrderUpdate(socket: Socket, data: any): void {
    // Invalidate cache and broadcast update
    cacheManager.del(cacheKeys.orderStats);

    // Broadcast to all relevant clients
    this.io?.to('orders').emit('orders:updated', data);
    this.io?.to('dashboard').emit('dashboard:refresh', { section: 'orders' });
  }

  /**
   * Handle inventory data updates
   */
  private handleInventoryUpdate(socket: Socket, data: any): void {
    // Invalidate cache and broadcast update
    cacheManager.del(cacheKeys.inventoryStats);
    cacheManager.del(cacheKeys.lowStockItems);

    // Broadcast to all relevant clients
    this.io?.to('inventory').emit('inventory:updated', data);
    this.io?.to('dashboard').emit('dashboard:refresh', { section: 'inventory' });
  }

  /**
   * Handle blog data updates
   */
  private handleBlogUpdate(socket: Socket, data: any): void {
    // Invalidate cache and broadcast update
    cacheManager.del('cms:blogs');
    cacheManager.del('cms:dashboard');

    // Broadcast to all relevant clients
    this.io?.to('blogs').emit('blogs:updated', data);
    this.io?.to('cms').emit('cms:refresh', { section: 'blogs' });
  }

  /**
   * Handle testimonial data updates
   */
  private handleTestimonialUpdate(socket: Socket, data: any): void {
    // Invalidate cache and broadcast update
    cacheManager.del('cms:testimonials');
    cacheManager.del('cms:dashboard');

    // Broadcast to all relevant clients
    this.io?.to('testimonials').emit('testimonials:updated', data);
    this.io?.to('cms').emit('cms:refresh', { section: 'testimonials' });
  }

  /**
   * Handle contact data updates
   */
  private handleContactUpdate(socket: Socket, data: any): void {
    // Invalidate cache and broadcast update
    cacheManager.del('cms:contacts');
    cacheManager.del('cms:dashboard');

    // Broadcast to all relevant clients
    this.io?.to('contacts').emit('contacts:updated', data);
    this.io?.to('cms').emit('cms:refresh', { section: 'contacts' });
  }

  /**
   * Handle event data updates
   */
  private handleEventUpdate(socket: Socket, data: any): void {
    // Invalidate cache and broadcast update
    cacheManager.del('cms:events');
    cacheManager.del('cms:dashboard');

    // Broadcast to all relevant clients
    this.io?.to('events').emit('events:updated', data);
    this.io?.to('cms').emit('cms:refresh', { section: 'events' });
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(socket: Socket): void {
    this.connectedClients.delete(socket.id);
    console.log(`🔌 Client disconnected: ${socket.id}`);
  }

  /**
   * Update client activity timestamp
   */
  private updateClientActivity(socketId: string): void {
    const client = this.connectedClients.get(socketId);
    if (client) {
      client.lastActivity = new Date();
      this.connectedClients.set(socketId, client);
    }
  }

  /**
   * Get dashboard data
   */
  private async getDashboardData(): Promise<any> {
    return cacheManager.getOrSet(
      cacheKeys.dashboardStats,
      async () => {
        const [userStats, orderStats, inventoryStats, bookingStats, recentOrders, lowStockItems, recentUsers] = await Promise.all([
          dbManager.get(`
            SELECT COUNT(*) as total_users,
                   SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) as active_users,
                   SUM(CASE WHEN emailVerified = 1 THEN 1 ELSE 0 END) as verified_users,
                   SUM(CASE WHEN role = 'ADMIN' THEN 1 ELSE 0 END) as admin_count,
                   SUM(CASE WHEN role = 'SELLER' THEN 1 ELSE 0 END) as seller_count,
                   SUM(CASE WHEN role = 'CUSTOMER' THEN 1 ELSE 0 END) as customer_count
            FROM users
          `),
          dbManager.get(`
            SELECT COUNT(*) as total_orders,
                   COALESCE(SUM(total), 0) as total_revenue,
                   COALESCE(AVG(total), 0) as avg_order_value,
                   SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_orders,
                   SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) as delivered_orders
            FROM orders
          `),
          dbManager.get(`
            SELECT
              SUM(CASE WHEN quantity <= minThreshold THEN 1 ELSE 0 END) as low_stock_count,
              SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count,
              COUNT(*) as total_products
            FROM inventory i
            JOIN products p ON i.productId = p.id
          `),
          dbManager.get(`
            SELECT COUNT(*) as total_bookings,
                   SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed_bookings,
                   SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_bookings,
                   SUM(CASE WHEN bookingType = 'PICKUP' THEN 1 ELSE 0 END) as pickup_bookings,
                   SUM(CASE WHEN bookingType = 'DELIVERY' THEN 1 ELSE 0 END) as delivery_bookings
            FROM bookings
          `),
          dbManager.query(`
            SELECT o.id, o.total, o.status, o.createdAt,
                   u.name as customer_name, u.email as customer_email,
                   GROUP_CONCAT(p.name) as product_names
            FROM orders o
            JOIN users u ON o.customerId = u.id
            LEFT JOIN order_items oi ON o.id = oi.orderId
            LEFT JOIN products p ON oi.productId = p.id
            GROUP BY o.id, o.total, o.status, o.createdAt, u.name, u.email
            ORDER BY o.createdAt DESC
            LIMIT 5
          `),
          dbManager.query(`
            SELECT p.name, i.quantity as current_stock, i.minThreshold, i.supplier
            FROM inventory i
            JOIN products p ON i.productId = p.id
            WHERE i.quantity <= i.minThreshold
            ORDER BY i.quantity ASC
            LIMIT 10
          `),
          dbManager.query(`
            SELECT id, name, email, role, createdAt
            FROM users
            ORDER BY createdAt DESC
            LIMIT 5
          `)
        ]);

        return {
          userStats: userStats || {},
          orderStats: orderStats || {},
          inventoryStats: inventoryStats || {},
          bookingStats: bookingStats || {},
          recentOrders: recentOrders || [],
          lowStockItems: lowStockItems || [],
          recentUsers: recentUsers || [],
          timestamp: new Date().toISOString()
        };
      },
      { ttl: 300 } // 5 minutes
    );
  }

  /**
   * Get users data
   */
  private async getUsersData(): Promise<any> {
    return cacheManager.getOrSet(
      cacheKeys.userList(1, 50, {}),
      async () => {
        const users = await dbManager.query(`
          SELECT id, email, name, role, isActive, emailVerified, createdAt, updatedAt
          FROM users
          ORDER BY createdAt DESC
          LIMIT 50
        `);

        const total = await dbManager.count('users');

        return {
          users: users || [],
          pagination: {
            page: 1,
            limit: 50,
            total,
            pages: Math.ceil(total / 50)
          }
        };
      },
      { ttl: 60 } // 1 minute
    );
  }

  /**
   * Get customers data
   */
  private async getCustomersData(): Promise<any> {
    return cacheManager.getOrSet(
      'customers:list',
      async () => {
        const customers = await dbManager.query(`
          SELECT 
            u.id,
            u.name,
            u.email,
            u.role,
            u.isActive,
            u.emailVerified,
            u.createdAt,
            u.updatedAt,
            COUNT(DISTINCT o.id) as orderCount,
            CAST(COALESCE(SUM(oi.quantity), 0) AS UNSIGNED) as totalQuantity,
            MAX(o.createdAt) as lastOrderDate
          FROM users u
          LEFT JOIN orders o ON u.id = o.customerId
          LEFT JOIN order_items oi ON o.id = oi.orderId
          WHERE u.role = 'CUSTOMER'
          GROUP BY u.id, u.name, u.email, u.role, u.isActive, u.emailVerified, u.createdAt, u.updatedAt
          ORDER BY u.createdAt DESC
          LIMIT 50
        `);

        const total = await dbManager.get(`
          SELECT COUNT(*) as count FROM users WHERE role = 'CUSTOMER'
        `);

        return {
          customers: customers || [],
          pagination: {
            page: 1,
            limit: 50,
            total: total.count,
            pages: Math.ceil(total.count / 50)
          }
        };
      },
      { ttl: 60 } // 1 minute
    );
  }

  /**
   * Get orders data
   */
  private async getOrdersData(): Promise<any> {
    return cacheManager.getOrSet(
      cacheKeys.recentOrders,
      async () => {
        const orders = await dbManager.query(`
          SELECT o.id, o.total, o.status, o.createdAt,
                 u.name as customer_name, u.email as customer_email,
                 GROUP_CONCAT(p.name) as product_names
          FROM orders o
          JOIN users u ON o.customerId = u.id
          LEFT JOIN order_items oi ON o.id = oi.orderId
          LEFT JOIN products p ON oi.productId = p.id
          GROUP BY o.id, o.total, o.status, o.createdAt, u.name, u.email
          ORDER BY o.createdAt DESC
          LIMIT 20
        `);

        return { orders: orders || [] };
      },
      { ttl: 120 } // 2 minutes
    );
  }

  /**
   * Get inventory data
   */
  private async getInventoryData(): Promise<any> {
    return cacheManager.getOrSet(
      cacheKeys.lowStockItems,
      async () => {
        const lowStockItems = await dbManager.query(`
          SELECT p.name, i.quantity as current_stock, i.minThreshold, i.supplier
          FROM inventory i
          JOIN products p ON i.productId = p.id
          WHERE i.quantity <= i.minThreshold
          ORDER BY i.quantity ASC
          LIMIT 20
        `);

        return { lowStockItems: lowStockItems || [] };
      },
      { ttl: 180 } // 3 minutes
    );
  }

  /**
   * Start periodic cleanup of inactive clients
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      const now = new Date();
      const timeout = 5 * 60 * 1000; // 5 minutes

      for (const [socketId, client] of this.connectedClients.entries()) {
        if (now.getTime() - client.lastActivity.getTime() > timeout) {
          this.connectedClients.delete(socketId);
          this.io?.sockets.sockets.get(socketId)?.disconnect();
        }
      }
    }, 60 * 1000); // Check every minute
  }

  /**
   * Broadcast data to specific room
   */
  broadcastToRoom(room: string, event: string, data: any): void {
    this.io?.to(room).emit(event, data);
  }

  /**
   * Emit event to specific user
   * @param userId - User ID
   * @param event - Event name
   * @param data - Event data
   */
  emitToUser(userId: number, event: string, data: any): void {
    const userRoom = `user:${userId}`;
    this.io?.to(userRoom).emit(event, data);
  }

  /**
   * Join user to their personal room
   * @param socket - Socket instance
   * @param userId - User ID
   */
  joinUserRoom(socket: Socket, userId: number): void {
    const userRoom = `user:${userId}`;
    socket.join(userRoom);
    console.log(`👤 User ${userId} joined personal room: ${userRoom}`);
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Handle CMS data subscription
   */
  private async handleCMSSubscription(socket: Socket): Promise<void> {
    const client = this.connectedClients.get(socket.id);
    if (!client || !['ADMIN', 'SELLER'].includes(client.role || '')) {
      socket.emit('subscription:error', { message: 'Unauthorized' });
      return;
    }

    socket.join('cms');

    // Send initial CMS data
    try {
      const cmsData = await this.getCMSData();
      socket.emit('cms:data', cmsData);
    } catch (error) {
      socket.emit('cms:error', { message: 'Failed to load CMS data' });
    }
  }

  /**
   * Handle blogs data subscription
   */
  private async handleBlogsSubscription(socket: Socket): Promise<void> {
    const client = this.connectedClients.get(socket.id);
    if (!client || !['ADMIN', 'SELLER'].includes(client.role || '')) {
      socket.emit('subscription:error', { message: 'Unauthorized' });
      return;
    }

    socket.join('blogs');

    // Send initial blogs data
    try {
      const blogsData = await this.getBlogsData();
      socket.emit('blogs:data', blogsData);
    } catch (error) {
      socket.emit('blogs:error', { message: 'Failed to load blogs data' });
    }
  }

  /**
   * Handle testimonials data subscription
   */
  private async handleTestimonialsSubscription(socket: Socket): Promise<void> {
    const client = this.connectedClients.get(socket.id);
    if (!client || !['ADMIN', 'SELLER'].includes(client.role || '')) {
      socket.emit('subscription:error', { message: 'Unauthorized' });
      return;
    }

    socket.join('testimonials');

    // Send initial testimonials data
    try {
      const testimonialsData = await this.getTestimonialsData();
      socket.emit('testimonials:data', testimonialsData);
    } catch (error) {
      socket.emit('testimonials:error', { message: 'Failed to load testimonials data' });
    }
  }

  /**
   * Handle contacts data subscription
   */
  private async handleContactsSubscription(socket: Socket): Promise<void> {
    const client = this.connectedClients.get(socket.id);
    if (!client || client.role !== 'ADMIN') {
      socket.emit('subscription:error', { message: 'Unauthorized' });
      return;
    }

    socket.join('contacts');

    // Send initial contacts data
    try {
      const contactsData = await this.getContactsData();
      socket.emit('contacts:data', contactsData);
    } catch (error) {
      socket.emit('contacts:error', { message: 'Failed to load contacts data' });
    }
  }

  /**
   * Handle events data subscription
   */
  private async handleEventsSubscription(socket: Socket): Promise<void> {
    const client = this.connectedClients.get(socket.id);
    if (!client || !['ADMIN', 'SELLER'].includes(client.role || '')) {
      socket.emit('subscription:error', { message: 'Unauthorized' });
      return;
    }

    socket.join('events');

    // Send initial events data
    try {
      const eventsData = await this.getEventsData();
      socket.emit('events:data', eventsData);
    } catch (error) {
      socket.emit('events:error', { message: 'Failed to load events data' });
    }
  }

  /**
   * Get CMS dashboard data
   */
  private async getCMSData(): Promise<any> {
    return cacheManager.getOrSet(
      'cms:dashboard',
      async () => {
        const cmsStats = await dbManager.query(`
          SELECT
            (SELECT COUNT(*) FROM blogs WHERE published_status = 1) as published_blogs,
            (SELECT COUNT(*) FROM blogs WHERE published_status = 0) as draft_blogs,
            (SELECT COUNT(*) FROM testimonials) as total_testimonials,
            (SELECT COUNT(*) FROM services) as total_services,
            (SELECT COUNT(*) FROM faqs) as total_faqs,
            (SELECT COUNT(*) FROM galleries) as total_gallery_items,
            (SELECT COUNT(*) FROM events WHERE date >= CURDATE()) as upcoming_events,
            (SELECT COUNT(*) FROM contacts WHERE status = 'unread') as unread_contacts,
            (SELECT COUNT(*) FROM subscribers WHERE status = 'active') as active_subscribers,
            (SELECT COUNT(*) FROM teams) as team_members
        `);

        return {
          stats: cmsStats[0] || {},
          timestamp: new Date().toISOString()
        };
      },
      { ttl: 300 } // 5 minutes
    );
  }

  /**
   * Get blogs data
   */
  private async getBlogsData(): Promise<any> {
    return cacheManager.getOrSet(
      'cms:blogs',
      async () => {
        const blogs = await dbManager.query(`
          SELECT id, title, slug, published_status, created_at, author_id
          FROM blogs
          ORDER BY created_at DESC
          LIMIT 20
        `);

        return { blogs: blogs || [] };
      },
      { ttl: 180 } // 3 minutes
    );
  }

  /**
   * Get testimonials data
   */
  private async getTestimonialsData(): Promise<any> {
    return cacheManager.getOrSet(
      'cms:testimonials',
      async () => {
        const testimonials = await dbManager.query(`
          SELECT id, client_name, rating, created_at
          FROM testimonials
          ORDER BY created_at DESC
          LIMIT 20
        `);

        return { testimonials: testimonials || [] };
      },
      { ttl: 180 } // 3 minutes
    );
  }

  /**
   * Get contacts data
   */
  private async getContactsData(): Promise<any> {
    return cacheManager.getOrSet(
      'cms:contacts',
      async () => {
        const contacts = await dbManager.query(`
          SELECT id, name, email, subject, status, created_at
          FROM contacts
          ORDER BY created_at DESC
          LIMIT 20
        `);

        return { contacts: contacts || [] };
      },
      { ttl: 120 } // 2 minutes
    );
  }

  /**
   * Get events data
   */
  private async getEventsData(): Promise<any> {
    return cacheManager.getOrSet(
      'cms:events',
      async () => {
        const events = await dbManager.query(`
          SELECT id, title, date, location, capacity
          FROM events
          WHERE date >= CURDATE()
          ORDER BY date ASC
          LIMIT 20
        `);

        return { events: events || [] };
      },
      { ttl: 300 } // 5 minutes
    );
  }

  /**
   * Handle menu data subscription
   */
  private async handleMenuSubscription(socket: Socket): Promise<void> {
    // Menu is public, so no authentication required
    socket.join('menu');
    console.log(`🍽️ Client subscribed to menu updates: ${socket.id}`);
  }

  /**
   * Handle products data subscription
   */
  private async handleProductsSubscription(socket: Socket): Promise<void> {
    // Products are public, so no authentication required
    socket.join('products');
    console.log(`🛍️ Client subscribed to product updates: ${socket.id}`);
  }

  /**
   * Handle categories data subscription
   */
  private async handleCategoriesSubscription(socket: Socket): Promise<void> {
    // Categories are public, so no authentication required
    socket.join('categories');
    console.log(`📂 Client subscribed to category updates: ${socket.id}`);
  }

  /**
   * Handle reservations data subscription
   */
  private async handleReservationsSubscription(socket: Socket): Promise<void> {
    const client = this.connectedClients.get(socket.id);
    if (!client || !['ADMIN', 'SELLER'].includes(client.role || '')) {
      socket.emit('subscription:error', { message: 'Unauthorized' });
      return;
    }

    socket.join('reservations');
    console.log(`📅 Admin subscribed to reservation updates: ${socket.id}`);

    // Send initial reservations data
    try {
      const reservationsData = await this.getReservationsData();
      socket.emit('reservations:data', reservationsData);
    } catch (error) {
      socket.emit('reservations:error', { message: 'Failed to load reservations data' });
    }
  }

  /**
   * Handle customer reservations subscription
   */
  private async handleCustomerReservationsSubscription(socket: Socket): Promise<void> {
    const client = this.connectedClients.get(socket.id);
    if (!client || !client.userId) {
      socket.emit('subscription:error', { message: 'Authentication required' });
      return;
    }

    // Join user's personal room for reservation updates
    this.joinUserRoom(socket, client.userId);
    console.log(`📅 Customer ${client.userId} subscribed to reservation updates: ${socket.id}`);
  }

  /**
   * Get reservations data
   */
  private async getReservationsData(): Promise<any> {
    return cacheManager.getOrSet(
      'reservations:list',
      async () => {
        const reservations = await dbManager.query(`
          SELECT 
            r.id,
            r.guestName,
            r.guestEmail,
            r.guestPhone,
            r.partySize,
            r.reservationDate,
            r.reservationTime,
            r.status,
            r.specialRequests,
            r.createdAt,
            r.updatedAt,
            t.tableNumber,
            t.capacity as tableCapacity,
            t.location as tableLocation,
            u.name as userName,
            u.email as userEmail
          FROM reservations r
          LEFT JOIN tables t ON r.tableId = t.id
          LEFT JOIN users u ON r.userId = u.id
          WHERE r.reservationDate >= CURDATE()
          ORDER BY r.reservationDate ASC, r.reservationTime ASC
          LIMIT 50
        `);

        const total = await dbManager.get(`
          SELECT COUNT(*) as count FROM reservations WHERE reservationDate >= CURDATE()
        `);

        return {
          reservations: reservations || [],
          pagination: {
            page: 1,
            limit: 50,
            total: total?.count || 0,
            pages: Math.ceil((total?.count || 0) / 50)
          }
        };
      },
      { ttl: 60 } // 1 minute
    );
  }

  /**
   * Handle tables data subscription
   */
  private async handleTablesSubscription(socket: Socket): Promise<void> {
    const client = this.connectedClients.get(socket.id);
    if (!client || !['ADMIN', 'SELLER'].includes(client.role || '')) {
      socket.emit('subscription:error', { message: 'Unauthorized' });
      return;
    }

    socket.join('tables');
    console.log(`🪑 Admin subscribed to table updates: ${socket.id}`);

    // Send initial tables data
    try {
      const tablesData = await this.getTablesData();
      socket.emit('tables:data', tablesData);
    } catch (error) {
      socket.emit('tables:error', { message: 'Failed to load tables data' });
    }
  }

  /**
   * Get tables data
   */
  private async getTablesData(): Promise<any> {
    return cacheManager.getOrSet(
      'tables:list',
      async () => {
        const tables = await dbManager.query(`
          SELECT 
            t.id,
            t.tableNumber,
            t.capacity,
            t.qrCode,
            t.isActive,
            t.location,
            t.createdAt,
            t.updatedAt,
            COUNT(DISTINCT o.id) as orderCount,
            COUNT(DISTINCT r.id) as reservationCount
          FROM tables t
          LEFT JOIN orders o ON t.id = o.tableId
          LEFT JOIN reservations r ON t.id = r.tableId
          GROUP BY t.id, t.tableNumber, t.capacity, t.qrCode, t.isActive, t.location, t.createdAt, t.updatedAt
          ORDER BY t.tableNumber ASC
        `);

        const total = await dbManager.get(`
          SELECT COUNT(*) as count FROM tables
        `);

        return {
          tables: tables || [],
          pagination: {
            page: 1,
            limit: 100,
            total: total?.count || 0,
            pages: Math.ceil((total?.count || 0) / 100)
          }
        };
      },
      { ttl: 60 } // 1 minute
    );
  }

  /**
   * Handle delivery zones data subscription
   */
  private async handleDeliveryZonesSubscription(socket: Socket): Promise<void> {
    const client = this.connectedClients.get(socket.id);
    if (!client || !['ADMIN', 'SELLER'].includes(client.role || '')) {
      socket.emit('subscription:error', { message: 'Unauthorized' });
      return;
    }

    socket.join('delivery-zones');
    console.log(`🚚 Admin subscribed to delivery zone updates: ${socket.id}`);

    // Send initial delivery zones data
    try {
      const deliveryZonesData = await this.getDeliveryZonesData();
      socket.emit('delivery-zones:data', deliveryZonesData);
    } catch (error) {
      socket.emit('delivery-zones:error', { message: 'Failed to load delivery zones data' });
    }
  }

  /**
   * Get delivery zones data
   */
  private async getDeliveryZonesData(): Promise<any> {
    return cacheManager.getOrSet(
      'delivery-zones:list',
      async () => {
        const zones = await dbManager.query(`
          SELECT 
            id,
            name,
            postcodes,
            deliveryFee,
            minOrderValue,
            estimatedTime,
            isActive,
            createdAt,
            updatedAt
          FROM delivery_zones
          ORDER BY name ASC
        `);

        // Parse postcodes JSON for each zone
        const formattedZones = (zones || []).map((zone: any) => ({
          ...zone,
          postcodes: JSON.parse(zone.postcodes || '[]'),
        }));

        const total = await dbManager.get(`
          SELECT COUNT(*) as count FROM delivery_zones
        `);

        return {
          zones: formattedZones,
          pagination: {
            page: 1,
            limit: 100,
            total: total?.count || 0,
            pages: Math.ceil((total?.count || 0) / 100)
          }
        };
      },
      { ttl: 300 } // 5 minutes
    );
  }

  /**
   * Handle admin room subscription (for all admin-related events)
   */
  private async handleAdminSubscription(socket: Socket): Promise<void> {
    const client = this.connectedClients.get(socket.id);
    if (!client || !['ADMIN', 'SELLER'].includes(client.role || '')) {
      socket.emit('subscription:error', { message: 'Unauthorized' });
      return;
    }

    socket.join('admin');
    console.log(`👨‍💼 Admin subscribed to admin room: ${socket.id}`);
  }

  /**
   * Handle promotions data subscription
   */
  private async handlePromotionsSubscription(socket: Socket): Promise<void> {
    const client = this.connectedClients.get(socket.id);
    if (!client || !['ADMIN', 'SELLER'].includes(client.role || '')) {
      socket.emit('subscription:error', { message: 'Unauthorized' });
      return;
    }

    socket.join('promotions');
    console.log(`🎁 Admin subscribed to promotion updates: ${socket.id}`);

    // Send initial promotions data
    try {
      const promotionsData = await this.getPromotionsData();
      socket.emit('promotions:data', promotionsData);
    } catch (error) {
      socket.emit('promotions:error', { message: 'Failed to load promotions data' });
    }
  }

  /**
   * Get promotions data
   */
  private async getPromotionsData(): Promise<any> {
    return cacheManager.getOrSet(
      'promotions:list',
      async () => {
        const promotions = await dbManager.query(`
          SELECT 
            id,
            code,
            discountType,
            discountValue,
            validFrom,
            validTo,
            usageLimit,
            usedCount,
            minOrderValue,
            maxDiscount,
            userLimit,
            firstOrderOnly,
            description,
            isActive,
            createdAt,
            updatedAt
          FROM promotions
          ORDER BY createdAt DESC
        `);

        const total = await dbManager.get(`
          SELECT COUNT(*) as count FROM promotions
        `);

        return {
          promotions: promotions || [],
          pagination: {
            page: 1,
            limit: 100,
            total: total?.count || 0,
            pages: Math.ceil((total?.count || 0) / 100)
          }
        };
      },
      { ttl: 60 } // 1 minute
    );
  }

  /**
   * Get server statistics
   */
  getServerStats(): any {
    return {
      connectedClients: this.connectedClients.size,
      rooms: this.io?.sockets.adapter.rooms ? Object.keys(this.io.sockets.adapter.rooms).length : 0,
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
export const wsManager = new WebSocketManager();
export default wsManager;