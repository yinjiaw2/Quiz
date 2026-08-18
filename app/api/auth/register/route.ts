import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { ensureSchema } from "../../../../lib/db";
import { createSession, sessionCookie } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { username, name, password, remember = false } = await request.json();
    if (
      !username?.trim() ||
      !name?.trim() ||
      !password ||
      username.toLowerCase() === "admin"
    )
      return NextResponse.json({ error: "注册信息无效" }, { status: 400 });
    const sql = await ensureSchema();
    const passwordHash = await hash(password, 12);
    await sql`
      INSERT INTO redbridge_users (username, name, password_hash)
      VALUES (${username.trim().toLowerCase()}, ${name.trim()}, ${passwordHash})
    `;
    const cleanUsername = username.trim().toLowerCase();
    const response = NextResponse.json({
      name: name.trim(),
      username: cleanUsername,
    });
    response.cookies.set(
      "redbridge_session",
      await createSession(
        {
          role: "learner",
          name: name.trim(),
          username: cleanUsername,
        },
        Boolean(remember),
      ),
      sessionCookie(Boolean(remember)),
    );
    return response;
  } catch (error: any) {
    const duplicate =
      error?.code === "23505" || String(error).includes("duplicate key");
    return NextResponse.json(
      { error: duplicate ? "该用户名已注册" : "注册服务暂不可用" },
      { status: duplicate ? 409 : 503 },
    );
  }
}
