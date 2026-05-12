import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { activities } from "./src/db/schema";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function seed() {
    const userId = process.env.SEED_CLERK_USER_ID;
    if (!userId) {
        throw new Error("Set SEED_CLERK_USER_ID in .env.local to seed user-specific activities.");
    }
    console.log("Seeding default activities...");
    
    await db.insert(activities).values([
        { userId, name: "Break", type: "break", isSystem: true },
        { userId, name: "Distraction", type: "distraction", isSystem: true },
        { userId, name: "Lunch", type: "break", isSystem: true },
    ]);
    
    console.log("Seeding complete!");
}

seed().catch(console.error);
