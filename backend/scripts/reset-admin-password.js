const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function resetAdminPassword() {
  try {
    const email = 'lishamalik2001@gmail.com';
    const newPassword = 'Admin@123';

    console.log('Resetting password for:', email);
    console.log('New password:', newPassword);
    console.log('');

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('❌ User not found with email:', email);
      console.log('');
      console.log('Available users:');
      const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true }
      });
      users.forEach(u => {
        console.log(`  - ${u.email} (${u.name}) - ${u.role}`);
      });
      return;
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update the user
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        emailVerified: true,
        isActive: true,
        role: 'ADMIN'
      }
    });

    console.log('✅ Password reset successful!');
    console.log('');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║              LOGIN CREDENTIALS                         ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`Email: ${email}`);
    console.log(`Password: ${newPassword}`);
    console.log(`Role: ${user.role}`);
    console.log('');
    console.log('You can now login with these credentials.');

    // Test the password
    const isValid = await bcrypt.compare(newPassword, hashedPassword);
    console.log('');
    console.log('Password verification test:', isValid ? '✅ PASS' : '❌ FAIL');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();
