import { Request, Response } from 'express';
import * as winston from 'winston';
import { whatsappService } from '../services/whatsappService';
import { env } from '../config/env';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'whatsapp-controller' },
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

/**
 * Verify WhatsApp webhook (GET request from Meta)
 */
export const verifyWebhook = async (req: Request, res: Response) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = env.whatsapp.verifyToken;

    if (mode === 'subscribe' && token === verifyToken) {
      logger.info('WhatsApp webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      logger.warn('WhatsApp webhook verification failed', { mode, token });
      res.status(403).json({
        success: false,
        error: 'Verification failed',
      });
    }
  } catch (error) {
    logger.error('Webhook verification error', { error });
    res.status(500).json({
      success: false,
      error: 'Webhook verification failed',
    });
  }
};

/**
 * Handle incoming WhatsApp webhook messages
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const body = req.body;

    logger.info('WhatsApp webhook received', { body });

    // Acknowledge receipt immediately
    res.status(200).json({ success: true });

    // Process webhook asynchronously
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            await processIncomingMessage(change.value);
          }
        }
      }
    }
  } catch (error) {
    logger.error('Webhook processing error', { error });
    // Still return 200 to prevent Meta from retrying
    res.status(200).json({ success: true });
  }
};

/**
 * Process incoming WhatsApp message
 */
async function processIncomingMessage(value: any): Promise<void> {
  try {
    const messages = value.messages || [];

    for (const message of messages) {
      const from = message.from;
      const messageBody = message.text?.body || '';
      const messageType = message.type;

      logger.info('Processing incoming WhatsApp message', {
        from,
        type: messageType,
        body: messageBody,
      });

      // Handle different message types
      if (messageType === 'text') {
        // Auto-reply with help message
        const helpMessage = `Thank you for contacting The Saffron Lounge!

For reservations, visit: ${process.env.FRONTEND_URL}/reservations
For orders, visit: ${process.env.FRONTEND_URL}/menu

Our team will respond to your message shortly.`;

        await whatsappService.sendMessage(from, helpMessage);
      }
    }
  } catch (error) {
    logger.error('Failed to process incoming message', { error, value });
  }
}

/**
 * Send test WhatsApp message (admin only)
 */
export const sendTestMessage = async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      });
    }

    const result = await whatsappService.sendTestMessage(phoneNumber);

    if (result) {
      logger.info('Test message sent successfully', { phoneNumber });
      res.json({
        success: true,
        message: 'Test message sent successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send test message',
      });
    }
  } catch (error) {
    logger.error('Failed to send test message', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to send test message',
    });
  }
};

/**
 * Get WhatsApp service configuration status
 */
export const getConfigStatus = async (req: Request, res: Response) => {
  try {
    const status = whatsappService.getConfigStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('Failed to get config status', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration status',
    });
  }
};