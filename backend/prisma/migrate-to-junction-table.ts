import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateToJunctionTable() {
  console.log('🔄 Starting migration to MenuProduct junction table...');

  try {
    // Step 1: Create menu_products table if it doesn't exist
    console.log('📦 Creating menu_products junction table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS menu_products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        menuId INT NOT NULL,
        productId INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        createdAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE KEY unique_menu_product (menuId, productId),
        INDEX idx_menuId (menuId),
        INDEX idx_productId (productId),
        FOREIGN KEY (menuId) REFERENCES menus(id) ON DELETE CASCADE,
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `;
    console.log('✅ Junction table created');

    // Step 2: Migrate existing menuId relationships to junction table
    console.log('🔄 Migrating existing menuId relationships...');
    const productsWithMenuId = await prisma.$queryRaw<Array<{ id: number; menuId: number }>>`
      SELECT id, menuId FROM products WHERE menuId IS NOT NULL
    `;

    console.log(`Found ${productsWithMenuId.length} products with menuId`);

    for (const product of productsWithMenuId) {
      try {
        await prisma.$executeRaw`
          INSERT INTO menu_products (menuId, productId, quantity, createdAt)
          VALUES (${product.menuId}, ${product.id}, 1, NOW())
          ON DUPLICATE KEY UPDATE quantity = quantity
        `;
        console.log(`✅ Migrated product ${product.id} -> menu ${product.menuId}`);
      } catch (error: any) {
        console.error(`❌ Error migrating product ${product.id}:`, error.message);
      }
    }

    console.log('✅ Migration completed successfully');
    console.log('⚠️  Next step: Run `npx prisma db push` to remove menuId column from products table');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateToJunctionTable();

























