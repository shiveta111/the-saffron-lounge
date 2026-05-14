const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function fixAuthDatabase() {
  console.log('🔧 Starting complete authentication database fix...');

  // Database connection configuration
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'saffron_db',
    multipleStatements: true
  };

  let connection;

  try {
    // Create connection
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Step 1: Clear all existing users
    console.log('🗑️  Clearing existing users...');
    await connection.execute('DELETE FROM users');
    await connection.execute('ALTER TABLE users AUTO_INCREMENT = 1');
    console.log('✅ Users table cleared and reset');

    // Step 2: Create test users with proper bcrypt hashing
    const testUsers = [
      {
        email: 'admin@test.com',
        password: 'admin123',
        name: 'System Administrator',
        role: 'ADMIN'
      },
      {
        email: 'seller@test.com',
        password: 'seller123',
        name: 'Restaurant Staff',
        role: 'SELLER'
      },
      {
        email: 'customer@test.com',
        password: 'customer123',
        name: 'Regular Customer',
        role: 'CUSTOMER'
      }
    ];

    console.log('👤 Creating test users with proper password hashing...');

    for (const userData of testUsers) {
      // Hash password with bcrypt (saltRounds = 12)
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Insert user
      const [result] = await connection.execute(
        `INSERT INTO users (
          email, password, name, role, emailVerified, isActive,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, TRUE, TRUE, NOW(), NOW())`,
        [userData.email, hashedPassword, userData.name, userData.role]
      );

      console.log(`✅ Created ${userData.role}: ${userData.email} (ID: ${result.insertId})`);

      // Verify password immediately
      const isValid = await bcrypt.compare(userData.password, hashedPassword);
      if (!isValid) {
        throw new Error(`Password verification failed for ${userData.email}`);
      }
      console.log(`   ✅ Password verification: SUCCESS`);
    }

    // Step 3: Verify all users were created correctly
    console.log('\\n🔍 Verifying database state...');
    const [users] = await connection.execute(
      'SELECT id, email, role, emailVerified, isActive FROM users ORDER BY id'
    );

    console.log('📋 Current users in database:');
    users.forEach(user => {
      console.log(`   ID: ${user.id}, Email: ${user.email}, Role: ${user.role}, Active: ${user.isActive}, Verified: ${user.emailVerified}`);
    });

    // Step 4: Test password verification for all users
    console.log('\\n🧪 Testing password verification...');
    for (const user of users) {
      const testPassword = user.email === 'admin@test.com' ? 'admin123' :
                          user.email === 'seller@test.com' ? 'seller123' : 'customer123';

      const [userData] = await connection.execute(
        'SELECT password FROM users WHERE id = ?',
        [user.id]
      );

      const isValid = await bcrypt.compare(testPassword, userData[0].password);
      console.log(`   ${user.email}: ${isValid ? '✅ PASS' : '❌ FAIL'}`);
    }

    console.log('\\n🎉 Authentication database fix completed successfully!');
    console.log('\\n📝 Test Credentials:');
    console.log('   Admin:    admin@test.com    / admin123');
    console.log('   Seller:   seller@test.com   / seller123');
    console.log('   Customer: customer@test.com / customer123');

    console.log('\\n🚀 Next steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Test login with the credentials above');
    console.log('   3. Verify frontend authentication works');

  } catch (error) {
    console.error('❌ Error during database fix:', error);
    console.error('\\n🔧 Troubleshooting:');
    console.error('   1. Ensure MySQL server is running');
    console.error('   2. Check database credentials in .env file');
    console.error('   3. Verify database exists');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the fix if this script is executed directly
if (require.main === module) {
  fixAuthDatabase();
}

module.exports = { fixAuthDatabase };