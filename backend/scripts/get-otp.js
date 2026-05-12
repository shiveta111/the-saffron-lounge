#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
require('./load-env');

async function getOTP() {
  const prisma = new PrismaClient();

  try {
    // Check if blog table exists
    try {
      const blogs = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='blogs'`;
      console.log('Blog table exists:', blogs.length > 0);
    } catch (e) {
      console.log('Error checking blog table:', e.message);
    }

    // Try to query blogs
    try {
      const blogs = await prisma.blog.findMany();
      console.log('Blogs found:', blogs.length);
    } catch (e) {
      console.log('Error querying blogs:', e.message);
    }

    // Update admin user password
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('admin123', 12);

    const adminUser = await prisma.user.update({
      where: { email: 'admin@test.com' },
      data: {
        password: hashedPassword,
        emailVerified: true,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true
      }
    });

    console.log('Admin user updated:');
    console.log(`ID: ${adminUser.id}`);
    console.log(`Email: ${adminUser.email}`);
    console.log(`Name: ${adminUser.name}`);
    console.log(`Role: ${adminUser.role}`);
    console.log(`Verified: ${adminUser.emailVerified}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getOTP();