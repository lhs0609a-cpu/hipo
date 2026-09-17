const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database_new.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Adding push notification columns to users table...');

db.serialize(() => {
  // Add push_token column
  db.run(`ALTER TABLE users ADD COLUMN push_token VARCHAR(255)`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding push_token:', err.message);
    } else {
      console.log('✓ Added push_token column');
    }
  });

  // Add push_platform column
  db.run(`ALTER TABLE users ADD COLUMN push_platform VARCHAR(20)`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding push_platform:', err.message);
    } else {
      console.log('✓ Added push_platform column');
    }
  });

  // Add notification_settings column
  db.run(`ALTER TABLE users ADD COLUMN notification_settings TEXT DEFAULT '{"trading":true,"dividend":true,"priceAlert":true,"social":true,"system":true}'`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding notification_settings:', err.message);
    } else {
      console.log('✓ Added notification_settings column');
    }
  });

  // Close database after all operations
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('\n✅ Migration completed successfully!');
      console.log('Push notification columns have been added.');
    }
  });
});
