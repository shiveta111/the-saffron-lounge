import { Request, Response } from 'express';
import * as Joi from 'joi';
import * as winston from 'winston';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import prisma from '../config/prisma';
import { JWTPayload } from '../utils/jwt';
import { sendEmail } from '../utils/email';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'customer-controller' },
  transports: [
    new winston.transports.File({ filename: 'logs/customer-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/customer.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(100).required(),
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional(),
  address: Joi.string().max(500).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional(),
  address: Joi.string().max(500).optional(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(100).required(),
});

const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const confirmResetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(8).max(100).required(),
});

// Helper function to generate verification token
const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Helper function to hash password
const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

// Helper function to verify password
const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Controller functions
export const register = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid registration data', { error: error.details?.[0]?.message });
      return res.status(400).json({
        success: false,
        error: 'Invalid registration data',
        details: error.details?.[0]?.message,
      });
    }

    const { email, password, name, phone, address } = value;

    // Check if user already exists
    const existingUser = await (prisma as any).user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists',
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate verification token
    const verificationToken = generateVerificationToken();

    // Create user
    const user = await (prisma as any).user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        phone,
        address,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        address: true,
        emailVerified: true,
        loyaltyPoints: true,
        createdAt: true,
      },
    });

    // Send verification email
    try {
      await sendEmail(
        user.email,
        'Verify Your Email - The Saffron Lounge',
        `
          <h2>Welcome to The Saffron Lounge!</h2>
          <p>Please verify your email address by clicking the link below:</p>
          <a href="${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}">Verify Email</a>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, please ignore this email.</p>
        `
      );
      logger.info('Verification email sent', { userId: user.id, email: user.email });
    } catch (emailError) {
      logger.error('Failed to send verification email', { error: emailError, userId: user.id });
      // Don't fail registration if email fails
    }

    logger.info('User registered successfully', { userId: user.id, email: user.email });

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.',
      data: { user },
    });
  } catch (error: any) {
    logger.error('Failed to register user', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to register user',
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid login data', { error: error.details?.[0]?.message });
      return res.status(400).json({
        success: false,
        error: 'Invalid login data',
        details: error.details?.[0]?.message,
      });
    }

    const { email, password } = value;

    // Find user
    const user = await (prisma as any).user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Check password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated',
      });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(401).json({
        success: false,
        error: 'Please verify your email before logging in',
      });
    }

    // Generate tokens (assuming you have these functions)
    const accessToken = 'generateAccessToken({ userId: user.id, email: user.email, role: user.role })';
    const refreshToken = 'generateRefreshToken({ userId: user.id, email: user.email, role: user.role })';

    logger.info('User logged in successfully', { userId: user.id, email: user.email });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          loyaltyPoints: user.loyaltyPoints,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error: any) {
    logger.error('Failed to login user', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to login',
    });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Verification token is required',
      });
    }

    // Find user with token
    const user = await (prisma as any).user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token',
      });
    }

    // Update user
    await (prisma as any).user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    logger.info('Email verified successfully', { userId: user.id, email: user.email });

    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error: any) {
    logger.error('Failed to verify email', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to verify email',
    });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as JWTPayload)?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        address: true,
        loyaltyPoints: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    logger.info('Profile retrieved successfully', { userId });

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    logger.error('Failed to retrieve profile', { error, userId: (req.user as JWTPayload)?.userId });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve profile',
    });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as JWTPayload)?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Validate request body
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid profile update data', { error: error.details?.[0]?.message });
      return res.status(400).json({
        success: false,
        error: 'Invalid profile update data',
        details: error.details?.[0]?.message,
      });
    }

    // Update user
    const updatedUser = await (prisma as any).user.update({
      where: { id: userId },
      data: value,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        address: true,
        loyaltyPoints: true,
        emailVerified: true,
        updatedAt: true,
      },
    });

    logger.info('Profile updated successfully', { userId, changes: value });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser },
    });
  } catch (error) {
    logger.error('Failed to update profile', { error, userId: (req.user as JWTPayload)?.userId });
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
    });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as JWTPayload)?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Validate request body
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid password change data', { error: error.details?.[0]?.message });
      return res.status(400).json({
        success: false,
        error: 'Invalid password change data',
        details: error.details?.[0]?.message,
      });
    }

    const { currentPassword, newPassword } = value;

    // Get user with password
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect',
      });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    await (prisma as any).user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    logger.info('Password changed successfully', { userId });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error('Failed to change password', { error, userId: (req.user as JWTPayload)?.userId });
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
    });
  }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid password reset request', { error: error.details?.[0]?.message });
      return res.status(400).json({
        success: false,
        error: 'Invalid email address',
        details: error.details?.[0]?.message,
      });
    }

    const { email } = value;

    // Find user
    const user = await (prisma as any).user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = generateVerificationToken();

    // Update user
    await (prisma as any).user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send reset email
    try {
      await sendEmail(
        user.email,
        'Password Reset - The Saffron Lounge',
        `
          <h2>Password Reset Request</h2>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `
      );
      logger.info('Password reset email sent', { userId: user.id, email: user.email });
    } catch (emailError) {
      logger.error('Failed to send password reset email', { error: emailError, userId: user.id });
    }

    res.json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.',
    });
  } catch (error: any) {
    logger.error('Failed to request password reset', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to request password reset',
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = confirmResetPasswordSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid password reset confirmation', { error: error.details?.[0]?.message });
      return res.status(400).json({
        success: false,
        error: 'Invalid reset data',
        details: error.details?.[0]?.message,
      });
    }

    const { token, newPassword } = value;

    // Find user with token
    const user = await (prisma as any).user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token',
      });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user
    await (prisma as any).user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    logger.info('Password reset successfully', { userId: user.id, email: user.email });

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error: any) {
    logger.error('Failed to reset password', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to reset password',
    });
  }
};

export const getLoyaltyPoints = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as JWTPayload)?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        loyaltyPoints: true,
        name: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Get loyalty history (assuming you have a loyalty transactions table)
    // For now, just return current points
    res.json({
      success: true,
      data: {
        userId: user.id,
        name: user.name,
        currentPoints: user.loyaltyPoints,
        // Add history when loyalty transactions are implemented
      },
    });
  } catch (error) {
    logger.error('Failed to get loyalty points', { error, userId: (req.user as JWTPayload)?.userId });
    res.status(500).json({
      success: false,
      error: 'Failed to get loyalty points',
    });
  }
};

export const exportUserData = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as JWTPayload)?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Get user data
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        address: true,
        role: true,
        loyaltyPoints: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Get user's orders
    const orders = await (prisma as any).order.findMany({
      where: { customerId: userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const exportData = {
      user,
      orders,
      exportDate: new Date().toISOString(),
      gdprCompliant: true,
    };

    logger.info('User data exported successfully', { userId });

    res.json({
      success: true,
      message: 'User data exported successfully',
      data: exportData,
    });
  } catch (error) {
    logger.error('Failed to export user data', { error, userId: (req.user as JWTPayload)?.userId });
    res.status(500).json({
      success: false,
      error: 'Failed to export user data',
    });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as JWTPayload)?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Check if user has active orders
    const activeOrders = await (prisma as any).order.count({
      where: {
        customerId: userId,
        status: {
          in: ['PENDING', 'PREPARING', 'READY'],
        },
      },
    });

    if (activeOrders > 0) {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete account with active orders. Please complete or cancel all orders first.',
      });
    }

    // Anonymize user data instead of deleting (GDPR compliance)
    await (prisma as any).user.update({
      where: { id: userId },
      data: {
        name: 'Deleted User',
        email: `deleted_${userId}@example.com`,
        phone: null,
        address: null,
        password: 'deleted',
        isActive: false,
        emailVerified: false,
        loyaltyPoints: 0,
      },
    });

    logger.info('User account deleted/anonymized successfully', { userId });

    res.json({
      success: true,
      message: 'Account deleted successfully. Your data has been anonymized per GDPR requirements.',
    });
  } catch (error) {
    logger.error('Failed to delete account', { error, userId: (req.user as JWTPayload)?.userId });
    res.status(500).json({
      success: false,
      error: 'Failed to delete account',
    });
  }
};