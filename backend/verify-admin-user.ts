import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Verifying admin user...');
  
  const hashedPassword = await bcrypt.hash('Admin@123', 12);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@saffronlounge.com' },
    update: {
      emailVerified: true,
      isActive: true,
      password: hashedPassword,
    },
    create: {
      email: 'admin@saffronlounge.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      emailVerified: true,
      isActive: true,
    },
  });
  
  console.log('✓ Admin user verified:', admin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
