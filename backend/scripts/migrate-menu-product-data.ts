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

async function migrateMenuAndProductData() {
  console.log('Starting menu and product data migration...');
  
  try {
    // Read menu.json file
    const menuJsonPath = path.join(__dirname, '../../frontend/src/data/menu.json');
    const menuDataRaw = fs.readFileSync(menuJsonPath, 'utf-8');
    const menuData: MenuData = JSON.parse(menuDataRaw);
    
    console.log(`Found ${menuData.categories.length} categories to migrate`);
    
    // 1. Create categories
    const categoryMap = new Map<string, number>();
    
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
        },
      });
      
      categoryMap.set(category.name, dbCategory.id);
      console.log(`✓ Category: ${category.name} (ID: ${dbCategory.id})`);
    }
    
    // 2. Migrate to both Menu and Product tables
    let migratedCount = 0;
    
    for (const category of menuData.categories) {
      const categoryId = categoryMap.get(category.name);
      
      console.log(`\nMigrating items for category: ${category.name}`);
      
      for (const item of category.items) {
        const price = parseFloat(item.price.replace('€', '').trim());
        
        // Create/Update Menu item (for public display)
        const menuItem = await prisma.menu.create({
          data: {
            name: item.name,
            description: item.description,
            price: price,
            category: category.name,
            categoryId: categoryId || null,
            type: category.type,
            imageUrl: item.image,
            isAvailable: true,
            dietaryNotes: JSON.stringify(item.dietaryNotes || []),
            allergenCodes: JSON.stringify(item.allergenCodes || []),
          },
        });
        
        // Generate SKU from category and item name
        const sku = `${category.name.replace(/\s+/g, '-')}-${item.name.replace(/\s+/g, '-')}`
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '');
        
        // Create/Update Product (for ordering and admin)
        await prisma.product.upsert({
          where: {
            sku: sku,
          },
          update: {
            menuId: menuItem.id,
            name: item.name,
            description: item.description,
            price: price,
            category: category.name,
            type: category.type,
            imageUrl: item.image,
            isAvailable: true,
            availability: item.availability || 10,
            dietaryNotes: JSON.stringify(item.dietaryNotes || []),
            allergenCodes: JSON.stringify(item.allergenCodes || []),
          },
          create: {
            menuId: menuItem.id,
            name: item.name,
            description: item.description,
            price: price,
            category: category.name,
            categoryId: categoryId || null,
            type: category.type,
            imageUrl: item.image,
            isAvailable: true,
            availability: item.availability || 10,
            sku: sku,
            dietaryNotes: JSON.stringify(item.dietaryNotes || []),
            allergenCodes: JSON.stringify(item.allergenCodes || []),
          },
        });
        
        migratedCount++;
        console.log(`  ✓ ${item.name} (SKU: ${sku})`);
      }
    }
    
    console.log(`\n✅ Migration complete! Migrated ${migratedCount} items to both Menu and Product tables.`);
    
    // Verify the migration
    const menuCount = await prisma.menu.count();
    const productCount = await prisma.product.count();
    
    console.log(`\nVerification:`);
    console.log(`  - Menu items: ${menuCount}`);
    console.log(`  - Products: ${productCount}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateMenuAndProductData()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
