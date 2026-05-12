/**
 * Data Integrity Validation Script
 * Validates database integrity after fixes
 */

require('./load-env');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function validateIntegrity() {
  console.log('🔍 Validating Data Integrity...\n');

  try {
    // 1. Check for orphaned menu_products
    console.log('1️⃣ Checking for orphaned menu_products records...');
    const orphanedRecords = await prisma.$queryRaw`
      SELECT mp.id, mp.menuId, mp.productId, m.name as menuName
      FROM menu_products mp
      LEFT JOIN products p ON mp.productId = p.id
      LEFT JOIN menus m ON mp.menuId = m.id
      WHERE p.id IS NULL OR m.id IS NULL
    `;
    
    if (orphanedRecords.length > 0) {
      console.log(`   ❌ Found ${orphanedRecords.length} orphaned records`);
      orphanedRecords.forEach(rec => {
        console.log(`   - ID: ${rec.id}, MenuID: ${rec.menuId}, ProductID: ${rec.productId}`);
      });
    } else {
      console.log('   ✅ No orphaned menu_products records found');
    }

    // 2. Check menus without products
    console.log('\n2️⃣ Checking menus without linked products...');
    const menusWithoutProducts = await prisma.$queryRaw`
      SELECT m.id, m.name, m.category
      FROM menus m
      LEFT JOIN menu_products mp ON m.id = mp.menuId
      WHERE mp.id IS NULL
    `;
    
    if (menusWithoutProducts.length > 0) {
      console.log(`   ⚠️ Found ${menusWithoutProducts.length} menus without products:`);
      menusWithoutProducts.forEach(menu => {
        console.log(`   - ID: ${menu.id}, Name: ${menu.name}, Category: ${menu.category}`);
      });
    } else {
      console.log('   ✅ All menus have linked products');
    }

    // 3. Check menu prices match product totals
    console.log('\n3️⃣ Validating menu prices against product totals...');
    const menusWithPriceMismatch = await prisma.$queryRaw`
      SELECT 
        m.id,
        m.name,
        m.price as menuPrice,
        COALESCE(SUM(p.price), 0) as calculatedPrice,
        ABS(m.price - COALESCE(SUM(p.price), 0)) as difference
      FROM menus m
      LEFT JOIN menu_products mp ON m.id = mp.menuId
      LEFT JOIN products p ON mp.productId = p.id
      GROUP BY m.id, m.name, m.price
      HAVING ABS(m.price - COALESCE(SUM(p.price), 0)) > 0.01
    `;
    
    if (menusWithPriceMismatch.length > 0) {
      console.log(`   ⚠️ Found ${menusWithPriceMismatch.length} menus with price mismatches:`);
      menusWithPriceMismatch.forEach(menu => {
        console.log(`   - ID: ${menu.id}, Name: ${menu.name}`);
        console.log(`     Menu Price: €${menu.menuPrice}, Calculated: €${menu.calculatedPrice}, Difference: €${menu.difference}`);
      });
    } else {
      console.log('   ✅ All menu prices match product totals');
    }

    // 4. Check promotions table structure
    console.log('\n4️⃣ Validating promotions table structure...');
    const promotionsColumns = await prisma.$queryRaw`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'saffron_db'
      AND TABLE_NAME = 'promotions'
      AND COLUMN_NAME = 'type'
    `;
    
    if (promotionsColumns.length > 0) {
      console.log('   ✅ Promotions table has "type" column');
    } else {
      console.log('   ❌ Promotions table missing "type" column');
    }

    // 5. Summary statistics
    console.log('\n📊 Summary Statistics:');
    const [menuCount, productCount, menuProductCount, promotionCount] = await Promise.all([
      prisma.menu.count(),
      prisma.product.count(),
      prisma.menuProduct.count(),
      prisma.promotion.count()
    ]);

    const menusWithProducts = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT m.id) as count
      FROM menus m
      INNER JOIN menu_products mp ON m.id = mp.menuId
      INNER JOIN products p ON mp.productId = p.id
    `;

    console.log(`   - Total Menus: ${menuCount}`);
    console.log(`   - Menus with valid products: ${menusWithProducts[0].count}`);
    console.log(`   - Total Products: ${productCount}`);
    console.log(`   - Menu-Product Links: ${menuProductCount}`);
    console.log(`   - Promotions: ${promotionCount}`);

    // Final validation
    console.log('\n✅ Data Integrity Check Complete!');
    const hasIssues = orphanedRecords.length > 0 || menusWithoutProducts.length > 0;
    if (hasIssues) {
      console.log('⚠️ Some issues found - see details above');
    } else {
      console.log('✅ No data integrity issues found');
    }

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

validateIntegrity();

