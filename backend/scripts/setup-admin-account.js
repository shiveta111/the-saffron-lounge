const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function setupAdminAccount() {
  try {
    const adminEmail = 'lishamalik2001@gmail.com';
    const adminPassword = 'Admin@123';
    const adminName = 'Lisha Malik';

    console.log('Setting up admin account...\n');

    // Check if admin exists
    let admin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (admin) {
      console.log('✅ Admin account exists');
      console.log('   ID:', admin.id);
      console.log('   Email:', admin.email);
      console.log('   Email Verified:', admin.emailVerified);
      console.log('   Role:', admin.role);

      // Update password and verify email if needed
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      await prisma.user.update({
        where: { email: adminEmail },
        data: {
          password: hashedPassword,
          emailVerified: true,
          name: adminName,
          role: 'ADMIN',
          isActive: true
        }
      });

      console.log('\n✅ Admin account updated');
      console.log('   Email verified: true');
      console.log('   Password reset to: Admin@123');
    } else {
      console.log('Creating new admin account...');
      
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      admin = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: adminName,
          role: 'ADMIN',
          emailVerified: true,
          isActive: true,
          loyaltyPoints: 0
        }
      });

      console.log('✅ Admin account created');
      console.log('   ID:', admin.id);
      console.log('   Email:', admin.email);
    }

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              ADMIN ACCOUNT CREDENTIALS                 ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`Role: ADMIN`);
    console.log('');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupAdminAccount();
