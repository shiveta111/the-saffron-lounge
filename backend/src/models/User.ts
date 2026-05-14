/**
 * User Model - Handles all user-related database operations
 * Provides CRUD operations for user management with proper validation and security
 */

import { dbManager } from '../utils/database';
import bcrypt from 'bcrypt';
import { generateAccessToken, generateRefreshToken, UserRole } from '../utils/jwt';

export interface User {
  id: number;
  email: string;
  password: string;
  name: string | null;
  role: UserRole;
  emailVerified: boolean;
  emailVerificationToken: string | null;
  emailVerificationExpires: Date | null;
  passwordResetToken: string | null;
  passwordResetExpires: Date | null;
  isActive: boolean;
  loyaltyPoints: number;
  phone: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  name?: string;
  role?: UserRole;
  emailVerified?: boolean;
  isActive?: boolean;
}

export interface UpdateUserData {
  name?: string;
  phone?: string;
  address?: string;
  isActive?: boolean;
  loyaltyPoints?: number;
  password?: string;
}

export class UserModel {
  /**
   * Find user by ID
   */
  static async findById(id: number): Promise<User | null> {
    try {
      const sql = `
        SELECT id, email, password, name, role, emailVerified, emailVerificationToken,
               emailVerificationExpires, passwordResetToken, passwordResetExpires,
               isActive, loyaltyPoints, phone, address, createdAt, updatedAt
        FROM users WHERE id = ? AND isActive = true
      `;
      const result = await dbManager.get(sql, [id]);
      return result ? this.mapRowToUser(result) : null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw new Error('Failed to find user');
    }
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    try {
      const sql = `
        SELECT id, email, password, name, role, emailVerified, emailVerificationToken,
               emailVerificationExpires, passwordResetToken, passwordResetExpires,
               isActive, loyaltyPoints, phone, address, createdAt, updatedAt
        FROM users WHERE email = ?
      `;
      const result = await dbManager.get(sql, [email]);
      return result ? this.mapRowToUser(result) : null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw new Error('Failed to find user');
    }
  }

  /**
   * Create new user
   */
  static async create(userData: CreateUserData): Promise<User> {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      const sql = `
        INSERT INTO users (email, password, name, role, emailVerified, isActive, loyaltyPoints, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, 0, NOW(), NOW())
      `;

      const result = await dbManager.run(sql, [
        userData.email,
        hashedPassword,
        userData.name || null,
        userData.role || UserRole.CUSTOMER,
        userData.emailVerified || false,
        userData.isActive !== undefined ? userData.isActive : true
      ]);

      if (!result.insertId) {
        throw new Error('Failed to create user');
      }

      const user = await this.findById(result.insertId);
      if (!user) {
        throw new Error('Failed to retrieve created user');
      }

      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * Update user
   */
  static async update(id: number, updateData: UpdateUserData): Promise<User | null> {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (updateData.name !== undefined) {
        fields.push('name = ?');
        values.push(updateData.name);
      }
      if (updateData.phone !== undefined) {
        fields.push('phone = ?');
        values.push(updateData.phone);
      }
      if (updateData.address !== undefined) {
        fields.push('address = ?');
        values.push(updateData.address);
      }
      if (updateData.isActive !== undefined) {
        fields.push('isActive = ?');
        values.push(updateData.isActive);
      }
      if (updateData.loyaltyPoints !== undefined) {
        fields.push('loyaltyPoints = ?');
        values.push(updateData.loyaltyPoints);
      }
      if (updateData.password !== undefined) {
        // Password is already hashed when passed to this method
        fields.push('password = ?');
        values.push(updateData.password);
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      fields.push('updatedAt = NOW()');
      values.push(id);

      const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
      await dbManager.run(sql, values);

      return await this.findById(id);
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  /**
   * Delete user (soft delete by setting isActive = false)
   */
  static async delete(id: number): Promise<boolean> {
    try {
      const sql = 'UPDATE users SET isActive = false, updatedAt = NOW() WHERE id = ?';
      const result = await dbManager.run(sql, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Get all users with pagination
   */
  static async findAll(page: number = 1, limit: number = 10): Promise<{ users: User[]; total: number }> {
    try {
      const offset = (page - 1) * limit;

      // Get total count
      const countSql = 'SELECT COUNT(*) as total FROM users WHERE isActive = true';
      const countResult = await dbManager.get(countSql);
      const total = countResult.total;

      // Get users
      const sql = `
        SELECT id, email, password, name, role, emailVerified, emailVerificationToken,
               emailVerificationExpires, passwordResetToken, passwordResetExpires,
               isActive, loyaltyPoints, phone, address, createdAt, updatedAt
        FROM users
        WHERE isActive = true
        ORDER BY createdAt DESC
        LIMIT ? OFFSET ?
      `;

      const results = await dbManager.query(sql, [limit, offset]);
      const users = results.map((row: any) => this.mapRowToUser(row));

      return { users, total };
    } catch (error) {
      console.error('Error finding all users:', error);
      throw new Error('Failed to retrieve users');
    }
  }

  /**
   * Verify user password
   */
  static async verifyPassword(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.findByEmail(email);
      if (!user) {
        console.error('verifyPassword: User not found for email:', email);
        return null;
      }

      if (!user.password) {
        console.error('verifyPassword: User has no password hash:', { userId: user.id, email });
        return null;
      }

      if (!password) {
        console.error('verifyPassword: No password provided for user:', { userId: user.id, email });
        return null;
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        console.error('verifyPassword: Password verification failed for user:', { userId: user.id, email });
      }
      return isValid ? user : null;
    } catch (error) {
      console.error('Error verifying password:', error);
      throw new Error('Failed to verify password');
    }
  }

  /**
   * Generate authentication tokens for user
   */
  static generateTokens(user: User): { accessToken: string; refreshToken: string } {
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Set email verification token
   */
  static async setEmailVerificationToken(id: number, token: string, expires: Date): Promise<boolean> {
    try {
      const sql = `
        UPDATE users
        SET emailVerificationToken = ?, emailVerificationExpires = ?, updatedAt = NOW()
        WHERE id = ?
      `;
      const result = await dbManager.run(sql, [token, expires, id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error setting email verification token:', error);
      throw new Error('Failed to set verification token');
    }
  }

  /**
   * Verify email
   */
  static async verifyEmail(id: number): Promise<boolean> {
    try {
      const sql = `
        UPDATE users
        SET emailVerified = true, emailVerificationToken = NULL, emailVerificationExpires = NULL, updatedAt = NOW()
        WHERE id = ?
      `;
      const result = await dbManager.run(sql, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error verifying email:', error);
      throw new Error('Failed to verify email');
    }
  }

  /**
   * Set password reset token
   */
  static async setPasswordResetToken(email: string, token: string | null, expires: Date | null): Promise<boolean> {
    try {
      const sql = `
        UPDATE users
        SET passwordResetToken = ?, passwordResetExpires = ?, updatedAt = UTC_TIMESTAMP()
        WHERE email = ?
      `;
      const result = await dbManager.run(sql, [token, expires, email]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error setting password reset token:', error);
      throw new Error('Failed to set password reset token');
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      const sql = `
        UPDATE users
        SET password = ?, passwordResetToken = NULL, passwordResetExpires = NULL, updatedAt = UTC_TIMESTAMP()
        WHERE passwordResetToken = ? AND passwordResetExpires > UTC_TIMESTAMP()
      `;
      const result = await dbManager.run(sql, [hashedPassword, token]);

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw new Error('Failed to reset password');
    }
  }

  /**
   * Add loyalty points
   */
  static async addLoyaltyPoints(id: number, points: number): Promise<boolean> {
    try {
      const sql = `
        UPDATE users
        SET loyaltyPoints = loyaltyPoints + ?, updatedAt = NOW()
        WHERE id = ?
      `;
      const result = await dbManager.run(sql, [points, id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error adding loyalty points:', error);
      throw new Error('Failed to add loyalty points');
    }
  }

  /**
   * Map database row to User interface
   */
  private static mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      name: row.name,
      role: row.role as UserRole,
      emailVerified: Boolean(row.emailVerified),
      emailVerificationToken: row.emailVerificationToken,
      emailVerificationExpires: row.emailVerificationExpires ? new Date(row.emailVerificationExpires) : null,
      passwordResetToken: row.passwordResetToken,
      passwordResetExpires: row.passwordResetExpires ? new Date(row.passwordResetExpires) : null,
      isActive: Boolean(row.isActive),
      loyaltyPoints: row.loyaltyPoints || 0,
      phone: row.phone,
      address: row.address,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }
}