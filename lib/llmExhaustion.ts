import { neonDb } from "@/lib/db";
import { WIB_RESET_HOUR } from "@/config/llm";

function getLastResetTime(): Date {
  const now = new Date();
  const wibOffset = 7 * 60 * 60 * 1000;
  const wibNow = new Date(now.getTime() + wibOffset);
  const reset = new Date(
    Date.UTC(
      wibNow.getUTCFullYear(),
      wibNow.getUTCMonth(),
      wibNow.getUTCDate(),
      WIB_RESET_HOUR - 7,
      0,
      0,
      0,
    ),
  );
  if (reset > now) reset.setUTCDate(reset.getUTCDate() - 1);
  return reset;
}

export async function markKeyExhausted(
  model: string,
  keyIndex: number,
): Promise<void> {
  await neonDb`
    INSERT INTO llm_exhaustion (model, key_index, exhausted_at)
    VALUES (${model}, ${keyIndex}, NOW())
    ON CONFLICT (model, key_index) DO UPDATE SET exhausted_at = NOW()
  `;
}

export async function getExhaustedKeys(model: string): Promise<Set<number>> {
  const lastReset = getLastResetTime();
  const rows = await neonDb`
    SELECT key_index FROM llm_exhaustion
    WHERE model = ${model} AND exhausted_at > ${lastReset.toISOString()}
  `;
  return new Set(rows.map((r) => (r as { key_index: number }).key_index));
}

export async function getAllExhaustedModels(): Promise<
  Record<string, Set<number>>
> {
  const lastReset = getLastResetTime();
  const rows = await neonDb`
    SELECT model, key_index FROM llm_exhaustion
    WHERE exhausted_at > ${lastReset.toISOString()}
  `;
  const result: Record<string, Set<number>> = {};
  for (const row of rows as { model: string; key_index: number }[]) {
    if (!result[row.model]) result[row.model] = new Set();
    result[row.model].add(row.key_index);
  }
  return result;
}
