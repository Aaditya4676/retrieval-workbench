import "server-only";
import { Pool } from "pg";
import { postgresAdapter, type SqlClient } from "./database";
import { dataRequest } from "./data-client";

let database: SqlClient | undefined;

/** A pool is reused within one Node instance; it does not imply a global serverless pool. */
export function getDatabase(): SqlClient {
  if (database) return database;
  if (process.env.DATABASE_URL) {
    database = postgresAdapter(
      new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 3,
        connectionTimeoutMillis: 10000,
        statement_timeout: 30000,
      }),
    );
  } else {
    // The loopback owner accepts only the four fixed SELECT statements, never arbitrary SQL.
    database = {
      query<T>(sql: string, params?: unknown[]) {
        return dataRequest<{ rows: T[] }>("/query", { sql, params });
      },
    };
  }
  return database;
}
