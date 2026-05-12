import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyMigration() {
  console.log('🔍 Verifying menu migration...\n');

  try {
    // Count total menu items
    const totalItems = await prisma.menu.count();
    console.log(`✅ Total menu items in database: ${totalItems}`);

    // Count by category
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { menus: true }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    console.log('\n📊 Items per category:');
    categories.forEach(cat => {
      console.log(`  ${cat.name} (${cat.type}): ${cat._count.menus} items`);
    });

    // Sample some items
    console.log('\n📝 Sample menu items:');
    const sampleItems = await prisma.menu.findMany({
      take: 5,
      include: {
        menuCategory: true
      }
    });

    sampleItems.forEach(item => {
      console.log(`  - ${item.name} (€${item.price}) - ${item.category}`);
    });

    // Check Cart tables exist
    const cartCount = await prisma.cart.count();
    const cartItemCount = await prisma.cartItem.count();
    
    console.log('\n🛒 Cart tables:');
    console.log(`  Carts: ${cartCount}`);
    console.log(`  Cart Items: ${cartItemCount}`);

    console.log('\n✅ Migration verification complete!');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyMigration();
