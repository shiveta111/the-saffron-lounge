/**
 * Database Backup Script
 * Creates a backup of the current database state before making changes
 * 
 * Usage: node scripts/backup-database.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('./load-env');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

// Parse DATABASE_URL - handle various formats
// Format: mysql://user:password@host:port/database or mysql://user:password@host/database
let user, password, host, port, database;

try {
  const url = new URL(DATABASE_URL);
  user = url.username;
  password = url.password;
  host = url.hostname;
  port = url.port || '3306';
  database = url.pathname.replace('/', '');
} catch (e) {
  console.error('❌ Could not parse DATABASE_URL');
  console.log('Current URL:', DATABASE_URL?.substring(0, 30) + '...');
  process.exit(1);
}

// Create backup directory
const backupDir = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

console.log('🔄 Creating database backup...');
console.log(`   Database: ${database}`);
console.log(`   Host: ${host}:${port}`);
console.log(`   Backup file: ${backupFile}`);

// Since mysqldump might not be available, let's use Prisma to export the data
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createBackup() {
  try {
    // Get counts of all important tables
    const [
      menuCount,
      productCount,
      menuProductCount,
      promotionCount,
      categoryCount,
      userCount,
      orderCount
    ] = await Promise.all([
      prisma.menu.count(),
      prisma.product.count(),
      prisma.menuProduct.count(),
      prisma.promotion.count().catch(() => 0),
      prisma.category.count(),
      prisma.user.count(),
      prisma.order.count()
    ]);

    // Create backup metadata
    const backupData = {
      timestamp: new Date().toISOString(),
      database,
      counts: {
        menus: menuCount,
        products: productCount,
        menuProducts: menuProductCount,
        promotions: promotionCount,
        categories: categoryCount,
        users: userCount,
        orders: orderCount
      }
    };

    // Export critical data
    const [menus, products, menuProducts, categories] = await Promise.all([
      prisma.menu.findMany({ include: { menuProducts: true } }),
      prisma.product.findMany(),
      prisma.menuProduct.findMany(),
      prisma.category.findMany()
    ]);

    backupData.data = {
      menus,
      products,
      menuProducts,
      categories
    };

    // Save backup
    fs.writeFileSync(backupFile.replace('.sql', '.json'), JSON.stringify(backupData, null, 2));

    console.log('\n✅ Backup created successfully!');
    console.log('\n📊 Current database state:');
    console.log(`   - Menus: ${menuCount}`);
    console.log(`   - Products: ${productCount}`);
    console.log(`   - Menu-Product links: ${menuProductCount}`);
    console.log(`   - Promotions: ${promotionCount}`);
    console.log(`   - Categories: ${categoryCount}`);
    console.log(`   - Users: ${userCount}`);
    console.log(`   - Orders: ${orderCount}`);
    console.log(`\n📁 Backup saved to: ${backupFile.replace('.sql', '.json')}`);

  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createBackup();
