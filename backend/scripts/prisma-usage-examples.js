const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function prismaUsageExamples() {
  console.log('🚀 Prisma Usage Examples\n');

  try {
    // Example 1: Create a user
    console.log('1. Creating a new user...');
    const newUser = await prisma.user.create({
      data: {
        email: 'example@test.com',
        name: 'Example User',
        password: 'hashedpassword123',
        role: 'CUSTOMER',
      },
    });
    console.log('✅ User created:', newUser);

    // Example 2: Find users
    console.log('\n2. Finding all users...');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
    console.log('✅ Found users:', users);

    // Example 3: Create categories and products
    console.log('\n3. Creating categories and products...');
    const category = await prisma.category.create({
      data: {
        name: 'Electronics',
        description: 'Electronic devices and gadgets',
      },
    });

    const product = await prisma.product.create({
      data: {
        name: 'Wireless Headphones',
        description: 'High-quality wireless headphones',
        price: 99.99,
        categoryId: category.id,
        stock: 50,
      },
    });
    console.log('✅ Category and product created:', { category, product });

    // Example 4: Complex query with relations
    console.log('\n4. Finding products with category info...');
    const productsWithCategory = await prisma.product.findMany({
      include: {
        category: true,
        reviews: true,
      },
      where: {
        price: {
          lt: 150, // Less than $150
        },
      },
    });
    console.log('✅ Products with categories:', productsWithCategory);

    // Example 5: Update a product
    console.log('\n5. Updating product stock...');
    const updatedProduct = await prisma.product.update({
      where: {
        id: product.id,
      },
      data: {
        stock: 45,
        price: 89.99,
      },
    });
    console.log('✅ Product updated:', updatedProduct);

    // Example 6: Create an order with items
    console.log('\n6. Creating an order with items...');
    const order = await prisma.order.create({
      data: {
        userId: newUser.id,
        total: 89.99,
        status: 'PENDING',
        items: {
          create: {
            productId: product.id,
            quantity: 1,
            price: 89.99,
          },
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
    console.log('✅ Order created:', order);

    // Example 7: Search and filter
    console.log('\n7. Searching products...');
    const searchResults = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: 'Wireless' } },
          { description: { contains: 'wireless' } },
        ],
        price: {
          gte: 50,
          lte: 200,
        },
      },
      include: {
        category: true,
      },
    });
    console.log('✅ Search results:', searchResults);

    // Example 8: Aggregation
    console.log('\n8. Getting product statistics...');
    const stats = await prisma.product.aggregate({
      _count: {
        id: true,
      },
      _avg: {
        price: true,
      },
      _min: {
        price: true,
      },
      _max: {
        price: true,
      },
    });
    console.log('✅ Product statistics:', stats);

    console.log('\n🎉 All Prisma examples completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Example of using Prisma in an Express route
function exampleExpressRoute() {
  const express = require('express');
  const router = express.Router();

  // GET all products
  router.get('/products', async (req, res) => {
    try {
      const products = await prisma.product.findMany({
        include: {
          category: true,
          reviews: {
            include: {
              user: {
                select: { name: true },
              },
            },
          },
        },
      });
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST create product
  router.post('/products', async (req, res) => {
    try {
      const { name, description, price, categoryId } = req.body;
      const product = await prisma.product.create({
        data: {
          name,
          description,
          price: parseFloat(price),
          categoryId: parseInt(categoryId),
        },
        include: {
          category: true,
        },
      });
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

// Export for use in other files
module.exports = {
  prismaUsageExamples,
  exampleExpressRoute,
};

// Run examples if this file is executed directly
if (require.main === module) {
  prismaUsageExamples();
}