const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database_new.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Adding available_shares column to stocks table...');

db.serialize(() => {
  // Check if column already exists
  db.all("PRAGMA table_info(stocks)", (err, columns) => {
    if (err) {
      console.error('Error checking table:', err);
      return;
    }

    const hasColumn = columns.some(col => col.name === 'available_shares');

    if (hasColumn) {
      console.log('✅ available_shares column already exists');
      db.close();
      return;
    }

    // Add the column
    db.run(`
      ALTER TABLE stocks
      ADD COLUMN available_shares INTEGER DEFAULT 0
    `, (err) => {
      if (err) {
        console.error('❌ Error adding column:', err);
      } else {
        console.log('✅ available_shares column added successfully');

        // Update existing stocks to set availableShares = totalShares
        db.run(`
          UPDATE stocks
          SET available_shares = total_shares
          WHERE available_shares = 0
        `, (err) => {
          if (err) {
            console.error('❌ Error updating existing stocks:', err);
          } else {
            console.log('✅ Existing stocks updated (availableShares = totalShares)');
          }
          db.close();
        });
      }
    });
  });
});
