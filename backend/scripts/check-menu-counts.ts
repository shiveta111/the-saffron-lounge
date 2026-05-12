import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMenuCounts() {
  console.log('🔍 Checking menu item counts...\n');

  try {
    // Count items in Menu table
    const menuCount = await prisma.menu.count();
    console.log(`📊 Menu table: ${menuCount} items`);

    // Count items in Product table
    const productCount = await prisma.product.count();
    console.log(`📊 Product table: ${productCount} items`);

    // Total
    console.log(`\n📊 Total: ${menuCount + productCount} items`);

    // Sample from each table
    console.log('\n📝 Sample from Menu table:');
    const menuSample = await prisma.menu.findMany({ take: 3 });
    menuSample.forEach(item => console.log(`  - ${item.name} (€${item.price})`));

    console.log('\n📝 Sample from Product table:');
    const productSample = await prisma.product.findMany({ take: 3 });
    productSample.forEach(item => console.log(`  - ${item.name} (€${item.price})`));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMenuCounts();
