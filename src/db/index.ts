import * as schema from "./schema.js";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const conn = postgres(process.env.DATABASE_URL!);
export const db = drizzle(conn, { schema });
