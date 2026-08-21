import { NextResponse } from "next/server";
import { ensureSchema } from "../../../lib/db";
import { readSession } from "../../../lib/auth";
import {
  learners,
  seedQuestionBanks,
  seedQuizzes,
  stateManagerEssay,
} from "../../data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const retiredDemoQuizIds = new Set(["product-03", "privacy-101", "conduct"]);
const currentDemoQuizIds = new Set(seedQuizzes.map((quiz) => quiz.id));
const essayFormatVersion = "2026-08-20-word-exact-paragraphs-v1";

export async function GET() {
  try {
    const sql = await ensureSchema();
    let rows = await sql`SELECT data FROM redbridge_state WHERE id = 'main'`;
    if (!rows.length) {
      const initialData = {
        quizzes: seedQuizzes,
        questionBanks: seedQuestionBanks,
        learnerRecords: [],
        announcement: "",
        announcementPersistent: false,
      };
      rows = await sql`
        INSERT INTO redbridge_state (id, data)
        VALUES ('main', ${JSON.stringify(initialData)}::jsonb)
        ON CONFLICT (id) DO UPDATE SET data = redbridge_state.data
        RETURNING data
      `;
    }
    const users =
      await sql`SELECT username, name FROM redbridge_users ORDER BY created_at`;
    const data = rows[0].data;
    const shouldInitializeQuestionBanks = !Array.isArray(data.questionBanks);
    if (shouldInitializeQuestionBanks) data.questionBanks = seedQuestionBanks;
    const shouldUpdateEssayFormat =
      data.essayFormatVersion !== essayFormatVersion;
    if (shouldUpdateEssayFormat) {
      const isStateManagerEssay = (question: any) =>
        question?.type === "essay" &&
        String(question.text || "").includes(
          "如何在90天内建立一个相互制衡、协同作战且不依赖个人的州级运营单元",
        );
      data.questionBanks = (data.questionBanks || []).map((bank: any) => ({
        ...bank,
        questions: (bank.questions || []).map((question: any) =>
          isStateManagerEssay(question)
            ? { ...question, text: stateManagerEssay, wordLimit: 1000 }
            : question,
        ),
      }));
      data.quizzes = (data.quizzes || []).map((quiz: any) => ({
        ...quiz,
        questions: (quiz.questions || []).map((question: any) =>
          isStateManagerEssay(question)
            ? { ...question, text: stateManagerEssay, wordLimit: 1000 }
            : question,
        ),
      }));
      data.essayFormatVersion = essayFormatVersion;
    }
    const storedQuizzes = data.quizzes || [];
    const shouldReplaceRetiredDemos = storedQuizzes.some((quiz: any) =>
      retiredDemoQuizIds.has(quiz.id),
    );
    if (shouldReplaceRetiredDemos) {
      data.quizzes = [
        ...seedQuizzes,
        ...storedQuizzes.filter(
          (quiz: any) =>
            !retiredDemoQuizIds.has(quiz.id) &&
            !currentDemoQuizIds.has(quiz.id),
        ),
      ];
    }
    const demoEmails = new Set(learners.map((learner) => learner.email));
    const originalLearners = data.learnerRecords || [];
    const existing = originalLearners.filter(
      (learner: any) => !demoEmails.has(learner.email),
    );
    const learnerRecords = [
      ...existing,
      ...users
        .filter(
          (user) =>
            !existing.some((learner: any) => learner.email === user.username),
        )
        .map((user) => ({
          name: user.name,
          email: user.username,
          department: "运营",
          completed: 0,
        })),
    ];
    if (
      shouldReplaceRetiredDemos ||
      shouldInitializeQuestionBanks ||
      shouldUpdateEssayFormat ||
      existing.length !== originalLearners.length
    ) {
      data.learnerRecords = learnerRecords;
      await sql`
        UPDATE redbridge_state
        SET data = ${JSON.stringify(data)}::jsonb, updated_at = NOW()
        WHERE id = 'main'
      `;
    }
    return NextResponse.json({ ...data, learnerRecords });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await readSession();
    if (session?.role !== "admin")
      return NextResponse.json({ error: "无权修改管理数据" }, { status: 403 });
    const data = await request.json();
    const sql = await ensureSchema();
    await sql`
      INSERT INTO redbridge_state (id, data, updated_at)
      VALUES ('main', ${JSON.stringify(data)}::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE
      SET data = redbridge_state.data || EXCLUDED.data, updated_at = NOW()
    `;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 503 });
  }
}
