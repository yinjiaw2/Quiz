import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { ensureSchema } from "../../../../lib/db";
import { createSession, sessionCookie } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    if (username === "admin" && password === process.env.ADMIN_PASSWORD) {
      const response = NextResponse.json({ role: "admin", name: "管理员" });
      response.cookies.set(
        "redbridge_session",
        await createSession({
          role: "admin",
          name: "管理员",
          username: "admin",
        }),
        sessionCookie,
      );
      return response;
    }
    const sql = await ensureSchema();
    const rows =
      await sql`SELECT username, name, password_hash FROM redbridge_users WHERE username = ${String(username).toLowerCase()}`;
    const user = rows[0];
    if (!user || !(await compare(password, user.password_hash)))
      return NextResponse.json(
        { error: "用户名或密码不正确" },
        { status: 401 },
      );
    const response = NextResponse.json({
      role: "learner",
      name: user.name,
      username: user.username,
    });
    response.cookies.set(
      "redbridge_session",
      await createSession({
        role: "learner",
        name: user.name,
        username: user.username,
      }),
      sessionCookie,
    );
    return response;
  } catch {
    return NextResponse.json({ error: "登录服务暂不可用" }, { status: 503 });
  }
}
