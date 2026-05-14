const mysql = require('mysql2/promise');
require('./load-env');

async function fixAdminAccount() {
  let connection;
  
  try {
    // Parse DATABASE_URL
    const dbUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/saffron_db';
    const urlMatch = dbUrl.match(/mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)/);
    
    if (!urlMatch) {
      throw new Error('Invalid DATABASE_URL format');
    }
    
    const [, user, password, host, port, database] = urlMatch;
    
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user,
      password: password || undefined,
      database
    });
    
    console.log('Connected successfully!');
    
    // Check admin account
    console.log('\n=== Checking admin@test.com account ===');
    const [users] = await connection.execute(
      'SELECT id, email, name, role, isActive, emailVerified FROM users WHERE email = ?',
      ['admin@test.com']
    );
    
    if (users.length === 0) {
      console.log('❌ Admin account not found!');
      console.log('Creating admin account...');
      
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      await connection.execute(
        `INSERT INTO users (email, password, name, role, isActive, emailVerified, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        ['admin@test.com', hashedPassword, 'Admin User', 'ADMIN', 1, 1]
      );
      
      console.log('✅ Admin account created successfully!');
      console.log('   Email: admin@test.com');
      console.log('   Password: admin123');
    } else {
      const user = users[0];
      console.log('Current status:');
      console.log(`  ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  isActive: ${user.isActive}`);
      console.log(`  emailVerified: ${user.emailVerified}`);
      
      if (user.isActive === 0 || user.emailVerified === 0) {
        console.log('\n⚠️  Account is disabled or not verified. Fixing...');
        
        await connection.execute(
          'UPDATE users SET isActive = 1, emailVerified = 1, updatedAt = NOW() WHERE email = ?',
          ['admin@test.com']
        );
        
        console.log('✅ Account activated and verified!');
      } else {
        console.log('\n✅ Account is already active and verified!');
      }
    }
    
    // Show all users
    console.log('\n=== All Users ===');
    const [allUsers] = await connection.execute(
      'SELECT id, email, name, role, isActive, emailVerified FROM users ORDER BY id'
    );
    
    console.table(allUsers);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixAdminAccount();
