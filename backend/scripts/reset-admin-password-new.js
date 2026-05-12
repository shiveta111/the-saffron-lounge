const prisma = require('./lib/prisma');
const bcrypt = require('bcrypt');

async function resetAdminPassword() {
  try {
    const email = 'lovely.webdev@gmail.com';
    const newPassword = 'Admin@123';
    
    console.log(`Resetting password for ${email}...`);
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the user
    const user = await prisma.user.update({
      where: { email },
      data: { 
        password: hashedPassword,
        isActive: true,
        emailVerified: true
      }
    });
    
    console.log('✓ Password reset successfully!');
    console.log(`\nLogin credentials:`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${newPassword}`);
    console.log(`\nUser details:`);
    console.log(`- Name: ${user.name}`);
    console.log(`- Role: ${user.role}`);
    console.log(`- Active: ${user.isActive}`);
    console.log(`- Email Verified: ${user.emailVerified}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();
