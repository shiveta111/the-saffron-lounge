const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetCustomerPassword() {
  try {
    console.log('Resetting customer password...\n');

    const hashedPassword = await bcrypt.hash('Customer@123', 12);
    
    const customer = await prisma.user.update({
      where: { email: 'lovely.webdev@gmail.com' },
      data: {
        password: hashedPassword,
        emailVerified: true,
        isActive: true
      }
    });

    console.log('✅ Customer password reset successfully');
    console.log(`   ID: ${customer.id}`);
    console.log(`   Email: ${customer.email}`);
    console.log(`   Password: Customer@123\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetCustomerPassword();
