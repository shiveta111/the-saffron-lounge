const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting CMS database seeding...');

  // Get admin user for authorship
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  if (!adminUser) {
    console.error('❌ No admin user found. Please run the main seed script first.');
    process.exit(1);
  }

  console.log(`📝 Using admin user: ${adminUser.email} (ID: ${adminUser.id})`);

  // Seed Categories
  console.log('\n📂 Seeding categories...');
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

  for (const categoryData of categories) {
    const existing = await prisma.category.findFirst({
      where: { name: categoryData.name }
    });

    if (!existing) {
      await prisma.category.create({
        data: {
          name: categoryData.name,
          description: categoryData.description,
          isActive: true,
        }
      });
      console.log(`✅ Created category: ${categoryData.name}`);
    } else {
      console.log(`⚠️  Category ${categoryData.name} already exists`);
    }
  }

  // Seed Blogs
  console.log('\n📝 Seeding blog posts...');
  const blogs = [
    {
      title: 'The Art of Fine Dining',
      slug: 'art-of-fine-dining',
      content: 'Fine dining is more than just eating—it\'s an experience that engages all the senses. At Saffron Lounge, we believe that every meal should be a journey of discovery, where the aromas of freshly ground spices mingle with the warmth of traditional hospitality. Our expert chefs combine centuries-old techniques with modern presentation to create unforgettable dining experiences that celebrate India\'s rich culinary heritage.',
      featured_image: 'https://example.com/blog/fine-dining.jpg',
      tags: JSON.stringify(['dining', 'food', 'restaurant', 'experience', 'hospitality']),
      published_status: true,
      meta_title: 'The Art of Fine Dining | Saffron Lounge',
      meta_description: 'Discover the secrets of fine dining and elevate your restaurant experience.',
      author_id: adminUser.id,
    },
    {
      title: 'Seasonal Ingredients: Spring Edition',
      slug: 'seasonal-ingredients-spring',
      content: 'Spring brings a bounty of fresh, vibrant ingredients that can transform your dishes into culinary masterpieces. From tender asparagus and sweet peas to fragrant herbs and citrus fruits, seasonal ingredients not only taste better but are also more nutritious. Our spring menu features dishes that highlight these fresh ingredients, creating light yet flavorful meals that celebrate the renewal of the season.',
      featured_image: 'https://example.com/blog/spring-ingredients.jpg',
      tags: JSON.stringify(['seasonal', 'ingredients', 'spring', 'fresh', 'nutrition']),
      published_status: true,
      meta_title: 'Spring Seasonal Ingredients | Saffron Lounge',
      meta_description: 'Explore the freshest spring ingredients for your culinary creations.',
      author_id: adminUser.id,
    },
    {
      title: 'The Story Behind Our Signature Dishes',
      slug: 'signature-dishes-story',
      content: 'Every dish on our menu tells a story of India\'s diverse culinary landscape. Our butter chicken, inspired by the royal kitchens of Delhi, represents the perfect fusion of Mughal and Punjabi cooking traditions. The Goan fish curry captures the Portuguese influence on India\'s western coast, while our Chettinad chicken showcases the bold flavors of South India. Each recipe has been carefully preserved and perfected to bring you authentic flavors that have delighted generations.',
      featured_image: 'https://example.com/blog/signature-dishes.jpg',
      tags: JSON.stringify(['signature-dishes', 'indian-cuisine', 'culinary-history', 'authentic']),
      published_status: true,
      meta_title: 'The Story Behind Our Signature Dishes | Saffron Lounge',
      meta_description: 'Discover the rich history and cultural significance of our signature Indian dishes.',
      author_id: adminUser.id,
    },
  ];

  for (const blogData of blogs) {
    const existing = await prisma.blog.findFirst({
      where: { slug: blogData.slug }
    });

    if (!existing) {
      await prisma.blog.create({ data: blogData });
      console.log(`✅ Created blog: ${blogData.title}`);
    } else {
      console.log(`⚠️  Blog ${blogData.title} already exists`);
    }
  }

  // Seed Team Members
  console.log('\n👥 Seeding team members...');
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
      phone: '+1-555-0101',
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
      phone: '+1-555-0102',
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
      phone: '+1-555-0104',
    },
  ];

  for (const memberData of teamMembers) {
    const existing = await prisma.team.findFirst({
      where: { email: memberData.email }
    });

    if (!existing) {
      await prisma.team.create({ data: memberData });
      console.log(`✅ Created team member: ${memberData.name}`);
    } else {
      console.log(`⚠️  Team member ${memberData.name} already exists`);
    }
  }

  // Seed Testimonials
  console.log('\n💬 Seeding testimonials...');
  const testimonials = [
    {
      client_name: 'Sarah Johnson',
      designation: 'Food Critic',
      feedback: 'Absolutely amazing flavors and authentic Indian cuisine. The Saffron Lounge sets the standard for Indian restaurants!',
      rating: 5,
      photo: 'https://example.com/testimonials/sarah.jpg',
      company: 'Food & Wine Magazine',
      date_given: new Date('2024-08-15')
    },
    {
      client_name: 'Rajesh Kumar',
      designation: 'Business Executive',
      feedback: 'The Hyderabadi biryani here is absolutely authentic. Takes me back to my childhood in Hyderabad. Exceptional quality!',
      rating: 5,
      photo: 'https://example.com/testimonials/rajesh.jpg',
      company: 'Tech Solutions Inc.',
      date_given: new Date('2024-10-01')
    },
    {
      client_name: 'Anjali Sharma',
      designation: 'Chef & Food Blogger',
      feedback: 'As someone who knows Indian cuisine intimately, I can say this restaurant serves some of the most authentic regional dishes I\'ve tasted outside India.',
      rating: 5,
      photo: 'https://example.com/testimonials/anjali.jpg',
      company: 'Spice Chronicles Blog',
      date_given: new Date('2024-09-18')
    },
    {
      client_name: 'David Rodriguez',
      designation: 'Family Man',
      feedback: 'My kids absolutely love the chicken 65 and paneer tikka. Great place for family dining with authentic Indian flavors.',
      rating: 4,
      photo: 'https://example.com/testimonials/david.jpg',
      company: null,
      date_given: new Date('2024-08-30')
    },
  ];

  for (const testimonialData of testimonials) {
    const existing = await prisma.testimonial.findFirst({
      where: {
        client_name: testimonialData.client_name,
        feedback: testimonialData.feedback
      }
    });

    if (!existing) {
      await prisma.testimonial.create({ data: testimonialData });
      console.log(`✅ Created testimonial: ${testimonialData.client_name}`);
    } else {
      console.log(`⚠️  Testimonial from ${testimonialData.client_name} already exists`);
    }
  }

  // Seed Services
  console.log('\n🛎️ Seeding services...');
  const services = [
    {
      title: 'Wedding Catering',
      description: 'Complete wedding catering service with traditional Indian ceremonies, multi-course meals, and customized menus for your special day.',
      icon: '💒',
      features: JSON.stringify(['Customized wedding menu', 'Ceremony catering', 'Professional service staff', 'Decor coordination', 'Dietary accommodations']),
      price: 150.00,
      category: 'Catering',
    },
    {
      title: 'Corporate Event Catering',
      description: 'Professional catering for business meetings, conferences, and corporate events with diverse menu options.',
      icon: '🏢',
      features: JSON.stringify(['Business lunch menus', 'Conference catering', 'Buffet service', 'Dietary restrictions handled', 'Professional presentation']),
      price: 75.00,
      category: 'Catering',
    },
    {
      title: 'Cooking Classes',
      description: 'Learn authentic Indian cooking techniques from our expert chefs in hands-on cooking workshops.',
      icon: '👨‍🍳',
      features: JSON.stringify(['Hands-on cooking', 'Recipe take-home', 'Ingredient kits', 'Small group classes', 'Beginner to advanced levels']),
      price: 85.00,
      category: 'Education',
    },
  ];

  for (const serviceData of services) {
    const existing = await prisma.service.findFirst({
      where: { title: serviceData.title }
    });

    if (!existing) {
      await prisma.service.create({ data: serviceData });
      console.log(`✅ Created service: ${serviceData.title}`);
    } else {
      console.log(`⚠️  Service ${serviceData.title} already exists`);
    }
  }

  console.log('\n🎉 CMS database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log('   - Categories: Sample menu categories created');
  console.log('   - Blogs: 2 sample blog posts created');
  console.log('   - Team: 2 team members created');
  console.log('   - Testimonials: 2 customer testimonials created');
  console.log('   - Services: 2 service offerings created');

  console.log('\n🔧 You can now test the admin dashboard!');
  console.log('   Login credentials: admin@test.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error during CMS seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });