require("dotenv").config({ path: __dirname + "/../../.env" });
const pool = require("./pool");

async function migrateDashboardThemes() {
  try {
    await pool.query(`
      ALTER TABLE businesses ADD COLUMN IF NOT EXISTS available_themes TEXT[] DEFAULT ARRAY['classic'];
      ALTER TABLE businesses ADD COLUMN IF NOT EXISTS active_dashboard_theme VARCHAR(50) DEFAULT 'classic';
    `);
    console.log("✅ Dashboard theme columns added to businesses table");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    pool.end();
  }
}

migrateDashboardThemes();
