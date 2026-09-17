const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database_new.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Adding tier system columns to stocks table...');

db.serialize(() => {
  // Check if columns already exist
  db.all("PRAGMA table_info(stocks)", (err, columns) => {
    if (err) {
      console.error('Error checking table:', err);
      return;
    }

    const hasTier = columns.some(col => col.name === 'tier');
    const hasShareholderCount = columns.some(col => col.name === 'shareholder_count');
    const hasTransactionCount = columns.some(col => col.name === 'transaction_count');

    let columnsToAdd = [];

    if (!hasTier) {
      columnsToAdd.push({
        name: 'tier',
        sql: `ALTER TABLE stocks ADD COLUMN tier TEXT DEFAULT 'BRONZE'`
      });
    }

    if (!hasShareholderCount) {
      columnsToAdd.push({
        name: 'shareholder_count',
        sql: `ALTER TABLE stocks ADD COLUMN shareholder_count INTEGER DEFAULT 0`
      });
    }

    if (!hasTransactionCount) {
      columnsToAdd.push({
        name: 'transaction_count',
        sql: `ALTER TABLE stocks ADD COLUMN transaction_count INTEGER DEFAULT 0`
      });
    }

    if (columnsToAdd.length === 0) {
      console.log('✅ All tier system columns already exist');
      db.close();
      return;
    }

    // Add columns sequentially
    let currentIndex = 0;

    const addNextColumn = () => {
      if (currentIndex >= columnsToAdd.length) {
        console.log('✅ All tier system columns added successfully');

        // Update shareholder counts for existing stocks
        db.run(`
          UPDATE stocks
          SET shareholder_count = (
            SELECT COUNT(DISTINCT holder_id)
            FROM holdings
            WHERE holdings.stock_id = stocks.id
            AND holdings.shares > 0
          )
          WHERE EXISTS (
            SELECT 1 FROM holdings WHERE holdings.stock_id = stocks.id
          )
        `, (err) => {
          if (err) {
            console.error('❌ Error updating shareholder counts:', err);
          } else {
            console.log('✅ Shareholder counts updated');
          }

          // Update transaction counts
          db.run(`
            UPDATE stocks
            SET transaction_count = (
              SELECT COUNT(*)
              FROM transactions
              WHERE transactions.stock_id = stocks.id
            )
            WHERE EXISTS (
              SELECT 1 FROM transactions WHERE transactions.stock_id = stocks.id
            )
          `, (err) => {
            if (err) {
              console.error('❌ Error updating transaction counts:', err);
            } else {
              console.log('✅ Transaction counts updated');
            }
            db.close();
          });
        });

        return;
      }

      const column = columnsToAdd[currentIndex];
      db.run(column.sql, (err) => {
        if (err) {
          console.error(`❌ Error adding ${column.name} column:`, err);
        } else {
          console.log(`✅ ${column.name} column added successfully`);
        }
        currentIndex++;
        addNextColumn();
      });
    };

    addNextColumn();
  });
});
