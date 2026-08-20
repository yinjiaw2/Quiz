import { ensureSchema } from "../../../../lib/db";
import { readSession } from "../../../../lib/auth";
import { seedQuizzes } from "../../../data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const csvCell = (value: unknown) => {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};

export async function GET(request: Request) {
  const session = await readSession();
  if (session?.role !== "admin")
    return Response.json({ error: "仅管理员可以导出" }, { status: 403 });

  try {
    const sql = await ensureSchema();
    const params = new URL(request.url).searchParams;
    const quizId = params.get("quizId");
    const learner = params.get("learner");
    const stateRows =
      await sql`SELECT data FROM redbridge_state WHERE id = 'main'`;
    const attemptRows = learner
      ? await sql`SELECT data FROM redbridge_attempts WHERE learner = ${learner} ORDER BY created_at DESC`
      : quizId
        ? await sql`SELECT data FROM redbridge_attempts WHERE quiz_id = ${quizId} ORDER BY created_at DESC`
        : await sql`SELECT data FROM redbridge_attempts ORDER BY created_at DESC`;
    const quizzes = stateRows[0]?.data?.quizzes || seedQuizzes;
    const quizMap = new Map(quizzes.map((quiz: any) => [quiz.id, quiz]));
    const header = [
      "提交ID",
      "学员",
      "考核名称",
      "提交日期",
      "最终状态",
      "最终分数",
      "题号",
      "题型",
      "题目",
      "学员答案",
      "正确答案",
      "管理员评分",
      "批改意见",
    ];
    const rows: unknown[][] = [header];

    for (const row of attemptRows) {
      const attempt = row.data;
      const quiz: any = quizMap.get(attempt.quizId);
      if (!quiz && !attempt.questionSnapshot) {
        rows.push([
          attempt.id,
          attempt.learner,
          "原考核已删除（记录保留）",
          attempt.date,
          attempt.status,
          attempt.status === "Pending" ? "待评分" : attempt.score,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ]);
        continue;
      }
      const questions = attempt.questionSnapshot || quiz.questions;
      const quizTitle = quiz?.title || "原考核已删除（记录保留）";
      questions.forEach((question: any, index: number) => {
        const type = question.type || "choice";
        const answer = attempt.answers?.[index];
        const learnerAnswer =
          type === "essay"
            ? typeof answer === "string"
              ? answer
              : ""
            : typeof answer === "number"
              ? question.options?.[answer] || ""
              : "";
        rows.push([
          attempt.id,
          attempt.learner,
          quizTitle,
          attempt.date,
          attempt.status === "Pending"
            ? "待管理员评分"
            : attempt.status === "Passed"
              ? "合格"
              : "不合格",
          attempt.status === "Pending" ? "待评分" : attempt.score,
          index + 1,
          type === "essay" ? "策论题" : "选择题",
          question.text,
          learnerAnswer,
          type === "choice" ? question.options?.[question.correct] || "" : "",
          type === "essay"
            ? attempt.essayGrades?.[index] === "Passed"
              ? "合格"
              : attempt.essayGrades?.[index] === "Failed"
                ? "不合格"
                : "待评分"
            : typeof answer === "number" && answer === question.correct
              ? "正确"
              : "错误",
          type === "essay" ? attempt.essayComments?.[index] || "" : "",
        ]);
      });
    }

    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${learner ? "redbridge-learner-results" : quizId ? "redbridge-quiz-results" : "redbridge-all-results"}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 503 });
  }
}
