import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const client = await pool.connect();
  try {
    console.log("Adding columns to goals...");
    await client.query(`ALTER TABLE goals ADD COLUMN IF NOT EXISTS importance integer DEFAULT 1`);
    await client.query(`ALTER TABLE goals ADD COLUMN IF NOT EXISTS logical_reason text`);
    await client.query(`ALTER TABLE goals ADD COLUMN IF NOT EXISTS emotional_reason text`);

    console.log("Adding columns to tasks...");
    await client.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS anticipated_friction text`);

    console.log("Renaming blocker_reason and adding skip_trigger to daily_plans...");
    // Check if column exists before renaming
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='daily_plans' AND column_name='blocker_reason'
    `);
    if (res.rowCount) {
      await client.query(`ALTER TABLE daily_plans RENAME COLUMN blocker_reason TO skip_reason`);
    }
    
    await client.query(`ALTER TABLE daily_plans ADD COLUMN IF NOT EXISTS skip_trigger text`);

    console.log("Migration successful!");
  } catch (e) {
    console.error("Migration failed:", e);
  } finally {
    client.release();
    pool.end();
  }
}

run();
