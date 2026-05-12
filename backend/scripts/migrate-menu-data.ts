import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface MenuItem {
  name: string;
  description: string;
  price: string;
  dietaryNotes?: string[];
  image: string;
  availability?: number;
  allergenCodes?: number[];
}

interface MenuCategory {
  name: string;
  type: string;
  description: string;
  items: MenuItem[];
}

interface MenuData {
  categories: MenuCategory[];
}

async function migrateMenuData() {
  console.log('🚀 Starting menu data migration...\n');

  try {
    // Read menu.json file
    const menuFilePath = path.join(
      __dirname,
      '../../frontend/src/data/menu.json'
    );

    if (!fs.existsSync(menuFilePath)) {
      throw new Error(`Menu file not found at: ${menuFilePath}`);
    }

    const menuData: MenuData = JSON.parse(
      fs.readFileSync(menuFilePath, 'utf-8')
    );

    console.log(`📖 Loaded menu data with ${menuData.categories.length} categories\n`);

    // Step 1: Create/Update Categories
    console.log('📁 Creating categories...');
    const categoryMap = new Map<string, number>();
    let categoryCount = 0;

    for (const category of menuData.categories) {
      const dbCategory = await prisma.category.upsert({
        where: { name: category.name },
        update: {
          type: category.type,
          description: category.description,
          isActive: true,
        },
        create: {
          name: category.name,
          type: category.type,
          description: category.description,
          isActive: true,
          sortOrder: categoryCount,
        },
      });

      categoryMap.set(category.name, dbCategory.id);
      categoryCount++;
      console.log(`  ✓ ${category.name} (${category.type})`);
    }

    console.log(`\n✅ Created/Updated ${categoryCount} categories\n`);

    // Step 2: Migrate Menu Items
    console.log('🍽️  Migrating menu items...');
    let migratedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const category of menuData.categories) {
      const categoryId = categoryMap.get(category.name);

      console.log(`\n  Processing category: ${category.name}`);

      for (const item of category.items) {
        try {
          // Parse price (remove € symbol and convert to float)
          const price = parseFloat(item.price.replace('€', '').trim());

          // Check if item already exists
          const existingItem = await prisma.menu.findFirst({
            where: {
              name: item.name,
              category: category.name,
            },
          });

          if (existingItem) {
            // Update existing item
            await prisma.menu.update({
              where: { id: existingItem.id },
              data: {
                description: item.description,
                price: price,
                type: category.type,
                imageUrl: item.image,
                isAvailable: true,
                dietaryNotes: JSON.stringify(item.dietaryNotes || []),
                allergenCodes: JSON.stringify(item.allergenCodes || []),
                availability: item.availability || 10,
              },
            });
            updatedCount++;
            console.log(`    ↻ Updated: ${item.name}`);
          } else {
            // Create new item
            const menuData: any = {
              name: item.name,
              description: item.description,
              price: price,
              category: category.name,
              type: category.type,
              imageUrl: item.image,
              isAvailable: true,
              dietaryNotes: JSON.stringify(item.dietaryNotes || []),
              allergenCodes: JSON.stringify(item.allergenCodes || []),
              availability: item.availability || 10,
            };

            if (categoryId) {
              menuData.categoryId = categoryId;
            }

            await prisma.menu.create({
              data: menuData,
            });
            migratedCount++;
            console.log(`    ✓ Created: ${item.name}`);
          }
        } catch (error) {
          errorCount++;
          console.error(`    ✗ Error with ${item.name}:`, error);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ New items created: ${migratedCount}`);
    console.log(`↻  Items updated: ${updatedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📁 Categories: ${categoryCount}`);
    console.log(`🎉 Total items processed: ${migratedCount + updatedCount}`);
    console.log('='.repeat(60));

    // Verify migration
    const totalMenuItems = await prisma.menu.count();
    console.log(`\n✅ Database now contains ${totalMenuItems} menu items`);

    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateMenuData()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
