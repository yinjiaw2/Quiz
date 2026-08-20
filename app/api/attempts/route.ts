import { NextResponse } from "next/server";
import { ensureSchema } from "../../../lib/db";
import { readSession } from "../../../lib/auth";
import { seedQuizzes } from "../../data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const attemptsResetVersion = "2026-08-20-clear-all-attempts";

export async function GET() {
  try {
    const session = await readSession();
    if (!session)
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    const sql = await ensureSchema();
    const resetRows =
      await sql`SELECT data FROM redbridge_state WHERE id = 'main'`;
    if (
      resetRows.length &&
      resetRows[0].data.attemptsResetVersion !== attemptsResetVersion
    ) {
      await sql`DELETE FROM redbridge_attempts`;
      const resetState = {
        ...resetRows[0].data,
        attemptsResetVersion,
      };
      await sql`
        UPDATE redbridge_state
        SET data = ${JSON.stringify(resetState)}::jsonb, updated_at = NOW()
        WHERE id = 'main'
      `;
    }
    const rows =
      session.role === "admin"
        ? await sql`SELECT data FROM redbridge_attempts ORDER BY created_at DESC`
        : await sql`SELECT data FROM redbridge_attempts WHERE learner = ${session.name} ORDER BY created_at DESC`;
    if (session.role === "admin")
      return NextResponse.json(rows.map((row) => row.data));

    const safeAttempts = rows.map((row) => {
      const stored = row.data;
      const safe = { ...stored };
      delete safe.essayGrades;
      delete safe.essayComments;
      delete safe.essayGraders;
      return {
        ...safe,
        correct: 0,
        total: 0,
        score: 0,
        status: "Pending",
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
    const canonicalOrder = quiz.questions.map((_: any, index: number) => index);
    const requestedOrder = Array.isArray(attempt.questionOrder)
      ? attempt.questionOrder.map(Number)
      : [];
    const validQuestionOrder =
      requestedOrder.length === canonicalOrder.length &&
      new Set(requestedOrder).size === canonicalOrder.length &&
      requestedOrder.every(
        (index: number) => index >= 0 && index < canonicalOrder.length,
      );
    const questionOrder = validQuestionOrder ? requestedOrder : canonicalOrder;
    const questionSnapshot = questionOrder.map(
      (originalQuestionIndex: number, displayedQuestionIndex: number) => {
        const question = quiz.questions[originalQuestionIndex];
        if ((question.type || "choice") !== "choice") return { ...question };
        const canonicalOptions = question.options.map(
          (_: string, index: number) => index,
        );
        const requestedOptions = attempt.optionOrders?.[displayedQuestionIndex];
        const validOptionOrder =
          Array.isArray(requestedOptions) &&
          requestedOptions.length === canonicalOptions.length &&
          new Set(requestedOptions).size === canonicalOptions.length &&
          requestedOptions.every(
            (index: number) => index >= 0 && index < canonicalOptions.length,
          );
        const optionOrder = validOptionOrder
          ? requestedOptions
          : canonicalOptions;
        return {
          ...question,
          options: optionOrder.map((index: number) => question.options[index]),
          correct: optionOrder.indexOf(question.correct),
        };
      },
    );
    const oversizedEssayIndex = questionSnapshot.findIndex(
      (question: any, index: number) => {
        if (question.type !== "essay") return false;
        const wordLimit = Math.min(
          1000,
          Math.max(1, Number(question.wordLimit) || 1000),
        );
        return String(answers[index] || "").length > wordLimit;
      },
    );
    if (oversizedEssayIndex >= 0) {
      const wordLimit = Math.min(
        1000,
        Math.max(
          1,
          Number(questionSnapshot[oversizedEssayIndex].wordLimit) || 1000,
        ),
      );
      return NextResponse.json(
        { error: `第 ${oversizedEssayIndex + 1} 题超过 ${wordLimit} 字上限` },
        { status: 400 },
      );
    }
    const correct = questionSnapshot.filter(
      (question: any, index: number) =>
        (question.type || "choice") === "choice" &&
        answers[index] === question.correct,
    ).length;
    const hasEssay = questionSnapshot.some(
      (question: any) => question.type === "essay",
    );
    const score = Math.round((correct / questionSnapshot.length) * 100);
    attempt.correct = correct;
    attempt.total = questionSnapshot.length;
    attempt.score = score;
    attempt.questionSnapshot = questionSnapshot;
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
    const learnerResponse = { ...rows[0].data };
    delete learnerResponse.essayGrades;
    delete learnerResponse.essayComments;
    delete learnerResponse.essayGraders;
    learnerResponse.correct = 0;
    learnerResponse.total = 0;
    learnerResponse.score = 0;
    learnerResponse.status = "Pending";
    return NextResponse.json(learnerResponse, { status: 201 });
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
      grader = "",
    } = await request.json();
    if (
      !attemptId ||
      !Number.isInteger(questionIndex) ||
      (grade !== undefined && !["Passed", "Failed"].includes(grade))
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

    attempt.essayGrades = attempt.essayGrades || {};
    if (grade !== undefined) attempt.essayGrades[questionIndex] = grade;
    attempt.essayComments = {
      ...(attempt.essayComments || {}),
      [questionIndex]: String(comment).trim(),
    };
    attempt.essayGraders = {
      ...(attempt.essayGraders || {}),
      [questionIndex]:
        String(grader).trim() ||
        attempt.essayGraders?.[questionIndex] ||
        session.name,
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
