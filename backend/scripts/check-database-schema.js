/**
 * Check Database Schema
 * Verifies the actual database schema matches Prisma expectations
 */

require('./load-env');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchema() {
  console.log('🔍 Checking database schema...\n');

  try {
    // Check promotions table columns
    console.log('📋 Checking promotions table:');
    const promotionsColumns = await prisma.$queryRaw`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'saffron_db'
      AND TABLE_NAME = 'promotions'
      ORDER BY ORDINAL_POSITION
    `;
    
    console.log('   Columns:');
    promotionsColumns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}, nullable: ${col.IS_NULLABLE})`);
    });

    // Check if 'type' column exists
    const hasTypeColumn = promotionsColumns.some(col => col.COLUMN_NAME === 'type');
    console.log(`\n   'type' column exists: ${hasTypeColumn ? '✅ YES' : '❌ NO'}`);

    // Check menu_products table
    console.log('\n📋 Checking menu_products table:');
    const menuProductsColumns = await prisma.$queryRaw`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'saffron_db'
      AND TABLE_NAME = 'menu_products'
      ORDER BY ORDINAL_POSITION
    `;
    
    console.log('   Columns:');
    menuProductsColumns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}, nullable: ${col.IS_NULLABLE})`);
    });

    // Check for orphaned menu_products records
    console.log('\n📋 Checking for orphaned menu_products records:');
    const orphanedRecords = await prisma.$queryRaw`
      SELECT mp.id, mp.menuId, mp.productId, m.name as menuName
      FROM menu_products mp
      LEFT JOIN products p ON mp.productId = p.id
      LEFT JOIN menus m ON mp.menuId = m.id
      WHERE p.id IS NULL
    `;
    
    if (orphanedRecords.length > 0) {
      console.log(`   ❌ Found ${orphanedRecords.length} orphaned records:`);
      orphanedRecords.forEach(rec => {
        console.log(`   - ID: ${rec.id}, MenuID: ${rec.menuId} (${rec.menuName || 'Unknown'}), ProductID: ${rec.productId} (DELETED)`);
      });
    } else {
      console.log('   ✅ No orphaned records found');
    }

    // Check menus without products
    console.log('\n📋 Checking menus without linked products:');
    const menusWithoutProducts = await prisma.$queryRaw`
      SELECT m.id, m.name
      FROM menus m
      LEFT JOIN menu_products mp ON m.id = mp.menuId
      WHERE mp.id IS NULL
    `;
    
    if (menusWithoutProducts.length > 0) {
      console.log(`   ⚠️ Found ${menusWithoutProducts.length} menus without products:`);
      menusWithoutProducts.slice(0, 10).forEach(menu => {
        console.log(`   - ID: ${menu.id}, Name: ${menu.name}`);
      });
      if (menusWithoutProducts.length > 10) {
        console.log(`   ... and ${menusWithoutProducts.length - 10} more`);
      }
    } else {
      console.log('   ✅ All menus have linked products');
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   - Promotions 'type' column: ${hasTypeColumn ? '✅' : '❌ NEEDS FIX'}`);
    console.log(`   - Orphaned menu_products: ${orphanedRecords.length === 0 ? '✅' : '❌ NEEDS CLEANUP'}`);
    console.log(`   - Menus without products: ${menusWithoutProducts.length === 0 ? '✅' : '⚠️ WARNING'}`);

  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
    if (error.message.includes('does not exist')) {
      console.log('\n⚠️ This error confirms the database schema needs to be updated');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();
