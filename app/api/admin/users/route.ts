import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { readSession } from "../../../../lib/auth";
import { ensureSchema } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await readSession();
  return session?.role === "admin";
}

export async function GET() {
  try {
    if (!(await requireAdmin()))
      return NextResponse.json({ error: "无权查看学员" }, { status: 403 });
    const sql = await ensureSchema();
    const rows = await sql`
      SELECT username, name, created_at
      FROM redbridge_users
      ORDER BY created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await requireAdmin()))
      return NextResponse.json({ error: "无权删除学员" }, { status: 403 });
    const { username } = await request.json();
    if (!username)
      return NextResponse.json({ error: "缺少用户名" }, { status: 400 });
    const sql = await ensureSchema();
    const users = await sql`
      SELECT name FROM redbridge_users
      WHERE username = ${String(username).toLowerCase()}
    `;
    if (!users.length)
      return NextResponse.json({ error: "学员不存在" }, { status: 404 });
    await sql`DELETE FROM redbridge_attempts WHERE learner = ${users[0].name}`;
    const rows = await sql`
      DELETE FROM redbridge_users
      WHERE username = ${String(username).toLowerCase()}
      RETURNING username
    `;
    if (!rows.length)
      return NextResponse.json({ error: "学员不存在" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 503 });
  }
}

export async function PATCH() {
  try {
    if (!(await requireAdmin()))
      return NextResponse.json({ error: "无权重置密码" }, { status: 403 });
    const sql = await ensureSchema();
    const passwordHash = await hash("123456", 12);
    const rows = await sql`
      UPDATE redbridge_users
      SET password_hash = ${passwordHash}
      RETURNING username
    `;
    return NextResponse.json({ ok: true, count: rows.length });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 503 });
  }
}
