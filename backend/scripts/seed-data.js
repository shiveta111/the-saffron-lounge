const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seedData() {
  try {
    console.log('Seeding data...');

    // Seed categories
    const categories = [
      { name: 'Appetizers', description: 'Light and flavorful starters', isActive: true, sortOrder: 1 },
      { name: 'Main Course', description: 'Hearty main dishes', isActive: true, sortOrder: 2 },
      { name: 'Vegetarian', description: 'Vegetarian specialties', isActive: true, sortOrder: 3 },
      { name: 'Desserts', description: 'Sweet endings', isActive: true, sortOrder: 4 },
      { name: 'Beverages', description: 'Refreshing drinks', isActive: true, sortOrder: 5 }
    ];

    for (const category of categories) {
      await prisma.category.upsert({
        where: { name: category.name },
        update: category,
        create: category
      });
    }
    console.log(`✅ Created ${categories.length} categories`);

    // Seed menu items
    const menuItems = [
      { name: 'Grilled Salmon', description: 'Fresh Atlantic salmon grilled to perfection with herbs', price: 450.00, category: 'Main Course', isAvailable: true },
      { name: 'Chicken Biryani', description: 'Aromatic basmati rice with tender chicken and spices', price: 280.00, category: 'Main Course', isAvailable: true },
      { name: 'Paneer Tikka Masala', description: 'Cottage cheese in rich, creamy tomato curry', price: 240.00, category: 'Vegetarian', isAvailable: true },
      { name: 'Masala Dosa', description: 'Crispy crepe filled with spiced potato filling', price: 120.00, category: 'Appetizers', isAvailable: true },
      { name: 'Ras Malai', description: 'Soft cheese dumplings in sweetened cardamom syrup', price: 80.00, category: 'Desserts', isAvailable: true }
    ];

    for (const item of menuItems) {
      try {
        await prisma.product.create({
          data: item
        });
      } catch (error) {
        // Skip if already exists
        console.log(`Product ${item.name} already exists, skipping`);
      }
    }
    console.log(`✅ Created ${menuItems.length} menu items`);

    console.log('✅ Data seeding completed successfully');

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedData();