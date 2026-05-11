import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Retry wrapper — handles Neon cold-start "fetch failed" errors.
// Retries up to 3 times with exponential backoff (200ms, 400ms, 800ms).
async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit, attempt = 0): Promise<Response> {
    try {
        return await fetch(input, init);
    } catch (err) {
        if (attempt >= 2) throw err; // max 3 total attempts
        const delay = 200 * Math.pow(2, attempt); // 200ms, 400ms
        await new Promise(res => setTimeout(res, delay));
        return fetchWithRetry(input, init, attempt + 1);
    }
}

neonConfig.fetchFunction = fetchWithRetry;
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });