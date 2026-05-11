import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { activities } from "./src/db/schema";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function seed() {
    console.log("Seeding default activities...");
    
    await db.insert(activities).values([
        { name: "Break", type: "break", isSystem: true },
        { name: "Distraction", type: "distraction", isSystem: true },
        { name: "Lunch", type: "break", isSystem: true },
    ]);
    
    console.log("Seeding complete!");
}

seed().catch(console.error);
