import { NextResponse } from "next/server";
import { readSession } from "../../../../lib/auth";
import { ensureSchema } from "../../../../lib/db";
import { seedQuizzes } from "../../../data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await readSession();
    if (!session)
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    const sql = await ensureSchema();
    const rows =
      session.role === "admin"
        ? await sql`SELECT data FROM redbridge_attempt_drafts ORDER BY updated_at DESC`
        : await sql`SELECT data FROM redbridge_attempt_drafts WHERE username = ${session.username} ORDER BY updated_at DESC`;
    return NextResponse.json(rows.map((row) => row.data));
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await readSession();
    if (session?.role !== "learner")
      return NextResponse.json({ error: "请先登录学员账户" }, { status: 401 });
    const draft = await request.json();
    if (!draft?.quizId || typeof draft.answers !== "object")
      return NextResponse.json({ error: "草稿信息无效" }, { status: 400 });

    const sql = await ensureSchema();
    const stateRows =
      await sql`SELECT data FROM redbridge_state WHERE id = 'main'`;
    const quizzes = stateRows[0]?.data?.quizzes || seedQuizzes;
    const quiz = quizzes.find((item: any) => item.id === draft.quizId);
    if (!quiz || quiz.status !== "Published")
      return NextResponse.json(
        { error: "该考核不存在或尚未发布" },
        { status: 404 },
      );

    const storedDraft = {
      quizId: draft.quizId,
      learner: session.name,
      username: session.username,
      answers: draft.answers,
      questionOrder: draft.questionOrder || [],
      optionOrders: draft.optionOrders || {},
      questionSnapshot: draft.questionSnapshot || [],
      timeRemaining: Number(draft.timeRemaining) || 0,
      tabSwitches: Number(draft.tabSwitches) || 0,
      fullscreenExits: Number(draft.fullscreenExits) || 0,
      updatedAt: new Date().toISOString(),
    };
    await sql`
      INSERT INTO redbridge_attempt_drafts (quiz_id, username, learner, data, updated_at)
      VALUES (${draft.quizId}, ${session.username}, ${session.name}, ${JSON.stringify(storedDraft)}::jsonb, NOW())
      ON CONFLICT (quiz_id, username) DO UPDATE
      SET learner = EXCLUDED.learner, data = EXCLUDED.data, updated_at = NOW()
    `;
    return NextResponse.json({ ok: true, updatedAt: storedDraft.updatedAt });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 503 });
  }
}
