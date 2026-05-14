require('./load-env');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const email = 'lovely.webdev@gmail.com';
    const password = 'admin123'; // Change this to your preferred password
    const name = 'Admin User';

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log('User already exists:', existingUser.email);
      console.log('Role:', existingUser.role);
      console.log('Email Verified:', existingUser.emailVerified);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'ADMIN',
        emailVerified: true,
        isActive: true,
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log('Email:', user.email);
    console.log('Password:', password);
    console.log('Role:', user.role);
    console.log('Email Verified:', user.emailVerified);
    console.log('\nYou can now login with these credentials.');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
