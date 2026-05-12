require('./load-env-helper');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function updateAdminPassword() {
  try {
    const newPassword = 'lovely.webdev@123';
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const result = await prisma.user.updateMany({
      where: {
        email: 'lovely.webdev@gmail.com',
        role: 'ADMIN'
      },
      data: {
        password: hashedPassword
      }
    });

    if (result.count > 0) {
      console.log('✅ Admin password updated successfully');
      console.log('Email: lovely.webdev@gmail.com');
      console.log('New Password: lovely.webdev@123');
    } else {
      console.log('❌ Admin user not found');
    }

  } catch (error) {
    console.error('❌ Error updating password:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminPassword();
