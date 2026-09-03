import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

declare global {
   
  var __botPgPool: Pool | undefined
}

// Reuse a single pool across hot reloads / serverless invocations.
export const pool = globalThis.__botPgPool ?? new Pool({ connectionString: process.env.DATABASE_URL })

if (process.env.NODE_ENV !== "production") {
  globalThis.__botPgPool = pool
}

export const db = drizzle(pool, { schema })
