/**
 * Field Mapping Configurations
 * 
 * Maps backend field names to frontend field names for all entities.
 * Handles both snake_case and camelCase field name variations.
 */

export interface FieldMapping {
  [backendField: string]: string;
}

/**
 * Apply field mapping to an object
 */
export function applyFieldMapping<T>(data: any, mapping: FieldMapping): T {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const mapped: any = {};

  // First, copy all existing fields
  Object.keys(data).forEach(key => {
    mapped[key] = data[key];
  });

  // Then apply mappings
  Object.keys(mapping).forEach(backendField => {
    const frontendField = mapping[backendField];
    if (data[backendField] !== undefined) {
      mapped[frontendField] = data[backendField];
      // Remove the old field if it's different
      if (backendField !== frontendField) {
        delete mapped[backendField];
      }
    }
  });

  return mapped as T;
}

/**
 * Apply field mapping to an array of objects
 */
export function applyFieldMappingToArray<T>(data: any[], mapping: FieldMapping): T[] {
  return data.map(item => applyFieldMapping<T>(item, mapping));
}

// Menu Item Field Mapping
export const menuItemFieldMapping: FieldMapping = {
  'menu_id': 'id',
  'item_name': 'name',
  'item_description': 'description',
  'item_price': 'price',
  'category_id': 'categoryId',
  'image_url': 'imageUrl',
  'is_available': 'isAvailable',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
};

// Category Field Mapping
export const categoryFieldMapping: FieldMapping = {
  'category_id': 'id',
  'category_name': 'name',
  'category_description': 'description',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
};

// Service Field Mapping
export const serviceFieldMapping: FieldMapping = {
  'service_id': 'id',
  'service_name': 'name',
  'service_title': 'name',
  'title': 'name',
  'service_description': 'description',
  'service_price': 'price',
  'service_duration': 'duration',
  'service_category': 'category',
  'is_active': 'isActive',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
};

// Blog Post Field Mapping
export const blogPostFieldMapping: FieldMapping = {
  'post_id': 'id',
  'blog_id': 'id',
  'post_title': 'title',
  'post_content': 'content',
  'post_slug': 'slug',
  'post_excerpt': 'excerpt',
  'featured_image': 'featuredImage',
  'post_tags': 'tags',
  'published_status': 'publishedStatus',
  'meta_title': 'metaTitle',
  'seo_title': 'seoTitle',
  'meta_description': 'metaDescription',
  'seo_description': 'seoDescription',
  'seo_keywords': 'seoKeywords',
  'author_id': 'authorId',
  'author_name': 'authorName',
  'author_username': 'authorUsername',
  'view_count': 'viewCount',
  'views': 'viewCount',
  'post_category': 'category',
  'date_created': 'createdAt',
  'date_updated': 'updatedAt',
  'date_published': 'publishedAt',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
  'published_at': 'publishedAt',
};

// Team Member Field Mapping
export const teamMemberFieldMapping: FieldMapping = {
  'member_id': 'id',
  'member_name': 'name',
  'member_email': 'email',
  'member_phone': 'phone',
  'member_role': 'role',
  'member_bio': 'bio',
  'photo_url': 'photo',
  'image_url': 'photo',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
};

// Testimonial Field Mapping
export const testimonialFieldMapping: FieldMapping = {
  'testimonial_id': 'id',
  'client_name': 'clientName',
  'client_rating': 'rating',
  'client_feedback': 'feedback',
  'photo_url': 'photoUrl',
  'image_url': 'photoUrl',
  'testimonial_source': 'source',
  'testimonial_status': 'status',
  'approved_by': 'approvedBy',
  'approved_at': 'approvedAt',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
};

// FAQ Field Mapping
export const faqFieldMapping: FieldMapping = {
  'faq_id': 'id',
  'faq_question': 'question',
  'faq_answer': 'answer',
  'faq_category': 'category',
  'faq_tags': 'tags',
  'view_count': 'viewCount',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
};

// Gallery Item Field Mapping
export const galleryItemFieldMapping: FieldMapping = {
  'gallery_id': 'id',
  'gallery_title': 'title',
  'gallery_description': 'description',
  'image_url': 'imageUrl',
  'gallery_category': 'category',
  'gallery_tags': 'tags',
  'is_active': 'isActive',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
};


// Booking Field Mapping
export const bookingFieldMapping: FieldMapping = {
  'booking_id': 'id',
  'customer_id': 'customerId',
  'booking_date': 'date',
  'time_slot': 'timeSlot',
  'booking_type': 'type',
  'booking_status': 'status',
  'booking_notes': 'notes',
  'order_id': 'orderId',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
};

// Reservation Field Mapping
export const reservationFieldMapping: FieldMapping = {
  'reservation_id': 'id',
  'guest_name': 'guestName',
  'guest_email': 'guestEmail',
  'guest_phone': 'guestPhone',
  'party_size': 'partySize',
  'reservation_date': 'reservationDate',
  'reservation_time': 'reservationTime',
  'table_id': 'tableId',
  'special_requests': 'specialRequests',
  'reservation_status': 'status',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
};

// Order Field Mapping
export const orderFieldMapping: FieldMapping = {
  'order_id': 'id',
  'customer_id': 'customerId',
  'order_status': 'status',
  'order_total': 'total',
  'order_notes': 'notes',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
};

// Customer Field Mapping
export const customerFieldMapping: FieldMapping = {
  'customer_id': 'id',
  'customer_email': 'email',
  'customer_name': 'name',
  'customer_phone': 'phone',
  'total_orders': 'totalOrders',
  'last_order_date': 'lastOrderDate',
  'loyalty_points': 'loyaltyPoints',
  'is_active': 'isActive',
  'customer_tags': 'tags',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
};

// User Field Mapping
export const userFieldMapping: FieldMapping = {
  'user_id': 'id',
  'user_email': 'email',
  'user_name': 'name',
  'user_role': 'role',
  'email_verified': 'emailVerified',
  'is_active': 'isActive',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
};

// Table Field Mapping
export const tableFieldMapping: FieldMapping = {
  'table_id': 'id',
  'table_number': 'tableNumber',
  'table_capacity': 'capacity',
  'table_location': 'location',
  'is_active': 'isActive',
  'qr_code': 'qrCode',
  'qr_code_url': 'qrCodeUrl',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
};

// Promotion Field Mapping
export const promotionFieldMapping: FieldMapping = {
  'promotion_id': 'id',
  'promotion_code': 'code',
  'discount_type': 'discountType',
  'discount_value': 'discountValue',
  'expiry_date': 'expiryDate',
  'promotion_status': 'status',
  'usage_limit': 'usageLimit',
  'usage_count': 'usageCount',
  'created_by': 'createdBy',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
};

// Delivery Zone Field Mapping
export const deliveryZoneFieldMapping: FieldMapping = {
  'zone_id': 'id',
  'zone_name': 'name',
  'zone_postcodes': 'postcodes',
  'delivery_fee': 'deliveryFee',
  'min_order_value': 'minOrderValue',
  'estimated_time': 'estimatedTime',
  'is_active': 'isActive',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
};

// Notification Field Mapping
export const notificationFieldMapping: FieldMapping = {
  'notification_id': 'id',
  'notification_type': 'type',
  'notification_recipient': 'recipient',
  'notification_subject': 'subject',
  'notification_message': 'message',
  'notification_status': 'status',
  'sent_at': 'sentAt',
  'delivered_at': 'deliveredAt',
  'failed_at': 'failedAt',
  'error_message': 'errorMessage',
  'notification_template': 'template',
  'created_at': 'createdAt',
};

/**
 * Get field mapping for entity type
 */
export function getFieldMapping(entityType: string): FieldMapping {
  const mappings: Record<string, FieldMapping> = {
    'menuItem': menuItemFieldMapping,
    'category': categoryFieldMapping,
    'service': serviceFieldMapping,
    'blogPost': blogPostFieldMapping,
    'teamMember': teamMemberFieldMapping,
    'testimonial': testimonialFieldMapping,
    'faq': faqFieldMapping,
    'galleryItem': galleryItemFieldMapping,
    'booking': bookingFieldMapping,
    'reservation': reservationFieldMapping,
    'order': orderFieldMapping,
    'customer': customerFieldMapping,
    'user': userFieldMapping,
    'table': tableFieldMapping,
    'promotion': promotionFieldMapping,
    'deliveryZone': deliveryZoneFieldMapping,
    'notification': notificationFieldMapping,
  };

  return mappings[entityType] || {};
}

export default {
  applyFieldMapping,
  applyFieldMappingToArray,
  getFieldMapping,
  menuItemFieldMapping,
  categoryFieldMapping,
  serviceFieldMapping,
  blogPostFieldMapping,
  teamMemberFieldMapping,
  testimonialFieldMapping,
  faqFieldMapping,
  galleryItemFieldMapping,
  bookingFieldMapping,
  reservationFieldMapping,
  orderFieldMapping,
  customerFieldMapping,
  userFieldMapping,
  tableFieldMapping,
  promotionFieldMapping,
  deliveryZoneFieldMapping,
  notificationFieldMapping,
};
