import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function wipeDatabase() {
    console.log("Dropping public schema cascade...");
    await sql`DROP SCHEMA public CASCADE;`;
    
    console.log("Recreating public schema...");
    await sql`CREATE SCHEMA public;`;
    
    console.log("Database wiped clean.");
}

wipeDatabase().catch(console.error);
