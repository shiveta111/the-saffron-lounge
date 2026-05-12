const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting core database seeding...');

  // Create admin user
  console.log('Creating admin user...');
  const adminEmail = 'admin@saffronlounge.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'System Admin',
        password: hashedPassword,
        role: 'ADMIN',
        emailVerified: true,
        isActive: true,
      },
    });
    console.log('✅ Created admin user');
  } else {
    console.log('⚠️  Admin user already exists');
  }

  // Create categories
  console.log('Creating categories...');
  const categories = [
    { name: 'Appetizers', description: 'Light starters and small plates', sortOrder: 1 },
    { name: 'Main Course', description: 'Hearty main dishes', sortOrder: 2 },
    { name: 'Vegetarian', description: 'Vegetarian dishes', sortOrder: 3 },
    { name: 'Seafood', description: 'Fresh seafood preparations', sortOrder: 4 },
    { name: 'Rice & Biryani', description: 'Fragrant rice dishes', sortOrder: 5 },
    { name: 'Breads', description: 'Traditional breads', sortOrder: 6 },
    { name: 'Desserts', description: 'Sweet treats', sortOrder: 7 },
    { name: 'Beverages', description: 'Drinks and beverages', sortOrder: 8 },
  ];

  for (const cat of categories) {
    const existing = await prisma.category.findUnique({ where: { name: cat.name } });
    if (!existing) {
      await prisma.category.create({ data: cat });
      console.log(`✅ Created category: ${cat.name}`);
    }
  }

  // Create menu items (for display)
  console.log('Creating menu items...');
  const menuData = [
    { name: 'Punjabi Samosa', description: 'Crispy fried pastry with spiced potatoes', price: 4.99, category: 'Appetizers', type: 'Vegetarian' },
    { name: 'Paneer Tikka', description: 'Marinated cottage cheese skewers', price: 8.99, category: 'Appetizers', type: 'Vegetarian' },
    { name: 'Chicken 65', description: 'Spicy fried chicken bites', price: 9.99, category: 'Appetizers', type: 'Non-Vegetarian' },
    { name: 'Butter Chicken', description: 'Creamy tomato-based curry with tender chicken', price: 16.99, category: 'Main Course', type: 'Non-Vegetarian' },
    { name: 'Paneer Butter Masala', description: 'Rich creamy curry with paneer cubes', price: 14.99, category: 'Main Course', type: 'Vegetarian' },
    { name: 'Lamb Rogan Josh', description: 'Kashmiri curry with tender lamb', price: 19.99, category: 'Main Course', type: 'Non-Vegetarian' },
    { name: 'Dal Makhani', description: 'Slow-cooked black lentils in creamy sauce', price: 12.99, category: 'Vegetarian', type: 'Vegetarian' },
    { name: 'Palak Paneer', description: 'Spinach and cottage cheese curry', price: 13.99, category: 'Vegetarian', type: 'Vegetarian' },
    { name: 'Goan Fish Curry', description: 'Traditional fish curry with coconut milk', price: 17.99, category: 'Seafood', type: 'Non-Vegetarian' },
    { name: 'Prawn Malabar', description: 'Kerala-style prawns with curry leaves', price: 19.99, category: 'Seafood', type: 'Non-Vegetarian' },
    { name: 'Hyderabadi Biryani', description: 'Fragrant basmati rice with tender meat', price: 18.99, category: 'Rice & Biryani', type: 'Non-Vegetarian' },
    { name: 'Vegetable Biryani', description: 'Mixed vegetables and basmati rice', price: 13.99, category: 'Rice & Biryani', type: 'Vegetarian' },
    { name: 'Butter Naan', description: 'Soft leavened bread baked in tandoor', price: 3.49, category: 'Breads', type: 'Vegetarian' },
    { name: 'Garlic Naan', description: 'Naan bread topped with garlic', price: 3.99, category: 'Breads', type: 'Vegetarian' },
    { name: 'Gulab Jamun', description: 'Soft milk dumplings in rose syrup', price: 6.99, category: 'Desserts', type: 'Vegetarian' },
    { name: 'Ras Malai', description: 'Cheese dumplings in sweetened milk', price: 7.99, category: 'Desserts', type: 'Vegetarian' },
    { name: 'Masala Chai', description: 'Spiced tea with cardamom and ginger', price: 3.99, category: 'Beverages', type: 'Vegetarian' },
    { name: 'Mango Lassi', description: 'Sweet yogurt drink with mangoes', price: 5.99, category: 'Beverages', type: 'Vegetarian' },
  ];

  const createdMenus = [];
  for (const item of menuData) {
    const existing = await prisma.menu.findFirst({ where: { name: item.name } });
    if (!existing) {
      const category = await prisma.category.findUnique({ where: { name: item.category } });
      const menu = await prisma.menu.create({
        data: {
          ...item,
          categoryId: category?.id,
          imageUrl: `/images/${item.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.jpg`,
        },
      });
      createdMenus.push(menu);
      console.log(`✅ Created menu: ${menu.name}`);
    }
  }

  // Create products linked to menus (for ordering)
  console.log('Creating products linked to menus...');
  const menus = await prisma.menu.findMany();
  
  for (const menu of menus) {
    const existing = await prisma.product.findFirst({ where: { menuId: menu.id } });
    if (!existing) {
      await prisma.product.create({
        data: {
          menuId: menu.id,
          name: menu.name,
          description: menu.description,
          price: menu.price,
          category: menu.category,
          categoryId: menu.categoryId,
          type: menu.type,
          imageUrl: menu.imageUrl,
          isAvailable: menu.isAvailable,
          availability: 50, // Stock count
          sku: `SKU-${menu.id}-${Date.now()}`,
        },
      });
      console.log(`✅ Created product for: ${menu.name}`);
    }
  }

  // Create tables
  console.log('Creating tables...');
  const tables = [
    { tableNumber: 'T1', capacity: 2, location: 'Window' },
    { tableNumber: 'T2', capacity: 4, location: 'Center' },
    { tableNumber: 'T3', capacity: 4, location: 'Corner' },
    { tableNumber: 'T4', capacity: 6, location: 'Private' },
    { tableNumber: 'T5', capacity: 2, location: 'Bar' },
  ];

  for (const table of tables) {
    const existing = await prisma.table.findUnique({ where: { tableNumber: table.tableNumber } });
    if (!existing) {
      await prisma.table.create({
        data: {
          ...table,
          qrCode: `QR-${table.tableNumber}-${Date.now()}`,
        },
      });
      console.log(`✅ Created table: ${table.tableNumber}`);
    }
  }

  // Create delivery zones
  console.log('Creating delivery zones...');
  const zones = [
    { name: 'Downtown', postcodes: '60601,60602,60603', deliveryFee: 5.99, minOrderValue: 20, estimatedTime: 30 },
    { name: 'North Side', postcodes: '60614,60657,60640', deliveryFee: 7.99, minOrderValue: 25, estimatedTime: 45 },
    { name: 'South Side', postcodes: '60615,60616,60617', deliveryFee: 7.99, minOrderValue: 25, estimatedTime: 45 },
  ];

  for (const zone of zones) {
    const existing = await prisma.deliveryZone.findFirst({ where: { name: zone.name } });
    if (!existing) {
      await prisma.deliveryZone.create({ data: zone });
      console.log(`✅ Created delivery zone: ${zone.name}`);
    }
  }

  // Create promotions
  console.log('Creating promotions...');
  const promotions = [
    {
      code: 'WELCOME10',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      minOrderValue: 30,
      firstOrderOnly: true,
      description: 'Welcome discount for new customers',
    },
    {
      code: 'SAVE5',
      discountType: 'FIXED',
      discountValue: 5,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      minOrderValue: 50,
      description: '$5 off on orders above $50',
    },
  ];

  for (const promo of promotions) {
    const existing = await prisma.promotion.findUnique({ where: { code: promo.code } });
    if (!existing) {
      await prisma.promotion.create({ data: promo });
      console.log(`✅ Created promotion: ${promo.code}`);
    }
  }

  console.log('✅ Core seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
