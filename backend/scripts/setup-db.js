const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  console.log('🚀 Starting complete database setup for The Saffron Lounge...');

  // Database connection configuration (without database name for initial connection)
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  };

  let connection;

  try {
    // Create connection without database first
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL server');

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'saffron_db';
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ Database '${dbName}' created/verified`);

    // Switch to the database
    await connection.query(`USE ${dbName}`);

    // Read and execute the master database setup script
    console.log('📋 Creating database tables and populating data...');
    const masterSetupSQL = fs.readFileSync(path.join(__dirname, '../sql/master-database-setup.sql'), 'utf8');

    // Execute the entire SQL file at once with multipleStatements enabled
    await connection.query(masterSetupSQL);
    console.log('✅ All tables created and data populated successfully');

    // Check if admin user already exists
    const [existingAdmin] = await connection.execute(`
      SELECT id, email, name FROM users WHERE role = 'ADMIN' LIMIT 1
    `);

    if (existingAdmin.length > 0) {
      console.log('✅ Admin user already exists. Setup complete.');
      console.log('\n🎉 Database setup completed successfully!');
      console.log('Your Saffron Lounge application is ready for use.');
      return;
    } else {
      console.log('👤 Creating default admin user...');

      // Generate secure password for admin
      const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123!Secure';
      const hashedPassword = await bcrypt.hash(adminPassword, 12);

      // Create admin user
      await connection.execute(`
        INSERT INTO users (email, name, password, role, emailVerified, isActive, createdAt, updatedAt)
        VALUES (?, ?, ?, 'ADMIN', TRUE, TRUE, NOW(), NOW())
      `, [process.env.ADMIN_EMAIL || 'admin@saffronlounge.com', 'System Administrator', hashedPassword]);

      console.log('✅ Default admin user created successfully!');
      console.log(`   Email: ${process.env.ADMIN_EMAIL || 'admin@saffronlounge.com'}`);
      console.log(`   Password: ${adminPassword}`);
      console.log('\n⚠️  IMPORTANT: Change the default password immediately after first login!');
      console.log('   You can set ADMIN_EMAIL and ADMIN_DEFAULT_PASSWORD in your .env file.');
    }

    console.log('\n🎉 Complete database setup finished successfully!');
    console.log('Your Saffron Lounge application is ready for use.');
    console.log('\n📋 Database Summary:');
    console.log('   - All tables created with proper indexes');
    console.log('   - Sample data populated');
    console.log('   - Real-time triggers installed');
    console.log('   - Admin user configured');
    console.log('   - CMS modules ready');

  } catch (error) {
    console.error('❌ Error during database setup:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Make sure MySQL server is running');
    console.error('   2. Check your database credentials in .env file');
    console.error('   3. Ensure you have CREATE DATABASE permissions');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run setup if this script is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };