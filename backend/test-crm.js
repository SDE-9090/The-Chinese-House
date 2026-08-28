require('dotenv').config({ path: __dirname + '/.env' });
const { syncCustomerCRM } = require('./src/utils/crmSync');
const { tenantContext } = require('./src/middleware/tenantContext');
const pool = require('./src/db/pool');

async function run() {
  await tenantContext.run('00000000-0000-0000-0000-000000000001', async () => {
    console.log('Running sync for Superman...');
    await syncCustomerCRM('00000000-0000-0000-0000-000000000001', '7777777777');
    console.log('Sync complete.');
  });
  await pool.end();
}
run().catch(console.error);
