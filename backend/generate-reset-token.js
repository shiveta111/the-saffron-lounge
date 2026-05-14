const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateResetToken() {
  try {
    // Generate reset token (same as in authController)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set expiry (1 hour from now)
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    // Update user with reset token
    await prisma.user.update({
      where: { email: 'lovely.webdev@gmail.com' },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: resetExpires,
      }
    });

    console.log('✅ Reset token generated successfully!');
    console.log('\n===================');
    console.log('Reset Token (use this for testing):', resetToken);
    console.log('Hashed Token (stored in DB):', hashedToken);
    console.log('Expires:', resetExpires);
    console.log('===================\n');
    console.log('Use this token to test the reset-password endpoint.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateResetToken();
