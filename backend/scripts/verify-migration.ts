import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyMigration() {
  console.log('🔍 Verifying Menu and Product Migration...\n');
  
  // Count records
  const menuCount = await prisma.menu.count();
  const productCount = await prisma.product.count();
  const categoryCount = await prisma.category.count();
  
  console.log('📊 Record Counts:');
  console.log(`  ✓ Menus: ${menuCount}`);
  console.log(`  ✓ Products: ${productCount}`);
  console.log(`  ✓ Categories: ${categoryCount}\n`);
  
  // Check product-menu relationships
  const productsWithMenu = await prisma.product.findMany({
    take: 5,
    include: {
      menu: {
        select: {
          id: true,
          name: true,
          category: true,
        }
      }
    }
  });
  
  console.log('🔗 Sample Product-Menu Relationships:');
  productsWithMenu.forEach(p => {
    console.log(`  ✓ Product: ${p.name} (SKU: ${p.sku})`);
    console.log(`    → Linked to Menu: ${p.menu.name} (ID: ${p.menu.id})\n`);
  });
  
  // Check categories
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      type: true,
    }
  });
  
  console.log('📁 Categories:');
  categories.forEach(c => {
    console.log(`  ✓ ${c.name} (${c.type})`);
  });
  
  await prisma.$disconnect();
}

verifyMigration().catch(console.error);
