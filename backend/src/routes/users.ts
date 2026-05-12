import express, { Router } from 'express';
import { getAllUsers, updateUserStatus, getCMSDashboard } from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router: Router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);
router.use(requireAdmin);

// Get all users with pagination and filtering
router.get('/', getAllUsers);

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID',
      });
      return;
    }

    // Import dbManager here to avoid circular imports
    const { dbManager } = await import('../utils/database');

    const user = await dbManager.get(`
      SELECT id, email, name, role, isActive, emailVerified, createdAt, updatedAt
      FROM users
      WHERE id = ?
    `, [userId]);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user',
    });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    const { name, email, role, isActive, emailVerified, password } = req.body;

    console.log(`[UPDATE USER] Request received for user ID: ${userId}`);
    console.log(`[UPDATE USER] Update data:`, { name, email, role, isActive, emailVerified });

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID',
      });
      return;
    }

    // Import dbManager here to avoid circular imports
    const { dbManager } = await import('../utils/database');
    
    // Get current user data before update
    const currentUser = await dbManager.get(`
      SELECT id, email, name, emailVerified, password FROM users WHERE id = ?
    `, [userId]);

    if (!currentUser) {
      console.log(`[UPDATE USER] User not found: ${userId}`);
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    console.log(`[UPDATE USER] Current user:`, { 
      id: currentUser.id, 
      email: currentUser.email, 
      emailVerified: currentUser.emailVerified 
    });

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (typeof isActive === 'boolean') updateData.isActive = isActive ? 1 : 0;
    if (typeof emailVerified === 'boolean') updateData.emailVerified = emailVerified ? 1 : 0;

    console.log(`[UPDATE USER] Prepared update data:`, updateData);

    // Check if emailVerified is being changed from false to true
    const isVerifyingEmail = currentUser.emailVerified === 0 && emailVerified === true;
    console.log(`[UPDATE USER] Is verifying email: ${isVerifyingEmail}`);

    if (Object.keys(updateData).length > 0) {
      const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      const updateQuery = `UPDATE users SET ${setClause}, updatedAt = NOW() WHERE id = ?`;
      const updateValues = [...Object.values(updateData), userId];
      
      console.log(`[UPDATE USER] Executing query:`, updateQuery);
      console.log(`[UPDATE USER] With values:`, updateValues);
      
      const result = await dbManager.run(updateQuery, updateValues);
      console.log(`[UPDATE USER] Update result:`, result);
    }

    // Fetch updated user
    const user = await dbManager.get(`
      SELECT id, email, name, role, isActive, emailVerified, updatedAt
      FROM users
      WHERE id = ?
    `, [userId]);

    console.log(`[UPDATE USER] Updated user:`, { 
      id: user.id, 
      email: user.email, 
      emailVerified: user.emailVerified 
    });

    // If email is being verified, send credentials email
    if (isVerifyingEmail) {
      try {
        const { sendCredentialsEmail } = await import('../utils/email');
        const bcrypt = (await import('bcrypt')).default;
        
        // Generate a temporary password if not provided
        let userPassword = password || 'TempPass123!';
        
        // If password is provided, hash and update it
        if (password) {
          const hashedPassword = await bcrypt.hash(password, 12);
          await dbManager.run(`
            UPDATE users SET password = ?, updatedAt = NOW() WHERE id = ?
          `, [hashedPassword, userId]);
        }
        
        console.log(`[UPDATE USER] Email verified for ${user.email}, sending credentials email`);
        await sendCredentialsEmail(user.email, user.name, userPassword);
        console.log(`[UPDATE USER] ✅ Credentials email sent successfully to ${user.email}`);
      } catch (emailError) {
        console.error('[UPDATE USER] Failed to send credentials email:', emailError);
        // Don't fail update if email fails
      }
    }

    res.json({
      success: true,
      message: isVerifyingEmail 
        ? 'User updated successfully. Login credentials have been sent to their email.' 
        : 'User updated successfully',
      data: { user },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    console.error('[UPDATE USER] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
    });
  }
});

// Update user status (activate/deactivate)
router.patch('/:id/status', updateUserStatus);

// Get comprehensive CMS dashboard
router.get('/dashboard/cms', getCMSDashboard);

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    console.log(`[DELETE USER] Attempting to delete user ID: ${userId}`);

    if (isNaN(userId)) {
      console.log('[DELETE USER] Invalid user ID provided');
      res.status(400).json({
        success: false,
        error: 'Invalid user ID',
      });
      return;
    }

    // Import dbManager here to avoid circular imports
    const { dbManager } = await import('../utils/database');

    // Check if user exists
    const existingUser = await dbManager.get(`
      SELECT id, email, name FROM users WHERE id = ?
    `, [userId]);

    if (!existingUser) {
      console.log(`[DELETE USER] User not found: ${userId}`);
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    console.log(`[DELETE USER] Found user: ${existingUser.name} (${existingUser.email})`);

    // Delete user with cascade - delete all associated data first
    try {
      console.log('[DELETE USER] Starting cascade delete...');
      
      // Delete associated data in correct order (child tables first)
      console.log('[DELETE USER] Deleting notifications...');
      await dbManager.run(`DELETE FROM notifications WHERE userId = ?`, [userId]);
      
      console.log('[DELETE USER] Deleting event attendees...');
      await dbManager.run(`DELETE FROM event_attendees WHERE user_id = ?`, [userId]);
      
      console.log('[DELETE USER] Deleting booking payments...');
      await dbManager.run(`DELETE FROM booking_payments WHERE bookingId IN (SELECT id FROM bookings WHERE userId = ?)`, [userId]);
      
      console.log('[DELETE USER] Deleting bookings...');
      await dbManager.run(`DELETE FROM bookings WHERE userId = ?`, [userId]);
      
      console.log('[DELETE USER] Deleting order items...');
      await dbManager.run(`DELETE FROM order_items WHERE orderId IN (SELECT id FROM orders WHERE customerId = ?)`, [userId]);
      
      console.log('[DELETE USER] Deleting payments...');
      await dbManager.run(`DELETE FROM payments WHERE orderId IN (SELECT id FROM orders WHERE customerId = ?)`, [userId]);
      
      console.log('[DELETE USER] Deleting orders...');
      await dbManager.run(`DELETE FROM orders WHERE customerId = ?`, [userId]);
      
      console.log('[DELETE USER] Deleting reservations...');
      await dbManager.run(`DELETE FROM reservations WHERE userId = ?`, [userId]);
      
      console.log('[DELETE USER] Deleting blogs...');
      await dbManager.run(`DELETE FROM blogs WHERE author_id = ?`, [userId]);
      
      console.log('[DELETE USER] Deleting events...');
      await dbManager.run(`DELETE FROM events WHERE organizer_id = ?`, [userId]);
      
      console.log('[DELETE USER] Deleting menu price history...');
      await dbManager.run(`DELETE FROM menu_price_history WHERE changedBy = ?`, [userId]);
      
      // Finally delete the user
      console.log('[DELETE USER] Deleting user record...');
      await dbManager.run(`DELETE FROM users WHERE id = ?`, [userId]);
      
      console.log(`[DELETE USER] Successfully deleted user ${userId} and all associated data`);
      
      res.json({
        success: true,
        message: 'User and all associated data deleted successfully',
        data: { deletedUser: existingUser },
      });
    } catch (deleteError: any) {
      console.error('[DELETE USER] Cascade delete error:', deleteError);
      console.error('[DELETE USER] Error details:', {
        message: deleteError.message,
        code: deleteError.code,
        errno: deleteError.errno,
        sql: deleteError.sql,
        sqlMessage: deleteError.sqlMessage
      });
      // If cascade delete fails, provide helpful error
      res.status(500).json({
        success: false,
        error: `Failed to delete user: ${deleteError.message || 'Unknown error'}`,
        details: deleteError.sqlMessage || deleteError.message
      });
      return;
    }
  } catch (error: any) {
    console.error('[DELETE USER] Outer error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete user',
    });
  }
});

// Create new user
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role, phone, isActive, emailVerified } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        error: 'Name, email, and password are required',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
      return;
    }

    // Import required modules
    const { dbManager } = await import('../utils/database');
    const bcrypt = (await import('bcrypt')).default;
    const { sendCredentialsEmail } = await import('../utils/email');

    // Check if user already exists
    const existingUser = await dbManager.get(`
      SELECT id FROM users WHERE email = ?
    `, [email]);

    if (existingUser) {
      res.status(400).json({
        success: false,
        error: 'User already exists',
      });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Admin can set emailVerified to true when creating user
    // This allows immediate credential issuance without waiting for email verification
    const isEmailVerified = emailVerified === true ? true : false;

    const result = await dbManager.run(`
      INSERT INTO users (email, password, name, role, isActive, emailVerified, phone, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [email, hashedPassword, name, role || 'CUSTOMER', isActive !== undefined ? isActive : true, isEmailVerified, phone || null]);

    console.log(`[CREATE USER] Insert result:`, result);
    console.log(`[CREATE USER] New user ID: ${(result as any).insertId}`);

    const user = await dbManager.get(`
      SELECT id, email, name, role, isActive, emailVerified, createdAt
      FROM users
      WHERE id = ?
    `, [(result as any).insertId]);

    console.log(`[CREATE USER] Retrieved user:`, user);

    if (!user) {
      console.error('[CREATE USER] Failed to retrieve newly created user');
      throw new Error('User created but failed to retrieve user data');
    }

    // If email is verified, send credentials email to user
    if (isEmailVerified) {
      try {
        console.log(`[CREATE USER] Sending credentials email to ${email}`);
        await sendCredentialsEmail(email, name, password);
        console.log(`[CREATE USER] ✅ Credentials email sent successfully to ${email}`);
      } catch (emailError) {
        console.error('[CREATE USER] Failed to send credentials email:', emailError);
        // Don't fail user creation if email fails
      }
    }

    res.status(201).json({
      success: true,
      message: isEmailVerified 
        ? 'User created successfully. Login credentials have been sent to their email.' 
        : 'User created successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
    });
  }
});

// Resend credentials email
router.post('/:id/resend-credentials', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    const { password } = req.body;

    console.log(`[RESEND CREDENTIALS] Request received for user ID: ${userId}`);

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID',
      });
      return;
    }

    // Import required modules
    const { dbManager } = await import('../utils/database');
    const { sendCredentialsEmail } = await import('../utils/email');
    const bcrypt = (await import('bcrypt')).default;

    // Get user data
    const user = await dbManager.get(`
      SELECT id, email, name, emailVerified FROM users WHERE id = ?
    `, [userId]);

    if (!user) {
      console.log(`[RESEND CREDENTIALS] User not found: ${userId}`);
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Check if email is verified
    if (!user.emailVerified) {
      console.log(`[RESEND CREDENTIALS] Email not verified for user: ${userId}`);
      res.status(400).json({
        success: false,
        error: 'Cannot resend credentials for unverified email. Please verify email first.',
      });
      return;
    }

    // Generate or use provided password
    let userPassword = password || 'TempPass123!';

    // If password is provided, hash and update it
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      await dbManager.run(`
        UPDATE users SET password = ?, updatedAt = NOW() WHERE id = ?
      `, [hashedPassword, userId]);
      console.log(`[RESEND CREDENTIALS] Password updated for user: ${userId}`);
    }

    // Send credentials email
    try {
      console.log(`[RESEND CREDENTIALS] Sending credentials email to ${user.email}`);
      await sendCredentialsEmail(user.email, user.name, userPassword);
      console.log(`[RESEND CREDENTIALS] ✅ Credentials email sent successfully to ${user.email}`);

      res.json({
        success: true,
        message: 'Login credentials have been resent to the user\'s email.',
        data: { user },
      });
    } catch (emailError) {
      console.error('[RESEND CREDENTIALS] Failed to send credentials email:', emailError);
      res.status(500).json({
        success: false,
        error: 'Failed to send credentials email. Please try again later.',
      });
    }
  } catch (error) {
    console.error('[RESEND CREDENTIALS] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend credentials',
    });
  }
});

export default router;