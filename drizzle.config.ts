import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

// Next.js loads .env.local on its own, but the drizzle-kit CLI does not —
// load it explicitly. (dotenv's default `.env` is not our convention.)
dotenv.config({ path: '.env.local' });

export default defineConfig({
  schema: './src/core/db/schema.ts', // created in step 3
  out: './src/core/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
