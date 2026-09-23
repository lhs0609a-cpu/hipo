// Default is read-only. Back up the target database before --apply.
const fs = require('fs');
const { sequelize } = require('../src/models');
const { inspect, migrate } = require('../src/services/exchangeMigration');
(async () => {
  try {
    const apply = process.argv.includes('--apply');
    const index = process.argv.indexOf('--resolutions');
    const resolutions = index >= 0 ? JSON.parse(fs.readFileSync(process.argv[index + 1], 'utf8')) : [];
    console.log(JSON.stringify(apply ? await migrate(resolutions) : await inspect(), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { await sequelize.close(); }
})();
