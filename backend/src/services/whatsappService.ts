import axios from 'axios';
import * as winston from 'winston';
import { env } from '../config/env';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'whatsapp-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/whatsapp-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/whatsapp.log' }),
  ],
});

if (env.server.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

export interface WhatsAppConfig {
  apiUrl: string;
  apiKey: string;
  phoneNumberId: string;
  businessAccountId: string;
}

export interface WhatsAppMessage {
  to: string;
  message: string;
  templateName?: string;
  templateParams?: Record<string, string>;
}

export class WhatsAppService {
  private config: WhatsAppConfig;
  private isConfigured: boolean = false;

  constructor() {
    this.config = {
      apiUrl: env.whatsapp.apiUrl,
      apiKey: env.whatsapp.apiKey,
      phoneNumberId: env.whatsapp.phoneNumberId,
      businessAccountId: env.whatsapp.businessAccountId,
    };

    this.isConfigured = !!(this.config.apiKey && this.config.phoneNumberId);

    if (!this.isConfigured) {
      logger.warn('WhatsApp service not configured. Set WHATSAPP_API_KEY and WHATSAPP_PHONE_NUMBER_ID in environment variables.');
    }
  }

  /**
   * Validate phone number format
   * @param phoneNumber - Phone number to validate
   * @returns Formatted phone number or null if invalid
   */
  validatePhoneNumber(phoneNumber: string): string | null {
    try {
      // Remove all non-digit characters
      let cleaned = phoneNumber.replace(/\D/g, '');

      // If starts with 0, remove it (UK format)
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }

      // If doesn't start with country code, assume UK (+44)
      if (!cleaned.startsWith('44') && !cleaned.startsWith('+')) {
        cleaned = '44' + cleaned;
      }

      // Remove + if present
      cleaned = cleaned.replace('+', '');

      // Validate length (should be 12-15 digits with country code)
      if (cleaned.length < 10 || cleaned.length > 15) {
        logger.warn('Invalid phone number length', { phoneNumber, cleaned });
        return null;
      }

      return cleaned;
    } catch (error) {
      logger.error('Phone number validation error', { error, phoneNumber });
      return null;
    }
  }

  /**
   * Send a WhatsApp message
   * @param to - Recipient phone number
   * @param message - Message text
   * @returns Success status
   */
  async sendMessage(to: string, message: string): Promise<boolean> {
    try {
      if (!this.isConfigured) {
        logger.warn('WhatsApp service not configured, skipping message send');
        return false;
      }

      const validatedPhone = this.validatePhoneNumber(to);
      if (!validatedPhone) {
        logger.error('Invalid phone number', { to });
        return false;
      }

      const url = `${this.config.apiUrl}/${this.config.phoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        to: validatedPhone,
        type: 'text',
        text: {
          body: message,
        },
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      });

      if (response.status === 200 || response.status === 201) {
        logger.info('WhatsApp message sent successfully', {
          to: validatedPhone,
          messageId: response.data.messages?.[0]?.id,
        });
        return true;
      }

      logger.error('WhatsApp API returned non-success status', {
        status: response.status,
        data: response.data,
      });
      return false;
    } catch (error: any) {
      logger.error('Failed to send WhatsApp message', {
        error: error.message,
        to,
        response: error.response?.data,
      });
      return false;
    }
  }

  /**
   * Send order confirmation message
   * @param phoneNumber - Customer phone number
   * @param orderId - Order ID
   * @param orderTotal - Order total amount
   * @returns Success status
   */
  async sendOrderConfirmation(
    phoneNumber: string,
    orderId: number,
    orderTotal: number
  ): Promise<boolean> {
    const message = `🎉 Order Confirmed - The Saffron Lounge

Thank you for your order!

Order ID: #${orderId}
Total: £${orderTotal.toFixed(2)}

We've received your order and will start preparing it shortly. You'll receive updates as your order progresses.

Track your order: ${env.urls.frontend}/order-status?id=${orderId}`;

    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Send order status update message
   * @param phoneNumber - Customer phone number
   * @param orderId - Order ID
   * @param status - New order status
   * @returns Success status
   */
  async sendOrderStatusUpdate(
    phoneNumber: string,
    orderId: number,
    status: string
  ): Promise<boolean> {
    let message = '';

    switch (status) {
      case 'PREPARING':
        message = `👨‍🍳 Order #${orderId} - Now Preparing

Your order is being prepared by our chefs. We'll notify you when it's ready!

The Saffron Lounge`;
        break;

      case 'READY':
        message = `✅ Order #${orderId} - Ready for Pickup/Delivery

Your order is ready! 

${env.urls.frontend}/order-status?id=${orderId}

The Saffron Lounge`;
        break;

      case 'DELIVERED':
        message = `🎊 Order #${orderId} - Delivered

Your order has been delivered. Enjoy your meal!

Thank you for choosing The Saffron Lounge. We hope to serve you again soon!`;
        break;

      case 'CANCELLED':
        message = `❌ Order #${orderId} - Cancelled

Your order has been cancelled. If you have any questions, please contact us.

The Saffron Lounge`;
        break;

      default:
        message = `📦 Order #${orderId} - Status Update

Your order status has been updated to: ${status}

Track your order: ${env.urls.frontend}/order-status?id=${orderId}

The Saffron Lounge`;
    }

    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Send invoice via WhatsApp
   * @param phoneNumber - Customer phone number
   * @param orderId - Order ID
   * @param invoiceDetails - Invoice details
   * @returns Success status
   */
  async sendInvoice(
    phoneNumber: string,
    orderId: number,
    invoiceDetails: {
      items: Array<{ name: string; quantity: number; price: number }>;
      subtotal: number;
      discount?: number;
      deliveryFee?: number;
      total: number;
    }
  ): Promise<boolean> {
    const itemsList = invoiceDetails.items
      .map(item => `${item.quantity}x ${item.name} - £${(item.price * item.quantity).toFixed(2)}`)
      .join('\n');

    let message = `🧾 Invoice - Order #${orderId}

${itemsList}

Subtotal: £${invoiceDetails.subtotal.toFixed(2)}`;

    if (invoiceDetails.discount) {
      message += `\nDiscount: -£${invoiceDetails.discount.toFixed(2)}`;
    }

    if (invoiceDetails.deliveryFee) {
      message += `\nDelivery Fee: £${invoiceDetails.deliveryFee.toFixed(2)}`;
    }

    message += `\n\nTotal: £${invoiceDetails.total.toFixed(2)}

Thank you for your order!
The Saffron Lounge`;

    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Send reservation confirmation message
   * @param phoneNumber - Guest phone number
   * @param reservationDetails - Reservation details
   * @returns Success status
   */
  async sendReservationConfirmation(
    phoneNumber: string,
    reservationDetails: {
      id: number;
      guestName: string;
      date: string;
      time: string;
      partySize: number;
      tableNumber?: string;
    }
  ): Promise<boolean> {
    const message = `🍽️ Reservation Confirmed - The Saffron Lounge

Dear ${reservationDetails.guestName},

Your table reservation is confirmed!

Date: ${reservationDetails.date}
Time: ${reservationDetails.time}
Party Size: ${reservationDetails.partySize} guests
${reservationDetails.tableNumber ? `Table: ${reservationDetails.tableNumber}` : ''}

We look forward to serving you!

Please arrive on time. If you need to modify or cancel, contact us at least 24 hours in advance.

The Saffron Lounge`;

    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Send reservation reminder (1 day before)
   * @param phoneNumber - Guest phone number
   * @param reservationDetails - Reservation details
   * @returns Success status
   */
  async sendReservationReminder(
    phoneNumber: string,
    reservationDetails: {
      id: number;
      guestName: string;
      date: string;
      time: string;
      partySize: number;
    }
  ): Promise<boolean> {
    const message = `⏰ Reservation Reminder - The Saffron Lounge

Dear ${reservationDetails.guestName},

This is a reminder of your reservation tomorrow:

Date: ${reservationDetails.date}
Time: ${reservationDetails.time}
Party Size: ${reservationDetails.partySize} guests

We look forward to seeing you!

The Saffron Lounge`;

    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Send pickup reminder message
   * @param phoneNumber - Customer phone number
   * @param orderId - Order ID
   * @param pickupTime - Scheduled pickup time
   * @returns Success status
   */
  async sendPickupReminder(
    phoneNumber: string,
    orderId: number,
    pickupTime: string
  ): Promise<boolean> {
    const message = `⏰ Pickup Reminder - Order #${orderId}

Your order is ready for pickup at ${pickupTime}.

Please collect your order at:
The Saffron Lounge
[Restaurant Address]

Thank you!`;

    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Send test message (for admin testing)
   * @param phoneNumber - Test phone number
   * @returns Success status
   */
  async sendTestMessage(phoneNumber: string): Promise<boolean> {
    const message = `🧪 Test Message - The Saffron Lounge

This is a test message from The Saffron Lounge WhatsApp notification system.

If you received this, the integration is working correctly!

Timestamp: ${new Date().toISOString()}`;

    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Check if WhatsApp service is configured
   * @returns Configuration status
   */
  isServiceConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Get service configuration status
   * @returns Configuration details
   */
  getConfigStatus(): {
    configured: boolean;
    hasApiKey: boolean;
    hasPhoneNumberId: boolean;
    hasApiUrl: boolean;
  } {
    return {
      configured: this.isConfigured,
      hasApiKey: !!this.config.apiKey,
      hasPhoneNumberId: !!this.config.phoneNumberId,
      hasApiUrl: !!this.config.apiUrl,
    };
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService();