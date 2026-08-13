import { NextResponse } from "next/server";
import { ensureSchema } from "../../../lib/db";
import { readSession } from "../../../lib/auth";
import { seedQuizzes } from "../../data";

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
        ? await sql`SELECT data FROM redbridge_attempts ORDER BY created_at DESC`
        : await sql`SELECT data FROM redbridge_attempts WHERE learner = ${session.name} ORDER BY created_at DESC`;
    return NextResponse.json(rows.map((row) => row.data));
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await readSession();
    if (session?.role !== "learner")
      return NextResponse.json({ error: "请先登录学员账户" }, { status: 401 });
    const { attempt } = await request.json();
    attempt.learner = session.name;
    const sql = await ensureSchema();
    const stateRows =
      await sql`SELECT data FROM redbridge_state WHERE id = 'main'`;
    const availableQuizzes = stateRows[0]?.data?.quizzes || seedQuizzes;
    const quiz = availableQuizzes.find(
      (item: any) => item.id === attempt.quizId,
    );
    if (!quiz || quiz.status !== "Published")
      return NextResponse.json(
        { error: "该考核不存在或尚未发布" },
        { status: 404 },
      );
    const limit = Math.max(1, Number(quiz.maxAttempts) || 1);
    const answers = attempt.answers || {};
    const correct = quiz.questions.filter(
      (question: any, index: number) => answers[index] === question.correct,
    ).length;
    const score = Math.round((correct / quiz.questions.length) * 100);
    attempt.correct = correct;
    attempt.total = quiz.questions.length;
    attempt.score = score;
    attempt.status = score >= quiz.passingScore ? "Passed" : "Failed";
    const rows = await sql`
      WITH attempt_lock AS MATERIALIZED (
        SELECT pg_advisory_xact_lock(hashtext(${`${attempt.quizId}:${attempt.learner}`}))
      )
      INSERT INTO redbridge_attempts (id, quiz_id, learner, data)
      SELECT ${attempt.id}, ${attempt.quizId}, ${attempt.learner}, ${JSON.stringify(attempt)}::jsonb
      FROM attempt_lock
      WHERE (
        SELECT COUNT(*) FROM redbridge_attempts
        WHERE quiz_id = ${attempt.quizId} AND learner = ${attempt.learner}
      ) < ${limit}
      RETURNING data
    `;
    if (!rows.length)
      return NextResponse.json(
        { error: `已达到最多 ${limit} 次答题限制` },
        { status: 409 },
      );
    return NextResponse.json(rows[0].data, { status: 201 });
  } catch (error: any) {
    const duplicate = error?.code === "23505";
    return NextResponse.json(
      { error: duplicate ? "该成绩已提交" : "成绩提交失败" },
      { status: duplicate ? 409 : 503 },
    );
  }
}
