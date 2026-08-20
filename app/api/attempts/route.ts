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
    if (session.role === "admin")
      return NextResponse.json(rows.map((row) => row.data));

    const stateRows =
      await sql`SELECT data FROM redbridge_state WHERE id = 'main'`;
    const quizzes = stateRows[0]?.data?.quizzes || seedQuizzes;
    const safeAttempts = rows.map((row) => {
      const stored = row.data;
      const quiz = quizzes.find((item: any) => item.id === stored.quizId);
      const questions = stored.questionSnapshot || quiz?.questions || [];
      const choiceQuestions = questions
        .map((question: any, index: number) => ({ question, index }))
        .filter(
          ({ question }: any) => (question.type || "choice") === "choice",
        );
      const correct = choiceQuestions.filter(
        ({ question, index }: any) =>
          stored.answers?.[index] === question.correct,
      ).length;
      const total = choiceQuestions.length;
      const score = total ? Math.round((correct / total) * 100) : 0;
      const passingScore =
        stored.passingScoreSnapshot ?? quiz?.passingScore ?? 0;
      const { essayGrades, essayComments, ...safe } = stored;
      return {
        ...safe,
        correct,
        total,
        score,
        status: score >= passingScore ? "Passed" : "Failed",
      };
    });
    return NextResponse.json(safeAttempts);
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
      (question: any, index: number) =>
        (question.type || "choice") === "choice" &&
        answers[index] === question.correct,
    ).length;
    const hasEssay = quiz.questions.some(
      (question: any) => question.type === "essay",
    );
    const score = Math.round((correct / quiz.questions.length) * 100);
    attempt.correct = correct;
    attempt.total = quiz.questions.length;
    attempt.score = score;
    attempt.questionSnapshot = quiz.questions;
    attempt.passingScoreSnapshot = quiz.passingScore;
    attempt.essayGrades = {};
    attempt.essayComments = {};
    attempt.status = hasEssay
      ? "Pending"
      : score >= quiz.passingScore
        ? "Passed"
        : "Failed";
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

export async function PATCH(request: Request) {
  try {
    const session = await readSession();
    if (session?.role !== "admin")
      return NextResponse.json({ error: "仅管理员可以评分" }, { status: 403 });
    const {
      attemptId,
      questionIndex,
      grade,
      comment = "",
    } = await request.json();
    if (
      !attemptId ||
      !Number.isInteger(questionIndex) ||
      !["Passed", "Failed"].includes(grade)
    )
      return NextResponse.json({ error: "评分信息无效" }, { status: 400 });

    const sql = await ensureSchema();
    const attemptRows =
      await sql`SELECT data FROM redbridge_attempts WHERE id = ${attemptId}`;
    if (!attemptRows.length)
      return NextResponse.json({ error: "提交记录不存在" }, { status: 404 });
    const attempt = attemptRows[0].data;
    const stateRows =
      await sql`SELECT data FROM redbridge_state WHERE id = 'main'`;
    const availableQuizzes = stateRows[0]?.data?.quizzes || seedQuizzes;
    const quiz = availableQuizzes.find(
      (item: any) => item.id === attempt.quizId,
    );
    const questions = attempt.questionSnapshot || quiz?.questions;
    const question = questions?.[questionIndex];
    if (!question || question.type !== "essay")
      return NextResponse.json({ error: "该题不是策论题" }, { status: 400 });

    attempt.essayGrades = {
      ...(attempt.essayGrades || {}),
      [questionIndex]: grade,
    };
    attempt.essayComments = {
      ...(attempt.essayComments || {}),
      [questionIndex]: String(comment).trim(),
    };
    const choiceCorrect = questions.filter(
      (item: any, index: number) =>
        (item.type || "choice") === "choice" &&
        attempt.answers?.[index] === item.correct,
    ).length;
    const essayIndexes = questions
      .map((item: any, index: number) => (item.type === "essay" ? index : -1))
      .filter((index: number) => index >= 0);
    const essayPassed = essayIndexes.filter(
      (index: number) => attempt.essayGrades[index] === "Passed",
    ).length;
    const allGraded = essayIndexes.every(
      (index: number) => attempt.essayGrades[index],
    );
    attempt.correct = choiceCorrect + essayPassed;
    attempt.total = questions.length;
    attempt.score = Math.round((attempt.correct / attempt.total) * 100);
    attempt.status = allGraded
      ? attempt.score >= (attempt.passingScoreSnapshot ?? quiz.passingScore)
        ? "Passed"
        : "Failed"
      : "Pending";
    const rows = await sql`
      UPDATE redbridge_attempts
      SET data = ${JSON.stringify(attempt)}::jsonb
      WHERE id = ${attemptId}
      RETURNING data
    `;
    return NextResponse.json(rows[0].data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 503 });
  }
}
