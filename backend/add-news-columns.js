const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database_new.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Adding news-related columns to users table...');

db.serialize(() => {
  // Add real_name column
  db.run(`ALTER TABLE users ADD COLUMN real_name VARCHAR(100)`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding real_name:', err.message);
    } else {
      console.log('✓ Added real_name column');
    }
  });

  // Add occupation column
  db.run(`ALTER TABLE users ADD COLUMN occupation VARCHAR(100)`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding occupation:', err.message);
    } else {
      console.log('✓ Added occupation column');
    }
  });

  // Add category column
  db.run(`ALTER TABLE users ADD COLUMN category VARCHAR(50)`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding category:', err.message);
    } else {
      console.log('✓ Added category column');
    }
  });

  // Add news_keywords column
  db.run(`ALTER TABLE users ADD COLUMN news_keywords VARCHAR(500)`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding news_keywords:', err.message);
    } else {
      console.log('✓ Added news_keywords column');
    }
  });

  // Close database after all operations
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('\n✅ Migration completed successfully!');
      console.log('You can now restart the server.');
    }
  });
});
