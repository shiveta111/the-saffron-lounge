import { wsManager } from '../utils/websocket';
import { cacheManager } from '../utils/cache';

/**
 * Centralized Event Broadcaster Service
 * Handles all WebSocket event broadcasting with proper room targeting and logging
 */
class EventBroadcaster {
  /**
   * Broadcast menu events
   */
  broadcastMenuCreated(menuData: any): void {
    this.logEvent('MENU_CREATED', menuData);
    wsManager.broadcastToRoom('menu', 'MENU_CREATED', menuData);
    wsManager.broadcastToRoom('admin', 'MENU_CREATED', menuData);
    
    // Invalidate cache
    cacheManager.del('menu:list');
  }

  broadcastMenuUpdated(menuData: any): void {
    this.logEvent('MENU_UPDATED', menuData);
    wsManager.broadcastToRoom('menu', 'MENU_UPDATED', menuData);
    wsManager.broadcastToRoom('admin', 'MENU_UPDATED', menuData);
    
    // Invalidate cache
    cacheManager.del('menu:list');
    cacheManager.del(`menu:${menuData.id}`);
  }

  broadcastMenuDeleted(menuId: number): void {
    this.logEvent('MENU_DELETED', { id: menuId });
    wsManager.broadcastToRoom('menu', 'MENU_DELETED', { id: menuId });
    wsManager.broadcastToRoom('admin', 'MENU_DELETED', { id: menuId });
    
    // Invalidate cache
    cacheManager.del('menu:list');
    cacheManager.del(`menu:${menuId}`);
  }

  /**
   * Broadcast product events
   */
  broadcastProductCreated(productData: any): void {
    this.logEvent('PRODUCT_CREATED', productData);
    wsManager.broadcastToRoom('products', 'PRODUCT_CREATED', productData);
    wsManager.broadcastToRoom('admin', 'PRODUCT_CREATED', productData);
    
    // Invalidate cache
    cacheManager.del('products:list');
  }

  broadcastProductUpdated(productData: any): void {
    this.logEvent('PRODUCT_UPDATED', productData);
    wsManager.broadcastToRoom('products', 'PRODUCT_UPDATED', productData);
    wsManager.broadcastToRoom('admin', 'PRODUCT_UPDATED', productData);
    
    // Invalidate cache
    cacheManager.del('products:list');
    cacheManager.del(`product:${productData.id}`);
  }

  broadcastProductDeleted(productId: number): void {
    this.logEvent('PRODUCT_DELETED', { id: productId });
    wsManager.broadcastToRoom('products', 'PRODUCT_DELETED', { id: productId });
    wsManager.broadcastToRoom('admin', 'PRODUCT_DELETED', { id: productId });
    
    // Invalidate cache
    cacheManager.del('products:list');
    cacheManager.del(`product:${productId}`);
  }

  /**
   * Broadcast cart events (user-specific)
   */
  broadcastCartUpdated(userId: number, cartData: any): void {
    this.logEvent('CART_UPDATED', { userId, ...cartData });
    wsManager.emitToUser(userId, 'CART_UPDATED', cartData);
  }

  broadcastCartCleared(userId: number): void {
    this.logEvent('CART_CLEARED', { userId });
    wsManager.emitToUser(userId, 'CART_CLEARED', {});
  }

  /**
   * Broadcast order events
   */
  broadcastOrderCreated(orderData: any): void {
    this.logEvent('ORDER_CREATED', orderData);
    
    // Notify customer
    if (orderData.customerId) {
      wsManager.emitToUser(orderData.customerId, 'ORDER_CREATED', orderData);
    }
    
    // Notify admin
    wsManager.broadcastToRoom('admin', 'ORDER_CREATED', orderData);
    wsManager.broadcastToRoom('orders', 'ORDER_CREATED', orderData);
    
    // Invalidate cache
    cacheManager.del('orders:list');
  }

  broadcastOrderStatusUpdated(orderData: any): void {
    this.logEvent('ORDER_STATUS_UPDATED', orderData);
    
    // Notify customer
    if (orderData.customerId) {
      wsManager.emitToUser(orderData.customerId, 'ORDER_STATUS_UPDATED', orderData);
    }
    
    // Notify admin
    wsManager.broadcastToRoom('admin', 'ORDER_STATUS_UPDATED', orderData);
    wsManager.broadcastToRoom('orders', 'ORDER_STATUS_UPDATED', orderData);
    
    // Invalidate cache
    cacheManager.del('orders:list');
    cacheManager.del(`order:${orderData.id}`);
  }

  /**
   * Broadcast category events
   */
  broadcastCategoryCreated(categoryData: any): void {
    this.logEvent('CATEGORY_CREATED', categoryData);
    wsManager.broadcastToRoom('categories', 'CATEGORY_CREATED', categoryData);
    wsManager.broadcastToRoom('admin', 'CATEGORY_CREATED', categoryData);
    
    // Invalidate cache
    cacheManager.del('categories:list');
  }

  broadcastCategoryUpdated(categoryData: any): void {
    this.logEvent('CATEGORY_UPDATED', categoryData);
    wsManager.broadcastToRoom('categories', 'CATEGORY_UPDATED', categoryData);
    wsManager.broadcastToRoom('admin', 'CATEGORY_UPDATED', categoryData);
    
    // Invalidate cache
    cacheManager.del('categories:list');
    cacheManager.del(`category:${categoryData.id}`);
  }

  broadcastCategoryDeleted(categoryId: number): void {
    this.logEvent('CATEGORY_DELETED', { id: categoryId });
    wsManager.broadcastToRoom('categories', 'CATEGORY_DELETED', { id: categoryId });
    wsManager.broadcastToRoom('admin', 'CATEGORY_DELETED', { id: categoryId });
    
    // Invalidate cache
    cacheManager.del('categories:list');
    cacheManager.del(`category:${categoryId}`);
  }

  /**
   * Broadcast customer events (admin only)
   */
  broadcastCustomerUpdated(customerData: any): void {
    this.logEvent('CUSTOMER_UPDATED', customerData);
    wsManager.broadcastToRoom('admin', 'CUSTOMER_UPDATED', customerData);
    wsManager.broadcastToRoom('customers', 'CUSTOMER_UPDATED', customerData);
    
    // Invalidate cache
    cacheManager.del('customers:list');
    cacheManager.del(`customer:${customerData.id}`);
  }

  broadcastCustomerStatusUpdated(customerData: any): void {
    this.logEvent('CUSTOMER_STATUS_UPDATED', customerData);
    wsManager.broadcastToRoom('admin', 'CUSTOMER_STATUS_UPDATED', customerData);
    wsManager.broadcastToRoom('customers', 'CUSTOMER_STATUS_UPDATED', customerData);
    
    // Invalidate cache
    cacheManager.del('customers:list');
    cacheManager.del(`customer:${customerData.id}`);
  }

  /**
   * Broadcast reservation events (admin only)
   */
  broadcastReservationCreated(reservationData: any): void {
    this.logEvent('RESERVATION_CREATED', reservationData);
    wsManager.broadcastToRoom('admin', 'RESERVATION_CREATED', reservationData);
    wsManager.broadcastToRoom('reservations', 'RESERVATION_CREATED', reservationData);
    
    // Invalidate cache
    cacheManager.del('reservations:list');
  }

  broadcastReservationStatusUpdated(reservationData: any): void {
    this.logEvent('RESERVATION_STATUS_UPDATED', reservationData);
    wsManager.broadcastToRoom('admin', 'RESERVATION_STATUS_UPDATED', reservationData);
    wsManager.broadcastToRoom('reservations', 'RESERVATION_STATUS_UPDATED', reservationData);
    
    // Invalidate cache
    cacheManager.del('reservations:list');
    cacheManager.del(`reservation:${reservationData.id}`);
  }

  broadcastReservationTableAssigned(reservationData: any): void {
    this.logEvent('RESERVATION_TABLE_ASSIGNED', reservationData);
    wsManager.broadcastToRoom('admin', 'RESERVATION_TABLE_ASSIGNED', reservationData);
    wsManager.broadcastToRoom('reservations', 'RESERVATION_TABLE_ASSIGNED', reservationData);
    
    // Invalidate cache
    cacheManager.del('reservations:list');
    cacheManager.del(`reservation:${reservationData.id}`);
  }

  /**
   * Broadcast table events (admin only)
   */
  broadcastTableCreated(tableData: any): void {
    this.logEvent('TABLE_CREATED', tableData);
    wsManager.broadcastToRoom('admin', 'TABLE_CREATED', tableData);
    wsManager.broadcastToRoom('tables', 'TABLE_CREATED', tableData);
    
    // Invalidate cache
    cacheManager.del('tables:list');
  }

  broadcastTableUpdated(tableData: any): void {
    this.logEvent('TABLE_UPDATED', tableData);
    wsManager.broadcastToRoom('admin', 'TABLE_UPDATED', tableData);
    wsManager.broadcastToRoom('tables', 'TABLE_UPDATED', tableData);
    
    // Invalidate cache
    cacheManager.del('tables:list');
    cacheManager.del(`table:${tableData.id}`);
  }

  broadcastTableDeleted(tableId: number): void {
    this.logEvent('TABLE_DELETED', { id: tableId });
    wsManager.broadcastToRoom('admin', 'TABLE_DELETED', { id: tableId });
    wsManager.broadcastToRoom('tables', 'TABLE_DELETED', { id: tableId });
    
    // Invalidate cache
    cacheManager.del('tables:list');
    cacheManager.del(`table:${tableId}`);
  }

  broadcastTableQRUpdated(tableData: any): void {
    this.logEvent('TABLE_QR_UPDATED', tableData);
    wsManager.broadcastToRoom('admin', 'TABLE_QR_UPDATED', tableData);
    wsManager.broadcastToRoom('tables', 'TABLE_QR_UPDATED', tableData);
    
    // Invalidate cache
    cacheManager.del('tables:list');
    cacheManager.del(`table:${tableData.id}`);
  }

  /**
   * Broadcast delivery zone events (admin only)
   */
  broadcastZoneCreated(zoneData: any): void {
    this.logEvent('ZONE_CREATED', zoneData);
    wsManager.broadcastToRoom('admin', 'ZONE_CREATED', zoneData);
    wsManager.broadcastToRoom('delivery-zones', 'ZONE_CREATED', zoneData);
    
    // Invalidate cache
    cacheManager.del('delivery-zones:list');
  }

  broadcastZoneUpdated(zoneData: any): void {
    this.logEvent('ZONE_UPDATED', zoneData);
    wsManager.broadcastToRoom('admin', 'ZONE_UPDATED', zoneData);
    wsManager.broadcastToRoom('delivery-zones', 'ZONE_UPDATED', zoneData);
    
    // Invalidate cache
    cacheManager.del('delivery-zones:list');
    cacheManager.del(`zone:${zoneData.id}`);
  }

  broadcastZoneDeleted(zoneId: number): void {
    this.logEvent('ZONE_DELETED', { id: zoneId });
    wsManager.broadcastToRoom('admin', 'ZONE_DELETED', { id: zoneId });
    wsManager.broadcastToRoom('delivery-zones', 'ZONE_DELETED', { id: zoneId });
    
    // Invalidate cache
    cacheManager.del('delivery-zones:list');
    cacheManager.del(`zone:${zoneId}`);
  }

  /**
   * Broadcast promotion events (admin only)
   */
  broadcastPromotionCreated(promotionData: any): void {
    this.logEvent('PROMOTION_CREATED', promotionData);
    wsManager.broadcastToRoom('admin', 'PROMOTION_CREATED', promotionData);
    wsManager.broadcastToRoom('promotions', 'PROMOTION_CREATED', promotionData);
    
    // Invalidate cache
    cacheManager.del('promotions:list');
  }

  broadcastPromotionUpdated(promotionData: any): void {
    this.logEvent('PROMOTION_UPDATED', promotionData);
    wsManager.broadcastToRoom('admin', 'PROMOTION_UPDATED', promotionData);
    wsManager.broadcastToRoom('promotions', 'PROMOTION_UPDATED', promotionData);
    
    // Invalidate cache
    cacheManager.del('promotions:list');
    cacheManager.del(`promotion:${promotionData.id}`);
  }

  broadcastPromotionDeleted(promotionId: number): void {
    this.logEvent('PROMOTION_DELETED', { id: promotionId });
    wsManager.broadcastToRoom('admin', 'PROMOTION_DELETED', { id: promotionId });
    wsManager.broadcastToRoom('promotions', 'PROMOTION_DELETED', { id: promotionId });
    
    // Invalidate cache
    cacheManager.del('promotions:list');
    cacheManager.del(`promotion:${promotionId}`);
  }

  /**
   * Log event for debugging
   */
  private logEvent(eventType: string, data: any): void {
    const timestamp = new Date().toISOString();
    console.log(`📡 [${timestamp}] Broadcasting ${eventType}:`, {
      id: data.id,
      type: eventType,
      timestamp
    });
  }
}

// Singleton instance
export const eventBroadcaster = new EventBroadcaster();
export default eventBroadcaster;
