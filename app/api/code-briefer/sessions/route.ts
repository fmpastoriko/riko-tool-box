import { NextRequest, NextResponse } from "next/server";
import { neonDb } from "@/lib/db";
import { getRequestContext } from "@/lib/requestContext";
import { encryptIfOwner, safeDecrypt } from "@/lib/encrypt";
import { attachIsOwn, filterOwnerRows } from "@/lib/sessionHelpers";
import { internalError } from "@/lib/apiUtils";

const MAX_OUTPUT_BYTES = 5000 * 1024;

export async function GET(req: NextRequest) {
  try {
    const { owner, hashedIp, ownerUserId } = await getRequestContext(req);
    const rows = await neonDb`
      SELECT s.id, s.prompt_label, s.prompt_body, s.additional_prompt, s.files_selected,
             s.created_at, s.hashed_ip, s.user_id, o.text_output
      FROM context_sessions s
      LEFT JOIN context_outputs o ON o.session_id = s.id
      ORDER BY s.created_at DESC
      LIMIT 100
    `;
    const withOwn = attachIsOwn(rows, owner, hashedIp);
    const sessions = filterOwnerRows(withOwn, owner, ownerUserId)
      .map((row) => {
        if (row.is_own) {
          return {
            id: row.id,
            prompt_label: row.prompt_label,
            prompt_body: owner
              ? safeDecrypt(row.prompt_body as string)
              : (row.prompt_body as string),
            additional_prompt: row.additional_prompt
              ? owner
                ? safeDecrypt(row.additional_prompt as string)
                : (row.additional_prompt as string)
              : null,
            text_output: owner
              ? safeDecrypt(row.text_output as string)
              : (row.text_output as string | null),
            files_selected: row.files_selected,
            created_at: row.created_at,
            is_own: true,
          };
        }
        return {
          id: row.id,
          prompt_label: "···",
          prompt_body: null,
          additional_prompt: null,
          text_output: null,
          files_selected: [],
          created_at: row.created_at,
          is_own: false,
        };
      });
    return NextResponse.json({ authenticated: owner, sessions });
  } catch (e) {
    console.error("GET /api/code-briefer/sessions error:", e);
    return internalError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const { owner, hashedIp, ownerUserId } = await getRequestContext(req);
    const {
      prompt_label,
      prompt_body,
      additional_prompt,
      files_selected,
      text_output,
      llm_suggestion,
    } = await req.json();
    if (!prompt_label || !prompt_body || !Array.isArray(files_selected)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }
    if (
      text_output &&
      Buffer.byteLength(text_output, "utf8") > MAX_OUTPUT_BYTES
    ) {
      return NextResponse.json(
        { error: "text_output exceeds 500KB limit" },
        { status: 413 },
      );
    }
    const userId = owner ? ownerUserId : hashedIp;
    const [session] = await neonDb`
      INSERT INTO context_sessions (prompt_label, prompt_body, additional_prompt, files_selected, llm_suggestion, user_id, hashed_ip)
      VALUES (${prompt_label}, ${encryptIfOwner(prompt_body, owner)}, ${encryptIfOwner(additional_prompt ?? null, owner)},
              ${JSON.stringify(files_selected)}, ${encryptIfOwner(llm_suggestion ?? null, owner)}, ${userId}, ${hashedIp})
      RETURNING id
    `;
    if (text_output) {
      await neonDb`INSERT INTO context_outputs (session_id, text_output, user_id) VALUES (${session.id}, ${encryptIfOwner(text_output, owner)}, ${userId})`;
      await neonDb`DELETE FROM context_outputs WHERE session_id NOT IN (SELECT id FROM context_sessions ORDER BY created_at DESC LIMIT 100)`;
    }
    return NextResponse.json({ id: session.id });
  } catch {
    return internalError();
  }
}