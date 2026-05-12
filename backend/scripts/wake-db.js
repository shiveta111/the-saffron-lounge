const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'dbserver.dev.329df7ae-e35d-4cee-8600-dd0686dd537b.drush.in',
  port: 11591,
  user: 'pantheon',
  password: 'PP2Ti8eEc3RK_wrXJP9WWXCT6TtXg3kc',
  database: 'pantheon',
  connectTimeout: 60000,
  acquireTimeout: 60000,
  timeout: 60000,
};

async function attemptConnection(attemptNumber) {
  console.log(`🔄 Attempt ${attemptNumber}: Trying to connect to database...`);

  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connection successful!');
    console.log('🎉 Database is now awake and ready to use!');
    await connection.end();
    return true;
  } catch (error) {
    console.log(`❌ Attempt ${attemptNumber} failed: ${error.message}`);
    return false;
  }
}

async function wakeDatabase() {
  console.log('🚀 Starting database wake-up process...');
  console.log('This may take a few minutes. Pantheon databases auto-sleep after inactivity.');

  for (let i = 1; i <= 10; i++) {
    const success = await attemptConnection(i);

    if (success) {
      console.log('\n✅ SUCCESS: Database is now awake!');
      console.log('You can now run: pnpm run db:seed');
      return;
    }

    if (i < 10) {
      console.log(`⏳ Waiting 30 seconds before next attempt... (${i}/10)`);
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }

  console.log('\n❌ All attempts failed. The database may need to be woken up manually through the Pantheon dashboard.');
  console.log('Please visit: https://dashboard.pantheon.io/');
  console.log('Find your site and look for a "Wake up" or "Start" button.');
}

wakeDatabase().catch(console.error);