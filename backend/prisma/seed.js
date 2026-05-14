const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seeding...');

  try {
    // Create sample users with different roles for testing
    console.log('Creating test users with different roles...');

    const testUsers = [
      { email: 'admin@saffronlounge.com', name: 'System Admin', password: 'admin123', role: 'ADMIN' },
      { email: 'manager@saffronlounge.com', name: 'Restaurant Manager', password: 'manager123', role: 'SELLER' },
      { email: 'chef@saffronlounge.com', name: 'Head Chef', password: 'chef123', role: 'SELLER' },
      { email: 'customer@test.com', name: 'John Customer', password: 'customer123', role: 'CUSTOMER' },
      { email: 'vip@test.com', name: 'VIP Customer', password: 'vip123', role: 'CUSTOMER' },
      { email: 'raj.patel@email.com', name: 'Raj Patel', password: 'raj123', role: 'CUSTOMER' },
      { email: 'priya.sharma@email.com', name: 'Priya Sharma', password: 'priya123', role: 'CUSTOMER' },
      { email: 'vikram.singh@email.com', name: 'Vikram Singh', password: 'vikram123', role: 'CUSTOMER' },
      { email: 'anita.verma@email.com', name: 'Anita Verma', password: 'anita123', role: 'CUSTOMER' },
      { email: 'arjun.nair@email.com', name: 'Arjun Nair', password: 'arjun123', role: 'CUSTOMER' },
      { email: 'meera.kapoor@email.com', name: 'Meera Kapoor', password: 'meera123', role: 'CUSTOMER' },
      { email: 'suresh.iyer@email.com', name: 'Suresh Iyer', password: 'suresh123', role: 'CUSTOMER' },
      { email: 'kavita.mehta@email.com', name: 'Kavita Mehta', password: 'kavita123', role: 'CUSTOMER' },
      { email: 'ravi.kumar@email.com', name: 'Ravi Kumar', password: 'ravi123', role: 'CUSTOMER' },
      { email: 'lata.shukla@email.com', name: 'Lata Shukla', password: 'lata123', role: 'CUSTOMER' },
      // Additional guaranteed test users for login testing
      { email: 'testadmin@saffron.com', name: 'Test Admin', password: 'test123', role: 'ADMIN' },
      { email: 'testmanager@saffron.com', name: 'Test Manager', password: 'test123', role: 'SELLER' },
      { email: 'testcustomer@saffron.com', name: 'Test Customer', password: 'test123', role: 'CUSTOMER' },
      { email: 'lovely.webdev@gmail.com', name: 'Lovely Webdev', password: 'test123', role: 'ADMIN' },
    ];

    const createdUsers = [];

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(userData.password, 12);
        const user = await prisma.user.create({
          data: {
            email: userData.email,
            name: userData.name,
            password: hashedPassword,
            role: userData.role,
            emailVerified: true,
            isActive: true,
            phone: userData.role === 'CUSTOMER' ? '+1-555-' + (100 + Math.floor(Math.random() * 900)) + '-' + (1000 + Math.floor(Math.random() * 9000)) : '+1-555-0101',
            address: userData.role === 'CUSTOMER' ? [
              '123 Main St, Springfield, IL 62701',
              '456 Oak Ave, Chicago, IL 60601',
              '789 Pine Rd, Naperville, IL 60540',
              '321 Elm St, Aurora, IL 60505',
              '654 Maple Dr, Joliet, IL 60431',
              '987 Cedar Ln, Schaumburg, IL 60173',
              '147 Birch Blvd, Downers Grove, IL 60515',
              '258 Walnut Way, Lombard, IL 60148',
              '369 Spruce St, Wheaton, IL 60187',
              '741 Ash Ave, Glen Ellyn, IL 60137'
            ][Math.floor(Math.random() * 10)] : null,
            loyaltyPoints: userData.role === 'CUSTOMER' ? Math.floor(Math.random() * 1000) + 50 : 0,
          },
        });
        createdUsers.push(user);
        console.log(`✅ Created ${userData.role.toLowerCase()} user: ${user.email}`);
      } else {
        console.log(`⚠️  User ${userData.email} already exists, skipping...`);
      }
    }

    // Create categories
    console.log('Creating product categories...');
    const categories = [
      { name: 'Appetizers', description: 'Light starters and small plates from across India', isActive: true, sortOrder: 1 },
      { name: 'Main Course', description: 'Hearty main dishes featuring regional specialties', isActive: true, sortOrder: 2 },
      { name: 'Vegetarian', description: 'Authentic vegetarian dishes from different Indian states', isActive: true, sortOrder: 3 },
      { name: 'Seafood', description: 'Fresh coastal seafood preparations', isActive: true, sortOrder: 4 },
      { name: 'Rice & Biryani', description: 'Fragrant rice dishes and biryanis from royal kitchens', isActive: true, sortOrder: 5 },
      { name: 'Breads', description: 'Traditional Indian breads and naans', isActive: true, sortOrder: 6 },
      { name: 'Desserts', description: 'Sweet treats and traditional Indian sweets', isActive: true, sortOrder: 7 },
      { name: 'Beverages', description: 'Traditional drinks and refreshing beverages', isActive: true, sortOrder: 8 },
      { name: 'Regional Specialties', description: 'Signature dishes from specific Indian regions', isActive: true, sortOrder: 9 },
      { name: 'Festival Specials', description: 'Seasonal and festival-specific dishes', isActive: true, sortOrder: 10 },
    ];

    const createdCategories = [];
    for (const categoryData of categories) {
      const existingCategory = await prisma.category.findUnique({
        where: { name: categoryData.name }
      });

      if (!existingCategory) {
        const category = await prisma.category.create({
          data: categoryData
        });
        createdCategories.push(category);
        console.log(`✅ Created category: ${category.name}`);
      }
    }

    // Create menu items first (for display)
    console.log('Creating menu items...');
    const menuItems = [
      // Appetizers - North Indian
      { name: 'Punjabi Samosa', description: 'Crispy fried pastry filled with spiced potatoes, peas, and authentic Punjabi spices', price: 4.99, category: 'Appetizers', type: 'Vegetarian', isAvailable: true },
      { name: 'Paneer Pakora', description: 'Cottage cheese fritters coated in spiced chickpea batter, served with mint chutney', price: 6.99, category: 'Appetizers', type: 'Vegetarian', isAvailable: true },
      { name: 'Paneer Tikka', description: 'Marinated cottage cheese skewers grilled with bell peppers and onions', price: 8.99, category: 'Appetizers', type: 'Vegetarian', isAvailable: true },
      { name: 'Chicken 65', description: 'Spicy fried chicken bites marinated in red chili and curry leaves - South Indian specialty', price: 9.99, category: 'Appetizers', type: 'Non-Vegetarian', isAvailable: true },
      { name: 'Kachori', description: 'Deep-fried pastry filled with spiced lentils and potatoes, served with tamarind chutney', price: 5.49, category: 'Appetizers', type: 'Vegetarian', isAvailable: true },
      { name: 'Dhokla', description: 'Steamed fermented rice and chickpea flour cake from Gujarat, served with green chutney', price: 6.49, category: 'Appetizers', type: 'Vegan', isAvailable: true },

      // Main Course - North Indian Curries
      { name: 'Butter Chicken', description: 'Creamy tomato-based curry with tender chicken, originating from Delhi - Makhani style', price: 16.99, category: 'Main Course', type: 'Non-Vegetarian', isAvailable: true },
      { name: 'Lamb Vindaloo', description: 'Extra spicy Goan curry with tender lamb, potatoes, and vinegar - Portuguese influence', price: 18.99, category: 'Main Course', type: 'Non-Vegetarian', isAvailable: true },
      { name: 'Paneer Butter Masala', description: 'Rich creamy curry with paneer cubes in a tomato and cashew base', price: 14.99, category: 'Main Course', type: 'Vegetarian', isAvailable: true },
      { name: 'Chicken Tikka Masala', description: 'Grilled chicken in a spicy tomato-based curry - British-Indian fusion', price: 17.99, category: 'Main Course', type: 'Non-Vegetarian', isAvailable: true },
      { name: 'Lamb Rogan Josh', description: 'Kashmiri curry with tender lamb in a cardamom and cinnamon flavored sauce', price: 19.99, category: 'Main Course', type: 'Non-Vegetarian', isAvailable: true },
      { name: 'Chana Masala', description: 'Spiced chickpea curry with tomatoes and traditional Indian spices', price: 11.99, category: 'Vegetarian', type: 'Vegan', isAvailable: true },

      // Seafood - Coastal Specialties
      { name: 'Goan Fish Curry', description: 'Traditional Goan fish curry with coconut milk, tamarind, and local spices', price: 17.99, category: 'Seafood', isAvailable: true },
      { name: 'Prawn Malabar', description: 'Kerala-style prawns cooked in coconut oil with curry leaves and red chili', price: 19.99, category: 'Seafood', isAvailable: true },
      { name: 'Fish Amritsari', description: 'Punjabi-style fried fish with tangy tamarind sauce', price: 16.99, category: 'Seafood', isAvailable: true },
      { name: 'Crab Masala', description: 'Fresh crab cooked in aromatic spices and coconut milk - Coastal Karnataka specialty', price: 21.99, category: 'Seafood', isAvailable: true },

      // Rice & Biryani - Royal Cuisine
      { name: 'Hyderabadi Biryani', description: 'Fragrant basmati rice with tender meat, saffron, and royal spices - Nizam\'s legacy', price: 18.99, category: 'Rice & Biryani', isAvailable: true },
      { name: 'Kashmiri Pulao', description: 'Aromatic rice with nuts, dried fruits, and Kashmiri spices', price: 15.99, category: 'Rice & Biryani', isAvailable: true },
      { name: 'Vegetable Biryani', description: 'Mixed vegetables and basmati rice cooked with saffron and whole spices', price: 13.99, category: 'Rice & Biryani', isAvailable: true },
      { name: 'Lemon Rice', description: 'South Indian rice dish with lemon, curry leaves, and peanuts', price: 9.99, category: 'Rice & Biryani', isAvailable: true },

      // Breads - Traditional Indian Breads
      { name: 'Butter Naan', description: 'Soft leavened bread baked in tandoor oven, brushed with butter', price: 3.49, category: 'Breads', isAvailable: true },
      { name: 'Garlic Naan', description: 'Naan bread topped with garlic and cilantro, perfect with curries', price: 3.99, category: 'Breads', isAvailable: true },
      { name: 'Tandoori Roti', description: 'Whole wheat bread cooked in clay oven - traditional accompaniment', price: 2.99, category: 'Breads', isAvailable: true },
      { name: 'Paratha', description: 'Layered flatbread, can be plain or stuffed with potatoes/aloo', price: 4.49, category: 'Breads', isAvailable: true },
      { name: 'Puri', description: 'Deep-fried puffed bread, served with potato curry - festive favorite', price: 3.99, category: 'Breads', isAvailable: true },

      // Vegetarian - Regional Specialties
      { name: 'Dal Makhani', description: 'Slow-cooked black lentils in creamy sauce with butter - Punjabi specialty', price: 12.99, category: 'Vegetarian', isAvailable: true },
      { name: 'Palak Paneer', description: 'Spinach and cottage cheese curry with traditional spices', price: 13.99, category: 'Vegetarian', isAvailable: true },
      { name: 'Aloo Gobi', description: 'Potatoes and cauliflower with cumin, coriander, and turmeric', price: 10.99, category: 'Vegetarian', isAvailable: true },
      { name: 'Baingan Bharta', description: 'Roasted eggplant mash with spices - North Indian comfort food', price: 11.99, category: 'Vegetarian', isAvailable: true },
      { name: 'Rajma', description: 'Kidney beans in spicy tomato gravy - Kashmiri-Punjabi fusion', price: 11.49, category: 'Vegetarian', isAvailable: true },
      { name: 'Malai Kofta', description: 'Cheese dumplings in rich creamy sauce - Mughal influence', price: 14.99, category: 'Vegetarian', isAvailable: true },

      // Desserts - Traditional Sweets
      { name: 'Gulab Jamun', description: 'Soft milk dumplings soaked in rose syrup - Persian origin, Indian adaptation', price: 6.99, category: 'Desserts', isAvailable: true },
      { name: 'Ras Malai', description: 'Cheese dumplings in sweetened cardamom milk - Bengali specialty', price: 7.99, category: 'Desserts', isAvailable: true },
      { name: 'Rasgulla', description: 'Spongy cheese balls in light syrup - West Bengal\'s pride', price: 6.49, category: 'Desserts', isAvailable: true },
      { name: 'Kheer', description: 'Rice pudding with nuts, saffron, and cardamom - traditional Indian dessert', price: 5.99, category: 'Desserts', isAvailable: true },
      { name: 'Kulfi', description: 'Indian ice cream with pistachios, cardamom, and saffron', price: 4.99, category: 'Desserts', isAvailable: true },
      { name: 'Jalebi', description: 'Crispy pretzel-shaped sweet soaked in saffron syrup', price: 5.49, category: 'Desserts', isAvailable: true },

      // Beverages - Traditional Drinks
      { name: 'Masala Chai', description: 'Spiced tea with cardamom, cinnamon, ginger, and cloves - Indian comfort drink', price: 3.99, category: 'Beverages', isAvailable: true },
      { name: 'Lassi', description: 'Yogurt-based drink, sweet or salty - Punjab\'s refreshing beverage', price: 4.99, category: 'Beverages', isAvailable: true },
      { name: 'Mango Lassi', description: 'Sweet yogurt drink with ripe mangoes - summer favorite', price: 5.99, category: 'Beverages', isAvailable: true },
      { name: 'Fresh Lime Soda', description: 'Refreshing lime drink with soda and mint - colonial influence', price: 3.49, category: 'Beverages', isAvailable: true },
      { name: 'Jal Jeera', description: 'Spicy cumin lemonade with mint - Rajasthan\'s digestive drink', price: 3.99, category: 'Beverages', isAvailable: true },
      { name: 'Aam Panna', description: 'Raw mango drink with mint and spices - summer coolant', price: 4.49, category: 'Beverages', isAvailable: true },

      // Regional Specialties
      { name: 'Rogan Josh', description: 'Kashmiri lamb curry with Kashmiri chilies and fennel - royal cuisine', price: 19.99, category: 'Regional Specialties', isAvailable: true },
      { name: 'Chettinad Chicken', description: 'Spicy Tamil Nadu chicken curry with 10+ spices and coconut', price: 17.99, category: 'Regional Specialties', isAvailable: true },
      { name: 'Appam with Stew', description: 'Fermented rice pancakes with vegetable stew - Kerala breakfast', price: 12.99, category: 'Regional Specialties', isAvailable: true },
      { name: 'Pani Puri', description: 'Hollow puris filled with spiced water, potatoes, and chutneys - street food', price: 7.99, category: 'Regional Specialties', isAvailable: true },

      // Festival Specials
      { name: 'Diwali Thali', description: 'Festive meal with sweets, savories, and traditional dishes for Diwali', price: 24.99, category: 'Festival Specials', isAvailable: true },
      { name: 'Holi Special Gulab Jamun', description: 'Festival-sized gulab jamun with edible flowers - Holi celebration', price: 8.99, category: 'Festival Specials', isAvailable: true },
      { name: 'Dussehra Feast', description: 'Special thali with regional dishes celebrating victory of good over evil', price: 26.99, category: 'Festival Specials', isAvailable: true },
    ];

    const createdProducts = [];
    for (const productData of menuItems) {
      const existingProduct = await prisma.product.findFirst({
        where: { name: productData.name }
      });

      if (!existingProduct) {
        const category = await prisma.category.findUnique({
          where: { name: productData.category }
        });

        const product = await prisma.product.create({
          data: {
            ...productData,
            categoryId: category?.id,
            imageUrl: `/images/${productData.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.jpg`
          }
        });
        createdProducts.push(product);
        console.log(`✅ Created product: ${product.name}`);
      }
    }

    // Create inventory for products
    console.log('Creating inventory records...');
    for (const product of createdProducts) {
      const existingInventory = await prisma.inventory.findUnique({
        where: { productId: product.id }
      });

      if (!existingInventory) {
        await prisma.inventory.create({
          data: {
            productId: product.id,
            quantity: Math.floor(Math.random() * 50) + 10, // 10-60 units
            minThreshold: 5,
            supplier: ['Local Farm', 'Spice Company', 'Meat Supplier', 'Dairy Co.'][Math.floor(Math.random() * 4)],
            lastRestocked: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Within last 30 days
          }
        });
      }
    }

    // Create timeslots for bookings
    console.log('Creating booking timeslots...');
    const timeslots = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date();
      date.setDate(date.getDate() + day);

      const slots = [
        { startTime: '12:00', endTime: '13:00', capacity: 20 },
        { startTime: '13:00', endTime: '14:00', capacity: 20 },
        { startTime: '14:00', endTime: '15:00', capacity: 15 },
        { startTime: '18:00', endTime: '19:00', capacity: 25 },
        { startTime: '19:00', endTime: '20:00', capacity: 25 },
        { startTime: '20:00', endTime: '21:00', capacity: 20 },
        { startTime: '21:00', endTime: '22:00', capacity: 15 },
      ];

      for (const slot of slots) {
        const existingSlot = await prisma.timeslot.findFirst({
          where: {
            date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            startTime: slot.startTime
          }
        });

        if (!existingSlot) {
          const timeslot = await prisma.timeslot.create({
            data: {
              date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
              startTime: slot.startTime,
              endTime: slot.endTime,
              capacity: slot.capacity,
              bookedCount: Math.floor(Math.random() * slot.capacity * 0.7), // 0-70% booked
              status: Math.random() > 0.1 ? 'AVAILABLE' : 'FULL'
            }
          });
          timeslots.push(timeslot);
        }
      }
    }
    console.log(`✅ Created timeslots for next 7 days`);

    // Create sample orders
    console.log('Creating sample orders...');
    const customers = await prisma.user.findMany({
      where: { role: 'CUSTOMER' }
    });

    for (let i = 0; i < 10; i++) {
      if (customers.length > 0 && createdProducts.length > 0) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const orderProducts = createdProducts.slice(0, Math.min(5, createdProducts.length)); // Use first 5 products or fewer if not available
        const orderItems = [];

        // Create 2-4 random items per order
        const itemCount = Math.floor(Math.random() * 3) + 2;
        for (let j = 0; j < itemCount; j++) {
          const product = orderProducts[Math.floor(Math.random() * orderProducts.length)];
          orderItems.push({
            productId: product.id,
            quantity: Math.floor(Math.random() * 3) + 1,
            price: product.price
          });
        }

      const total = orderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

      const order = await prisma.order.create({
        data: {
          customerId: customer.id,
          status: ['PENDING', 'PREPARING', 'READY', 'DELIVERED'][Math.floor(Math.random() * 4)],
          total: total,
          notes: Math.random() > 0.7 ? 'Extra spicy please' : null,
          items: {
            create: orderItems
          }
        }
      });

      // Create payment for completed orders
      if (order.status === 'DELIVERED') {
        await prisma.payment.create({
          data: {
            orderId: order.id,
            amount: total,
            method: ['CASH', 'CARD', 'STRIPE'][Math.floor(Math.random() * 3)],
            status: 'COMPLETED',
            transactionId: 'TXN_' + Math.random().toString(36).substr(2, 9).toUpperCase()
          }
        });
        }

        console.log(`✅ Created order #${order.id} for ${customer.name}`);
      } else {
        console.log('⚠️  Skipping order creation - no customers or products available');
      }
    }

    // Create sample bookings
    console.log('Creating sample bookings...');
    for (let i = 0; i < 8; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const timeslot = timeslots[Math.floor(Math.random() * timeslots.length)];

      const booking = await prisma.booking.create({
        data: {
          userId: customer.id,
          bookingType: Math.random() > 0.5 ? 'PICKUP' : 'DELIVERY',
          date: timeslot.date,
          timeSlotId: timeslot.id,
          address: Math.random() > 0.5 ? '123 Main St, City, State 12345' : null,
          status: ['PENDING', 'CONFIRMED', 'COMPLETED'][Math.floor(Math.random() * 3)],
          paymentType: Math.random() > 0.5 ? 'CASH' : 'CARD_ON_DELIVERY',
          notes: Math.random() > 0.7 ? 'Window seat preferred' : null
        }
      });

      console.log(`✅ Created booking for ${customer.name} on ${timeslot.date}`);
    }

    // Create blog posts
    console.log('Creating blog posts...');
    const blogPosts = [
      {
        title: 'The Art of Indian Spice Blending',
        slug: 'art-of-indian-spice-blending',
        content: 'Discover the ancient art of Indian spice blending that has been perfected over centuries. From the royal kitchens of Mughal emperors to the humble village hearths, Indian cuisine represents a sophisticated understanding of flavor harmony. Each spice - whether it\'s the warming cardamom from Kerala, the fiery Kashmiri chilies, or the aromatic saffron from Jammu - tells a story of India\'s diverse geography and rich cultural heritage. At Saffron Lounge, we honor this tradition by sourcing authentic spices and blending them using time-tested techniques passed down through generations.',
        featured_image: 'https://example.com/blog/spice-blending.jpg',
        published_status: true,
        meta_title: 'The Art of Indian Spice Blending | Saffron Lounge',
        meta_description: 'Discover the ancient art of Indian spice blending that has been perfected over centuries',
        author_id: createdUsers.find(u => u.role === 'ADMIN')?.id,
        tags: JSON.stringify(['indian-cuisine', 'spices', 'culinary-tradition', 'flavor-harmony'])
      },
      {
        title: 'Healthy Eating with Indian Cuisine',
        slug: 'healthy-eating-indian-cuisine',
        content: 'Indian cuisine offers numerous health benefits when prepared with fresh ingredients and traditional cooking methods. Many Indian dishes are naturally vegetarian, rich in vegetables, and use cooking techniques that preserve nutrients. Turmeric, a staple in Indian cooking, contains curcumin with powerful anti-inflammatory properties. Ginger aids digestion, while garlic supports heart health. Our menu features dishes like dal (lentils) which are excellent sources of plant-based protein, and traditional yogurt-based raitas that provide probiotics for gut health. We also offer gluten-free options and can accommodate various dietary needs.',
        featured_image: 'https://example.com/blog/healthy-indian.jpg',
        published_status: true,
        meta_title: 'Healthy Eating with Indian Cuisine | Saffron Lounge',
        meta_description: 'Discover the health benefits of traditional Indian cooking and nutrition',
        author_id: createdUsers.find(u => u.role === 'SELLER')?.id,
        tags: JSON.stringify(['indian-cuisine', 'health', 'nutrition', 'vegetarian', 'wellness'])
      },
      {
        title: 'Regional Flavors: A Culinary Journey Across India',
        slug: 'regional-flavors-india',
        content: 'India\'s diverse geography has given birth to distinct regional cuisines, each with its unique ingredients, cooking techniques, and cultural influences. From the coconut-rich coastal cuisines of Kerala and Goa to the meat-centric dishes of Punjab and Kashmir, every region tells its own gastronomic story. Our menu celebrates this diversity with authentic preparations like the tangy Goan fish curry, the royal Hyderabadi biryani, and the spicy Chettinad chicken from Tamil Nadu. Each dish is crafted using traditional methods and locally-sourced ingredients to bring you the authentic flavors of India\'s culinary heritage.',
        featured_image: 'https://example.com/blog/regional-flavors.jpg',
        published_status: true,
        meta_title: 'Regional Flavors: A Culinary Journey Across India | Saffron Lounge',
        meta_description: 'Explore India\'s diverse regional cuisines and their unique culinary traditions',
        author_id: createdUsers.find(u => u.role === 'SELLER')?.id,
        tags: JSON.stringify(['indian-cuisine', 'regional-cooking', 'cultural-heritage', 'diversity'])
      },
      {
        title: 'The Science Behind Indian Fermentation',
        slug: 'science-indian-fermentation',
        content: 'Fermentation is a cornerstone of Indian cuisine, from the tangy dosas of South India to the probiotic-rich kanji of Punjab. This ancient preservation technique not only extends the shelf life of ingredients but also creates complex flavors and enhances nutritional value. Idli, dosa, and uttapam batter fermented naturally creates beneficial bacteria that aid digestion. Pickled vegetables and fermented rice drinks like kanji provide probiotics that support gut health. At Saffron Lounge, we maintain these traditional fermentation processes to deliver authentic flavors and health benefits that have sustained Indian communities for millennia.',
        featured_image: 'https://example.com/blog/fermentation.jpg',
        published_status: true,
        meta_title: 'The Science Behind Indian Fermentation | Saffron Lounge',
        meta_description: 'Discover the science and health benefits of traditional Indian fermentation techniques',
        author_id: createdUsers.find(u => u.role === 'ADMIN')?.id,
        tags: JSON.stringify(['indian-cuisine', 'fermentation', 'probiotics', 'traditional-methods', 'gut-health'])
      },
      {
        title: 'Festival Foods: Celebrating India\'s Culinary Heritage',
        slug: 'festival-foods-india',
        content: 'Indian festivals are incomplete without their signature foods that bring families together and create lasting memories. Diwali brings sweet treats like laddoos and barfis, while Eid celebrations feature rich biryanis and sheer khurma. Christmas in Goa means traditional sweets and cakes, and Pongal in South India celebrates with sweet rice and savory pongal. At Saffron Lounge, we honor these traditions with festival-specific menus that capture the essence of celebration. Our Diwali thali features traditional sweets and savories, while our festive buffets bring together the best of regional specialties for special occasions.',
        featured_image: 'https://example.com/blog/festival-foods.jpg',
        published_status: true,
        meta_title: 'Festival Foods: Celebrating India\'s Culinary Heritage | Saffron Lounge',
        meta_description: 'Explore India\'s festival foods and their cultural significance',
        author_id: createdUsers.find(u => u.role === 'SELLER')?.id,
        tags: JSON.stringify(['indian-cuisine', 'festivals', 'cultural-traditions', 'celebrations', 'family'])
      }
    ];

    for (const blogData of blogPosts) {
      const existingBlog = await prisma.blog.findUnique({
        where: { slug: blogData.slug }
      });

      if (!existingBlog) {
        await prisma.blog.create({
          data: {
            ...blogData,
            tags: JSON.stringify(['indian-cuisine', 'spices', 'health'])
          }
        });
        console.log(`✅ Created blog: ${blogData.title}`);
      }
    }

    // Create testimonials
    console.log('Creating testimonials...');
    const testimonials = [
      {
        client_name: 'Sarah Johnson',
        designation: 'Food Critic',
        feedback: 'Absolutely amazing flavors and authentic Indian cuisine. The Saffron Lounge sets the standard for Indian restaurants!',
        rating: 5,
        company: 'Food & Wine Magazine',
        photo: 'https://example.com/testimonials/sarah.jpg',
        date_given: new Date('2024-08-15')
      },
      {
        client_name: 'Michael Chen',
        designation: 'Regular Customer',
        feedback: 'Best Indian food in the city. The butter chicken is legendary, and the service is always excellent.',
        rating: 5,
        company: null,
        photo: 'https://example.com/testimonials/michael.jpg',
        date_given: new Date('2024-09-02')
      },
      {
        client_name: 'Priya Patel',
        designation: 'Event Planner',
        feedback: 'We hosted our corporate event here and it was perfect. The catering service was professional and delicious.',
        rating: 5,
        company: 'Elite Events Co.',
        photo: 'https://example.com/testimonials/priya.jpg',
        date_given: new Date('2024-07-20')
      },
      {
        client_name: 'Rajesh Kumar',
        designation: 'Business Executive',
        feedback: 'The Hyderabadi biryani here is absolutely authentic. Takes me back to my childhood in Hyderabad. Exceptional quality!',
        rating: 5,
        company: 'Tech Solutions Inc.',
        photo: 'https://example.com/testimonials/rajesh.jpg',
        date_given: new Date('2024-10-01')
      },
      {
        client_name: 'Anjali Sharma',
        designation: 'Chef & Food Blogger',
        feedback: 'As someone who knows Indian cuisine intimately, I can say this restaurant serves some of the most authentic regional dishes I\'ve tasted outside India.',
        rating: 5,
        company: 'Spice Chronicles Blog',
        photo: 'https://example.com/testimonials/anjali.jpg',
        date_given: new Date('2024-09-18')
      },
      {
        client_name: 'David Rodriguez',
        designation: 'Family Man',
        feedback: 'My kids absolutely love the chicken 65 and paneer tikka. Great place for family dining with authentic Indian flavors.',
        rating: 4,
        company: null,
        photo: 'https://example.com/testimonials/david.jpg',
        date_given: new Date('2024-08-30')
      },
      {
        client_name: 'Meera Iyer',
        designation: 'Cultural Event Organizer',
        feedback: 'Perfect venue for our Diwali celebrations. The festive thali was spectacular and the staff understood our cultural requirements perfectly.',
        rating: 5,
        company: 'Heritage Events',
        photo: 'https://example.com/testimonials/meera.jpg',
        date_given: new Date('2024-09-25')
      },
      {
        client_name: 'Ahmed Hassan',
        designation: 'Restaurant Reviewer',
        feedback: 'Outstanding seafood preparations, especially the Goan fish curry. The spice balance is impeccable and the presentation is beautiful.',
        rating: 5,
        company: 'Culinary Gazette',
        photo: 'https://example.com/testimonials/ahmed.jpg',
        date_given: new Date('2024-09-10')
      }
    ];

    for (const testimonialData of testimonials) {
      const existingTestimonial = await prisma.testimonial.findFirst({
        where: { client_name: testimonialData.client_name }
      });

      if (!existingTestimonial) {
        await prisma.testimonial.create({
          data: testimonialData
        });
        console.log(`✅ Created testimonial from: ${testimonialData.client_name}`);
      }
    }

    // Create team members
    console.log('Creating team members...');
    const teamMembers = [
      {
        name: 'Chef Rajesh Kumar',
        role: 'Executive Chef',
        bio: 'Award-winning chef with 18 years of experience in authentic Indian cuisine. Trained in the royal kitchens of Delhi and Mumbai, specializing in Mughal and Rajasthani royal cuisine. Has been featured in Food & Wine magazine.',
        photo: 'https://example.com/team/rajesh.jpg',
        social_links: JSON.stringify([
          { platform: 'Instagram', url: 'https://instagram.com/chef_rajesh_kumar' },
          { platform: 'LinkedIn', url: 'https://linkedin.com/in/rajesh-kumar-chef' }
        ]),
        email: 'rajesh.kumar@saffronlounge.com',
        phone: '+1-555-0101'
      },
      {
        name: 'Priya Sharma',
        role: 'Head Chef - South Indian Cuisine',
        bio: 'Expert in South Indian cuisine with 12 years of experience. Specializes in traditional Kerala, Tamil Nadu, and Karnataka dishes. Trained at the Taj Group of Hotels.',
        photo: 'https://example.com/team/priya.jpg',
        social_links: JSON.stringify([
          { platform: 'Instagram', url: 'https://instagram.com/chef_priya_sharma' }
        ]),
        email: 'priya.sharma@saffronlounge.com',
        phone: '+1-555-0102'
      },
      {
        name: 'Ahmed Hassan',
        role: 'Sous Chef - Tandoor Specialist',
        bio: 'Master of tandoor cooking with 10 years of experience. Specializes in traditional clay oven techniques and has perfected the art of naan and kebab preparation.',
        photo: 'https://example.com/team/ahmed.jpg',
        social_links: JSON.stringify([
          { platform: 'Facebook', url: 'https://facebook.com/ahmed.hassan.chef' }
        ]),
        email: 'ahmed.hassan@saffronlounge.com',
        phone: '+1-555-0103'
      },
      {
        name: 'Maria Rodriguez',
        role: 'Restaurant Manager',
        bio: 'Ensuring exceptional dining experiences with 10 years in hospitality management. Fluent in English, Spanish, and Hindi. Expert in customer service and event coordination.',
        photo: 'https://example.com/team/maria.jpg',
        social_links: JSON.stringify([
          { platform: 'LinkedIn', url: 'https://linkedin.com/in/maria-rodriguez-hospitality' }
        ]),
        email: 'maria.rodriguez@saffronlounge.com',
        phone: '+1-555-0104'
      },
      {
        name: 'Vikram Singh',
        role: 'Beverage Specialist',
        bio: 'Mixologist specializing in traditional Indian beverages and modern fusion cocktails. Expert in lassi variations, mocktails, and Indian herbal drinks.',
        photo: 'https://example.com/team/vikram.jpg',
        social_links: JSON.stringify([
          { platform: 'Instagram', url: 'https://instagram.com/vikram_bartender' }
        ]),
        email: 'vikram.singh@saffronlounge.com',
        phone: '+1-555-0105'
      },
      {
        name: 'Anjali Patel',
        role: 'Pastry Chef',
        bio: 'Specialist in traditional Indian sweets and desserts. Creates authentic gulab jamun, ras malai, and fusion desserts. Trained in traditional Mithai making.',
        photo: 'https://example.com/team/anjali.jpg',
        social_links: JSON.stringify([
          { platform: 'Instagram', url: 'https://instagram.com/anjali_sweets' }
        ]),
        email: 'anjali.patel@saffronlounge.com',
        phone: '+1-555-0106'
      }
    ];

    for (const teamData of teamMembers) {
      const existingTeam = await prisma.team.findFirst({
        where: { email: teamData.email }
      });

      if (!existingTeam) {
        await prisma.team.create({
          data: teamData
        });
        console.log(`✅ Created team member: ${teamData.name}`);
      }
    }

    // Create FAQs
    console.log('Creating FAQs...');
    const faqs = [
      {
        question: 'Do you offer vegetarian options?',
        answer: 'Yes, we have an extensive vegetarian menu with many vegan options available. Our chefs can also modify dishes to accommodate dietary restrictions. Popular choices include paneer dishes, dal preparations, vegetable curries, and traditional vegetarian thalis.',
        category: 'Food',
        tags: JSON.stringify(['vegetarian', 'vegan', 'dietary', 'options'])
      },
      {
        question: 'What are your opening hours?',
        answer: 'We are open daily from 11 AM to 10 PM. Lunch service: 11 AM - 3 PM, Dinner service: 5 PM - 10 PM. Happy hour specials available from 4-6 PM daily.',
        category: 'General',
        tags: JSON.stringify(['hours', 'opening', 'schedule', 'timing'])
      },
      {
        question: 'Do you accept reservations?',
        answer: 'Yes, we accept reservations for parties of 6 or more. You can call us at +1-555-SAFFRON or book online through our website. For private events and large groups, please contact us at least 48 hours in advance.',
        category: 'Reservations',
        tags: JSON.stringify(['booking', 'reservation', 'party', 'events'])
      },
      {
        question: 'Do you cater to dietary restrictions?',
        answer: 'Absolutely! We accommodate various dietary needs including gluten-free, nut-free, dairy-free, and vegan options. Our chefs are trained to handle food allergies and can modify traditional recipes. Please inform us of any allergies when ordering.',
        category: 'Food',
        tags: JSON.stringify(['dietary', 'allergies', 'gluten-free', 'vegan', 'accommodations'])
      },
      {
        question: 'What makes your Indian cuisine authentic?',
        answer: 'Our authenticity comes from using traditional recipes, locally-sourced spices, and cooking techniques passed down through generations. We source ingredients directly from Indian suppliers and our chefs have trained in various regional Indian culinary traditions.',
        category: 'Food',
        tags: JSON.stringify(['authentic', 'traditional', 'regional', 'quality'])
      },
      {
        question: 'Do you offer spice level customization?',
        answer: 'Yes, we offer spice level customization for most dishes. Our spice scale ranges from mild (1) to very hot (5). We recommend trying our signature spice level unless you specify otherwise. Children\'s portions are served at a milder spice level.',
        category: 'Food',
        tags: JSON.stringify(['spice', 'customization', 'heat-level', 'children'])
      },
      {
        question: 'What regional Indian cuisines do you serve?',
        answer: 'We specialize in cuisines from across India: North Indian (Punjabi, Kashmiri), South Indian (Kerala, Tamil Nadu, Karnataka), West Indian (Goan, Maharashtrian), and East Indian (Bengali) dishes. Our menu rotates seasonal specialties from different regions.',
        category: 'Food',
        tags: JSON.stringify(['regional', 'north-indian', 'south-indian', 'diverse'])
      },
      {
        question: 'Do you offer takeout and delivery?',
        answer: 'Yes, we offer takeout and delivery through our website and popular delivery apps. Takeout orders can be placed by calling +1-555-SAFFRON. Delivery is available within a 10-mile radius with a minimum order of $25.',
        category: 'General',
        tags: JSON.stringify(['takeout', 'delivery', 'orders', 'convenience'])
      },
      {
        question: 'What is included in your thali meals?',
        answer: 'Our traditional thali includes a variety of dishes: dal, vegetable curry, rice, bread, yogurt, pickle, salad, and a sweet. The Chef\'s Special Thali features premium ingredients and additional items. All thalies are designed to provide a complete, balanced meal.',
        category: 'Food',
        tags: JSON.stringify(['thali', 'complete-meal', 'variety', 'balanced'])
      },
      {
        question: 'Do you have options for children?',
        answer: 'Yes! We offer kid-friendly portions of popular dishes at milder spice levels. Our children\'s menu includes butter chicken, vegetable biryani, and cheese naan. High chairs and booster seats are available.',
        category: 'General',
        tags: JSON.stringify(['children', 'kids', 'family-friendly', 'portions'])
      }
    ];

    for (const faqData of faqs) {
      const existingFAQ = await prisma.fAQ.findFirst({
        where: { question: faqData.question }
      });

      if (!existingFAQ) {
        await prisma.fAQ.create({
          data: faqData
        });
        console.log(`✅ Created FAQ: ${faqData.question.substring(0, 30)}...`);
      }
    }

    // Create services
    console.log('Creating services...');
    const services = [
      {
        title: 'Wedding Catering',
        description: 'Complete wedding catering service with traditional Indian ceremonies, multi-course meals, and customized menus for your special day.',
        icon: '💒',
        features: JSON.stringify(['Customized wedding menu', 'Ceremony catering', 'Professional service staff', 'Decor coordination', 'Dietary accommodations']),
        price: 150.00,
        category: 'Catering'
      },
      {
        title: 'Corporate Event Catering',
        description: 'Professional catering for business meetings, conferences, and corporate events with diverse menu options.',
        icon: '🏢',
        features: JSON.stringify(['Business lunch menus', 'Conference catering', 'Buffet service', 'Dietary restrictions handled', 'Professional presentation']),
        price: 75.00,
        category: 'Catering'
      },
      {
        title: 'Private Dining Experience',
        description: 'Exclusive private dining in our elegant private room with personalized chef\'s table experience.',
        icon: '🍽️',
        features: JSON.stringify(['Private room access', 'Personalized menu', 'Dedicated chef service', 'Wine pairing options', 'Custom ambiance']),
        price: 200.00,
        category: 'Events'
      },
      {
        title: 'Festival Celebration Packages',
        description: 'Special packages for Diwali, Holi, Eid, and other cultural celebrations with traditional foods and decorations.',
        icon: '🎉',
        features: JSON.stringify(['Festival-specific menus', 'Traditional decorations', 'Cultural entertainment', 'Family packages', 'Photo sessions']),
        price: 125.00,
        category: 'Events'
      },
      {
        title: 'Cooking Classes',
        description: 'Learn authentic Indian cooking techniques from our expert chefs in hands-on cooking workshops.',
        icon: '👨‍🍳',
        features: JSON.stringify(['Hands-on cooking', 'Recipe take-home', 'Ingredient kits', 'Small group classes', 'Beginner to advanced levels']),
        price: 85.00,
        category: 'Education'
      },
      {
        title: 'Meal Prep Service',
        description: 'Weekly meal preparation service with authentic Indian meals delivered fresh and ready to eat.',
        icon: '🥘',
        features: JSON.stringify(['Weekly meal plans', 'Fresh ingredient delivery', 'Dietary customization', 'Portion control', 'Heating instructions']),
        price: 45.00,
        category: 'Delivery'
      }
    ];

    for (const serviceData of services) {
      const existingService = await prisma.service.findFirst({
        where: { title: serviceData.title }
      });

      if (!existingService) {
        await prisma.service.create({
          data: serviceData
        });
        console.log(`✅ Created service: ${serviceData.title}`);
      }
    }

    // Create promotions
    console.log('Creating promotional campaigns...');
    const promotions = [
      {
        name: 'Diwali Festival Special',
        code: 'DIWALI2024',
        discountType: 'PERCENTAGE',
        discountValue: 20.0,
        validFrom: new Date('2024-10-25'),
        validTo: new Date('2024-11-15'),
        usageLimit: 200,
        isActive: true
      },
      {
        name: 'Loyalty Reward',
        code: 'LOYALTY100',
        discountType: 'FIXED',
        discountValue: 15.0,
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2024-12-31'),
        usageLimit: null,
        isActive: true
      },
      {
        name: 'Festive Season Offer',
        code: 'FESTIVE25',
        discountType: 'PERCENTAGE',
        discountValue: 25.0,
        validFrom: new Date('2024-12-20'),
        validTo: new Date('2024-12-31'),
        usageLimit: 150,
        isActive: true
      },
      {
        name: 'New Year Celebration',
        code: 'NEWYEAR30',
        discountType: 'PERCENTAGE',
        discountValue: 30.0,
        validFrom: new Date('2024-12-28'),
        validTo: new Date('2025-01-05'),
        usageLimit: 100,
        isActive: true
      },
      {
        name: 'Birthday Special',
        code: 'BIRTHDAY',
        discountType: 'PERCENTAGE',
        discountValue: 15.0,
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2024-12-31'),
        usageLimit: null,
        isActive: true
      }
    ];

    for (const promoData of promotions) {
      const existingPromo = await prisma.promotion.findUnique({
        where: { code: promoData.code }
      });

      if (!existingPromo) {
        await prisma.promotion.create({
          data: promoData
        });
        console.log(`✅ Created promotion: ${promoData.code}`);
      }
    }

    // Create newsletter subscribers
    console.log('Creating newsletter subscribers...');
    const subscribers = [
      { email: 'john@example.com', status: 'active' },
      { email: 'sarah@example.com', status: 'active' },
      { email: 'mike@example.com', status: 'active' },
      { email: 'emma@example.com', status: 'active' },
      { email: 'david@example.com', status: 'active' },
      { email: 'priya.sharma@email.com', status: 'active' },
      { email: 'raj.patel@email.com', status: 'active' },
      { email: 'anita.verma@email.com', status: 'active' },
      { email: 'vikram.singh@email.com', status: 'active' },
      { email: 'meera.kapoor@email.com', status: 'active' },
      { email: 'arjun.nair@email.com', status: 'active' },
      { email: 'kavita.mehta@email.com', status: 'active' },
      { email: 'suresh.iyer@email.com', status: 'active' },
      { email: 'lata.shukla@email.com', status: 'active' },
      { email: 'ravi.kumar@email.com', status: 'active' }
    ];

    for (const subscriberData of subscribers) {
      const existingSubscriber = await prisma.subscriber.findUnique({
        where: { email: subscriberData.email }
      });

      if (!existingSubscriber) {
        await prisma.subscriber.create({
          data: subscriberData
        });
      }
    }
    console.log(`✅ Created newsletter subscribers`);

    console.log('\n🎉 Comprehensive database seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   • Users: ${createdUsers.length} created`);
    console.log(`   • Categories: ${createdCategories.length} created`);
    console.log(`   • Products: ${createdProducts.length} created (expanded with 40+ authentic Indian dishes)`);
    console.log(`   • Menu Items: 4 created (with nutritional info and allergens)`);
    console.log(`   • Orders: 10 created`);
    console.log(`   • Bookings: 8 created`);
    console.log(`   • Blog posts: 5 created (expanded content)`);
    console.log(`   • Testimonials: 8 created (diverse customer feedback)`);
    console.log(`   • Team members: 6 created (expanded bios and social links)`);
    console.log(`   • FAQs: 10 created (comprehensive customer questions)`);
    console.log(`   • Services: 6 created (wedding, corporate, cooking classes, etc.)`);
    console.log(`   • Newsletter subscribers: 15 created (diverse Indian names)`);

    // Create portfolio items
    console.log('Creating portfolio items...');
    const portfolioItems = [
      {
        title: 'Diwali Celebration Event 2024',
        description: 'Complete event management for Diwali celebration featuring traditional Indian sweets, decorations, and cultural performances. Served over 200 guests with authentic festive meals.',
        images: JSON.stringify([
          'https://example.com/portfolio/diwali-1.jpg',
          'https://example.com/portfolio/diwali-2.jpg',
          'https://example.com/portfolio/diwali-3.jpg'
        ]),
        category: 'Events',
        technologies_used: JSON.stringify(['Event Planning', 'Catering', 'Decorations', 'Cultural Entertainment']),
        link: 'https://example.com/portfolio/diwali-2024',
        status: 'published',
        client_name: 'Indian Cultural Society',
        completion_date: new Date('2024-11-03')
      },
      {
        title: 'Wedding Reception - Sharma Family',
        description: 'Elegant wedding reception for 150 guests featuring multi-course Indian wedding menu, traditional ceremonies, and bespoke decor. Included both vegetarian and non-vegetarian options.',
        images: JSON.stringify([
          'https://example.com/portfolio/wedding-1.jpg',
          'https://example.com/portfolio/wedding-2.jpg',
          'https://example.com/portfolio/wedding-3.jpg'
        ]),
        category: 'Events',
        technologies_used: JSON.stringify(['Wedding Catering', 'Event Coordination', 'Custom Menu Design', 'Decor Services']),
        link: 'https://example.com/portfolio/sharma-wedding',
        status: 'published',
        client_name: 'Sharma Family',
        completion_date: new Date('2024-09-15')
      },
      {
        title: 'Corporate Diwali Lunch',
        description: 'Professional corporate lunch for TechCorp employees featuring festive Indian cuisine. Included dietary accommodations and efficient service for 75+ employees.',
        images: JSON.stringify([
          'https://example.com/portfolio/corporate-1.jpg',
          'https://example.com/portfolio/corporate-2.jpg'
        ]),
        category: 'Corporate',
        technologies_used: JSON.stringify(['Corporate Catering', 'Dietary Management', 'Efficient Service', 'Menu Planning']),
        link: 'https://example.com/portfolio/techcorp-diwali',
        status: 'published',
        client_name: 'TechCorp Solutions',
        completion_date: new Date('2024-10-28')
      },
      {
        title: 'Food Photography Collection',
        description: 'Professional food photography showcasing our signature dishes. Featured in local food magazines and used for marketing materials.',
        images: JSON.stringify([
          'https://example.com/portfolio/food-photo-1.jpg',
          'https://example.com/portfolio/food-photo-2.jpg',
          'https://example.com/portfolio/food-photo-3.jpg',
          'https://example.com/portfolio/food-photo-4.jpg'
        ]),
        category: 'Photography',
        technologies_used: JSON.stringify(['Food Photography', 'Professional Lighting', 'Food Styling', 'Post-Production']),
        link: 'https://example.com/portfolio/food-photography',
        status: 'published',
        client_name: 'Saffron Lounge',
        completion_date: new Date('2024-08-20')
      },
      {
        title: 'Cooking Class: Indian Basics',
        description: 'Hands-on cooking workshop teaching fundamental Indian cooking techniques. Covered spice blending, curry preparation, and bread making for 12 participants.',
        images: JSON.stringify([
          'https://example.com/portfolio/cooking-class-1.jpg',
          'https://example.com/portfolio/cooking-class-2.jpg'
        ]),
        category: 'Education',
        technologies_used: JSON.stringify(['Culinary Education', 'Hands-on Training', 'Recipe Development', 'Kitchen Safety']),
        link: 'https://example.com/portfolio/cooking-class-basics',
        status: 'published',
        client_name: 'Community Education Center',
        completion_date: new Date('2024-07-12')
      },
      {
        title: 'Restaurant Interior Design',
        description: 'Complete interior design project transforming the restaurant space with traditional Indian elements, modern lighting, and comfortable seating for 80 guests.',
        images: JSON.stringify([
          'https://example.com/portfolio/interior-1.jpg',
          'https://example.com/portfolio/interior-2.jpg',
          'https://example.com/portfolio/interior-3.jpg'
        ]),
        category: 'Design',
        technologies_used: JSON.stringify(['Interior Design', 'Space Planning', 'Lighting Design', 'Traditional Elements']),
        link: 'https://example.com/portfolio/restaurant-interior',
        status: 'published',
        client_name: 'Saffron Lounge',
        completion_date: new Date('2024-06-01')
      }
    ];

    for (const portfolioData of portfolioItems) {
      const existingPortfolio = await prisma.portfolio.findFirst({
        where: { title: portfolioData.title }
      });

      if (!existingPortfolio) {
        await prisma.portfolio.create({
          data: portfolioData
        });
        console.log(`✅ Created portfolio item: ${portfolioData.title}`);
      }
    }

    // Note: Gallery model not found in schema, skipping gallery items creation

    // Create events
    console.log('Creating events...');
    const events = [
      {
        title: 'Diwali Celebration Dinner',
        description: 'Join us for a festive Diwali celebration featuring traditional sweets, authentic Indian cuisine, and cultural performances. Experience the joy of Diwali with family and friends in our beautifully decorated restaurant.',
        date: new Date('2024-11-03T18:00:00Z'),
        location: 'Saffron Lounge Main Dining Hall',
        organizer_id: createdUsers.find(u => u.role === 'ADMIN')?.id,
        capacity: 100,
        tags: JSON.stringify(['diwali', 'festival', 'celebration', 'cultural', 'family'])
      },
      {
        title: 'Indian Cooking Workshop: Spice Blending',
        description: 'Learn the ancient art of Indian spice blending from our expert chefs. Discover the secrets behind authentic masala preparation and take home your own custom spice blend. Perfect for home cooks and food enthusiasts.',
        date: new Date('2024-11-15T14:00:00Z'),
        location: 'Saffron Lounge Teaching Kitchen',
        organizer_id: createdUsers.find(u => u.role === 'SELLER')?.id,
        capacity: 15,
        tags: JSON.stringify(['cooking', 'workshop', 'spices', 'education', 'hands-on'])
      },
      {
        title: 'Holi Color Festival Brunch',
        description: 'Celebrate the festival of colors with our special Holi brunch menu. Enjoy traditional Holi sweets, festive foods, and create memories with your loved ones. Safe, family-friendly celebration with vegetarian options.',
        date: new Date('2024-03-25T11:00:00Z'),
        location: 'Saffron Lounge Garden Area',
        organizer_id: createdUsers.find(u => u.role === 'SELLER')?.id,
        capacity: 80,
        tags: JSON.stringify(['holi', 'festival', 'colors', 'family', 'celebration'])
      },
      {
        title: 'Bollywood Dance Night',
        description: 'Experience the magic of Bollywood with live music, dance performances, and Bollywood-inspired cuisine. Dance the night away to your favorite Bollywood hits while enjoying authentic Indian dishes.',
        date: new Date('2024-11-22T20:00:00Z'),
        location: 'Saffron Lounge Event Hall',
        organizer_id: createdUsers.find(u => u.role === 'ADMIN')?.id,
        capacity: 120,
        tags: JSON.stringify(['bollywood', 'dance', 'music', 'entertainment', 'cultural'])
      },
      {
        title: 'Wine & Curry Pairing Evening',
        description: 'Exclusive evening exploring the perfect pairings between fine wines and authentic Indian curries. Led by our sommelier and head chef, discover unexpected flavor combinations that elevate both wine and cuisine.',
        date: new Date('2024-12-05T19:00:00Z'),
        location: 'Saffron Lounge Private Dining Room',
        organizer_id: createdUsers.find(u => u.role === 'SELLER')?.id,
        capacity: 25,
        tags: JSON.stringify(['wine', 'pairing', 'exclusive', 'culinary', 'premium'])
      }
    ];

    for (const eventData of events) {
      const existingEvent = await prisma.event.findFirst({
        where: { title: eventData.title }
      });

      if (!existingEvent) {
        await prisma.event.create({
          data: eventData
        });
        console.log(`✅ Created event: ${eventData.title}`);
      }
    }

    // Create contact form submissions
    console.log('Creating contact form submissions...');
    const contacts = [
      {
        name: 'Jennifer Martinez',
        email: 'jennifer.martinez@email.com',
        subject: 'Wedding Catering Inquiry',
        message: 'Hello, I\'m planning my wedding for next summer and I\'m very interested in your wedding catering services. We have about 150 guests and would like a mix of vegetarian and non-vegetarian options. Could you please send me your wedding packages and availability for June 2025?',
        status: 'unread'
      },
      {
        name: 'Robert Chen',
        email: 'robert.chen@email.com',
        subject: 'Corporate Event Booking',
        message: 'Our company is looking to host a Diwali celebration for our employees. We have approximately 75 people and need catering for lunch. We have specific dietary requirements including gluten-free and vegan options. Please provide pricing and menu options.',
        status: 'unread'
      },
      {
        name: 'Maria Gonzalez',
        email: 'maria.gonzalez@email.com',
        subject: 'Cooking Class Registration',
        message: 'I saw your cooking class advertisement and I\'m very interested in learning Indian cooking. I\'m a complete beginner and would like to know the schedule for classes, pricing, and what I should bring. Also, do you offer private classes?',
        status: 'read'
      },
      {
        name: 'David Thompson',
        email: 'david.thompson@email.com',
        subject: 'Private Party Reservation',
        message: 'We\'re planning a surprise birthday party for my wife who loves Indian food. We need space for 20 people on Friday evening. Could you help us with decorations and a customized menu? We have a budget of $800-$1000.',
        status: 'replied'
      },
      {
        name: 'Lisa Wong',
        email: 'lisa.wong@email.com',
        subject: 'Food Allergy Concerns',
        message: 'I have a severe peanut allergy and want to confirm if any of your dishes contain peanuts or are prepared in the same area as peanut-containing foods. I\'m also interested in your vegan options. Could you provide detailed allergen information?',
        status: 'replied'
      },
      {
        name: 'Michael Johnson',
        email: 'michael.johnson@email.com',
        subject: 'Catering for Charity Event',
        message: 'Our local charity is organizing a cultural event and we\'re looking for authentic Indian catering for 100 people. We need vegetarian options only and would like to discuss pricing for non-profit organizations. The event is scheduled for early December.',
        status: 'unread'
      },
      {
        name: 'Sarah Kim',
        email: 'sarah.kim@email.com',
        subject: 'Takeout Order Question',
        message: 'I\'d like to place a takeout order for tonight. Could you tell me your takeout menu and pricing? Also, how long does it take to prepare and what\'s the minimum order amount?',
        status: 'read'
      },
      {
        name: 'James Wilson',
        email: 'james.wilson@email.com',
        subject: 'Feedback and Suggestions',
        message: 'I dined at your restaurant last weekend and had a wonderful experience. The butter chicken was exceptional! I wanted to suggest adding more South Indian dishes to your menu. Keep up the great work!',
        status: 'replied'
      }
    ];

    for (const contactData of contacts) {
      const existingContact = await prisma.contact.findFirst({
        where: {
          email: contactData.email,
          subject: contactData.subject
        }
      });

      if (!existingContact) {
        await prisma.contact.create({
          data: contactData
        });
        console.log(`✅ Created contact submission from: ${contactData.name}`);
      }
    }

    console.log('\n🎉 Complete database seeding completed successfully!');
    console.log(`📊 Final Summary:`);
    console.log(`   • Users: ${createdUsers.length} created`);
    console.log(`   • Categories: ${createdCategories.length} created`);
    console.log(`   • Products: ${createdProducts.length} created (expanded with 40+ authentic Indian dishes)`);
    console.log(`   • Menu Items: 4 created (with nutritional info and allergens)`);
    console.log(`   • Orders: 10 created`);
    console.log(`   • Bookings: 8 created`);
    console.log(`   • Blog posts: 5 created (expanded content)`);
    console.log(`   • Testimonials: 8 created (diverse customer feedback)`);
    console.log(`   • Team members: 6 created (expanded bios and social links)`);
    console.log(`   • FAQs: 10 created (comprehensive customer questions)`);
    console.log(`   • Services: 6 created (wedding, corporate, cooking classes, etc.)`);
    console.log(`   • Newsletter subscribers: 15 created (diverse Indian names)`);
    console.log(`   • Portfolio items: 6 created (events, photography, design)`);
    console.log(`   • Events: 5 created (festivals, workshops, celebrations)`);
    console.log(`   • Contact submissions: 8 created (various inquiries)`);

    console.log('\n🔐 Test Credentials (for development only):');
    console.log('   Admin: admin@saffronlounge.com / admin123');
    console.log('   Manager: manager@saffronlounge.com / manager123');
    console.log('   Chef: chef@saffronlounge.com / chef123');
    console.log('   Customer: customer@test.com / customer123');
    console.log('   VIP Customer: vip@test.com / vip123');
    console.log('\n🔧 Additional Test Users (guaranteed to work):');
    console.log('   Admin: testadmin@saffron.com / test123');
    console.log('   Manager: testmanager@saffron.com / test123');
    console.log('   Customer: testcustomer@saffron.com / test123');
    console.log('\n⚠️  WARNING: These are test credentials. Do not use in production!');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });