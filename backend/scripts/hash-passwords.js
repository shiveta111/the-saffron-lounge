const bcrypt = require('bcrypt');

const saltRounds = 12;

async function hashPasswords() {
  const passwords = {
    admin: 'admin123',
    seller: 'seller123',
    customer: 'customer123'
  };

  const hashed = {};

  for (const [key, password] of Object.entries(passwords)) {
    hashed[key] = await bcrypt.hash(password, saltRounds);
    console.log(`${key}: '${hashed[key]}'`);
  }

  console.log('\nHashed passwords:');
  console.log(JSON.stringify(hashed, null, 2));
}

hashPasswords().catch(console.error);