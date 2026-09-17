const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false
});

async function checkSchema() {
  try {
    const [results] = await sequelize.query("PRAGMA table_info(posts);");

    console.log('\n📋 Posts table columns:');
    console.log('='.repeat(50));
    results.forEach(col => {
      console.log(`${col.name} (${col.type}) - ${col.notnull ? 'NOT NULL' : 'NULL'} - Default: ${col.dflt_value || 'none'}`);
    });
    console.log('='.repeat(50));

    const hasVisibility = results.some(col => col.name === 'visibility_type');
    const hasIsPremium = results.some(col => col.name === 'is_premium');
    const hasMinShares = results.some(col => col.name === 'minimum_shares');

    console.log('\n✅ Column check:');
    console.log(`  visibility_type: ${hasVisibility ? '✓ EXISTS' : '✗ MISSING'}`);
    console.log(`  is_premium: ${hasIsPremium ? '✓ EXISTS' : '✗ MISSING'}`);
    console.log(`  minimum_shares: ${hasMinShares ? '✓ EXISTS' : '✗ MISSING'}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkSchema();
