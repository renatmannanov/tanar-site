import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import * as schema from './schema';

// Lazy init: importing this module must have NO side effects. The DB connection
// (and the DATABASE_URL check) is deferred until the first real access at
// runtime. Otherwise a top-level throw breaks `next build` "collect page data"
// for any page whose import graph touches the db client — even force-dynamic
// pages, which don't read the DB at build time but are still imported. The
// prod Docker build runs without DATABASE_URL, so the import must not throw.

let _client: Sql | undefined;
let _db: PostgresJsDatabase<typeof schema> | undefined;

function getClient(): Sql {
  if (!_client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    _client = postgres(url, { max: 10 });
  }
  return _client;
}

function getDb(): PostgresJsDatabase<typeof schema> {
  if (!_db) _db = drizzle(getClient(), { schema });
  return _db;
}

// Proxies so existing call sites (`db.select(...)`, `queryClient.end()`) keep
// working unchanged while the underlying instances are created on first use.
// queryClient is only ever used for method access (.end()), so a get-trap on a
// plain object target suffices (no tagged-template / call usage anywhere).
export const queryClient = new Proxy({} as Sql, {
  get(_t, prop) {
    const value = Reflect.get(getClient() as object, prop);
    return typeof value === 'function' ? value.bind(getClient()) : value;
  },
});

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_t, prop) {
    const instance = getDb();
    const value = Reflect.get(instance as object, prop);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
