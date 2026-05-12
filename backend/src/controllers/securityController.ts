import { Request, Response } from 'express';
import * as winston from 'winston';
import { getAllowedOrigins } from '../utils/corsHelper';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'security-controller' },
  transports: [
    new winston.transports.File({ filename: 'logs/security-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/security.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Controller functions
export const getSecuritySettings = async (req: Request, res: Response) => {
  try {
    // Mock security settings - in real app, fetch from database
    const securitySettings = {
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
      },
      sessionSettings: {
        sessionTimeout: 3600000, // 1 hour
        maxConcurrentSessions: 5,
        rememberMeDuration: 604800000, // 7 days
      },
      loginSecurity: {
        maxLoginAttempts: 5,
        lockoutDuration: 900000, // 15 minutes
        enableTwoFactor: false,
        requireEmailVerification: true,
      },
      apiSecurity: {
        rateLimitEnabled: true,
        rateLimitRequests: 100,
        rateLimitWindow: 900000, // 15 minutes
        enableCors: true,
        allowedOrigins: getAllowedOrigins(),
      },
    };

    logger.info('Security settings retrieved successfully');

    res.json({
      success: true,
      data: { settings: securitySettings },
    });
  } catch (error) {
    logger.error('Failed to retrieve security settings', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security settings',
    });
  }
};

export const updateSecuritySettings = async (req: Request, res: Response) => {
  try {
    const { settings } = req.body;

    // Validate required fields
    if (!settings) {
      return res.status(400).json({
        success: false,
        error: 'Security settings are required',
      });
    }

    // In a real application, you would validate and save to database
    // For now, just log the update
    logger.info('Security settings updated successfully', {
      updatedBy: (req as any).user?.userId,
      settings: Object.keys(settings),
    });

    res.json({
      success: true,
      message: 'Security settings updated successfully',
      data: { settings },
    });
  } catch (error) {
    logger.error('Failed to update security settings', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to update security settings',
    });
  }
};

export const getSecurityLogs = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, type, startDate, endDate } = req.query;

    // Mock security logs - in real app, fetch from database
    const securityLogs = [
      {
        id: 1,
        type: 'LOGIN_ATTEMPT',
        message: 'Failed login attempt',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
        timestamp: new Date(Date.now() - 3600000),
        severity: 'WARNING',
      },
      {
        id: 2,
        type: 'PASSWORD_CHANGE',
        message: 'Password changed successfully',
        userId: 123,
        timestamp: new Date(Date.now() - 7200000),
        severity: 'INFO',
      },
    ];

    logger.info('Security logs retrieved successfully', {
      page,
      limit,
      filters: { type, startDate, endDate },
    });

    res.json({
      success: true,
      data: {
        logs: securityLogs,
        pagination: {
          total: securityLogs.length,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(securityLogs.length / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('Failed to retrieve security logs', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security logs',
    });
  }
};

export const getAuditTrail = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, userId, action, startDate, endDate } = req.query;

    // Mock audit trail - in real app, fetch from database
    const auditTrail = [
      {
        id: 1,
        userId: 123,
        action: 'USER_LOGIN',
        resource: 'auth',
        details: 'User logged in successfully',
        ipAddress: '192.168.1.100',
        timestamp: new Date(Date.now() - 1800000),
        success: true,
      },
      {
        id: 2,
        userId: 123,
        action: 'ORDER_CREATE',
        resource: 'orders',
        details: 'Order #1234 created',
        ipAddress: '192.168.1.100',
        timestamp: new Date(Date.now() - 3600000),
        success: true,
      },
    ];

    logger.info('Audit trail retrieved successfully', {
      page,
      limit,
      filters: { userId, action, startDate, endDate },
    });

    res.json({
      success: true,
      data: {
        trail: auditTrail,
        pagination: {
          total: auditTrail.length,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(auditTrail.length / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('Failed to retrieve audit trail', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit trail',
    });
  }
};

export const blockIPAddress = async (req: Request, res: Response) => {
  try {
    const { ipAddress, reason, duration } = req.body;

    if (!ipAddress) {
      return res.status(400).json({
        success: false,
        error: 'IP address is required',
      });
    }

    // In a real application, you would add to blocked IPs list/database
    logger.info('IP address blocked successfully', {
      ipAddress,
      reason,
      duration,
      blockedBy: (req as any).user?.userId,
    });

    res.json({
      success: true,
      message: 'IP address blocked successfully',
      data: {
        ipAddress,
        reason,
        duration,
        blockedAt: new Date(),
        blockedBy: (req as any).user?.userId,
      },
    });
  } catch (error) {
    logger.error('Failed to block IP address', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to block IP address',
    });
  }
};

export const unblockIPAddress = async (req: Request, res: Response) => {
  try {
    const { ipAddress } = req.params;

    if (!ipAddress) {
      return res.status(400).json({
        success: false,
        error: 'IP address is required',
      });
    }

    // In a real application, you would remove from blocked IPs list
    logger.info('IP address unblocked successfully', {
      ipAddress,
      unblockedBy: (req as any).user?.userId,
    });

    res.json({
      success: true,
      message: 'IP address unblocked successfully',
      data: { ipAddress },
    });
  } catch (error) {
    logger.error('Failed to unblock IP address', { error, ipAddress: req.params.ipAddress });
    res.status(500).json({
      success: false,
      error: 'Failed to unblock IP address',
    });
  }
};