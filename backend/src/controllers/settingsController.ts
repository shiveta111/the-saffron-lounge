import { Request, Response } from 'express';
import * as winston from 'winston';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'settings-controller' },
  transports: [
    new winston.transports.File({ filename: 'logs/settings-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/settings.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Controller functions
export const getApplicationSettings = async (req: Request, res: Response) => {
  try {
    // Mock application settings - in real app, fetch from database
    const appSettings = {
      general: {
        siteName: 'The Saffron Lounge',
        siteDescription: 'Premium dining experience',
        contactEmail: 'info@saffronlounge.com',
        contactPhone: '+1-555-0123',
        timezone: 'UTC',
        language: 'en',
      },
      business: {
        openingHours: {
          monday: { open: '11:00', close: '22:00' },
          tuesday: { open: '11:00', close: '22:00' },
          wednesday: { open: '11:00', close: '22:00' },
          thursday: { open: '11:00', close: '22:00' },
          friday: { open: '11:00', close: '23:00' },
          saturday: { open: '12:00', close: '23:00' },
          sunday: { open: '12:00', close: '21:00' },
        },
        maxReservationsPerDay: 50,
        reservationDuration: 120, // minutes
        cancellationPolicy: '24 hours',
      },
      notifications: {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        orderConfirmations: true,
        reservationReminders: true,
        marketingEmails: false,
      },
      integrations: {
        paymentGateway: 'stripe',
        emailService: 'smtp',
        smsService: 'twilio',
        analytics: 'google-analytics',
      },
    };

    logger.info('Application settings retrieved successfully');

    res.json({
      success: true,
      data: { settings: appSettings },
    });
  } catch (error) {
    logger.error('Failed to retrieve application settings', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve application settings',
    });
  }
};

export const updateApplicationSettings = async (req: Request, res: Response) => {
  try {
    const { settings } = req.body;

    if (!settings) {
      return res.status(400).json({
        success: false,
        error: 'Settings are required',
      });
    }

    // Validate settings structure
    const allowedCategories = ['general', 'business', 'notifications', 'integrations'];
    const invalidCategories = Object.keys(settings).filter(cat => !allowedCategories.includes(cat));

    if (invalidCategories.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid setting categories: ${invalidCategories.join(', ')}`,
      });
    }

    // In a real application, you would validate and save to database
    logger.info('Application settings updated successfully', {
      updatedBy: (req as any).user?.userId,
      categories: Object.keys(settings),
    });

    res.json({
      success: true,
      message: 'Application settings updated successfully',
      data: { settings },
    });
  } catch (error) {
    logger.error('Failed to update application settings', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to update application settings',
    });
  }
};

export const getUserPreferences = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Mock user preferences - in real app, fetch from database
    const userPreferences = {
      notifications: {
        email: true,
        sms: false,
        push: true,
        marketing: false,
        orderUpdates: true,
        reservationReminders: true,
      },
      privacy: {
        profileVisibility: 'private',
        showEmail: false,
        showPhone: false,
        allowDataCollection: true,
      },
      preferences: {
        language: 'en',
        timezone: 'UTC',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        theme: 'light',
      },
    };

    logger.info('User preferences retrieved successfully', { userId });

    res.json({
      success: true,
      data: { preferences: userPreferences },
    });
  } catch (error) {
    logger.error('Failed to retrieve user preferences', { error, userId: (req as any).user?.userId });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user preferences',
    });
  }
};

export const updateUserPreferences = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { preferences } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!preferences) {
      return res.status(400).json({
        success: false,
        error: 'Preferences are required',
      });
    }

    // In a real application, you would validate and save to database
    logger.info('User preferences updated successfully', {
      userId,
      updatedBy: userId,
      categories: Object.keys(preferences),
    });

    res.json({
      success: true,
      message: 'User preferences updated successfully',
      data: { preferences },
    });
  } catch (error) {
    logger.error('Failed to update user preferences', {
      error,
      userId: (req as any).user?.userId,
      body: req.body
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update user preferences',
    });
  }
};

import { env } from '../config/env';

export const getSystemInfo = async (req: Request, res: Response) => {
  try {
    const systemInfo = {
      version: env.optional.npmPackageVersion,
      environment: env.server.nodeEnv,
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      database: {
        type: 'MySQL',
        version: '8.0+',
        connectionStatus: 'healthy',
      },
      cache: {
        type: 'NodeCache',
        status: 'healthy',
      },
      lastDeployment: new Date().toISOString(),
      maintenance: {
        scheduled: false,
        message: null,
      },
    };

    logger.info('System information retrieved successfully');

    res.json({
      success: true,
      data: { system: systemInfo },
    });
  } catch (error) {
    logger.error('Failed to retrieve system information', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system information',
    });
  }
};

export const resetSettings = async (req: Request, res: Response) => {
  try {
    const { category } = req.body;

    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Category is required for reset',
      });
    }

    const allowedCategories = ['general', 'business', 'notifications', 'integrations', 'user-preferences'];

    if (!allowedCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: `Invalid category: ${category}`,
      });
    }

    // In a real application, you would reset to default values in database
    logger.info('Settings reset successfully', {
      category,
      resetBy: (req as any).user?.userId,
    });

    res.json({
      success: true,
      message: `Settings reset successfully for category: ${category}`,
      data: { category, resetAt: new Date() },
    });
  } catch (error) {
    logger.error('Failed to reset settings', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to reset settings',
    });
  }
};