const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('Creating admin user...');

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { email: 'admin@test.com' }
    });

    // Hash password
    const hashedPassword = await bcrypt.hash('Admin123!', 12);

    if (existingAdmin) {
      // Update the existing user with correct password and settings
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          password: hashedPassword,
          name: 'Admin User',
          role: 'ADMIN',
          emailVerified: true,
          isActive: true,
          phone: '+91-9876543210',
          address: '123 Admin Street, Bangalore, Karnataka 560001',
          loyaltyPoints: 0
        }
      });
      console.log('Admin user updated successfully:', existingAdmin.email);
      console.log('Password: Admin123!');
      return;
    }

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'ADMIN',
        emailVerified: true,
        isActive: true,
        phone: '+91-9876543210',
        address: '123 Admin Street, Bangalore, Karnataka 560001',
        loyaltyPoints: 0
      }
    });

    console.log('Admin user created successfully:', adminUser.email);
    console.log('Password: Admin123!');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();