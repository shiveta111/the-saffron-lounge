const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting migration: Menu → Products');
  console.log('='.repeat(80));

  try {
    // Step 1: Get all menu items
    console.log('\n📖 Step 1: Reading all menu items...');
    const menuItems = await prisma.menu.findMany({
      include: {
        menuCategory: true,
      },
    });
    console.log(`✅ Found ${menuItems.length} menu items to migrate`);

    // Step 2: Check existing products to avoid duplicates
    console.log('\n📊 Step 2: Checking existing products...');
    const existingProducts = await prisma.product.findMany({
      select: { name: true },
    });
    const existingProductNames = new Set(existingProducts.map(p => p.name));
    console.log(`ℹ️  Found ${existingProducts.length} existing products`);

    // Step 3: Migrate menu items to products
    console.log('\n🔄 Step 3: Migrating menu items to products...');
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const menuItem of menuItems) {
      try {
        // Skip if product with same name already exists
        if (existingProductNames.has(menuItem.name)) {
          console.log(`⚠️  Skipping "${menuItem.name}" - already exists in products`);
          skippedCount++;
          continue;
        }

        // Create product from menu item
        await prisma.product.create({
          data: {
            name: menuItem.name,
            description: menuItem.description,
            price: menuItem.price,
            categoryId: menuItem.categoryId,
            category: menuItem.category,
            imageUrl: menuItem.imageUrl,
            isAvailable: menuItem.isAvailable,
            type: menuItem.type,
            allergenCodes: menuItem.allergenCodes,
            dietaryNotes: menuItem.dietaryNotes,
            availability: menuItem.availability || 10,
          },
        });

        console.log(`✅ Migrated: ${menuItem.name}`);
        migratedCount++;
      } catch (error) {
        console.error(`❌ Error migrating "${menuItem.name}":`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 Migration Summary:');
    console.log(`   Total menu items: ${menuItems.length}`);
    console.log(`   ✅ Migrated: ${migratedCount}`);
    console.log(`   ⚠️  Skipped (duplicates): ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('='.repeat(80));

    if (migratedCount > 0) {
      console.log('\n✅ Migration completed successfully!');
      console.log('\n⚠️  IMPORTANT NEXT STEPS:');
      console.log('   1. Verify the migrated data in the products table');
      console.log('   2. Update your application code to use products instead of menus');
      console.log('   3. After verification, you can drop the menus table');
      console.log('   4. Run: npx prisma db push (after updating schema.prisma)');
    } else {
      console.log('\n⚠️  No new items were migrated.');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
