const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function debugMenuItems() {
  try {
    console.log("🔍 Checking database connection...");

    // Check Product table
    const productCount = await prisma.product.count();
    console.log(`\n📊 Total products in database: ${productCount}`);

    if (productCount === 0) {
      console.log("⚠️  WARNING: No products found in the database!");
      console.log("   You may need to run the seed script.");
    } else {
      // Get first 10 products
      const products = await prisma.product.findMany({
        take: 10,
        select: {
          id: true,
          name: true,
          category: true,
          price: true,
          isAvailable: true,
        },
        orderBy: {
          id: "asc",
        },
      });

      console.log("\n📋 First 10 products:");
      products.forEach((p) => {
        console.log(
          `   ID: ${p.id} | ${p.name} | ${p.category} | $${p.price} | Available: ${p.isAvailable}`,
        );
      });
    }

    // Check Menu table (legacy)
    const menuCount = await prisma.menu.count();
    console.log(`\n📊 Total items in Menu table (legacy): ${menuCount}`);

    // Check Categories
    const categoryCount = await prisma.category.count();
    console.log(`\n📊 Total categories: ${categoryCount}`);

    if (categoryCount > 0) {
      const categories = await prisma.category.findMany({
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      });
      console.log("\n📁 Categories:");
      categories.forEach((c) => {
        console.log(`   ID: ${c.id} | ${c.name} | Active: ${c.isActive}`);
      });
    }

    console.log("\n✅ Debug complete!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugMenuItems();
