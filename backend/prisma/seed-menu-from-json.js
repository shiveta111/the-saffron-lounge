const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting menu seeding from JSON file...');

  try {
    // Read the menu JSON file
    const menuJsonPath = path.join(__dirname, '../../frontend/src/data/menu.json');
    const menuData = JSON.parse(fs.readFileSync(menuJsonPath, 'utf8'));

    console.log(`📖 Loaded menu data with ${menuData.categories.length} categories`);

    let totalMenuItems = 0;
    let createdMenuItems = 0;
    let skippedMenuItems = 0;

    // Process each category
    for (const categoryData of menuData.categories) {
      const categoryName = `${categoryData.name} - ${categoryData.type}`;
      
      console.log(`\n📂 Processing category: ${categoryName}`);

      // Create or find category
      let category = await prisma.category.findFirst({
        where: { name: categoryName }
      });

      if (!category) {
        category = await prisma.category.create({
          data: {
            name: categoryName,
            description: categoryData.description,
            type: categoryData.type,
            isActive: true,
            sortOrder: 0
          }
        });
        console.log(`✅ Created category: ${categoryName}`);
      } else {
        console.log(`ℹ️  Category already exists: ${categoryName}`);
      }

      // Process items in this category
      for (const item of categoryData.items) {
        totalMenuItems++;

        // Check if menu item already exists
        const existingMenu = await prisma.menu.findFirst({
          where: { name: item.name }
        });

        if (existingMenu) {
          console.log(`⚠️  Menu item already exists: ${item.name}`);
          skippedMenuItems++;
          continue;
        }

        // Parse price (remove € symbol and convert to float)
        const price = parseFloat(item.price.replace('€', '').trim());

        // Create menu item
        const menuItem = await prisma.menu.create({
          data: {
            name: item.name,
            description: item.description,
            price: price,
            categoryId: category.id,
            category: categoryName,
            type: categoryData.type,
            imageUrl: item.image || '/assets-main/menu/coming-soon.png',
            isAvailable: true,
            isSpecial: false,
            preparationTime: 15, // Default preparation time
            allergens: item.allergenCodes ? JSON.stringify(item.allergenCodes) : null,
            allergenCodes: item.allergenCodes ? JSON.stringify(item.allergenCodes) : null,
            dietaryNotes: item.dietaryNotes ? item.dietaryNotes.join(', ') : null,
            availability: item.availability || 10
          }
        });

        createdMenuItems++;
        console.log(`✅ Created menu item: ${menuItem.name} (€${price})`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎉 Menu seeding completed successfully!');
    console.log('='.repeat(80));
    console.log(`📊 Summary:`);
    console.log(`   Total items processed: ${totalMenuItems}`);
    console.log(`   New items created: ${createdMenuItems}`);
    console.log(`   Items skipped (already exist): ${skippedMenuItems}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error seeding menu:', error);
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
