import { neon } from "@neondatabase/serverless";

if (!process.env.NEON_DATABASE_URL) {
  throw new Error("NEON_DATABASE_URL is not set");
}

export const neonDb = neon(process.env.NEON_DATABASE_URL);
