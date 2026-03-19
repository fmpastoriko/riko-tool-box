import { NextRequest, NextResponse } from "next/server";
import { neonDb } from "@/lib/db";
import { getServerRole, isOwnerRole } from "@/lib/session";
import { encryptIfOwner, decrypt } from "@/lib/encrypt";
import { sha256 } from "@/lib/auth";
import { getIp } from "@/lib/ip";

const MAX_OUTPUT_BYTES = 500 * 1024;

export async function GET(req: NextRequest) {
  try {
    const role = await getServerRole();
    const owner = isOwnerRole(role);
    const hashedIp = sha256(getIp(req));

    const rows = await neonDb`
      SELECT id, prompt_label, prompt_body, additional_prompt, files_selected, created_at, hashed_ip
      FROM context_sessions
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const sessions = rows.map((row) => {
      const isOwn = owner || row.hashed_ip === hashedIp;
      if (isOwn) {
        return {
          id: row.id,
          prompt_label: row.prompt_label,
          prompt_body: owner
            ? decrypt(row.prompt_body as string)
            : (row.prompt_body as string),
          additional_prompt: row.additional_prompt
            ? owner
              ? decrypt(row.additional_prompt as string)
              : (row.additional_prompt as string)
            : null,
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
        files_selected: [],
        created_at: row.created_at,
        is_own: false,
      };
    });

    return NextResponse.json({ authenticated: owner, sessions });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = await getServerRole();
    const owner = isOwnerRole(role);
    const hashedIp = sha256(getIp(req));

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

    const userId = owner ? (process.env.OWNER_EMAIL ?? null) : null;

    const [session] = await neonDb`
      INSERT INTO context_sessions (prompt_label, prompt_body, additional_prompt, files_selected, llm_suggestion, user_id, hashed_ip)
      VALUES (
        ${prompt_label},
        ${encryptIfOwner(prompt_body, owner)},
        ${encryptIfOwner(additional_prompt ?? null, owner)},
        ${JSON.stringify(files_selected)},
        ${encryptIfOwner(llm_suggestion ?? null, owner)},
        ${userId},
        ${hashedIp}
      )
      RETURNING id
    `;

    if (text_output) {
      await neonDb`
        INSERT INTO context_outputs (session_id, text_output, user_id)
        VALUES (${session.id}, ${encryptIfOwner(text_output, owner)}, ${userId})
      `;

      await neonDb`
        DELETE FROM context_outputs
        WHERE session_id NOT IN (
          SELECT id FROM context_sessions
          ORDER BY created_at DESC
          LIMIT 100
        )
      `;
    }

    return NextResponse.json({ id: session.id });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
