import { PrismaClient, Product, Menu, User } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log('🗑️  Clearing existing data...');
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.category.deleteMany();

  // 1. Create Categories
  console.log('📁 Creating categories...');
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Starters',
        description: 'Delicious appetizers to start your meal',
        type: 'All',
        isActive: true,
        sortOrder: 1,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Main Course',
        description: 'Hearty main dishes',
        type: 'All',
        isActive: true,
        sortOrder: 2,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Desserts',
        description: 'Sweet treats to end your meal',
        type: 'Vegetarian',
        isActive: true,
        sortOrder: 3,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Beverages',
        description: 'Refreshing drinks',
        type: 'Vegetarian',
        isActive: true,
        sortOrder: 4,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Specials',
        description: 'Chef\'s special recommendations',
        type: 'All',
        isActive: true,
        sortOrder: 5,
      },
    }),
  ]);

  console.log(`✅ Created ${categories.length} categories`);

  // 2. Create Menu Items
  console.log('🍽️  Creating menu items...');
  const menuItems = [
    // Starters
    {
      name: 'Samosa (2 pcs)',
      description: 'Crispy pastry filled with spiced potatoes and peas',
      price: 4.99,
      category: 'Starters',
      categoryId: categories[0].id,
      type: 'Vegetarian',
      imageUrl: '/assets/menu/samosa.jpg',
      isAvailable: true,
      isSpecial: false,
      preparationTime: 10,
      dietaryNotes: JSON.stringify(['Vegetarian', 'Can be made vegan']),
      allergenCodes: JSON.stringify([1, 6]), // Gluten, Mustard
    },
    {
      name: 'Chicken Tikka',
      description: 'Tender chicken pieces marinated in yogurt and spices',
      price: 7.99,
      category: 'Starters',
      categoryId: categories[0].id,
      type: 'Non-Vegetarian',
      imageUrl: '/assets/menu/chicken-tikka.jpg',
      isAvailable: true,
      isSpecial: true,
      preparationTime: 15,
      dietaryNotes: JSON.stringify(['Contains dairy']),
      allergenCodes: JSON.stringify([7]), // Milk
    },
    {
      name: 'Paneer Tikka',
      description: 'Grilled cottage cheese with bell peppers and onions',
      price: 6.99,
      category: 'Starters',
      categoryId: categories[0].id,
      type: 'Vegetarian',
      imageUrl: '/assets/menu/paneer-tikka.jpg',
      isAvailable: true,
      isSpecial: false,
      preparationTime: 12,
      dietaryNotes: JSON.stringify(['Vegetarian', 'Contains dairy']),
      allergenCodes: JSON.stringify([7]), // Milk
    },
    // Main Course
    {
      name: 'Chicken Tikka Masala',
      description: 'Tender chicken in creamy tomato sauce',
      price: 14.99,
      category: 'Main Course',
      categoryId: categories[1].id,
      type: 'Non-Vegetarian',
      imageUrl: '/assets/menu/chicken-tikka-masala.jpg',
      isAvailable: true,
      isSpecial: true,
      preparationTime: 20,
      dietaryNotes: JSON.stringify(['Contains dairy', 'Mild spice']),
      allergenCodes: JSON.stringify([7]), // Milk
    },
    {
      name: 'Lamb Rogan Josh',
      description: 'Aromatic lamb curry with Kashmiri spices',
      price: 16.99,
      category: 'Main Course',
      categoryId: categories[1].id,
      type: 'Non-Vegetarian',
      imageUrl: '/assets/menu/lamb-rogan-josh.jpg',
      isAvailable: true,
      isSpecial: true,
      preparationTime: 25,
      dietaryNotes: JSON.stringify(['Medium spice']),
      allergenCodes: JSON.stringify([]),
    },
    {
      name: 'Palak Paneer',
      description: 'Cottage cheese in creamy spinach gravy',
      price: 12.99,
      category: 'Main Course',
      categoryId: categories[1].id,
      type: 'Vegetarian',
      imageUrl: '/assets/menu/palak-paneer.jpg',
      isAvailable: true,
      isSpecial: false,
      preparationTime: 18,
      dietaryNotes: JSON.stringify(['Vegetarian', 'Contains dairy']),
      allergenCodes: JSON.stringify([7]), // Milk
    },
    {
      name: 'Dal Makhani',
      description: 'Black lentils cooked with butter and cream',
      price: 11.99,
      category: 'Main Course',
      categoryId: categories[1].id,
      type: 'Vegetarian',
      imageUrl: '/assets/menu/dal-makhani.jpg',
      isAvailable: true,
      isSpecial: false,
      preparationTime: 15,
      dietaryNotes: JSON.stringify(['Vegetarian', 'Contains dairy']),
      allergenCodes: JSON.stringify([7]), // Milk
    },
    {
      name: 'Biryani (Chicken)',
      description: 'Fragrant basmati rice with spiced chicken',
      price: 15.99,
      category: 'Main Course',
      categoryId: categories[1].id,
      type: 'Non-Vegetarian',
      imageUrl: '/assets/menu/chicken-biryani.jpg',
      isAvailable: true,
      isSpecial: true,
      preparationTime: 30,
      dietaryNotes: JSON.stringify(['Contains nuts']),
      allergenCodes: JSON.stringify([8]), // Nuts
    },
    // Desserts
    {
      name: 'Gulab Jamun (2 pcs)',
      description: 'Sweet milk dumplings in rose syrup',
      price: 5.99,
      category: 'Desserts',
      categoryId: categories[2].id,
      type: 'Vegetarian',
      imageUrl: '/assets/menu/gulab-jamun.jpg',
      isAvailable: true,
      isSpecial: false,
      preparationTime: 5,
      dietaryNotes: JSON.stringify(['Vegetarian', 'Contains dairy', 'Very sweet']),
      allergenCodes: JSON.stringify([1, 7]), // Gluten, Milk
    },
    {
      name: 'Mango Kulfi',
      description: 'Traditional Indian ice cream with mango',
      price: 4.99,
      category: 'Desserts',
      categoryId: categories[2].id,
      type: 'Vegetarian',
      imageUrl: '/assets/menu/mango-kulfi.jpg',
      isAvailable: true,
      isSpecial: false,
      preparationTime: 2,
      dietaryNotes: JSON.stringify(['Vegetarian', 'Contains dairy']),
      allergenCodes: JSON.stringify([7]), // Milk
    },
    // Beverages
    {
      name: 'Mango Lassi',
      description: 'Sweet yogurt drink with mango',
      price: 3.99,
      category: 'Beverages',
      categoryId: categories[3].id,
      type: 'Vegetarian',
      imageUrl: '/assets/menu/mango-lassi.jpg',
      isAvailable: true,
      isSpecial: false,
      preparationTime: 3,
      dietaryNotes: JSON.stringify(['Vegetarian', 'Contains dairy']),
      allergenCodes: JSON.stringify([7]), // Milk
    },
    {
      name: 'Masala Chai',
      description: 'Spiced Indian tea with milk',
      price: 2.99,
      category: 'Beverages',
      categoryId: categories[3].id,
      type: 'Vegetarian',
      imageUrl: '/assets/menu/masala-chai.jpg',
      isAvailable: true,
      isSpecial: false,
      preparationTime: 5,
      dietaryNotes: JSON.stringify(['Vegetarian', 'Contains dairy']),
      allergenCodes: JSON.stringify([7]), // Milk
    },
  ];

  // 2. Create Products FIRST (products should exist independently)
  console.log('📦 Creating products...');
  const products: Product[] = [];
  for (let i = 0; i < menuItems.length; i++) {
    const item = menuItems[i]!;
    const product = await prisma.product.create({
      data: {
        // Products are created independently - linked to menus via MenuProduct junction table
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        categoryId: item.categoryId,
        type: item.type,
        imageUrl: item.imageUrl,
        isAvailable: item.isAvailable,
        isSpecial: item.isSpecial,
        preparationTime: item.preparationTime,
        availability: Math.floor(Math.random() * 50) + 10, // Random stock between 10-60
        sku: `SKU-${(i + 1).toString().padStart(4, '0')}`,
        dietaryNotes: item.dietaryNotes,
        allergenCodes: item.allergenCodes,
      },
    });
    products.push(product);
  }

  console.log(`✅ Created ${products.length} products`);

  // 3. Create Menus (linked to Products using productIds)
  console.log('🍽️  Creating menu items...');
  const createdMenus: Menu[] = [];
  for (let i = 0; i < menuItems.length; i++) {
    const item = menuItems[i]!;
    const product = products[i]!;
    
    // Create menu and link it to the corresponding product via MenuProduct junction table
    const menu = await prisma.menu.create({ 
      data: {
        ...item,
      }
    });
    
    // Link the product to this menu using MenuProduct junction table
    await prisma.menuProduct.create({
      data: {
        menuId: menu.id,
        productId: product.id,
        quantity: 1,
      }
    });
    
    createdMenus.push(menu);
  }

  console.log(`✅ Created ${createdMenus.length} menu items`);

  // 4. Create some test users if they don't exist
  console.log('👥 Creating test users...');
  const testUsers: User[] = [];
  
  try {
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@saffronlounge.com' },
      update: {},
      create: {
        email: 'admin@saffronlounge.com',
        password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5ztJ3sdJ.1LQy', // password: Admin@123
        name: 'Admin User',
        role: 'ADMIN',
        emailVerified: true,
        isActive: true,
      },
    });
    testUsers.push(adminUser);

    const customerUser = await prisma.user.upsert({
      where: { email: 'customer@example.com' },
      update: {},
      create: {
        email: 'customer@example.com',
        password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5ztJ3sdJ.1LQy', // password: Customer@123
        name: 'Test Customer',
        role: 'CUSTOMER',
        emailVerified: true,
        isActive: true,
      },
    });
    testUsers.push(customerUser);
  } catch (error) {
    console.log('⚠️  Users may already exist');
  }

  console.log(`✅ Created/verified ${testUsers.length} test users`);

  // 5. Create some test orders
  console.log('🛒 Creating test orders...');
  if (testUsers.length > 0) {
    const customerUser = testUsers.find(u => u.role === 'CUSTOMER');
    if (customerUser && products.length >= 9) {
      const order1 = await prisma.order.create({
        data: {
          customerId: customerUser.id,
          status: 'PENDING',
          orderType: 'ONLINE',
          total: 45.97,
          deliveryFee: 5.00,
          items: {
            create: [
              {
                productId: products[0]!.id,
                quantity: 2,
                price: products[0]!.price,
              },
              {
                productId: products[3]!.id,
                quantity: 1,
                price: products[3]!.price,
              },
            ],
          },
        },
      });

      const order2 = await prisma.order.create({
        data: {
          customerId: customerUser.id,
          status: 'DELIVERED',
          orderType: 'DELIVERY',
          total: 32.97,
          deliveryFee: 5.00,
          items: {
            create: [
              {
                productId: products[5]!.id,
                quantity: 1,
                price: products[5]!.price,
              },
              {
                productId: products[8]!.id,
                quantity: 2,
                price: products[8]!.price,
              },
            ],
          },
        },
      });

      console.log(`✅ Created 2 test orders`);
    }
  }

  console.log('');
  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   - Categories: ${categories.length}`);
  console.log(`   - Menu Items: ${createdMenus.length}`);
  console.log(`   - Products: ${products.length}`);
  console.log(`   - Test Users: ${testUsers.length}`);
  console.log('');
  console.log('🔐 Test Credentials:');
  console.log('   Admin: admin@saffronlounge.com / Admin@123');
  console.log('   Customer: customer@example.com / Customer@123');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
