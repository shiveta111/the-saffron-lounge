const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function setupCustomer() {
  try {
    console.log('Setting up customer account...\n');

    // Check if customer exists
    const existing = await prisma.user.findUnique({
      where: { email: 'lovely.webdev@gmail.com' }
    });

    if (existing) {
      console.log('✅ Customer account already exists');
      console.log(`   ID: ${existing.id}`);
      console.log(`   Email: ${existing.email}\n`);
      return;
    }

    // Create customer
    const hashedPassword = await bcrypt.hash('Customer@123', 12);
    
    const customer = await prisma.user.create({
      data: {
        email: 'lovely.webdev@gmail.com',
        password: hashedPassword,
        name: 'Customer User',
        role: 'CUSTOMER',
        emailVerified: true,
        isActive: true,
        phone: '+1-555-9999',
        loyaltyPoints: 0
      }
    });

    console.log('✅ Customer account created');
    console.log(`   ID: ${customer.id}`);
    console.log(`   Email: ${customer.email}\n`);

    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║            CUSTOMER ACCOUNT CREDENTIALS                ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('Email: lovely.webdev@gmail.com');
    console.log('Password: Customer@123');
    console.log('Role: CUSTOMER\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

setupCustomer();
