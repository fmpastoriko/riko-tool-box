import { neon } from "@neondatabase/serverless";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const COLUMNS = {
  comparisons: ["text_a", "text_b"],
  chat_messages: ["content"],
  context_sessions: ["prompt_body", "additional_prompt", "llm_suggestion"],
  context_outputs: ["text_output"],
};

const oldKey = Buffer.from(process.env.ENCRYPTION_KEY ?? "", "hex");
const newHex = process.argv[2] ?? randomBytes(32).toString("hex");
const newKey = Buffer.from(newHex, "hex");
if (
  !process.env.NEON_DATABASE_URL ||
  oldKey.length !== 32 ||
  newKey.length !== 32 ||
  newKey.equals(oldKey)
) {
  console.error(
    "Load NEON_DATABASE_URL and the current ENCRYPTION_KEY first. Usage: node scripts/rotate-encryption-key.mjs [new 64-char hex key]",
  );
  process.exit(1);
}

function decryptOld(value) {
  try {
    const buf = Buffer.from(value, "base64");
    const decipher = createDecipheriv("aes-256-gcm", oldKey, buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    return decipher.update(buf.subarray(28)) + decipher.final("utf8");
  } catch {
    return null;
  }
}

function encryptNew(text) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", newKey, iv);
  const data = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}

console.log(`New key: ${newHex}`);
const sql = neon(process.env.NEON_DATABASE_URL);

for (const [table, columns] of Object.entries(COLUMNS)) {
  for (const column of columns) {
    const rows = await sql(
      `SELECT id, ${column} AS value FROM ${table} WHERE ${column} IS NOT NULL`,
    );
    let count = 0;
    for (const { id, value } of rows) {
      const text = decryptOld(value);
      if (text === null) continue;
      await sql(`UPDATE ${table} SET ${column} = $1 WHERE id = $2`, [
        encryptNew(text),
        id,
      ]);
      count++;
    }
    console.log(`${table}.${column}: ${count} re-encrypted`);
  }
}

console.log("Done. Put the new key in ENCRYPTION_KEY and restart the app.");
