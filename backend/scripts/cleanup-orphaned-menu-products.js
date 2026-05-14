/**
 * Cleanup orphaned menu_products rows.
 *
 * A row is orphaned when:
 * - menuId points to a non-existent menu, or
 * - productId points to a non-existent product.
 *
 * Usage:
 *   node scripts/cleanup-orphaned-menu-products.js
 *   node scripts/cleanup-orphaned-menu-products.js --dry-run
 */

require('./load-env');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');

async function run() {
  console.log('Checking for orphaned menu_products rows...');

  try {
    const orphanRows = await prisma.$queryRaw`
      SELECT mp.id, mp.menuId, mp.productId
      FROM menu_products mp
      LEFT JOIN menus m ON m.id = mp.menuId
      LEFT JOIN products p ON p.id = mp.productId
      WHERE m.id IS NULL OR p.id IS NULL
      ORDER BY mp.id ASC
    `;

    if (!orphanRows.length) {
      console.log('No orphaned rows found.');
      return;
    }

    console.log(`Found ${orphanRows.length} orphaned row(s).`);

    const preview = orphanRows.slice(0, 20);
    preview.forEach((row) => {
      console.log(`- id=${row.id}, menuId=${row.menuId}, productId=${row.productId}`);
    });

    if (orphanRows.length > preview.length) {
      console.log(`...and ${orphanRows.length - preview.length} more`);
    }

    if (isDryRun) {
      console.log('Dry run mode: no rows were deleted.');
      return;
    }

    const ids = orphanRows.map((row) => row.id);
    const deleted = await prisma.menuProduct.deleteMany({
      where: { id: { in: ids } },
    });

    console.log(`Deleted ${deleted.count} orphaned row(s).`);
  } catch (error) {
    console.error('Cleanup failed:', error.message || error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run();
