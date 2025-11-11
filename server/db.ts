// Reference: javascript_database blueprint
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure connection pool for Neon serverless
// See: https://neon.tech/docs/serverless/serverless-driver#use-connection-pooling
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,                      // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,     // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Wait 10 seconds for connection
  maxUses: 7500,                // Neon recommendation: close connection after 7500 uses
});

export const db = drizzle({ client: pool, schema });
