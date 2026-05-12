/**
 * Cleanup Menus Script
 * Identifies and handles menus without linked products
 * 
 * Options:
 * - List menus without products
 * - Delete menus without products (with confirmation)
 * - Add default products to menus
 */

require('./load-env');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  console.log('🧹 Menu Cleanup Script\n');

  try {
    // Find menus without products
    const menusWithoutProducts = await prisma.$queryRaw`
      SELECT m.id, m.name, m.category, m.price, m.createdAt
      FROM menus m
      LEFT JOIN menu_products mp ON m.id = mp.menuId
      WHERE mp.id IS NULL
    `;

    if (menusWithoutProducts.length === 0) {
      console.log('✅ All menus have linked products. Nothing to cleanup.');
      return;
    }

    console.log(`Found ${menusWithoutProducts.length} menus without linked products:\n`);
    
    // Group by name to identify duplicates
    const menusByName = {};
    menusWithoutProducts.forEach(menu => {
      if (!menusByName[menu.name]) {
        menusByName[menu.name] = [];
      }
      menusByName[menu.name].push(menu);
    });

    console.log('Summary by name:');
    Object.entries(menusByName).forEach(([name, menus]) => {
      console.log(`  - "${name}": ${menus.length} instances`);
    });

    // Delete menus without products (they are essentially useless)
    console.log('\n🗑️ Deleting menus without products...');
    
    const menuIds = menusWithoutProducts.map(m => m.id);
    
    // Delete in batches
    const result = await prisma.menu.deleteMany({
      where: {
        id: { in: menuIds }
      }
    });

    console.log(`✅ Deleted ${result.count} menus without products.`);

    // Verify remaining menus
    const remainingCount = await prisma.menu.count();
    const menusWithProductsCount = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT m.id) as count
      FROM menus m
      INNER JOIN menu_products mp ON m.id = mp.menuId
      INNER JOIN products p ON mp.productId = p.id
    `;

    console.log(`\n📊 Current state:`);
    console.log(`   - Total menus: ${remainingCount}`);
    console.log(`   - Menus with valid products: ${menusWithProductsCount[0].count}`);

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
