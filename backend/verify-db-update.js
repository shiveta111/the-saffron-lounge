const mysql = require('mysql2/promise');
require('./load-env-helper');

async function verifyUpdate() {
  let connection;
  
  try {
    const dbUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/saffron_db';
    const urlMatch = dbUrl.match(/mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)/);
    
    if (!urlMatch) {
      throw new Error('Invalid DATABASE_URL format');
    }
    
    const [, user, password, host, port, database] = urlMatch;
    
    console.log('Connecting to database...');
    console.log(`Host: ${host}:${port}`);
    console.log(`Database: ${database}`);
    console.log(`User: ${user}\n`);
    
    connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user,
      password: password || undefined,
      database
    });
    
    console.log('✅ Connected\n');
    
    // Check user ID 27 (lovely.webdev@gmail.com)
    console.log('Checking user ID 27 (lovely.webdev@gmail.com)...');
    const [users] = await connection.execute(
      'SELECT id, email, name, emailVerified, updatedAt FROM users WHERE id = 27'
    );
    
    if (users.length > 0) {
      const user = users[0];
      console.log('Current status:');
      console.log(`  ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  emailVerified: ${user.emailVerified}`);
      console.log(`  updatedAt: ${user.updatedAt}`);
      
      if (user.emailVerified === 0) {
        console.log('\n⚠️  Email is NOT verified');
        console.log('Updating now...');
        
        const [result] = await connection.execute(
          'UPDATE users SET emailVerified = 1, updatedAt = NOW() WHERE id = 27'
        );
        
        console.log(`✅ Update executed: ${result.affectedRows} rows affected, ${result.changedRows} rows changed`);
        
        // Verify
        const [verifyUsers] = await connection.execute(
          'SELECT id, email, emailVerified FROM users WHERE id = 27'
        );
        console.log(`\nVerification: emailVerified = ${verifyUsers[0].emailVerified}`);
        
        if (verifyUsers[0].emailVerified === 1) {
          console.log('✅ Update successful!');
        } else {
          console.log('❌ Update failed!');
        }
      } else {
        console.log('\n✅ Email is already verified');
      }
    } else {
      console.log('❌ User not found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verifyUpdate();
