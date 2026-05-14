import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, JWTPayload, UserRole } from '../utils/jwt';
import { CustomError } from '../middleware/errorHandler';
import { sendPasswordResetEmail, sendWelcomeEmail, sendOTPEmail, generateOTP } from '../utils/email';

// Standard response helper function
const createSuccessResponse = (message: string, data?: any) => ({
  success: true,
  message,
  ...(data && { data }),
});

const createErrorResponse = (message: string, statusCode: number, error?: string) => {
  const err: CustomError = new Error(message);
  err.statusCode = statusCode;
  if (error) {
    (err as any).error = error;
  }
  return err;
};
import { UserModel } from '../models/User';

// Temporary storage for registration data (in production, use Redis or database)
interface TempRegistrationData {
  email: string;
  name: string;
  password: string;
  otp: string;
  expires: Date;
}

const tempRegistrations = new Map<string, TempRegistrationData>();

// Clean up expired temporary registrations
setInterval(() => {
  const now = new Date();
  for (const [key, data] of tempRegistrations.entries()) {
    if (data.expires < now) {
      tempRegistrations.delete(key);
    }
  }
}, 60000); // Clean up every minute

export const initiateRegistration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      const error: CustomError = new Error('Email, password, and name are required');
      error.statusCode = 400;
      return next(error);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error: CustomError = new Error('Invalid email format');
      error.statusCode = 400;
      return next(error);
    }

    // Validate password strength
    if (password.length < 6) {
      const error: CustomError = new Error('Password must be at least 6 characters long');
      error.statusCode = 400;
      return next(error);
    }

    // Check if user already exists and is verified
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser && existingUser.emailVerified) {
      const error: CustomError = new Error('User already exists');
      error.statusCode = 409;
      return next(error);
    }

    // Generate OTP
    const otp = generateOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store registration data temporarily
    const tempData: TempRegistrationData = {
      email,
      name,
      password,
      otp,
      expires
    };

    tempRegistrations.set(email.toLowerCase(), tempData);

    // Send OTP email (temporarily disabled for signup flow)
    let emailSent = false;
    if (process.env.NODE_ENV !== 'test') {
      // Signup email flow is intentionally disabled for now.
      // try {
      //   await sendOTPEmail(email, otp, 'registration');
      //   console.log(`✅ OTP email sent to ${email} for registration initiation`);
      //   emailSent = true;
      // } catch (emailError: any) {
      //   console.error('❌ Failed to send OTP email:', emailError.message);
      //   console.error('📧 Email error details:', {
      //     code: emailError.code,
      //     responseCode: emailError.responseCode,
      //     command: emailError.command
      //   });
      //   emailSent = false;
      // }

      // In development, log OTP to console for testing
      if (process.env.NODE_ENV === 'development') {
        console.log('═══════════════════════════════════════════════════════');
        console.log('📧 SIGNUP EMAIL TEMPORARILY DISABLED - OTP FOR TESTING:');
        console.log(`   Email: ${email}`);
        console.log(`   OTP: ${otp}`);
        console.log('   Purpose: registration');
        console.log('   (This OTP is valid for 10 minutes)');
        console.log('═══════════════════════════════════════════════════════');
      }
    } else {
      // In test environment, log OTP
      console.log(`[TEST] OTP for ${email}: ${otp}`);
    }

    res.status(200).json({
      success: true,
      message: emailSent 
        ? 'OTP sent successfully. Please verify to complete registration.'
        : 'Registration initiated. Signup email is temporarily disabled. Use OTP from development logs.',
      data: {
        email,
        expiresIn: 600, // 10 minutes in seconds
        emailSent,
        // In development, include OTP in response for testing (remove in production)
        ...(process.env.NODE_ENV === 'development' && !emailSent ? { otp } : {})
      }
    });
  } catch (error) {
    next(error);
  }
};

export const completeRegistration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      const error: CustomError = new Error('Email and OTP are required');
      error.statusCode = 400;
      return next(error);
    }

    // Get temporary registration data
    const tempData = tempRegistrations.get(email.toLowerCase());
    if (!tempData) {
      const error: CustomError = new Error('Registration session expired. Please start over.');
      error.statusCode = 400;
      return next(error);
    }

    // Check if OTP is expired
    if (tempData.expires < new Date()) {
      tempRegistrations.delete(email.toLowerCase());
      const error: CustomError = new Error('OTP has expired. Please start over.');
      error.statusCode = 400;
      return next(error);
    }

    // Check if OTP is correct
    if (tempData.otp !== otp) {
      const error: CustomError = new Error('Invalid OTP');
      error.statusCode = 400;
      return next(error);
    }

    // Remove temp data
    tempRegistrations.delete(email.toLowerCase());

    // Create user (this will use the existing register logic but with verified email)
    const user = await UserModel.create({
      email: tempData.email,
      password: tempData.password,
      name: tempData.name,
      role: UserRole.CUSTOMER,
    });

    // Mark email as verified since OTP was validated
    await UserModel.verifyEmail(user.id);

    // Get updated user
    const updatedUser = await UserModel.findById(user.id);
    if (!updatedUser) {
      throw new Error('Failed to retrieve updated user');
    }

    // Generate tokens
    const tokens = UserModel.generateTokens(updatedUser);

    // Send welcome email (don't block registration if email fails)
    try {
      await sendWelcomeEmail(updatedUser.email, updatedUser.name || 'Valued Customer');
      console.log(`Welcome email sent to ${updatedUser.email}`);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Registration completed successfully',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, name, role } = req.body;

    // Validate input
    if (!email || !password || !name) {
      const error: CustomError = new Error('Email, password, and name are required');
      error.statusCode = 400;
      return next(error);
    }

    // Public registration: Force CUSTOMER role only
    // Admin and other roles must be created through admin panel
    const userRole = UserRole.CUSTOMER;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error: CustomError = new Error('Invalid email format');
      error.statusCode = 400;
      return next(error);
    }

    // Validate password strength
    if (password.length < 6) {
      const error: CustomError = new Error('Password must be at least 6 characters long');
      error.statusCode = 400;
      return next(error);
    }

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);

    if (existingUser) {
      if (existingUser.emailVerified) {
        const error: CustomError = new Error('User already exists');
        error.statusCode = 409;
        return next(error);
      } else {
        // If user exists but email is not verified, update and activate account directly
        const hashedPassword = await hashPassword(password);

        await UserModel.update(existingUser.id, {
          name,
          password: hashedPassword,
        });

        await UserModel.verifyEmail(existingUser.id);

        const updatedUser = await UserModel.findById(existingUser.id);
        if (!updatedUser) {
          throw new Error('Failed to retrieve updated user');
        }

        const tokens = UserModel.generateTokens(updatedUser);

        res.status(201).json({
          success: true,
          message: 'User registered successfully',
          data: {
            user: updatedUser,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          },
        });
        return;
      }
    }

    // Create user with CUSTOMER role (public registration)
    // Note: UserModel.create will hash the password
    const user = await UserModel.create({
      email,
      password, // Pass plain password, UserModel.create will hash it
      name,
      role: userRole,
    });

    // Temporarily bypass email verification for direct signup flow
    await UserModel.verifyEmail(user.id);

    const verifiedUser = await UserModel.findById(user.id);
    if (!verifiedUser) {
      throw new Error('Failed to retrieve verified user');
    }

    // Generate tokens after successful registration
    const accessToken = generateAccessToken({
      userId: verifiedUser.id,
      email: verifiedUser.email,
      role: verifiedUser.role,
    });

    const refreshToken = generateRefreshToken({
      userId: verifiedUser.id,
      email: verifiedUser.email,
      role: verifiedUser.role,
    });

    // Send welcome email (don't block registration if email fails)
    try {
      await sendWelcomeEmail(verifiedUser.email, verifiedUser.name || 'Valued Customer');
      console.log(`Welcome email sent to ${verifiedUser.email}`);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: verifiedUser,
        accessToken,
        refreshToken,
      },
    });
  } catch (error: any) {
    // Handle MySQL unique constraint violations
    if (error.message && error.message.includes('Duplicate entry')) {
      const customError: CustomError = new Error('User already exists');
      customError.statusCode = 409;
      return next(customError);
    }

    // Log unexpected errors for debugging
    console.error('Registration error:', {
      message: error.message,
      stack: error.stack
    });

    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    console.log('Login attempt:', { email: req.body?.email, hasPassword: !!req.body?.password });

    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.error('Login validation failed: Missing email or password', { email: !!email, password: !!password });
      const error: CustomError = new Error('Email and password are required');
      error.statusCode = 400;
      return next(error);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error: CustomError = new Error('Invalid email format');
      error.statusCode = 400;
      return next(error);
    }

    // Find user
    const user = await UserModel.findByEmail(email);

    if (!user) {
      console.error('Login failed: User not found for email:', email);
      const error: CustomError = new Error('Invalid credentials');
      error.statusCode = 401;
      return next(error);
    }

    console.log('User found:', { userId: user.id, email: user.email, hasPassword: !!user.password });

    // Check password
    if (!password || !user.password) {
      console.error('Login error: Missing password or user.password', {
        hasPassword: !!password,
        hasUserPassword: !!user.password,
        userId: user.id
      });
      const error: CustomError = new Error('Invalid credentials');
      error.statusCode = 401;
      return next(error);
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      console.error('Login error: Password verification failed', {
        userId: user.id,
        email: user.email
      });
      const error: CustomError = new Error('Invalid credentials');
      error.statusCode = 401;
      return next(error);
    }

    // Check if account is active
    if (!user.isActive) {
      console.error('Login failed: Account deactivated for user:', { userId: user.id, email });
      const error: CustomError = new Error('Account is deactivated. Please contact support.');
      error.statusCode = 403;
      return next(error);
    }

    // Check if email is verified (if required)
    if (!user.emailVerified) {
      console.log('Login: Email not verified, sending OTP for user:', { userId: user.id, email });
      // Generate OTP
      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Update user with OTP
      await UserModel.setEmailVerificationToken(user.id, otp, otpExpires);

      // Send OTP email
      try {
        await sendOTPEmail(email, otp, 'login');
        console.log(`✅ OTP email sent to ${email} for login verification`);
      } catch (emailError: any) {
        console.error('❌ Failed to send OTP email:', emailError.message);
        
        // In development, log OTP to console for testing
        if (process.env.NODE_ENV === 'development') {
          console.log('═══════════════════════════════════════════════════════');
          console.log('📧 EMAIL NOT CONFIGURED - OTP FOR TESTING:');
          console.log(`   Email: ${email}`);
          console.log(`   OTP: ${otp}`);
          console.log('   Purpose: login');
          console.log('   (This OTP is valid for 10 minutes)');
          console.log('═══════════════════════════════════════════════════════');
        }
        
        // Don't fail login if email fails
      }

      const error: CustomError = new Error('Please verify your email. An OTP has been sent to your email address.');
      error.statusCode = 403;
      return next(error);
    }

    // Generate tokens
    const tokens = UserModel.generateTokens(user);

    console.log('Login successful for user:', { userId: user.id, email: user.email, role: user.role });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    console.error('Login error - unexpected exception:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
      email: req.body?.email
    });
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // In a real application, you might want to blacklist the token
    // For now, we'll just return a success response
    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      const error: CustomError = new Error('Refresh token is required');
      error.statusCode = 400;
      return next(error);
    }

    // Verify refresh token and generate new access token
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as JWTPayload;

    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      const error: CustomError = new Error('User not found');
      error.statusCode = 404;
      return next(error);
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      data: {
        accessToken,
      },
    });
  } catch (error) {
    const err: CustomError = new Error('Invalid refresh token');
    err.statusCode = 401;
    next(err);
  }
};

export const getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      const error: CustomError = new Error('User not authenticated');
      error.statusCode = 401;
      return next(error);
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      const error: CustomError = new Error('User not found');
      error.statusCode = 404;
      return next(error);
    }

    // Return user data without sensitive information
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.emailVerified,
          loyaltyPoints: user.loyaltyPoints,
          phone: user.phone,
          address: user.address,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }
      },
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      const error: CustomError = new Error('Email is required');
      error.statusCode = 400;
      return next(error);
    }

    // Check if user exists
    const user = await UserModel.findByEmail(email);

    if (!user) {
      // Don't reveal if email exists or not for security
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set expiry (1 hour from now)
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    // Update user with reset token
    await UserModel.setPasswordResetToken(email, hashedToken, resetExpires);

    // Send email
    try {
      await sendPasswordResetEmail(email, resetToken);
    } catch (emailError) {
      // If email fails, clear the token
      await UserModel.setPasswordResetToken(email, null, null);
      throw emailError;
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, password } = req.body;

    // Validate input
    if (!token || !password) {
      const error: CustomError = new Error('Token and new password are required');
      error.statusCode = 400;
      return next(error);
    }

    // Validate password strength
    if (password.length < 6) {
      const error: CustomError = new Error('Password must be at least 6 characters long');
      error.statusCode = 400;
      return next(error);
    }

    // The token from the email is already the raw token that was hashed and stored
    // We need to hash it once to match the stored hashed token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Reset password using the model method
    // Note: UserModel.resetPassword will hash the password
    const success = await UserModel.resetPassword(hashedToken, password);

    if (!success) {
      const error: CustomError = new Error('Invalid or expired reset token');
      error.statusCode = 400;
      return next(error);
    }

    res.json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const verifyRegistrationOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      const error: CustomError = new Error('Email and OTP are required');
      error.statusCode = 400;
      return next(error);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error: CustomError = new Error('Invalid email format');
      error.statusCode = 400;
      return next(error);
    }

    // Find user
    const user = await UserModel.findByEmail(email);

    if (!user) {
      const error: CustomError = new Error('User not found');
      error.statusCode = 404;
      return next(error);
    }

    // Check if email is already verified
    if (user.emailVerified) {
      const error: CustomError = new Error('Email already verified');
      error.statusCode = 400;
      return next(error);
    }

    // Check if OTP exists
    if (!user.emailVerificationToken) {
      const error: CustomError = new Error('No OTP found. Please request a new OTP.');
      error.statusCode = 400;
      return next(error);
    }

    // Check if OTP is expired (compare with current time)
    const now = new Date();
    if (!user.emailVerificationExpires || new Date(user.emailVerificationExpires) < now) {
      const error: CustomError = new Error('OTP has expired. Please request a new OTP.');
      error.statusCode = 400;
      return next(error);
    }

    // Validate OTP format (should be 6 digits)
    if (!/^\d{6}$/.test(otp)) {
      const error: CustomError = new Error('OTP must be a 6-digit number');
      error.statusCode = 400;
      return next(error);
    }

    // Check if OTP is correct (case-sensitive string comparison)
    if (user.emailVerificationToken !== otp.trim()) {
      const error: CustomError = new Error('Invalid OTP. Please check and try again.');
      error.statusCode = 400;
      return next(error);
    }

    // Update user as verified
    await UserModel.verifyEmail(user.id);

    // Get updated user
    const updatedUser = await UserModel.findById(user.id);
    if (!updatedUser) {
      throw new Error('Failed to retrieve updated user');
    }

    // Generate tokens
    const tokens = UserModel.generateTokens(updatedUser);

    // Send welcome email (don't block registration if email fails)
    try {
      await sendWelcomeEmail(updatedUser.email, updatedUser.name || 'Valued Customer');
      console.log(`Welcome email sent to ${updatedUser.email}`);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    next(error);
  }
};

export const verifyLoginOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      const error: CustomError = new Error('Email and OTP are required');
      error.statusCode = 400;
      return next(error);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error: CustomError = new Error('Invalid email format');
      error.statusCode = 400;
      return next(error);
    }

    // Validate OTP format (should be 6 digits)
    if (!/^\d{6}$/.test(otp)) {
      const error: CustomError = new Error('OTP must be a 6-digit number');
      error.statusCode = 400;
      return next(error);
    }

    // Find user
    const user = await UserModel.findByEmail(email);

    if (!user) {
      const error: CustomError = new Error('User not found');
      error.statusCode = 404;
      return next(error);
    }

    // Check if account is active
    if (!user.isActive) {
      const error: CustomError = new Error('Account is deactivated. Please contact support.');
      error.statusCode = 403;
      return next(error);
    }

    // Check if email is already verified
    if (user.emailVerified) {
      const error: CustomError = new Error('Email already verified');
      error.statusCode = 400;
      return next(error);
    }

    // Check if OTP exists
    if (!user.emailVerificationToken) {
      const error: CustomError = new Error('No OTP found. Please request a new OTP.');
      error.statusCode = 400;
      return next(error);
    }

    // Check if OTP is expired (compare with current time)
    const now = new Date();
    if (!user.emailVerificationExpires || new Date(user.emailVerificationExpires) < now) {
      const error: CustomError = new Error('OTP has expired. Please request a new OTP.');
      error.statusCode = 400;
      return next(error);
    }

    // Check if OTP is correct (case-sensitive string comparison)
    if (user.emailVerificationToken !== otp.trim()) {
      const error: CustomError = new Error('Invalid OTP. Please check and try again.');
      error.statusCode = 400;
      return next(error);
    }

    // Update user as verified
    await UserModel.verifyEmail(user.id);

    // Get updated user
    const updatedUser = await UserModel.findById(user.id);
    if (!updatedUser) {
      throw new Error('Failed to retrieve updated user');
    }

    // Generate tokens
    const tokens = UserModel.generateTokens(updatedUser);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You are now logged in.',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    next(error);
  }
};

/**
 * Resend OTP for email verification
 * Supports both registration and login flows
 */
export const resendOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, purpose } = req.body; // purpose: 'registration' | 'login'

    // Validate input
    if (!email) {
      const error: CustomError = new Error('Email is required');
      error.statusCode = 400;
      return next(error);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error: CustomError = new Error('Invalid email format');
      error.statusCode = 400;
      return next(error);
    }

    // Find user
    const user = await UserModel.findByEmail(email);

    if (!user) {
      const error: CustomError = new Error('User not found');
      error.statusCode = 404;
      return next(error);
    }

    // Check if account is active
    if (!user.isActive) {
      const error: CustomError = new Error('Account is deactivated. Please contact support.');
      error.statusCode = 403;
      return next(error);
    }

    // Check if email is already verified
    if (user.emailVerified) {
      const error: CustomError = new Error('Email is already verified. No OTP needed.');
      error.statusCode = 400;
      return next(error);
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Update user with new OTP
    await UserModel.setEmailVerificationToken(user.id, otp, otpExpires);

    // Determine email purpose
    const emailPurpose: 'registration' | 'login' = purpose === 'login' ? 'login' : 'registration';

    // Send OTP email (temporarily disabled for registration purpose)
    let emailSent = false;
    if (emailPurpose === 'registration') {
      // Registration email resend is intentionally disabled for now.
      if (process.env.NODE_ENV === 'development') {
        console.log('═══════════════════════════════════════════════════════');
        console.log('📧 SIGNUP EMAIL TEMPORARILY DISABLED - OTP FOR TESTING:');
        console.log(`   Email: ${email}`);
        console.log(`   OTP: ${otp}`);
        console.log(`   Purpose: ${emailPurpose}`);
        console.log('   (This OTP is valid for 10 minutes)');
        console.log('═══════════════════════════════════════════════════════');
      }
      emailSent = false;
    } else {
      try {
        await sendOTPEmail(email, otp, emailPurpose);
        emailSent = true;
        console.log(`✅ OTP email resent to ${email} for ${emailPurpose}`);
      } catch (emailError: any) {
        console.error('❌ Failed to send OTP email:', emailError.message);
        
        // In development, log OTP to console for testing
        if (process.env.NODE_ENV === 'development') {
          console.log('═══════════════════════════════════════════════════════');
          console.log('📧 EMAIL NOT CONFIGURED - OTP FOR TESTING:');
          console.log(`   Email: ${email}`);
          console.log(`   OTP: ${otp}`);
          console.log(`   Purpose: ${emailPurpose}`);
          console.log('   (This OTP is valid for 10 minutes)');
          console.log('═══════════════════════════════════════════════════════');
        }
        
        // Don't fail if email fails - user can still use OTP from logs in dev
        emailSent = false;
      }
    }

    res.status(200).json({
      success: true,
      message: emailSent 
        ? 'OTP has been resent successfully.'
        : emailPurpose === 'registration'
          ? 'OTP has been regenerated. Signup email is temporarily disabled. Use OTP from development logs.'
          : 'OTP has been regenerated. Please check your email. If email is not configured, check server logs for OTP.',
      data: {
        email,
        expiresIn: 600, // 10 minutes in seconds
        emailSent,
        // In development, include OTP in response for testing (remove in production)
        ...(process.env.NODE_ENV === 'development' && !emailSent ? { otp } : {})
      },
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    next(error);
  }
};