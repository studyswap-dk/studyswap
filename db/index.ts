import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

// The app uses the pooled connection. On Vercel Fluid Compute, attachDatabasePool
// closes idle connections before a function instance is suspended, so they are
// not left hanging in the database.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
attachDatabasePool(pool);

export const db = drizzle({ client: pool, schema });
