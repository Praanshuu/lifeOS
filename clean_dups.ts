import { db } from "./src/db/index.js";
import { activities } from "./src/db/schema.js";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Removing duplicate activities...");
    
    // We can delete duplicates keeping only the one with the maximum ID or min ID
    await db.execute(sql`
        DELETE FROM activities
        WHERE id IN (
            SELECT id
            FROM (
                SELECT id,
                ROW_NUMBER() OVER( PARTITION BY user_id, name, type ORDER BY id ) as row_num
                FROM activities
            ) t
            WHERE t.row_num > 1
        )
    `);
    
    console.log("Duplicates removed.");
    process.exit(0);
}

main().catch(console.error);
