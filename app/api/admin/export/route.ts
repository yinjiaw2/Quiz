import { ensureSchema } from "../../../../lib/db";
import { readSession } from "../../../../lib/auth";
import { seedQuizzes } from "../../../data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const statusText = (status: string) =>
  status === "Pending"
    ? "待管理员评分"
    : status === "Passed"
      ? "合格"
      : "不合格";

const chineseAttemptNumber = (value: number) =>
  ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"][value] ||
  String(value);

export async function GET(request: Request) {
  const session = await readSession();
  if (session?.role !== "admin")
    return Response.json({ error: "仅管理员可以导出" }, { status: 403 });

  try {
    const sql = await ensureSchema();
    const params = new URL(request.url).searchParams;
    const quizId = params.get("quizId");
    const learner = params.get("learner");
    const attemptId = params.get("attemptId");
    const selectedLearnersParam = params.get("selectedLearners");
    let selectedLearners: string[] = [];
    if (selectedLearnersParam) {
      try {
        const parsed = JSON.parse(selectedLearnersParam);
        if (Array.isArray(parsed))
          selectedLearners = parsed.map(String).filter(Boolean);
      } catch {
        return Response.json({ error: "所选学员信息无效" }, { status: 400 });
      }
    }
    if (!quizId && !learner && !attemptId)
      return Response.json(
        { error: "请选择一个考核或学员后再导出" },
        { status: 400 },
      );

    const stateRows =
      await sql`SELECT data FROM redbridge_state WHERE id = 'main'`;
    const attemptRows = attemptId
      ? await sql`SELECT data FROM redbridge_attempts WHERE id = ${attemptId}`
      : learner
        ? await sql`SELECT data FROM redbridge_attempts WHERE learner = ${learner} ORDER BY created_at ASC`
        : await sql`SELECT data FROM redbridge_attempts WHERE quiz_id = ${quizId} ORDER BY learner ASC, created_at ASC`;
    const quizzes = stateRows[0]?.data?.quizzes || seedQuizzes;
    const testAccountNames = new Set(
      (stateRows[0]?.data?.learnerRecords || [])
        .filter((record: any) => record.testAccount)
        .map((record: any) => record.name),
    );
    const quizMap = new Map(quizzes.map((quiz: any) => [quiz.id, quiz]));
    const attempts = attemptRows
      .map((row) => row.data)
      .filter(
        (attempt) =>
          !quizId ||
          !selectedLearners.length ||
          selectedLearners.includes(attempt.learner),
      );

    const occurrenceByAttempt = new Map<string, number>();
    const occurrenceCounts = new Map<string, number>();
    const registerOccurrence = (attempt: any) => {
      const key = `${attempt.learner}\u0000${attempt.quizId}`;
      const next = (occurrenceCounts.get(key) || 0) + 1;
      occurrenceCounts.set(key, next);
      occurrenceByAttempt.set(attempt.id, next);
    };
    if (attemptId && attempts[0]) {
      const current = attempts[0];
      const siblingRows = await sql`
        SELECT data FROM redbridge_attempts
        WHERE learner = ${current.learner} AND quiz_id = ${current.quizId}
        ORDER BY created_at ASC
      `;
      siblingRows.forEach((row) => registerOccurrence(row.data));
    } else {
      attempts.forEach(registerOccurrence);
    }

    if (learner) {
      attempts.sort((left, right) => {
        const leftTitle =
          (quizMap.get(left.quizId) as any)?.title || "已删除考核";
        const rightTitle =
          (quizMap.get(right.quizId) as any)?.title || "已删除考核";
        return (
          leftTitle.localeCompare(rightTitle, "zh-CN") ||
          String(left.date).localeCompare(String(right.date))
        );
      });
    }

    const pages = attempts.map((attempt) => {
      const quiz: any = quizMap.get(attempt.quizId);
      const questions = attempt.questionSnapshot || quiz?.questions || [];
      const quizTitle = quiz?.title || "原考核已删除（记录保留）";
      const occurrence = occurrenceByAttempt.get(attempt.id) || 1;
      const showOccurrence = (quiz?.maxAttempts ?? 1) > 1;
      const testTitle = showOccurrence
        ? `${quizTitle}第${chineseAttemptNumber(occurrence)}次`
        : quizTitle;
      const choiceQuestions = questions
        .map((question: any, index: number) => ({ question, index }))
        .filter(({ question }: any) => (question.type || "choice") === "choice")
        .filter(
          ({ question, index }: any) =>
            attempt.answers?.[index] !== question.correct,
        );
      const essayQuestions = questions
        .map((question: any, index: number) => ({ question, index }))
        .filter(({ question }: any) => question.type === "essay");

      const renderQuestion = ({ question, index }: any) => {
        const answer = attempt.answers?.[index];
        const isEssay = question.type === "essay";
        const incorrectChoice = !isEssay && answer !== question.correct;
        const essayTitle = isEssay
          ? String(question.text || "")
              .split("\n")
              .map((line) => line.trim())
              .find((line) => line.startsWith("《") && line.endsWith("》")) ||
            "策论题"
          : "";
        const learnerAnswer = isEssay
          ? typeof answer === "string" && answer.trim()
            ? answer
            : "未作答"
          : typeof answer === "number"
            ? question.options?.[answer] || "未作答"
            : "未作答";
        const correctAnswer = isEssay
          ? ""
          : question.options?.[question.correct] || "";
        const grade = isEssay
          ? attempt.essayGrades?.[index] === "Excellent"
            ? "优秀"
            : attempt.essayGrades?.[index] === "Passed"
              ? "合格"
              : attempt.essayGrades?.[index] === "Failed"
                ? "不合格"
                : "待评分"
          : answer === question.correct
            ? "正确"
            : "错误";
        return `
          <article class="question">
            <h4><span class="${incorrectChoice ? "incorrect-number" : ""}">${index + 1}.</span> ${escapeHtml(isEssay ? essayTitle : question.text)}</h4>
            <div class="answer"><strong>学员答案：</strong>${escapeHtml(learnerAnswer)}</div>
            ${!isEssay ? `<div><strong>正确答案：</strong>${escapeHtml(correctAnswer)}</div>` : ""}
            <div><strong>${isEssay ? "管理员评分" : "答题结果"}：</strong>${escapeHtml(grade)}</div>
            ${isEssay ? `<div><strong>批改人：</strong>${escapeHtml(attempt.essayGraders?.[index] || "未填写")}</div>` : ""}
            ${isEssay ? `<div class="comment"><strong>批改意见：</strong>${escapeHtml(attempt.essayComments?.[index] || "暂无批改意见")}</div>` : ""}
          </article>`;
      };

      const dateLine = learner
        ? ""
        : `<span><strong>提交时间：</strong>${escapeHtml(new Date(attempt.date).toLocaleString("zh-CN"))}</span>`;
      return `
        <section class="assessment-page">
          <header>
            <div class="brand">Redbridge 实习生考核</div>
            <h1>${escapeHtml(testTitle)}</h1>
            <div class="meta">
              <span><strong>姓名：</strong>${escapeHtml(attempt.learner)}${testAccountNames.has(attempt.learner) ? '<strong class="test-account">（测试账号）</strong>' : ""}</span>
              ${dateLine}
              <span><strong>结果：</strong>${escapeHtml(statusText(attempt.status))}</span>
              <span><strong>评分：</strong>${attempt.status === "Pending" ? "待评分" : escapeHtml(statusText(attempt.status))}</span>
              <span><strong>违规次数：</strong>${escapeHtml((attempt.tabSwitches || 0) + (attempt.fullscreenExits || 0))}</span>
            </div>
          </header>
          ${choiceQuestions.length ? `<h2>错误选择题</h2>${choiceQuestions.map(renderQuestion).join("")}` : ""}
          ${essayQuestions.length ? `<h2>策论题</h2>${essayQuestions.map(renderQuestion).join("")}` : ""}
          ${questions.length ? "" : '<p class="empty">此历史记录没有可用的题目快照。</p>'}
          <footer>Redbridge 实习生考核 · ${escapeHtml(testTitle)}</footer>
        </section>`;
    });

    const documentTitle = learner
      ? learner
      : attempts[0]
        ? `${attempts[0].learner}-${(quizMap.get(attempts[0].quizId) as any)?.title || "考核结果"}`
        : "考核结果";
    const html = `<!doctype html>
      <html lang="zh-CN"><head><meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(documentTitle)}</title>
      <style>
        @page { size: A4 portrait; margin: 14mm 15mm 16mm; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", Arial, sans-serif; background: #eef2f0; }
        .print-button { position: fixed; top: 18px; right: 18px; z-index: 10; border: 0; border-radius: 10px; padding: 11px 18px; background: #2f6e55; color: white; font-weight: 700; cursor: pointer; box-shadow: 0 5px 18px #0002; }
        .assessment-page { width: 210mm; min-height: 297mm; margin: 18px auto; padding: 14mm 15mm 16mm; background: white; }
        .assessment-page + .assessment-page { page-break-before: always; break-before: page; }
        header { border-bottom: 2px solid #2f6e55; padding-bottom: 12px; }
        .brand { color: #2f6e55; font-size: 12px; font-weight: 800; letter-spacing: .08em; }
        h1 { margin: 8px 0 10px; font-size: 23px; }
        h2 { margin: 22px 0 10px; padding: 8px 11px; border-left: 4px solid #2f6e55; background: #edf7f1; color: #245642; font-size: 16px; }
        .meta { display: flex; flex-wrap: wrap; gap: 7px 20px; color: #475569; font-size: 11px; }
        .test-account { margin-left: 4px; color: #6d28d9; }
        .question { break-inside: avoid; margin: 0 0 11px; padding: 11px 12px; border: 1px solid #dbe4df; border-radius: 8px; font-size: 11px; line-height: 1.65; }
        .question h4 { margin: 0 0 7px; color: #0f172a; font-size: 12px; }
        .incorrect-number { display: inline-block; min-width: 22px; border-radius: 5px; padding: 1px 5px; background: #fee2e2; color: #b91c1c; font-weight: 800; }
        .answer { white-space: pre-wrap; }
        .comment { margin-top: 5px; padding: 7px 9px; background: #f8fafc; white-space: pre-wrap; }
        footer { margin-top: 18px; border-top: 1px solid #dbe4df; padding-top: 8px; color: #94a3b8; font-size: 9px; text-align: center; }
        .empty { padding: 35px; text-align: center; color: #64748b; }
        @media print {
          body { background: white; }
          .print-button { display: none; }
          .assessment-page { width: auto; min-height: auto; margin: 0; padding: 0; }
        }
      </style></head><body>
      <button class="print-button" onclick="window.print()">保存 PDF</button>
      ${pages.length ? pages.join("") : '<section class="assessment-page"><p class="empty">暂无可导出的考核记录。</p></section>'}
      <script>window.addEventListener('load', () => setTimeout(() => window.print(), 300));</script>
      </body></html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 503 });
  }
}
