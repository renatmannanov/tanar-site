import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

// Exported so one-off scripts (seed/reset) can close the pool via .end().
export const queryClient = postgres(url, { max: 10 });

export const db = drizzle(queryClient, { schema });
