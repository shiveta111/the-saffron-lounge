const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  console.log('🍽️  Creating menu items from existing products...\n');

  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
  });

  if (products.length === 0) {
    console.log('❌ No products found. Run the seed first.');
    return;
  }

  console.log(`Found ${products.length} products. Creating menu items...\n`);

  let created = 0;
  let skipped = 0;

  for (const product of products) {
    const baseSlug = slugify(product.name);

    const existing = await prisma.menu.findFirst({
      where: { name: product.name },
    });

    if (existing) {
      console.log(`  ⏭️  Skipped (already exists): ${product.name}`);
      skipped++;
      continue;
    }

    // Make slug unique
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.menu.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const menu = await prisma.menu.create({
      data: {
        name: product.name,
        slug,
        description: product.description || `${product.name} - a delicious dish`,
        price: product.price,
        category: product.category || 'Uncategorized',
        categoryId: product.categoryId || null,
        type: product.type || 'All',
        imageUrl: product.imageUrl || '',
        isAvailable: product.isAvailable,
        isSpecial: false,
      },
    });

    // Link product to menu item
    await prisma.menuProduct.create({
      data: {
        menuId: menu.id,
        productId: product.id,
        quantity: 1,
      },
    });

    console.log(`  ✅ Created menu item: ${product.name} (${product.category})`);
    created++;
  }

  console.log(`\n✅ Done! Created: ${created}, Skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
