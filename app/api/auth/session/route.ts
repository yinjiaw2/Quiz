import { NextResponse } from "next/server";
import { readSession } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });
  return NextResponse.json(session);
}
