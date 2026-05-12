import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password';
import { UserRole } from '../src/utils/jwt';

const prisma = new PrismaClient();

async function createTestUsers() {
  console.log('👥 Creating test users...\n');
  
  try {
    // Create test customer
    const customerPassword = await hashPassword('password123');
    const customer = await prisma.user.upsert({
      where: { email: 'customer@test.com' },
      update: {
        password: customerPassword,
        emailVerified: true,
        isActive: true,
      },
      create: {
        email: 'customer@test.com',
        password: customerPassword,
        name: 'Test Customer',
        role: UserRole.CUSTOMER,
        emailVerified: true,
        isActive: true,
      },
    });
    console.log('✅ Test Customer created');
    console.log(`   Email: customer@test.com`);
    console.log(`   Password: password123`);
    console.log(`   Role: ${customer.role}\n`);
    
    // Create test admin
    const adminPassword = await hashPassword('admin123');
    const admin = await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {
        password: adminPassword,
        emailVerified: true,
        isActive: true,
      },
      create: {
        email: 'admin@test.com',
        password: adminPassword,
        name: 'Test Admin',
        role: UserRole.ADMIN,
        emailVerified: true,
        isActive: true,
      },
    });
    console.log('✅ Test Admin created');
    console.log(`   Email: admin@test.com`);
    console.log(`   Password: admin123`);
    console.log(`   Role: ${admin.role}\n`);
    
    console.log('✅ Test users ready!\n');
    
  } catch (error) {
    console.error('❌ Failed to create test users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();
