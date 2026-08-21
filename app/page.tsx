"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  Edit3,
  Eye,
  Flag,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react";
import {
  buildDefaultQuestions,
  buildEssayQuestions,
  buildQuestions,
  learners,
  seedQuestionBanks,
  seedAttempts,
  seedQuizzes,
} from "./data";
import { Attempt, QuestionBank, Quiz, Role } from "./types";

type View =
  | "dashboard"
  | "quizzes"
  | "results"
  | "learners"
  | "banks"
  | "learnerDetail"
  | "builder"
  | "take"
  | "resultDetail";
type Account = { name: string; username: string; password: string };
type LearnerRecord = (typeof learners)[number] & { testAccount?: boolean };
let activeLearnerName = "";
const fmtDate = (v: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(v));
const fmtDateTime = (v: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(v));
const badge = (s: string) =>
  s === "Passed" || s === "Published"
    ? "bg-emerald-50 text-emerald-700"
    : s === "Failed"
      ? "bg-rose-50 text-rose-700"
      : "bg-amber-50 text-amber-700";
const statusText = (s: string) =>
  ({
    Passed: "合格",
    Excellent: "优秀",
    Failed: "不合格",
    Pending: "待管理员评分",
    Published: "已发布",
    Draft: "草稿",
  })[s] || s;

function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`grid h-10 w-10 place-items-center rounded-xl ${inverse ? "bg-white/15 text-white" : "bg-brand text-white"}`}
      >
        <GraduationCap size={21} />
      </div>
      <div>
        <div
          className={`font-bold tracking-tight ${inverse ? "text-white" : ""}`}
        >
          Redbridge 实习生考核
        </div>
        <div
          className={`text-[11px] ${inverse ? "text-emerald-100" : "text-brand"}`}
        >
          在线考核平台
        </div>
      </div>
    </div>
  );
}

function Login({
  accounts,
  onLogin,
  onRegister,
}: {
  accounts: Account[];
  onLogin: (r: Role, account?: Account) => void;
  onRegister: (a: Account) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const changeMode = (next: "login" | "register") => {
    setMode(next);
    setError("");
    setPassword("");
  };
  const submit = async () => {
    const user = username.trim();
    const localPreview =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    setError("");
    if (!user || !password) {
      setError("请输入用户名和密码");
      return;
    }
    if (mode === "register") {
      if (!name.trim()) {
        setError("请输入姓名");
        return;
      }
      if (user.toLowerCase() === "admin") {
        setError("该用户名不可注册");
        return;
      }
      if (
        accounts.some((a) => a.username.toLowerCase() === user.toLowerCase())
      ) {
        setError("该用户名已注册");
        return;
      }
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            username: user,
            password,
            remember,
          }),
        });
        if (!response.ok) {
          const body = await response.json();
          if (response.status !== 503 || !localPreview) {
            setError(body.error || "注册失败");
            return;
          }
        }
      } catch {}
      activeLearnerName = name.trim();
      onRegister({ name: name.trim(), username: user, password });
      return;
    }
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password, remember }),
      });
      if (response.ok) {
        const body = await response.json();
        if (body.role === "admin") {
          activeLearnerName = "";
          onLogin("admin");
        } else {
          const account = {
            name: body.name,
            username: body.username,
            password,
          };
          activeLearnerName = body.name;
          onLogin("learner", account);
        }
        return;
      }
      if (response.status !== 503 || !localPreview) {
        const body = await response.json();
        setError(
          body.error ||
            "后端服务未配置，请检查 Vercel 的数据库环境变量后重新部署",
        );
        return;
      }
    } catch {}
    if (localPreview && user === "admin" && password === "Redbridge1982") {
      activeLearnerName = "";
      onLogin("admin");
      return;
    }
    const found = accounts.find(
      (a) =>
        a.username.toLowerCase() === user.toLowerCase() &&
        a.password === password,
    );
    if (localPreview && found) {
      activeLearnerName = found.name;
      onLogin("learner", found);
    } else if (localPreview) setError("用户名或密码不正确");
    else setError("无法连接后端，请检查 Vercel 数据库环境变量并重新部署");
  };
  return (
    <main className="min-h-screen bg-[#eef4ef] p-5">
      <div className="mx-auto flex min-h-[calc(100vh-40px)] max-w-6xl overflow-hidden rounded-[28px] bg-white shadow-xl">
        <section className="hidden w-1/2 flex-col justify-between bg-brand p-14 text-white lg:flex">
          <Logo inverse />
          <div>
            <p className="mb-5 text-sm font-semibold tracking-[.18em] text-emerald-200">
              学习 · 考核 · 成长
            </p>
            <h1 className="max-w-md text-5xl font-semibold leading-[1.08]">
              让每一次实习，都成为职业成长的起点。
            </h1>
            <p className="mt-6 max-w-md text-lg leading-8 text-emerald-100">
              专注于实习生培训、在线考核与成长记录的一站式平台。
            </p>
          </div>
          <p className="text-xs text-emerald-200">© 2026 Redbridge</p>
        </section>
        <section className="flex flex-1 items-center justify-center p-7 sm:p-14">
          <div className="w-full max-w-md">
            <div className="mb-10 lg:hidden">
              <Logo />
            </div>
            <p className="text-sm font-semibold text-brand">
              {mode === "login" ? "欢迎回来" : "学员注册"}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">
              {mode === "login" ? "登录后继续" : "创建学员账户"}
            </h2>
            {mode === "register" && (
              <>
                <label className="label mt-7">姓名</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入姓名"
                />
              </>
            )}
            <label className={`label ${mode === "register" ? "mt-4" : "mt-7"}`}>
              用户名
            </label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              autoComplete="username"
            />
            <label className="label mt-4">密码</label>
            <input
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 accent-[#2f6e55]"
              />
              记住账号并自动登录（30 天）
            </label>
            {error && (
              <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>
            )}
            <button className="btn-primary mt-6 w-full py-3" onClick={submit}>
              {mode === "login" ? "登录" : "注册并登录"}{" "}
              <ArrowRight size={17} />
            </button>
            <p className="mt-6 text-center text-sm text-slate-500">
              {mode === "login" ? (
                <>
                  还没有学员账户？{" "}
                  <button
                    className="font-semibold text-brand hover:underline"
                    onClick={() => changeMode("register")}
                  >
                    立即注册
                  </button>
                </>
              ) : (
                <>
                  已有账户？{" "}
                  <button
                    className="font-semibold text-brand hover:underline"
                    onClick={() => changeMode("login")}
                  >
                    返回登录
                  </button>
                </>
              )}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Shell({
  role,
  view,
  setView,
  logout,
  onAnnounce,
  children,
}: {
  role: Role;
  view: View;
  setView: (v: View) => void;
  logout: () => void;
  onAnnounce: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const admin = [
    { id: "dashboard", label: "管理概览", icon: LayoutDashboard },
    { id: "quizzes", label: "考核管理", icon: BookOpenCheck },
    { id: "banks", label: "题库管理", icon: BookOpenCheck },
    { id: "results", label: "考核结果", icon: BarChart3 },
    { id: "learners", label: "学员管理", icon: Users },
  ];
  const employee = [
    { id: "dashboard", label: "首页", icon: LayoutDashboard },
    { id: "quizzes", label: "我的考核", icon: BookOpenCheck },
    { id: "results", label: "我的记录", icon: Trophy },
  ];
  const links = role === "admin" ? admin : employee;
  return (
    <div className="min-h-screen bg-cream">
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 border-r border-slate-200 bg-white p-5 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between">
          <Logo />
          <button className="lg:hidden" onClick={() => setOpen(false)}>
            <X />
          </button>
        </div>
        <nav className="mt-10 space-y-1">
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => {
                setView(l.id as View);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold ${view === l.id ? "bg-mint text-brand" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
            >
              <l.icon size={19} />
              {l.label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-5 left-5 right-5">
          <div className="mb-3 rounded-xl bg-slate-50 p-3">
            <div className="text-sm font-semibold">
              {role === "admin" ? "管理员" : "实习学员"}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {role === "admin" ? "Redbridge 管理中心" : "Redbridge 学员中心"}
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 px-3 py-2 text-sm font-semibold text-slate-500 hover:text-rose-600"
          >
            <LogOut size={17} />
            退出登录
          </button>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur md:px-8">
          <button className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu />
          </button>
          <div className="hidden max-w-sm flex-1 items-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5 lg:flex">
            <Search size={17} className="text-slate-400" />
            <input
              className="w-full bg-transparent text-sm outline-none"
              placeholder="搜索"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            {role === "admin" && (
              <button className="btn-secondary" onClick={onAnnounce}>
                <Bell size={17} />
                发布公告
              </button>
            )}
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#dcece3] text-sm font-bold text-brand">
              {role === "admin" ? "管" : "学"}
            </div>
          </div>
        </header>
        <main className="p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: any;
}) {
  return (
    <div className="card p-5">
      <div className="flex justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-mint text-brand">
          <Icon size={20} />
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-500">{sub}</p>
    </div>
  );
}
function PageTitle({
  eyebrow,
  title,
  desc,
  action,
}: {
  eyebrow?: string;
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-bold uppercase tracking-[.14em] text-brand">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-sm text-slate-500">{desc}</p>
      </div>
      {action}
    </div>
  );
}

function AdminDashboard({
  attempts,
  quizzes,
  learnersCount,
  setView,
  openResult,
}: {
  attempts: Attempt[];
  quizzes: Quiz[];
  learnersCount: number;
  setView: (v: View) => void;
  openResult: (attempt: Attempt) => void;
}) {
  const names = Object.fromEntries(quizzes.map((q) => [q.id, q.title]));
  const gradedAttempts = attempts.filter((a) => a.status !== "Pending");
  const avg = gradedAttempts.length
    ? Math.round(
        gradedAttempts.reduce((a, b) => a + b.score, 0) / gradedAttempts.length,
      )
    : 0;
  const passed = attempts.filter((a) => a.status === "Passed").length;
  const passRate = gradedAttempts.length
    ? Math.round((passed / gradedAttempts.length) * 100)
    : 0;
  const today = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
  return (
    <>
      <PageTitle
        eyebrow={today}
        title="下午好，管理员"
        desc="查看 Redbridge 实习生考核的实时进展。"
        action={
          <button className="btn-primary" onClick={() => setView("builder")}>
            <Plus size={17} />
            创建考核
          </button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat
          label="学员总数"
          value={String(learnersCount)}
          sub="当前已注册学员"
          icon={Users}
        />
        <Stat
          label="进行中考核"
          value={String(quizzes.filter((q) => q.status === "Published").length)}
          sub={`共 ${quizzes.length} 项考核`}
          icon={BookOpenCheck}
        />
        <Stat
          label="考试次数"
          value={String(attempts.length)}
          sub="全部提交记录"
          icon={CheckCircle2}
        />
        <Stat
          label="平均分"
          value={`${avg}%`}
          sub="根据当前成绩计算"
          icon={BarChart3}
        />
        <Stat
          label="通过率"
          value={`${passRate}%`}
          sub={`${passed} 次合格`}
          icon={Trophy}
        />
      </div>
      <div className="card mt-7 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <h2 className="font-bold">最近提交</h2>
            <p className="mt-1 text-xs text-slate-500">
              学员最近提交的考核记录
            </p>
          </div>
          <button
            className="text-sm font-semibold text-brand"
            onClick={() => setView("results")}
          >
            查看全部
          </button>
        </div>
        <ResultTable
          attempts={attempts.slice(0, 5)}
          names={names}
          onOpen={openResult}
        />
      </div>
    </>
  );
}

function ResultTable({
  attempts,
  names,
  onOpen,
  hideScores = false,
}: {
  attempts: Attempt[];
  names: Record<string, string>;
  onOpen?: (a: Attempt) => void;
  hideScores?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-xs tracking-wide text-slate-500">
          <tr>
            {(hideScores
              ? ["学员", "考核", "用时", "违规次数", "提交日期", "状态"]
              : [
                  "学员",
                  "考核",
                  "分数",
                  "答对题数",
                  "用时",
                  "违规次数",
                  "提交日期",
                  "状态",
                ]
            ).map((x) => (
              <th className="px-5 py-3 font-semibold" key={x}>
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {attempts.map((a) => (
            <tr
              key={a.id}
              onClick={() => onOpen?.(a)}
              className={
                onOpen
                  ? "cursor-pointer hover:bg-slate-50"
                  : "hover:bg-slate-50"
              }
            >
              <td className="px-5 py-4 font-semibold">{a.learner}</td>
              <td className="px-5 py-4 text-slate-600">
                {names[a.quizId] || "原考核已删除（记录保留）"}
              </td>
              {!hideScores && (
                <>
                  <td className="px-5 py-4 font-bold">
                    {a.status === "Pending" ? "待评分" : `${a.score}%`}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {a.status === "Pending"
                      ? "待评分"
                      : `${a.correct} / ${a.total}`}
                  </td>
                </>
              )}
              <td className="px-5 py-4 text-slate-600">{a.timeUsed} 分钟</td>
              <td className="px-5 py-4 text-slate-600">
                {a.tabSwitches + a.fullscreenExits}
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                {fmtDateTime(a.date)}
              </td>
              <td className="px-5 py-4">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge(a.status)}`}
                >
                  {hideScores ? "已提交" : statusText(a.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const learnerAliases: Record<string, string[]> = {
  张艾瑞: ["张艾瑞", "Eric Zhang"],
  陈米娅: ["陈米娅", "Mia Chen"],
  詹姆斯: ["詹姆斯", "James Wilson"],
  艾娃: ["艾娃", "Ava Patel"],
};
const attemptsFor = (learner: LearnerRecord, attempts: Attempt[]) => {
  const names = learnerAliases[learner.name] || [learner.name];
  return attempts.filter((a) => names.includes(a.learner));
};

function LearnerManagement({
  records,
  setRecords,
  attempts,
  open,
  remove,
  resetPassword,
}: {
  records: LearnerRecord[];
  setRecords: (v: LearnerRecord[]) => void;
  attempts: Attempt[];
  open: (l: LearnerRecord) => void;
  remove: (l: LearnerRecord) => void;
  resetPassword: (l: LearnerRecord) => void;
}) {
  const [accountView, setAccountView] = useState<"regular" | "test">("regular");
  const regularCount = records.filter((learner) => !learner.testAccount).length;
  const testCount = records.filter((learner) => learner.testAccount).length;
  const visibleRecords = records.filter((learner) =>
    accountView === "test" ? learner.testAccount : !learner.testAccount,
  );
  const updateDepartment = (email: string, department: string) =>
    setRecords(
      records.map((l) => (l.email === email ? { ...l, department } : l)),
    );
  const toggleTestAccount = (email: string) =>
    setRecords(
      records.map((learner) =>
        learner.email === email
          ? { ...learner, testAccount: !learner.testAccount }
          : learner,
      ),
    );
  return (
    <>
      <PageTitle
        title="学员管理"
        desc="编辑学员部门，并查看考核结果和考试记录。"
      />
      <div className="mb-5 inline-flex rounded-2xl bg-slate-100 p-1.5">
        <button
          type="button"
          className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${accountView === "regular" ? "bg-white text-brand shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          onClick={() => setAccountView("regular")}
        >
          正式学员（{regularCount}）
        </button>
        <button
          type="button"
          className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${accountView === "test" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          onClick={() => setAccountView("test")}
        >
          测试账号（{testCount}）
        </button>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                {["学员", "部门", "考核结果", "考试次数", "操作"].map((x) => (
                  <th key={x} className="px-5 py-3">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRecords.map((l) => {
                const rows = attemptsFor(l, attempts);
                const waiting =
                  rows.length === 0 || rows.some((a) => a.status === "Pending");
                const passed = rows.some((a) => a.status === "Passed");
                return (
                  <tr
                    key={l.email}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => open(l)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{l.name}</p>
                        <button
                          type="button"
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${l.testAccount ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500 hover:bg-violet-50 hover:text-violet-700"}`}
                          title="点击切换测试账号标签"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleTestAccount(l.email);
                          }}
                        >
                          {l.testAccount ? "测试账号" : "设为测试账号"}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">{l.email}</p>
                    </td>
                    <td
                      className="px-5 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <select
                        aria-label={`编辑${l.name}的部门`}
                        title="修改学员所属部门"
                        className="input max-w-40 py-2"
                        value={
                          ["销售", "运营"].includes(l.department)
                            ? l.department
                            : "运营"
                        }
                        onChange={(e) =>
                          updateDepartment(l.email, e.target.value)
                        }
                      >
                        <option value="销售">销售</option>
                        <option value="运营">运营</option>
                      </select>
                    </td>
                    <td className="px-5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${waiting ? "bg-amber-50 text-amber-700" : passed ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
                      >
                        {waiting ? "等待结果" : passed ? "合格" : "不合格"}
                      </span>
                    </td>
                    <td className="px-5 font-semibold">{rows.length}</td>
                    <td className="px-5">
                      <div className="flex items-center gap-3">
                        <a
                          aria-label={`打印${l.name}的全部作答情况`}
                          data-tooltip="按 A4 打印或保存该学员的全部作答"
                          className="icon-action"
                          href={`/api/admin/export?learner=${encodeURIComponent(l.name)}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Download size={16} />
                        </a>
                        <button
                          aria-label="查看考试记录"
                          data-tooltip="查看考试记录"
                          className="icon-action flex items-center gap-1 text-sm font-semibold text-brand"
                          onClick={() => open(l)}
                        >
                          查看记录
                          <ChevronRight size={16} />
                        </button>
                        <button
                          aria-label="重置密码为 123456"
                          data-tooltip="重置密码为 123456"
                          className="icon-action text-amber-600 hover:bg-amber-50"
                          onClick={(event) => {
                            event.stopPropagation();
                            resetPassword(l);
                          }}
                        >
                          <Settings2 size={16} />
                        </button>
                        <button
                          aria-label="删除学员"
                          data-tooltip="删除学员"
                          className="icon-action text-rose-600 hover:bg-rose-50"
                          onClick={(event) => {
                            event.stopPropagation();
                            remove(l);
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!visibleRecords.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    {accountView === "test" ? "暂无测试账号" : "暂无正式学员"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function LearnerDetail({
  learner,
  attempts,
  quizzes,
  back,
  openResult,
}: {
  learner: LearnerRecord;
  attempts: Attempt[];
  quizzes: Quiz[];
  back: () => void;
  openResult: (a: Attempt) => void;
}) {
  const rows = attemptsFor(learner, attempts);
  const names = Object.fromEntries(quizzes.map((q) => [q.id, q.title]));
  const passed = rows.filter((a) => a.status === "Passed").length;
  return (
    <>
      <button
        className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand"
        onClick={back}
      >
        <ArrowLeft size={16} />
        返回学员管理
      </button>
      <PageTitle
        title={learner.name}
        desc={`${learner.department} · ${learner.email}`}
        action={
          <a
            className="btn-primary"
            href={`/api/admin/export?learner=${encodeURIComponent(learner.name)}`}
            target="_blank"
            rel="noreferrer"
          >
            <Download size={17} />
            保存 PDF
          </a>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat
          label="考试次数"
          value={String(rows.length)}
          sub="全部参加记录"
          icon={BookOpenCheck}
        />
        <Stat
          label="合格次数"
          value={String(passed)}
          sub={`不合格 ${rows.length - passed} 次`}
          icon={CheckCircle2}
        />
        <Stat
          label="当前结果"
          value={rows.some((a) => a.status === "Passed") ? "合格" : "不合格"}
          sub="按历史考试结果统计"
          icon={Trophy}
        />
      </div>
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-bold">参加过的考核</h2>
          <p className="mt-1 text-xs text-slate-500">点击记录可查看详细成绩</p>
        </div>
        {rows.length ? (
          <ResultTable attempts={rows} names={names} onOpen={openResult} />
        ) : (
          <div className="p-10 text-center text-sm text-slate-500">
            该学员还没有参加过考核。
          </div>
        )}
      </div>
    </>
  );
}

function AdminQuizzes({
  quizzes,
  attempts,
  learnerRecords,
  setQuizzes,
  edit,
}: {
  quizzes: Quiz[];
  attempts: Attempt[];
  learnerRecords: LearnerRecord[];
  setQuizzes: (q: Quiz[]) => void;
  edit: (q?: Quiz) => void;
}) {
  const [exportQuiz, setExportQuiz] = useState<Quiz | null>(null);
  const [exportLearners, setExportLearners] = useState<string[]>([]);
  const [exportAccountView, setExportAccountView] = useState<
    "regular" | "test"
  >("regular");
  const statsByQuiz = attempts.reduce<
    Record<
      string,
      { submissions: number; gradedSubmissions: number; totalScore: number }
    >
  >((stats, attempt) => {
    const current = stats[attempt.quizId] || {
      submissions: 0,
      gradedSubmissions: 0,
      totalScore: 0,
    };
    stats[attempt.quizId] = {
      submissions: current.submissions + 1,
      gradedSubmissions:
        current.gradedSubmissions + (attempt.status === "Pending" ? 0 : 1),
      totalScore:
        current.totalScore + (attempt.status === "Pending" ? 0 : attempt.score),
    };
    return stats;
  }, {});
  const toggle = (id: string) =>
    setQuizzes(
      quizzes.map((q) =>
        q.id === id
          ? { ...q, status: q.status === "Draft" ? "Published" : "Draft" }
          : q,
      ),
    );
  const toggleResults = (id: string) =>
    setQuizzes(
      quizzes.map((q) =>
        q.id === id ? { ...q, resultsReleased: !q.resultsReleased } : q,
      ),
    );
  return (
    <>
      <PageTitle
        title="考核管理"
        desc="创建、发布和管理实习生考核。"
        action={
          <button className="btn-primary" onClick={() => edit()}>
            <Plus size={17} />
            创建考核
          </button>
        }
      />
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                {[
                  "考核名称",
                  "状态",
                  "题目数",
                  "截止日期",
                  "提交次数",
                  "平均分",
                  "操作",
                ].map((x) => (
                  <th key={x} className="px-5 py-3">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quizzes.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="font-semibold">{q.title}</div>
                    <div className="mt-1 max-w-sm truncate text-xs text-slate-500">
                      {q.description}
                    </div>
                  </td>
                  <td className="px-5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge(q.status)}`}
                    >
                      {statusText(q.status)}
                    </span>
                  </td>
                  <td className="px-5 text-slate-600">{q.questions.length}</td>
                  <td className="px-5 text-slate-600">{fmtDate(q.deadline)}</td>
                  <td className="px-5 text-slate-600">
                    {statsByQuiz[q.id]?.submissions ?? 0}
                  </td>
                  <td className="px-5 font-semibold">
                    {statsByQuiz[q.id]?.gradedSubmissions
                      ? `${Math.round(statsByQuiz[q.id].totalScore / statsByQuiz[q.id].gradedSubmissions)}%`
                      : "—"}
                  </td>
                  <td className="px-5">
                    <div className="flex gap-1">
                      <button
                        aria-label={`打印“${q.title}”的考核结果`}
                        data-tooltip="选择学员并导出此考核结果"
                        className="icon-action"
                        onClick={() => {
                          setExportQuiz(q);
                          setExportLearners([]);
                          setExportAccountView("regular");
                        }}
                      >
                        <Download size={16} />
                      </button>
                      <button
                        aria-label="编辑考核"
                        data-tooltip="编辑考核"
                        className="icon-action"
                        onClick={() => edit(q)}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        aria-label={
                          q.status === "Draft" ? "发布考核" : "取消发布"
                        }
                        data-tooltip={
                          q.status === "Draft" ? "发布考核" : "取消发布"
                        }
                        className="icon-action"
                        onClick={() => toggle(q.id)}
                      >
                        {q.status === "Draft" ? (
                          <Eye size={16} />
                        ) : (
                          <Eye size={16} className="text-brand" />
                        )}
                      </button>
                      <button
                        aria-label={
                          q.resultsReleased
                            ? "收回答案详情"
                            : "提前发布答案详情"
                        }
                        data-tooltip={
                          q.resultsReleased
                            ? "收回答案详情"
                            : "提前发布答案详情"
                        }
                        className={`icon-action ${q.resultsReleased ? "bg-emerald-50 text-emerald-700" : ""}`}
                        onClick={() => toggleResults(q.id)}
                      >
                        <CheckCircle2 size={16} />
                      </button>
                      <button
                        aria-label="删除考核"
                        data-tooltip="删除考核"
                        className="icon-action text-rose-500 hover:bg-rose-50"
                        onClick={() =>
                          confirm(`确定删除“${q.title}”吗？`) &&
                          setQuizzes(quizzes.filter((x) => x.id !== q.id))
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Dialog.Root
        open={Boolean(exportQuiz)}
        onOpenChange={(open) => !open && setExportQuiz(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-bold">
                  选择导出学员
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-slate-500">
                  {exportQuiz?.title} · 可选择一个或多个学员
                </Dialog.Description>
              </div>
              <Dialog.Close className="icon-action" aria-label="关闭">
                <X size={18} />
              </Dialog.Close>
            </div>
            {(() => {
              const allLearnerNames = Array.from(
                new Set(
                  attempts
                    .filter((attempt) => attempt.quizId === exportQuiz?.id)
                    .map((attempt) => attempt.learner),
                ),
              ).sort((left, right) => left.localeCompare(right, "zh-CN"));
              const testAccountNames = new Set(
                learnerRecords
                  .filter((learner) => learner.testAccount)
                  .map((learner) => learner.name),
              );
              const regularNames = allLearnerNames.filter(
                (name) => !testAccountNames.has(name),
              );
              const testNames = allLearnerNames.filter((name) =>
                testAccountNames.has(name),
              );
              const learnerNames =
                exportAccountView === "test" ? testNames : regularNames;
              return learnerNames.length ? (
                <>
                  <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                    <button
                      type="button"
                      className={`rounded-lg px-3 py-2 text-sm font-bold ${exportAccountView === "regular" ? "bg-white text-brand shadow-sm" : "text-slate-500"}`}
                      onClick={() => {
                        setExportAccountView("regular");
                        setExportLearners([]);
                      }}
                    >
                      正式学员（{regularNames.length}）
                    </button>
                    <button
                      type="button"
                      className={`rounded-lg px-3 py-2 text-sm font-bold ${exportAccountView === "test" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}
                      onClick={() => {
                        setExportAccountView("test");
                        setExportLearners([]);
                      }}
                    >
                      测试账号（{testNames.length}）
                    </button>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-sm font-semibold text-slate-600">
                      已选择 {exportLearners.length} / {learnerNames.length} 人
                    </span>
                    <button
                      type="button"
                      className="text-sm font-bold text-brand"
                      onClick={() =>
                        setExportLearners(
                          exportLearners.length === learnerNames.length
                            ? []
                            : learnerNames,
                        )
                      }
                    >
                      {exportLearners.length === learnerNames.length
                        ? "取消全选"
                        : "全选"}
                    </button>
                  </div>
                  <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
                    {learnerNames.map((name) => (
                      <label
                        key={name}
                        className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-brand"
                          checked={exportLearners.includes(name)}
                          onChange={() =>
                            setExportLearners((current) =>
                              current.includes(name)
                                ? current.filter((item) => item !== name)
                                : [...current, name],
                            )
                          }
                        />
                        <span className="font-medium">{name}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!exportLearners.length || !exportQuiz}
                    onClick={() => {
                      if (!exportQuiz || !exportLearners.length) return;
                      const selected = encodeURIComponent(
                        JSON.stringify(exportLearners),
                      );
                      window.open(
                        `/api/admin/export?quizId=${encodeURIComponent(exportQuiz.id)}&selectedLearners=${selected}`,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }}
                  >
                    <Download size={17} />
                    导出所选学员 PDF
                  </button>
                </>
              ) : (
                <>
                  <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                    <button
                      type="button"
                      className={`rounded-lg px-3 py-2 text-sm font-bold ${exportAccountView === "regular" ? "bg-white text-brand shadow-sm" : "text-slate-500"}`}
                      onClick={() => {
                        setExportAccountView("regular");
                        setExportLearners([]);
                      }}
                    >
                      正式学员（{regularNames.length}）
                    </button>
                    <button
                      type="button"
                      className={`rounded-lg px-3 py-2 text-sm font-bold ${exportAccountView === "test" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}
                      onClick={() => {
                        setExportAccountView("test");
                        setExportLearners([]);
                      }}
                    >
                      测试账号（{testNames.length}）
                    </button>
                  </div>
                  <p className="mt-4 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                    当前分类没有学员提交记录。
                  </p>
                </>
              );
            })()}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function QuestionBankManagement({
  banks,
  saveBanks,
}: {
  banks: QuestionBank[];
  saveBanks: (banks: QuestionBank[]) => void;
}) {
  const [selectedId, setSelectedId] = useState(banks[0]?.id || "");
  const [questionFilter, setQuestionFilter] = useState<
    "all" | "choice" | "essay"
  >("all");
  const selected = banks.find((bank) => bank.id === selectedId) || banks[0];
  const [draft, setDraft] = useState<QuestionBank | undefined>(selected);
  useEffect(() => {
    setDraft(selected ? structuredClone(selected) : undefined);
  }, [selected?.id, banks]);
  const updateQuestion = (index: number, patch: any) => {
    if (!draft) return;
    setDraft({
      ...draft,
      questions: draft.questions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...patch } : question,
      ),
    });
  };
  const addBank = () => {
    const bank: QuestionBank = {
      id: crypto.randomUUID(),
      title: "新题库",
      description: "",
      questions: [],
    };
    saveBanks([...banks, bank]);
    setSelectedId(bank.id);
    setDraft(bank);
  };
  return (
    <>
      <PageTitle
        title="题库管理"
        desc="创建、编辑和维护选择题与策论题，创建考核时可直接导入。"
        action={
          <button className="btn-primary" onClick={addBank}>
            <Plus size={17} />
            新建题库
          </button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <aside className="card h-fit p-4">
          <h2 className="px-2 font-bold">全部题库</h2>
          <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
            {[
              ["all", "全部"],
              ["choice", "选择题"],
              ["essay", "策论题"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`rounded-lg px-2 py-2 text-xs font-bold transition ${questionFilter === value ? "bg-white text-brand shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                onClick={() =>
                  setQuestionFilter(value as "all" | "choice" | "essay")
                }
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            {banks.map((bank) => (
              <button
                key={bank.id}
                className={`w-full rounded-xl px-3 py-3 text-left ${bank.id === selected?.id ? "bg-mint text-brand" : "hover:bg-slate-50"}`}
                onClick={() => setSelectedId(bank.id)}
              >
                <p className="font-semibold">{bank.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {bank.questions.length} 道题
                </p>
              </button>
            ))}
          </div>
        </aside>
        {draft ? (
          <div className="space-y-5">
            <section className="card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-xl font-bold">编辑题库</h2>
                <div className="flex gap-2">
                  <button
                    className="btn-secondary text-rose-600"
                    onClick={() => {
                      if (!confirm(`确定删除题库“${draft.title}”吗？`)) return;
                      const next = banks.filter((bank) => bank.id !== draft.id);
                      saveBanks(next);
                      setSelectedId(next[0]?.id || "");
                    }}
                  >
                    <Trash2 size={16} />
                    删除题库
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() =>
                      saveBanks(
                        banks.map((bank) =>
                          bank.id === draft.id ? draft : bank,
                        ),
                      )
                    }
                  >
                    <Check size={16} />
                    保存题库
                  </button>
                </div>
              </div>
              <label className="label mt-5">题库名称</label>
              <input
                className="input"
                value={draft.title}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
              />
              <label className="label mt-4">说明</label>
              <textarea
                className="input"
                value={draft.description}
                onChange={(event) =>
                  setDraft({ ...draft, description: event.target.value })
                }
              />
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  className="btn-secondary"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      questions: [
                        ...draft.questions,
                        {
                          id: Date.now(),
                          type: "choice",
                          text: "",
                          options: ["", "", "", ""],
                          correct: 0,
                          explanation: "",
                        },
                      ],
                    })
                  }
                >
                  <Plus size={16} />
                  增加选择题
                </button>
                <button
                  className="btn-secondary"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      questions: [
                        ...draft.questions,
                        {
                          id: Date.now(),
                          type: "essay",
                          text: "",
                          options: [],
                          correct: 0,
                          explanation: "",
                          wordLimit: 1000,
                        },
                      ],
                    })
                  }
                >
                  <Plus size={16} />
                  增加策论题
                </button>
              </div>
            </section>
            {draft.questions.map((question, index) =>
              questionFilter === "all" ||
              (question.type ?? "choice") === questionFilter ? (
                <section className="card p-6" key={question.id}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold">
                      第 {index + 1} 题 ·{" "}
                      {(question.type ?? "choice") === "choice"
                        ? "选择题"
                        : "策论题"}
                    </h3>
                    <button
                      className="icon-action text-rose-600"
                      data-tooltip="删除此题"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          questions: draft.questions.filter(
                            (_, questionIndex) => questionIndex !== index,
                          ),
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <label className="label mt-4">题干</label>
                  <textarea
                    className="input min-h-28"
                    value={question.text}
                    onChange={(event) =>
                      updateQuestion(index, { text: event.target.value })
                    }
                  />
                  {(question.type ?? "choice") === "choice" ? (
                    <div className="mt-4 space-y-3">
                      {question.options.map((option, optionIndex) => (
                        <div
                          className="flex items-center gap-3"
                          key={optionIndex}
                        >
                          <button
                            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${question.correct === optionIndex ? "bg-brand text-white" : "bg-slate-100 text-slate-500"}`}
                            onClick={() =>
                              updateQuestion(index, { correct: optionIndex })
                            }
                          >
                            {String.fromCharCode(65 + optionIndex)}
                          </button>
                          <input
                            className="input"
                            value={option}
                            onChange={(event) =>
                              updateQuestion(index, {
                                options: question.options.map(
                                  (item, itemIndex) =>
                                    itemIndex === optionIndex
                                      ? event.target.value
                                      : item,
                                ),
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 max-w-xs">
                      <label className="label">最高字数</label>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        max="10000"
                        value={question.wordLimit || 1000}
                        onChange={(event) =>
                          updateQuestion(index, {
                            wordLimit: Math.min(
                              10000,
                              Math.max(1, +event.target.value),
                            ),
                          })
                        }
                      />
                    </div>
                  )}
                </section>
              ) : null,
            )}
          </div>
        ) : (
          <div className="card p-10 text-center text-slate-500">
            暂无题库，请先新建题库。
          </div>
        )}
      </div>
    </>
  );
}

function Builder({
  initial,
  questionBanks,
  onSave,
  onCancel,
}: {
  initial?: Quiz;
  questionBanks: QuestionBank[];
  onSave: (q: Quiz) => void;
  onCancel: () => void;
}) {
  const blankQuestion = (id: number) => ({
    id,
    type: "choice" as const,
    text: "",
    options: ["", "", "", ""],
    correct: 0,
    explanation: "",
  });
  const [q, setQ] = useState<Quiz>(
    initial || {
      id: crypto.randomUUID(),
      title: "",
      description: "",
      deadline: "2026-08-31T17:00",
      passingScore: 80,
      timeLimit: 30,
      maxAttempts: 1,
      status: "Draft",
      questions: buildDefaultQuestions(),
      showScore: true,
      answerRelease: "deadline",
      resultsReleased: false,
      requireFullscreen: true,
      detectTabSwitch: true,
      detectFullscreenExit: true,
      maxViolations: 3,
      autoSubmit: true,
    },
  );
  const [idx, setIdx] = useState(0);
  const [questionTemplate, setQuestionTemplate] = useState("mixed");
  const [selectedBank, setSelectedBank] = useState("");
  const [selectedBankQuestions, setSelectedBankQuestions] = useState<number[]>(
    [],
  );
  const [bankQuestionFilter, setBankQuestionFilter] = useState<
    "all" | "choice" | "essay"
  >("all");
  const [titleError, setTitleError] = useState("");
  const [questionError, setQuestionError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const questionSectionRef = useRef<HTMLElement>(null);
  const question = q.questions[idx];
  const choiceQuestionCount = q.questions.filter(
    (item) => (item.type ?? "choice") === "choice",
  ).length;
  const update = (patch: any) => setQ({ ...q, ...patch });
  const uq = (patch: any) =>
    setQ({
      ...q,
      questions: q.questions.map((x, i) =>
        i === idx ? { ...x, ...patch } : x,
      ),
    });
  const setQuestionCount = (count: number) => {
    const nextCount = Math.max(1, Math.min(25, count || 1));
    const questions = Array.from({ length: nextCount }, (_, i) =>
      q.questions[i] ? q.questions[i] : blankQuestion(Date.now() + i),
    );
    setQ({
      ...q,
      questions: questions.length ? questions : [blankQuestion(Date.now())],
    });
    setIdx((current) => Math.min(current, nextCount - 1));
  };
  const applyQuestionTemplate = (template: string) => {
    setQuestionTemplate(template);
    const questions =
      template === "choice"
        ? buildQuestions(12, 1)
        : template === "essay"
          ? buildEssayQuestions(12, 1)
          : template === "other"
            ? [blankQuestion(Date.now())]
            : buildDefaultQuestions();
    setQ({
      ...q,
      questions: questions.length ? questions : [blankQuestion(Date.now())],
    });
    setIdx(0);
    setQuestionError("");
  };
  const addQuestion = () => {
    if (q.questions.length >= 25) return;
    const nextQuestions = [...q.questions, blankQuestion(Date.now())];
    setQ({ ...q, questions: nextQuestions });
    setIdx(nextQuestions.length - 1);
    setQuestionTemplate("other");
    setQuestionError("");
  };
  const selectQuestionBank = (bankId: string) => {
    setSelectedBank(bankId);
    setSelectedBankQuestions([]);
  };
  const selectedQuestionBank = questionBanks.find(
    (item) => item.id === selectedBank,
  );
  const toggleBankQuestion = (questionIndex: number) => {
    setSelectedBankQuestions((current) =>
      current.includes(questionIndex)
        ? current.filter((item) => item !== questionIndex)
        : current.length < 25
          ? [...current, questionIndex]
          : current,
    );
  };
  const importSelectedQuestions = () => {
    if (!selectedQuestionBank || !selectedBankQuestions.length) return;
    const questions = [...selectedBankQuestions]
      .sort((a, b) => a - b)
      .map((questionIndex) => selectedQuestionBank.questions[questionIndex])
      .filter(Boolean)
      .slice(0, 25)
      .map((item, index) => ({
        ...item,
        id: Date.now() + index,
        options: [...item.options],
        wordLimit:
          item.type === "essay"
            ? Math.min(10000, Math.max(1, item.wordLimit || 1000))
            : item.wordLimit,
      }));
    setQ({
      ...q,
      questions: questions.length ? questions : [blankQuestion(Date.now())],
    });
    setIdx(0);
    setQuestionTemplate("other");
    setQuestionError("");
  };
  const validateAndSave = () => {
    setTitleError("");
    setQuestionError("");
    if (!q.title.trim()) {
      setTitleError("请先填写考核标题，然后才能保存。 ");
      requestAnimationFrame(() => {
        titleRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        titleRef.current?.focus();
      });
      return;
    }
    const invalidQuestion = q.questions.findIndex(
      (item) =>
        !item.text.trim() ||
        ((item.type ?? "choice") === "choice" &&
          item.options.some((option) => !option.trim())),
    );
    if (invalidQuestion !== -1) {
      setIdx(invalidQuestion);
      setQuestionError(
        `第 ${invalidQuestion + 1} 题内容不完整，请填写题目${(q.questions[invalidQuestion].type ?? "choice") === "choice" ? "和所有选项" : ""}。`,
      );
      requestAnimationFrame(() =>
        questionSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      );
      return;
    }
    onSave(q);
  };
  return (
    <>
      <PageTitle
        eyebrow="Quiz builder"
        title={initial ? "Edit quiz" : "Create a new quiz"}
        desc="设置题目数量，并自由组合选择题与策论题。"
        action={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button className="btn-primary" onClick={validateAndSave}>
              <Check size={17} />
              Save quiz
            </button>
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="font-bold">Quiz details</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Quiz title</label>
                <input
                  ref={titleRef}
                  className={`input ${titleError ? "border-rose-500 bg-rose-50 ring-2 ring-rose-100" : ""}`}
                  value={q.title}
                  onChange={(e) => {
                    update({ title: e.target.value });
                    if (e.target.value.trim()) setTitleError("");
                  }}
                  placeholder="e.g. Product Knowledge Quiz 04"
                />
                {titleError && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-rose-600">
                    <AlertTriangle size={15} />
                    {titleError}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="label">Description</label>
                <textarea
                  className="input min-h-24"
                  value={q.description}
                  onChange={(e) => update({ description: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Deadline</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={q.deadline}
                  onChange={(e) => update({ deadline: e.target.value })}
                />
              </div>
              <div>
                <label className="label">通过要求（答对题数）</label>
                <div className="flex items-center gap-3">
                  <input
                    className="input"
                    type="number"
                    min="1"
                    max={Math.max(1, choiceQuestionCount)}
                    disabled={!choiceQuestionCount}
                    value={Math.round(
                      (q.passingScore / 100) * choiceQuestionCount,
                    )}
                    onChange={(e) => {
                      const required = Math.min(
                        choiceQuestionCount,
                        Math.max(1, +e.target.value),
                      );
                      update({
                        passingScore: Math.round(
                          (required / choiceQuestionCount) * 100,
                        ),
                      });
                    }}
                  />
                  <span className="shrink-0 font-bold text-slate-500">
                    / {choiceQuestionCount} 道选择题
                  </span>
                </div>
              </div>
              {!initial && (
                <>
                  <div>
                    <label className="label">从题库导入</label>
                    <select
                      className="input"
                      value={selectedBank}
                      onChange={(e) => selectQuestionBank(e.target.value)}
                    >
                      <option value="">不使用题库</option>
                      {questionBanks.map((bank) => (
                        <option key={bank.id} value={bank.id}>
                          {bank.title}（最多导入 25 题）
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">默认题型组合</label>
                    <select
                      className="input"
                      value={questionTemplate}
                      onChange={(e) => applyQuestionTemplate(e.target.value)}
                    >
                      <option value="mixed">10 道选择题 + 2 道策论题</option>
                      <option value="choice">12 道选择题</option>
                      <option value="essay">12 道策论题</option>
                      <option value="other">其他（空白题库，逐题添加）</option>
                    </select>
                  </div>
                  {selectedQuestionBank && (
                    <div className="sm:col-span-2 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <div className="grid lg:grid-cols-[minmax(0,1fr)_250px]">
                        <div className="border-b border-slate-200 lg:border-b-0 lg:border-r">
                          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                            <div>
                              <p className="font-bold text-slate-900">
                                选择题目
                              </p>
                              <p className="text-xs text-slate-500">
                                从左侧勾选需要导入的考题，最多 25 道
                              </p>
                            </div>
                            <button
                              type="button"
                              className="text-sm font-bold text-red-700 hover:text-red-800"
                              onClick={() => setSelectedBankQuestions([])}
                            >
                              清空选择
                            </button>
                          </div>
                          <div className="flex gap-2 border-b border-slate-200 px-4 py-3">
                            {[
                              ["all", "全部"],
                              ["choice", "选择题"],
                              ["essay", "策论题"],
                            ].map(([value, label]) => (
                              <button
                                key={value}
                                type="button"
                                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${bankQuestionFilter === value ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                                onClick={() =>
                                  setBankQuestionFilter(
                                    value as "all" | "choice" | "essay",
                                  )
                                }
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          <div className="max-h-80 overflow-y-auto p-2">
                            {selectedQuestionBank.questions.map(
                              (bankQuestion, bankQuestionIndex) => {
                                if (
                                  bankQuestionFilter !== "all" &&
                                  (bankQuestion.type ?? "choice") !==
                                    bankQuestionFilter
                                )
                                  return null;
                                const checked =
                                  selectedBankQuestions.includes(
                                    bankQuestionIndex,
                                  );
                                return (
                                  <label
                                    key={`${bankQuestion.id}-${bankQuestionIndex}`}
                                    className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-3 hover:bg-slate-50"
                                  >
                                    <input
                                      type="checkbox"
                                      className="mt-1 h-4 w-4 accent-red-700"
                                      checked={checked}
                                      disabled={
                                        !checked &&
                                        selectedBankQuestions.length >= 25
                                      }
                                      onChange={() =>
                                        toggleBankQuestion(bankQuestionIndex)
                                      }
                                    />
                                    <span className="min-w-0 flex-1 text-sm text-slate-700">
                                      {bankQuestionIndex + 1}.{" "}
                                      {bankQuestion.text}
                                    </span>
                                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                                      {bankQuestion.type === "essay"
                                        ? "策论题"
                                        : "选择题"}
                                    </span>
                                  </label>
                                );
                              },
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col justify-between gap-5 bg-slate-50 p-5">
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              已选择 {selectedBankQuestions.length} / 25 题
                            </p>
                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              导入后将替换当前 Quiz 中的题目，之后仍可继续编辑。
                            </p>
                          </div>
                          <button
                            type="button"
                            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={!selectedBankQuestions.length}
                            onClick={importSelectedQuestions}
                          >
                            导入已选题目
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div>
                <label className="label">题目总数</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="25"
                  value={q.questions.length}
                  onChange={(e) => setQuestionCount(+e.target.value)}
                />
              </div>
              <div>
                <label className="label">Time limit (minutes)</label>
                <input
                  className="input"
                  type="number"
                  value={q.timeLimit}
                  onChange={(e) => update({ timeLimit: +e.target.value })}
                />
              </div>
              <div>
                <label className="label">最大答题次数</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={q.maxAttempts ?? 1}
                  onChange={(e) =>
                    update({ maxAttempts: Math.max(1, +e.target.value) })
                  }
                />
              </div>
              <div>
                <label className="label">成绩与答案开放时间</label>
                <select
                  className="input"
                  value={q.answerRelease}
                  onChange={(e) => update({ answerRelease: e.target.value })}
                >
                  <option value="immediate">提交后立即开放</option>
                  <option value="deadline">截止时间后自动开放</option>
                  <option value="never">不自动开放</option>
                </select>
              </div>
              <label className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={q.resultsReleased ?? false}
                  onChange={(e) =>
                    update({ resultsReleased: e.target.checked })
                  }
                  className="h-4 w-4 accent-[#2f6e55]"
                />
                提前发布作答情况（开启后学员可立即查看答案详情）
              </label>
            </div>
          </section>
          <section
            ref={questionSectionRef}
            className={`card scroll-mt-28 p-6 ${questionError ? "border-rose-400 ring-2 ring-rose-100" : ""}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-brand">
                  Question {idx + 1} of {q.questions.length}
                </p>
                <h2 className="mt-1 font-bold">Question content</h2>
              </div>
              <select
                className="input max-w-36"
                value={question.type ?? "choice"}
                onChange={(e) =>
                  uq({ type: e.target.value as "choice" | "essay" })
                }
              >
                <option value="choice">选择题</option>
                <option value="essay">策论题</option>
              </select>
            </div>
            {questionError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                <AlertTriangle size={16} />
                {questionError}
              </div>
            )}
            <label className="label mt-5">Question text</label>
            <textarea
              className="input min-h-24"
              value={question.text}
              onChange={(e) => {
                uq({ text: e.target.value });
                setQuestionError("");
              }}
            />
            {(question.type ?? "choice") === "choice" ? (
              <div className="mt-4 grid gap-3">
                {question.options.map((o, oi) => (
                  <div key={oi} className="flex items-center gap-3">
                    <button
                      onClick={() => uq({ correct: oi })}
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${question.correct === oi ? "bg-brand text-white" : "bg-slate-100 text-slate-500"}`}
                    >
                      {String.fromCharCode(65 + oi)}
                    </button>
                    <input
                      className="input"
                      value={o}
                      onChange={(e) => {
                        uq({
                          options: question.options.map((x, j) =>
                            j === oi ? e.target.value : x,
                          ),
                        });
                        setQuestionError("");
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                  学员将填写文字回答并看到实时字数，提交后由管理员评为合格或不合格。
                </div>
                <div className="max-w-xs">
                  <label className="label">最高字数</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    max="10000"
                    value={question.wordLimit || 1000}
                    onChange={(event) =>
                      uq({
                        wordLimit: Math.min(
                          10000,
                          Math.max(1, +event.target.value),
                        ),
                      })
                    }
                  />
                </div>
              </div>
            )}
            {(question.type ?? "choice") === "choice" && (
              <>
                <label className="label mt-5">Explanation (optional)</label>
                <textarea
                  className="input"
                  value={question.explanation}
                  onChange={(e) => uq({ explanation: e.target.value })}
                />
              </>
            )}
            <div className="mt-5 flex justify-between">
              <button
                className="btn-secondary"
                disabled={idx === 0}
                onClick={() => setIdx(idx - 1)}
              >
                <ArrowLeft size={16} />
                Previous
              </button>
              <button
                className="btn-secondary"
                disabled={
                  idx === q.questions.length - 1 && q.questions.length >= 25
                }
                onClick={() =>
                  idx === q.questions.length - 1
                    ? addQuestion()
                    : setIdx(idx + 1)
                }
              >
                {idx === q.questions.length - 1 && q.questions.length < 25
                  ? "Next（新增题目）"
                  : "Next"}
                <ArrowRight size={16} />
              </button>
            </div>
          </section>
        </div>
        <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          <section className="card border-brand/20 bg-mint p-5">
            <h3 className="font-bold text-brand">保存考核</h3>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              系统会检查标题、题目和选项是否完整。
            </p>
            <button
              className="btn-primary mt-4 w-full"
              onClick={validateAndSave}
            >
              <Check size={17} />
              保存考核
            </button>
          </section>
          <section className="card p-5">
            <h3 className="font-bold">Questions</h3>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {q.questions.map((x, i) => (
                <button
                  onClick={() => setIdx(i)}
                  key={x.id}
                  className={`h-10 rounded-lg text-sm font-bold ${idx === i ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-mint"}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              className="btn-secondary mt-4 w-full"
              disabled={q.questions.length >= 25}
              onClick={addQuestion}
            >
              <Plus size={16} />
              {q.questions.length >= 25 ? "已达到 25 题上限" : "添加下一题"}
            </button>
          </section>
          <section className="card p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={19} className="text-brand" />
              <h3 className="font-bold">Focus mode</h3>
            </div>
            <div className="mt-4 space-y-3">
              {[
                ["requireFullscreen", "Require fullscreen"],
                ["detectTabSwitch", "Detect tab switching"],
                ["detectFullscreenExit", "Detect fullscreen exit"],
                ["autoSubmit", "Auto-submit at limit"],
              ].map(([k, l]) => (
                <label
                  className="flex items-center justify-between text-sm"
                  key={k}
                >
                  {l}
                  <input
                    type="checkbox"
                    checked={(q as any)[k]}
                    onChange={(e) => update({ [k]: e.target.checked })}
                    className="h-4 w-4 accent-[#2f6e55]"
                  />
                </label>
              ))}
              <div>
                <label className="label mt-4">Maximum violations</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={q.maxViolations}
                  onChange={(e) => update({ maxViolations: +e.target.value })}
                />
              </div>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

function LearnerDashboard({
  quizzes,
  attempts,
  start,
  setView,
}: {
  quizzes: Quiz[];
  attempts: Attempt[];
  start: (q: Quiz) => void;
  setView: (v: View) => void;
}) {
  const learnerAttempts = attempts.filter(
    (attempt) => attempt.learner === activeLearnerName,
  );
  const publishedQuizzes = quizzes.filter(
    (quiz) => quiz.status === "Published",
  );
  const completedQuizIds = new Set(
    learnerAttempts.map((attempt) => attempt.quizId),
  );
  const completedCount = publishedQuizzes.filter((quiz) =>
    completedQuizIds.has(quiz.id),
  ).length;
  const completionRate = publishedQuizzes.length
    ? Math.round((completedCount / publishedQuizzes.length) * 100)
    : 0;
  const waitingCount = publishedQuizzes.length - completedCount;
  return (
    <>
      <PageTitle
        eyebrow={new Intl.DateTimeFormat("zh-CN", {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "long",
        }).format(new Date())}
        title={`欢迎回来，${activeLearnerName || "学员"}`}
        desc={`保持学习进度，你还有 ${waitingCount} 项考核待完成。`}
      />
      <div className="mb-7 rounded-2xl bg-brand p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-white/15 p-3">
            <Bell size={21} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">
              最新考核
            </p>
            <h2 className="mt-1 text-xl font-bold">
              {publishedQuizzes[0]?.title || "暂无可参加的考核"}
            </h2>
            <p className="mt-1 text-sm text-emerald-100">
              {publishedQuizzes[0]
                ? `请在 ${fmtDate(publishedQuizzes[0].deadline)} 前完成。`
                : "管理员发布新考核后会显示在这里。"}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">可参加的考核</h2>
        <button
          className="text-sm font-semibold text-brand"
          onClick={() => setView("quizzes")}
        >
          查看全部
        </button>
      </div>
      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        {quizzes
          .filter((q) => q.status === "Published")
          .map((q) => (
            <article className="card p-6" key={q.id}>
              <div className="flex justify-between">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${completedQuizIds.has(q.id) ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}
                >
                  {completedQuizIds.has(q.id) ? "已参加" : "未开始"}
                </span>
                <MoreHorizontal className="text-slate-400" size={20} />
              </div>
              <h3 className="mt-5 text-xl font-bold">{q.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {q.description}
              </p>
              <div className="my-5 flex gap-5 border-y border-slate-100 py-4 text-sm text-slate-600">
                <span className="flex items-center gap-1.5">
                  <BookOpenCheck size={16} />
                  {q.questions.length} 道题
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock3 size={16} />
                  {q.timeLimit} 分钟
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">截止日期</p>
                  <p className="mt-1 text-sm font-semibold">
                    {fmtDate(q.deadline)}
                  </p>
                </div>
                <button
                  className="btn-primary"
                  disabled={
                    attempts.filter(
                      (a) =>
                        a.quizId === q.id && a.learner === activeLearnerName,
                    ).length >= (q.maxAttempts ?? 1)
                  }
                  onClick={() => start(q)}
                >
                  {attempts.filter(
                    (a) => a.quizId === q.id && a.learner === activeLearnerName,
                  ).length >= (q.maxAttempts ?? 1)
                    ? "已达次数上限"
                    : "开始考核"}{" "}
                  <ChevronRight size={17} />
                </button>
              </div>
            </article>
          ))}
      </div>
      <section className="card mt-7 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">我的进度</h2>
          <button
            className="text-sm font-semibold text-brand"
            onClick={() => setView("results")}
          >
            查看成绩
          </button>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <div>
            <p className="text-2xl font-bold">{completedCount}</p>
            <p className="text-sm text-slate-500">已完成考核</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{learnerAttempts.length}</p>
            <p className="text-sm text-slate-500">提交次数</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{completionRate}%</p>
            <p className="text-sm text-slate-500">完成率</p>
          </div>
        </div>
      </section>
    </>
  );
}

function EssayPrompt({ text, numbered }: { text: string; numbered?: number }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-3 text-left text-slate-800">
      {lines.map((line, index) => {
        const value = line.trim();
        if (!value) return <div className="h-2" key={index} />;
        if (index === 0 && value === "州经理选拔策论题")
          return (
            <h2 className="text-2xl font-bold text-slate-950" key={index}>
              {numbered ? `${numbered}. ` : ""}
              {value}
            </h2>
          );
        if (["题目", "背景材料", "策论要求"].includes(value))
          return (
            <h3
              className="border-b border-slate-200 pb-2 pt-2 text-xl font-bold text-slate-950"
              key={index}
            >
              {value}
            </h3>
          );
        if (/^[一二三四五六]、/.test(value))
          return (
            <h4 className="pt-2 text-lg font-bold text-brand" key={index}>
              {value}
            </h4>
          );
        if (value.startsWith("•"))
          return (
            <div
              className={`${line.startsWith("  ") ? "ml-8" : "ml-3"} flex gap-3 leading-7`}
              key={index}
            >
              <span className="font-bold text-brand">•</span>
              <span>{value.slice(1).trim()}</span>
            </div>
          );
        if (/^\d+\./.test(value))
          return (
            <p className="pl-1 font-medium leading-7" key={index}>
              {value}
            </p>
          );
        return (
          <p
            className={`${line.startsWith("   ") ? "pl-8 text-slate-600" : ""} leading-7`}
            key={index}
          >
            {value}
          </p>
        );
      })}
    </div>
  );
}

function QuizTake({
  quiz,
  onComplete,
  onExit,
}: {
  quiz: Quiz;
  onComplete: (a: Attempt) => Promise<{ ok: boolean; error?: string }>;
  onExit: () => void;
}) {
  const [presentation] = useState(() => {
    const shuffle = <T,>(items: T[]) => {
      const next = [...items];
      for (let index = next.length - 1; index > 0; index--) {
        const target = Math.floor(Math.random() * (index + 1));
        [next[index], next[target]] = [next[target], next[index]];
      }
      return next;
    };
    const choiceQuestionOrder = shuffle(
      quiz.questions
        .map((question, index) => ({ question, index }))
        .filter(({ question }) => (question.type ?? "choice") === "choice")
        .map(({ index }) => index),
    );
    const essayQuestionOrder = quiz.questions
      .map((question, index) => ({ question, index }))
      .filter(({ question }) => question.type === "essay")
      .map(({ index }) => index);
    const questionOrder = [...choiceQuestionOrder, ...essayQuestionOrder];
    const optionOrders: Record<number, number[]> = {};
    const questions = questionOrder.map((originalQuestionIndex, index) => {
      const question = quiz.questions[originalQuestionIndex];
      if ((question.type ?? "choice") !== "choice") return { ...question };
      const optionOrder = shuffle(question.options.map((_, option) => option));
      optionOrders[index] = optionOrder;
      return {
        ...question,
        options: optionOrder.map((option) => question.options[option]),
        correct: optionOrder.indexOf(question.correct),
      };
    });
    return { questions, questionOrder, optionOrders };
  });
  const randomizedQuiz = { ...quiz, questions: presentation.questions };
  const [answers, setAnswers] = useState<Record<number, number | string>>({});
  const [idx, setIdx] = useState(0);
  const [flags, setFlags] = useState<number[]>([]);
  const [seconds, setSeconds] = useState(randomizedQuiz.timeLimit * 60);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<
    "saving" | "saved" | "failed"
  >("saving");
  const [violations, setViolations] = useState({ tab: 0, fs: 0 });
  const finishingRef = useRef(false);
  const answered = randomizedQuiz.questions.filter((question, index) => {
    const answer = answers[index];
    return (question.type ?? "choice") === "essay"
      ? typeof answer === "string" && answer.trim().length > 0
      : typeof answer === "number";
  }).length;
  useEffect(() => {
    setAutosaveStatus("saving");
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/attempts/draft", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quizId: quiz.id,
            answers,
            questionOrder: presentation.questionOrder,
            optionOrders: presentation.optionOrders,
            questionSnapshot: randomizedQuiz.questions,
            timeRemaining: seconds,
            tabSwitches: violations.tab,
            fullscreenExits: violations.fs,
          }),
        });
        setAutosaveStatus(response.ok ? "saved" : "failed");
      } catch {
        setAutosaveStatus("failed");
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [answers, violations, quiz.id]);
  const finish = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setSubmitting(true);
    setSubmitError("");
    const correct = randomizedQuiz.questions.filter(
      (q, i) => (q.type ?? "choice") === "choice" && answers[i] === q.correct,
    ).length;
    const choiceTotal = randomizedQuiz.questions.filter(
      (question) => (question.type ?? "choice") === "choice",
    ).length;
    const score = choiceTotal ? Math.round((correct / choiceTotal) * 100) : 0;
    const hasEssay = randomizedQuiz.questions.some(
      (question) => question.type === "essay",
    );
    const completedAttempt: Attempt = {
      id: crypto.randomUUID(),
      quizId: quiz.id,
      learner: activeLearnerName || "未知学员",
      date: new Date().toISOString(),
      score,
      correct,
      total: choiceTotal,
      timeUsed: Math.max(1, Math.ceil((quiz.timeLimit * 60 - seconds) / 60)),
      answers,
      questionOrder: presentation.questionOrder,
      optionOrders: presentation.optionOrders,
      questionSnapshot: randomizedQuiz.questions,
      status: hasEssay
        ? "Pending"
        : score >= quiz.passingScore
          ? "Passed"
          : "Failed",
      tabSwitches: violations.tab,
      fullscreenExits: violations.fs,
    };
    const result = await onComplete(completedAttempt);
    if (!result.ok) {
      finishingRef.current = false;
      setSubmitting(false);
      setSubmitError(result.error || "提交失败，请再次提交或联系管理员。");
      setSubmitOpen(true);
      return;
    }
    if (document.fullscreenElement)
      await document.exitFullscreen().catch(() => {});
  };
  useEffect(() => {
    const t = setInterval(
      () =>
        setSeconds((s) => {
          if (s <= 1) {
            clearInterval(t);
            setTimeout(finish, 0);
            return 0;
          }
          return s - 1;
        }),
      1000,
    );
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    let primed = false;
    const visible = () => {
      if (document.hidden && quiz.detectTabSwitch && primed)
        setViolations((v) => ({ ...v, tab: v.tab + 1 }));
    };
    const fs = () => {
      if (!document.fullscreenElement && quiz.detectFullscreenExit && primed)
        setViolations((v) => ({ ...v, fs: v.fs + 1 }));
    };
    const timer = setTimeout(() => (primed = true), 1500);
    document.addEventListener("visibilitychange", visible);
    document.addEventListener("fullscreenchange", fs);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visible);
      document.removeEventListener("fullscreenchange", fs);
    };
  }, [quiz]);
  useEffect(() => {
    if (quiz.autoSubmit && violations.tab + violations.fs >= quiz.maxViolations)
      finish();
  }, [violations]);
  const q = randomizedQuiz.questions[idx];
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand">
                Assessment in progress
              </p>
              <h1 className="font-bold">{quiz.title}</h1>
              <p
                className={`mt-1 text-xs ${autosaveStatus === "failed" ? "text-rose-600" : "text-slate-400"}`}
              >
                {autosaveStatus === "saving"
                  ? "正在保存作答…"
                  : autosaveStatus === "saved"
                    ? "作答已自动保存"
                    : "自动保存暂时失败，系统将继续重试"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div
                className={`rounded-xl px-4 py-2 text-right ${seconds < 300 ? "bg-rose-50 text-rose-700" : "bg-slate-100"}`}
              >
                <p className="text-[10px] font-bold uppercase">Time left</p>
                <p className="font-mono text-xl font-bold">{time}</p>
              </div>
              <button
                className="btn-primary"
                onClick={() => setSubmitOpen(true)}
              >
                Submit quiz
              </button>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{
                  width: `${(answered / randomizedQuiz.questions.length) * 100}%`,
                }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {answered} / {randomizedQuiz.questions.length} 已回答 ·{" "}
              {Math.round((answered / randomizedQuiz.questions.length) * 100)}%
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-7xl gap-6 p-5 lg:grid-cols-[250px_1fr]">
        <aside className="card h-fit p-5 lg:sticky lg:top-32">
          <div className="flex justify-between">
            <h2 className="font-bold">Questions</h2>
            <span className="text-xs text-slate-400">
              {flags.length} flagged
            </span>
          </div>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {randomizedQuiz.questions.map((x, i) => {
              const answer = answers[i];
              const a =
                  (x.type ?? "choice") === "essay"
                    ? typeof answer === "string" && answer.trim().length > 0
                    : typeof answer === "number",
                f = flags.includes(i);
              return (
                <button
                  key={x.id}
                  onClick={() => setIdx(i)}
                  className={`relative grid h-9 place-items-center rounded-lg text-xs font-bold ${idx === i ? "ring-2 ring-brand ring-offset-2" : a ? "bg-brand text-white" : "bg-slate-100 text-slate-500"}`}
                >
                  {a ? <Check size={14} /> : i + 1}
                  {f && (
                    <Flag
                      size={9}
                      fill="currentColor"
                      className="absolute -right-1 -top-1 text-amber-500"
                    />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <i className="h-3 w-3 rounded bg-brand" />
              Answered
            </div>
            <div className="flex items-center gap-2">
              <i className="h-3 w-3 rounded bg-slate-100" />
              Unanswered
            </div>
            <div className="flex items-center gap-2">
              <Flag size={12} className="text-amber-500" />
              Flagged
            </div>
          </div>
          {violations.tab + violations.fs > 0 && (
            <div className="mt-5 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle size={14} />
                Warning {violations.tab + violations.fs} of {quiz.maxViolations}
              </div>
              <p className="mt-1">Stay on this page and in fullscreen mode.</p>
            </div>
          )}
        </aside>
        <section className="card min-h-[560px] p-6 md:p-10">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[.12em] text-brand">
              Question {idx + 1} of {randomizedQuiz.questions.length}
            </p>
            <button
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${flags.includes(idx) ? "bg-amber-50 text-amber-700" : "text-slate-500 hover:bg-slate-50"}`}
              onClick={() =>
                setFlags(
                  flags.includes(idx)
                    ? flags.filter((x) => x !== idx)
                    : [...flags, idx],
                )
              }
            >
              <Flag
                size={15}
                fill={flags.includes(idx) ? "currentColor" : "none"}
              />
              Flag for review
            </button>
          </div>
          {(q.type ?? "choice") === "essay" ? (
            <div className="mt-7 max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 md:p-8">
              <EssayPrompt text={q.text} />
            </div>
          ) : (
            <h2 className="mt-7 max-w-3xl text-2xl font-semibold leading-9">
              {q.text}
            </h2>
          )}
          {(q.type ?? "choice") === "choice" ? (
            <div className="mt-8 grid gap-3">
              {q.options.map((o, i) => (
                <button
                  key={i}
                  onClick={() => setAnswers({ ...answers, [idx]: i })}
                  className={`flex items-center gap-4 rounded-xl border p-4 text-left transition ${answers[idx] === i ? "border-brand bg-mint ring-1 ring-brand" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${answers[idx] === i ? "bg-brand text-white" : "bg-slate-100 text-slate-600"}`}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="font-medium">{o}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-8">
              <textarea
                className="input min-h-64 resize-y text-base leading-7"
                maxLength={q.wordLimit || 1000}
                value={typeof answers[idx] === "string" ? answers[idx] : ""}
                onChange={(e) =>
                  setAnswers({ ...answers, [idx]: e.target.value })
                }
                placeholder={`请在这里填写回答（最多 ${q.wordLimit || 1000} 字）……`}
              />
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-slate-500">
                  最多 {q.wordLimit || 1000} 字
                </span>
                <span
                  className={`font-bold ${(typeof answers[idx] === "string" ? answers[idx].trim().length : 0) >= 180 ? "text-emerald-700" : "text-slate-500"}`}
                >
                  当前字数：
                  {typeof answers[idx] === "string"
                    ? answers[idx].trim().length
                    : 0}
                </span>
              </div>
            </div>
          )}
          <div className="mt-10 flex justify-between border-t border-slate-100 pt-6">
            <button
              className="btn-secondary"
              disabled={idx === 0}
              onClick={() => setIdx(idx - 1)}
            >
              <ArrowLeft size={16} />
              Previous
            </button>
            {idx < randomizedQuiz.questions.length - 1 ? (
              <button className="btn-primary" onClick={() => setIdx(idx + 1)}>
                Next
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={() => setSubmitOpen(true)}
              >
                Review & submit
              </button>
            )}
          </div>
        </section>
      </main>
      <Dialog.Root open={submitOpen} onOpenChange={setSubmitOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-600">
              <AlertTriangle />
            </div>
            <Dialog.Title className="mt-5 text-xl font-bold">
              Submit your quiz?
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 text-slate-500">
              You have answered{" "}
              <strong className="text-slate-800">
                {answered} / {quiz.questions.length}
              </strong>{" "}
              题，仍有 {quiz.questions.length - answered} 题未回答。
            </Dialog.Description>
            {submitError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700">
                <strong>提交失败。</strong>
                <br />
                {submitError} 请检查网络后再次提交；如果仍然失败，请联系管理员。
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close className="btn-secondary">
                Continue quiz
              </Dialog.Close>
              <button
                className="btn-primary disabled:cursor-wait disabled:opacity-60"
                disabled={submitting}
                onClick={() => void finish()}
              >
                {submitting
                  ? "正在提交…"
                  : submitError
                    ? "再次提交"
                    : "Submit quiz"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function ResultDetail({
  attempt,
  quiz,
  back,
  admin = false,
  onGrade,
}: {
  attempt: Attempt;
  quiz: Quiz;
  back: () => void;
  admin?: boolean;
  onGrade?: (
    questionIndex: number,
    grade: "Excellent" | "Passed" | "Failed" | undefined,
    comment: string,
    grader: string,
  ) => Promise<void>;
}) {
  const [reviewTab, setReviewTab] = useState<"choice" | "essay">("choice");
  const [essayComments, setEssayComments] = useState<Record<number, string>>(
    attempt.essayComments || {},
  );
  const [essayGraders, setEssayGraders] = useState<Record<number, string>>(
    attempt.essayGraders || {},
  );
  useEffect(() => {
    setEssayComments(attempt.essayComments || {});
    setEssayGraders(attempt.essayGraders || {});
  }, [attempt.id, attempt.essayComments, attempt.essayGraders]);
  const canReview =
    admin ||
    quiz.resultsReleased ||
    quiz.answerRelease === "immediate" ||
    (quiz.answerRelease === "deadline" &&
      new Date().getTime() >= new Date(quiz.deadline).getTime());
  const reviewQuestions = attempt.questionSnapshot || quiz.questions;
  const choiceQuestions = reviewQuestions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => (question.type ?? "choice") === "choice");
  const essayQuestions = reviewQuestions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => question.type === "essay");
  const visibleReviewQuestions =
    reviewTab === "choice" ? choiceQuestions : essayQuestions;
  useEffect(() => {
    setReviewTab(choiceQuestions.length ? "choice" : "essay");
  }, [attempt.id]);
  const visibleStatus = admin ? attempt.status : "Pending";
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button
          className="flex items-center gap-2 text-sm font-semibold text-slate-500"
          onClick={back}
        >
          <ArrowLeft size={16} />
          返回考核结果
        </button>
        {admin && (
          <a
            className="btn-primary"
            href={`/api/admin/export?attemptId=${encodeURIComponent(attempt.id)}`}
            target="_blank"
            rel="noreferrer"
          >
            <Download size={17} />
            导出 PDF
          </a>
        )}
      </div>
      <div className="mx-auto max-w-4xl">
        <section className="card overflow-hidden">
          <div
            className={`p-8 text-center ${visibleStatus === "Passed" ? "bg-[#edf7f1]" : visibleStatus === "Pending" ? "bg-amber-50" : "bg-rose-50"}`}
          >
            <div
              className={`mx-auto grid h-16 w-16 place-items-center rounded-full bg-white ${visibleStatus === "Passed" ? "text-brand" : visibleStatus === "Pending" ? "text-amber-600" : "text-rose-600"}`}
            >
              {visibleStatus === "Passed" ? (
                <Trophy size={30} />
              ) : visibleStatus === "Pending" ? (
                <Clock3 size={30} />
              ) : (
                <AlertTriangle size={30} />
              )}
            </div>
            <p className="mt-4 text-sm font-bold tracking-widest">
              {admin ? statusText(attempt.status) : "已提交"}
            </p>
            <h1 className="mt-2 text-5xl font-bold">
              {admin
                ? attempt.status === "Pending"
                  ? "—"
                  : `${attempt.score}%`
                : "等待管理评分"}
            </h1>
            <p className="mt-2 text-slate-600">
              {admin
                ? attempt.status === "Pending"
                  ? `策论题评分完成后生成最终成绩 · ${quiz.title}`
                  : `答对 ${attempt.correct} / ${attempt.total} 题 · ${quiz.title}`
                : quiz.title}
            </p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100 p-6 text-center">
            <div>
              <p className="text-xl font-bold">{attempt.timeUsed} 分钟</p>
              <p className="text-xs text-slate-500">考试用时</p>
            </div>
            <div>
              <p className="text-xl font-bold">
                {attempt.tabSwitches + attempt.fullscreenExits}
              </p>
              <p className="text-xs text-slate-500">违规次数</p>
            </div>
            <div>
              <p className="text-xl font-bold">{fmtDate(attempt.date)}</p>
              <p className="text-xs text-slate-500">提交日期</p>
            </div>
          </div>
        </section>
        {canReview ? (
          <section className="card mt-6 p-6">
            <h2 className="text-xl font-bold">答案详情</h2>
            <div className="mt-4 flex gap-2 border-b border-slate-200 pb-4">
              <button
                className={`rounded-xl px-4 py-2.5 text-sm font-bold ${reviewTab === "choice" ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                disabled={!choiceQuestions.length}
                onClick={() => setReviewTab("choice")}
              >
                选择题（{choiceQuestions.length}）
              </button>
              <button
                className={`rounded-xl px-4 py-2.5 text-sm font-bold ${reviewTab === "essay" ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                disabled={!essayQuestions.length}
                onClick={() => setReviewTab("essay")}
              >
                策论题（{essayQuestions.length}）
              </button>
            </div>
            {Object.keys(attempt.answers).length === 0 && (
              <p className="mt-2 text-sm text-amber-700">
                此历史记录未保存学员的逐题答案，以下仍展示全部题目及正确答案。
              </p>
            )}
            <div className="mt-5 space-y-5">
              {visibleReviewQuestions.map(({ question: q, index: i }) => {
                const a = attempt.answers[i];
                const ok = a === q.correct;
                return (
                  <div key={q.id} className="border-b border-slate-100 pb-5">
                    {(q.type ?? "choice") === "essay" ? (
                      <div className="rounded-xl border border-slate-200 p-5">
                        <EssayPrompt text={q.text} numbered={i + 1} />
                      </div>
                    ) : (
                      <p className="font-semibold">
                        {i + 1}. {q.text}
                      </p>
                    )}
                    {(q.type ?? "choice") === "essay" ? (
                      <>
                        <div className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                          {typeof a === "string" && a.trim() ? a : "学员未作答"}
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          回答字数：
                          {typeof a === "string" ? a.trim().length : 0}
                        </p>
                        {admin && onGrade && (
                          <div className="mt-4">
                            <label className="label">批改人姓名</label>
                            <input
                              className="input mb-4"
                              value={essayGraders[i] || ""}
                              onChange={(event) =>
                                setEssayGraders({
                                  ...essayGraders,
                                  [i]: event.target.value,
                                })
                              }
                              placeholder="请输入批改人姓名"
                            />
                            <label className="label">批改意见</label>
                            <textarea
                              className="input min-h-24"
                              value={essayComments[i] || ""}
                              onChange={(event) =>
                                setEssayComments({
                                  ...essayComments,
                                  [i]: event.target.value,
                                })
                              }
                              placeholder="请输入对这道策论题的批改意见（可选）"
                            />
                            <p className="mt-1 text-xs text-slate-500">
                              可以单独保存意见；点击评分按钮时也会同时保存。
                            </p>
                            <button
                              className="btn-secondary mt-3"
                              onClick={() =>
                                void onGrade(
                                  i,
                                  undefined,
                                  essayComments[i] || "",
                                  essayGraders[i] || "",
                                )
                              }
                            >
                              <Check size={16} />
                              保存批改意见
                            </button>
                          </div>
                        )}
                        {admin && (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-600">
                              管理员评分：
                            </span>
                            {admin && onGrade ? (
                              <>
                                <button
                                  className={`rounded-lg px-3 py-2 text-sm font-bold ${attempt.essayGrades?.[i] === "Excellent" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                                  onClick={() =>
                                    void onGrade(
                                      i,
                                      "Excellent",
                                      essayComments[i] || "",
                                      essayGraders[i] || "",
                                    )
                                  }
                                >
                                  优秀
                                </button>
                                <button
                                  className={`rounded-lg px-3 py-2 text-sm font-bold ${attempt.essayGrades?.[i] === "Passed" ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"}`}
                                  onClick={() =>
                                    void onGrade(
                                      i,
                                      "Passed",
                                      essayComments[i] || "",
                                      essayGraders[i] || "",
                                    )
                                  }
                                >
                                  合格
                                </button>
                                <button
                                  className={`rounded-lg px-3 py-2 text-sm font-bold ${attempt.essayGrades?.[i] === "Failed" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100"}`}
                                  onClick={() =>
                                    void onGrade(
                                      i,
                                      "Failed",
                                      essayComments[i] || "",
                                      essayGraders[i] || "",
                                    )
                                  }
                                >
                                  不合格
                                </button>
                              </>
                            ) : (
                              <span className="text-sm font-bold text-amber-700">
                                {attempt.essayGrades?.[i]
                                  ? statusText(attempt.essayGrades[i])
                                  : "待评分"}
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <p
                          className={`mt-2 text-sm ${admin ? (ok ? "text-emerald-700" : "text-rose-600") : "text-slate-700"}`}
                        >
                          学员答案：
                          {typeof a === "number" ? q.options[a] : "未记录"}
                        </p>
                        {admin && !ok && (
                          <p className="mt-1 text-sm text-emerald-700">
                            正确答案：{q.options[q.correct]}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <div className="card mt-6 p-6 text-center">
            <ShieldCheck className="mx-auto text-slate-400" />
            <h2 className="mt-3 font-bold">答案详情暂未开放</h2>
            <p className="mt-1 text-sm text-slate-500">
              正确答案将在考核截止后开放。
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export default function App() {
  const [browserCompatibility, setBrowserCompatibility] = useState<
    "checking" | "supported" | "blocked"
  >("checking");
  const [role, setRole] = useState<Role | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [learnerRecords, setLearnerRecords] =
    useState<LearnerRecord[]>(learners);
  const [announcement, setAnnouncement] = useState("");
  const [announcementDraft, setAnnouncementDraft] = useState("");
  const [announcementPersistent, setAnnouncementPersistent] = useState(false);
  const [announcementPersistentDraft, setAnnouncementPersistentDraft] =
    useState(false);
  const [announceEditor, setAnnounceEditor] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [resultAccountView, setResultAccountView] = useState<
    "regular" | "test"
  >("regular");
  const [resultBack, setResultBack] = useState<View>("results");
  const [quizzes, setQuizzes] = useState(seedQuizzes);
  const [questionBanks, setQuestionBanks] = useState(seedQuestionBanks);
  const [attempts, setAttempts] = useState(seedAttempts);
  const [active, setActive] = useState<Quiz>();
  const [edit, setEdit] = useState<Quiz>();
  const [selected, setSelected] = useState<Attempt>();
  const [selectedLearner, setSelectedLearner] = useState<LearnerRecord>();
  const [saveToast, setSaveToast] = useState(false);
  const saveToastTimer = useRef<number | undefined>(undefined);
  const hydrated = useRef(false);
  useEffect(() => {
    const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
    let hasLocalStorage = false;
    try {
      const testKey = "redbridge-browser-test";
      localStorage.setItem(testKey, "1");
      localStorage.removeItem(testKey);
      hasLocalStorage = true;
    } catch {
      hasLocalStorage = false;
    }
    setBrowserCompatibility(
      !isWeChat && hasLocalStorage ? "supported" : "blocked",
    );
  }, []);
  const showSaveSuccess = () => {
    setSaveToast(true);
    if (saveToastTimer.current) window.clearTimeout(saveToastTimer.current);
    saveToastTimer.current = window.setTimeout(() => setSaveToast(false), 2500);
  };
  useEffect(() => {
    if (browserCompatibility !== "supported") return;
    const load = async () => {
      try {
        const [stateResponse, attemptsResponse, sessionResponse] =
          await Promise.all([
            fetch("/api/state", { cache: "no-store" }),
            fetch("/api/attempts", { cache: "no-store" }),
            fetch("/api/auth/session", { cache: "no-store" }),
          ]);
        let s: any = null;
        let savedAttempts: Attempt[] = [];
        let attemptsLoadedFromBackend = false;
        if (stateResponse.ok) s = await stateResponse.json();
        if (attemptsResponse.ok) {
          attemptsLoadedFromBackend = true;
          const remoteAttempts: Attempt[] = await attemptsResponse.json();
          savedAttempts = remoteAttempts;
        }
        if (!s) {
          const raw = localStorage.getItem("redbridge-state");
          s = raw ? JSON.parse(raw) : {};
        }
        setQuizzes(
          (s.quizzes || seedQuizzes).map((q: Quiz) => ({
            ...q,
            maxAttempts: q.maxAttempts ?? 1,
            resultsReleased: q.resultsReleased ?? false,
          })),
        );
        setQuestionBanks(s.questionBanks || seedQuestionBanks);
        if (!attemptsLoadedFromBackend && !savedAttempts.length)
          savedAttempts = s.attempts || seedAttempts;
        setAttempts(
          savedAttempts.map((a) => {
            const demo = seedAttempts.find((d) => d.id === a.id);
            return Object.keys(a.answers || {}).length === 0 && demo
              ? { ...a, answers: demo.answers }
              : a;
          }),
        );
        setLearnerRecords(s.learnerRecords || learners);
        setAnnouncement(s.announcement || "");
        setAnnouncementPersistent(s.announcementPersistent || false);
        setAccounts(
          (s.accounts || [])
            .filter((a: any) => a.role !== "admin")
            .map((a: any) => ({
              name: a.name,
              username: a.username || a.email,
              password: a.password,
            })),
        );
        if (sessionResponse.ok) {
          const session: {
            role: Role;
            name: string;
            username: string;
          } = await sessionResponse.json();
          activeLearnerName = session.role === "learner" ? session.name : "";
          setRole(session.role);
          setView("dashboard");
          const currentAnnouncement = s.announcement || "";
          const persistent = s.announcementPersistent || false;
          const seen = localStorage.getItem(
            `redbridge-announcement-seen:${session.name}`,
          );
          if (
            session.role === "learner" &&
            currentAnnouncement &&
            (persistent || seen !== currentAnnouncement)
          )
            setShowAnnouncement(true);
        }
      } catch {
        const raw = localStorage.getItem("redbridge-state");
        if (raw) {
          const s = JSON.parse(raw);
          setQuizzes(s.quizzes || seedQuizzes);
          setQuestionBanks(s.questionBanks || seedQuestionBanks);
          setAttempts(s.attempts || seedAttempts);
          setLearnerRecords(s.learnerRecords || learners);
          setAnnouncement(s.announcement || "");
          setAnnouncementPersistent(s.announcementPersistent || false);
          setAccounts(s.accounts || []);
        }
      } finally {
        hydrated.current = true;
      }
    };
    load();
  }, [browserCompatibility]);
  useEffect(() => {
    if (!hydrated.current) return;
    const state = {
      quizzes,
      questionBanks,
      learnerRecords,
      announcement,
      announcementPersistent,
    };
    localStorage.setItem(
      "redbridge-state",
      JSON.stringify({ ...state, attempts }),
    );
  }, [
    quizzes,
    questionBanks,
    attempts,
    accounts,
    learnerRecords,
    announcement,
    announcementPersistent,
  ]);
  const saveSharedState = async (
    nextQuizzes: Quiz[],
    nextLearners: LearnerRecord[],
    nextAnnouncement: string,
    nextAnnouncementPersistent = announcementPersistent,
    nextQuestionBanks = questionBanks,
  ) => {
    const response = await fetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quizzes: nextQuizzes,
        questionBanks: nextQuestionBanks,
        learnerRecords: nextLearners,
        announcement: nextAnnouncement,
        announcementPersistent: nextAnnouncementPersistent,
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "后端保存失败");
    }
  };
  const updateQuizzesAndSync = (next: Quiz[]) => {
    const previous = quizzes;
    setQuizzes(next);
    void saveSharedState(next, learnerRecords, announcement)
      .then(showSaveSuccess)
      .catch((error) => {
        setQuizzes(previous);
        alert(`${error.message}，本次考核修改已撤销。`);
      });
  };
  const updateLearnersAndSync = (next: LearnerRecord[]) => {
    const previous = learnerRecords;
    setLearnerRecords(next);
    void saveSharedState(quizzes, next, announcement)
      .then(showSaveSuccess)
      .catch((error) => {
        setLearnerRecords(previous);
        alert(`${error.message}，本次部门修改已撤销。`);
      });
  };
  const updateQuestionBanksAndSync = (next: QuestionBank[]) => {
    const previous = questionBanks;
    setQuestionBanks(next);
    void saveSharedState(
      quizzes,
      learnerRecords,
      announcement,
      announcementPersistent,
      next,
    )
      .then(showSaveSuccess)
      .catch((error) => {
        setQuestionBanks(previous);
        alert(`${error.message}，本次题库修改已撤销。`);
      });
  };
  const shouldShowCurrentAnnouncement = () =>
    Boolean(
      announcement &&
      (announcementPersistent ||
        localStorage.getItem(
          `redbridge-announcement-seen:${activeLearnerName}`,
        ) !== announcement),
    );
  const closeLearnerAnnouncement = () => {
    if (!announcementPersistent && announcement) {
      localStorage.setItem(
        `redbridge-announcement-seen:${activeLearnerName}`,
        announcement,
      );
    }
    setShowAnnouncement(false);
  };
  const refreshRemoteAttempts = async () => {
    try {
      const response = await fetch("/api/attempts", { cache: "no-store" });
      if (!response.ok) return;
      const remote: Attempt[] = await response.json();
      setAttempts(remote);
    } catch {}
  };
  const refreshRemoteLearners = async () => {
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      if (!response.ok) return;
      const users: Array<{ username: string; name: string }> =
        await response.json();
      setLearnerRecords((current) => [
        ...current.filter(
          (learner) => !users.some((user) => user.username === learner.email),
        ),
        ...users.map((user) => {
          const existing = current.find(
            (learner) => learner.email === user.username,
          );
          return {
            name: user.name,
            email: user.username,
            department: existing?.department || "运营",
            completed: existing?.completed || 0,
            testAccount: existing?.testAccount || false,
          };
        }),
      ]);
    } catch {}
  };
  const deleteLearner = async (learner: LearnerRecord) => {
    if (!confirm(`确定删除学员“${learner.name}”吗？其考试记录也会删除。`))
      return;
    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: learner.email, name: learner.name }),
      });
      if (!response.ok && response.status !== 404) {
        const body = await response.json();
        alert(body.error || "删除失败");
        return;
      }
      setLearnerRecords((current) =>
        current.filter((item) => item.email !== learner.email),
      );
      const aliases = learnerAliases[learner.name] || [learner.name];
      setAttempts((current) =>
        current.filter((attempt) => !aliases.includes(attempt.learner)),
      );
    } catch {
      alert("无法连接后端，删除失败");
    }
  };
  const resetLearnerPassword = async (learner: LearnerRecord) => {
    if (!confirm(`确定将“${learner.name}”的密码重置为 123456 吗？`)) return;
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: learner.email }),
      });
      const body = await response.json();
      if (!response.ok) {
        alert(body.error || "密码重置失败");
        return;
      }
      alert(`“${learner.name}”的密码已重置为 123456`);
    } catch {
      alert("无法连接后端，密码重置失败");
    }
  };
  const gradeEssay = async (
    questionIndex: number,
    grade: "Excellent" | "Passed" | "Failed" | undefined,
    comment: string,
    grader: string,
  ) => {
    if (!selected) return;
    try {
      const response = await fetch("/api/attempts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: selected.id,
          questionIndex,
          grade,
          comment,
          grader,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        alert(body.error || "评分保存失败");
        return;
      }
      const updated = body as Attempt;
      setSelected(updated);
      setAttempts((current) =>
        current.map((attempt) =>
          attempt.id === updated.id ? updated : attempt,
        ),
      );
      showSaveSuccess();
    } catch {
      alert("无法连接后端，评分保存失败");
    }
  };
  if (browserCompatibility === "checking")
    return (
      <main className="grid min-h-screen place-items-center bg-[#eef4ef] p-5">
        <div className="text-sm font-semibold text-slate-500">
          正在检查浏览器环境…
        </div>
      </main>
    );
  if (browserCompatibility === "blocked")
    return (
      <main className="grid min-h-screen place-items-center bg-[#eef4ef] p-5">
        <section className="w-full max-w-lg rounded-[28px] bg-white p-8 text-center shadow-xl md:p-10">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-50 text-amber-600">
            <AlertTriangle size={30} />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-slate-900">
            请使用系统浏览器打开
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Redbridge
            实习生考核需要使用浏览器本地存储来保护登录及答题数据，微信内置浏览器不支持进入。
          </p>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-left text-sm leading-7 text-slate-600">
            <p className="font-bold text-slate-800">打开方法</p>
            <p>1. 点击微信右上角“…”</p>
            <p>2. 选择“在浏览器打开”，或复制链接</p>
            <p>3. 使用 Chrome、Safari、Edge 等浏览器访问</p>
          </div>
          <button
            type="button"
            className="btn-primary mt-6 w-full"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
                alert("链接已复制，请粘贴到 Chrome、Safari 或 Edge 打开");
              } catch {
                prompt("请复制以下链接到浏览器打开", window.location.href);
              }
            }}
          >
            复制网页链接
          </button>
        </section>
      </main>
    );
  if (!role)
    return (
      <Login
        accounts={accounts}
        onLogin={(r) => {
          setAttempts([]);
          setRole(r);
          setView("dashboard");
          void refreshRemoteAttempts();
          if (r === "admin") void refreshRemoteLearners();
          if (r === "learner" && shouldShowCurrentAnnouncement())
            setShowAnnouncement(true);
        }}
        onRegister={(a) => {
          setAttempts([]);
          setAccounts([...accounts, a]);
          setLearnerRecords([
            ...learnerRecords,
            {
              name: a.name,
              email: a.username,
              department: "运营",
              completed: 0,
              testAccount: false,
            },
          ]);
          setRole("learner");
          setView("dashboard");
          void refreshRemoteAttempts();
          if (shouldShowCurrentAnnouncement()) setShowAnnouncement(true);
        }}
      />
    );
  if (view === "take" && active)
    return (
      <QuizTake
        quiz={active}
        onExit={() => setView("dashboard")}
        onComplete={async (a) => {
          try {
            const response = await fetch("/api/attempts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                attempt: a,
                maxAttempts: active.maxAttempts ?? 1,
              }),
            });
            if (!response.ok) {
              const body = await response.json().catch(() => ({}));
              return {
                ok: false,
                error: body.error || "成绩未能保存到后端。",
              };
            }
            const savedAttempt = (await response.json()) as Attempt;
            const learnerAttempt: Attempt = {
              ...a,
              ...savedAttempt,
              questionSnapshot:
                savedAttempt.questionSnapshot ||
                a.questionSnapshot ||
                active.questions,
              passingScoreSnapshot: active.passingScore,
              correct: 0,
              total: 0,
              score: 0,
              status: "Pending",
            };
            setAttempts((current) => [learnerAttempt, ...current]);
            setSelected(learnerAttempt);
            setResultBack("results");
            setView("resultDetail");
            return { ok: true };
          } catch {
            return {
              ok: false,
              error: "无法连接后端，成绩尚未提交。",
            };
          }
        }}
      />
    );
  const names = Object.fromEntries(quizzes.map((q) => [q.id, q.title]));
  let content: React.ReactNode;
  if (view === "builder")
    content = (
      <Builder
        initial={edit}
        questionBanks={questionBanks}
        onCancel={() => setView("quizzes")}
        onSave={(q) => {
          updateQuizzesAndSync(
            quizzes.some((x) => x.id === q.id)
              ? quizzes.map((x) => (x.id === q.id ? q : x))
              : [q, ...quizzes],
          );
          setView("quizzes");
        }}
      />
    );
  else if (role === "admin" && view === "banks")
    content = (
      <QuestionBankManagement
        banks={questionBanks}
        saveBanks={updateQuestionBanksAndSync}
      />
    );
  else if (view === "resultDetail" && selected) {
    const quiz = quizzes.find((q) => q.id === selected.quizId) || quizzes[0];
    content = (
      <ResultDetail
        attempt={selected}
        quiz={quiz}
        admin={role === "admin"}
        onGrade={role === "admin" ? gradeEssay : undefined}
        back={() => setView(resultBack)}
      />
    );
  } else if (role === "admin" && view === "dashboard")
    content = (
      <AdminDashboard
        attempts={attempts}
        quizzes={quizzes}
        learnersCount={
          learnerRecords.filter((learner) => !learner.testAccount).length
        }
        setView={setView}
        openResult={(attempt) => {
          setSelected(attempt);
          setResultBack("dashboard");
          setView("resultDetail");
        }}
      />
    );
  else if (role === "admin" && view === "quizzes")
    content = (
      <AdminQuizzes
        quizzes={quizzes}
        attempts={attempts}
        learnerRecords={learnerRecords}
        setQuizzes={updateQuizzesAndSync}
        edit={(q) => {
          setEdit(q);
          setView("builder");
        }}
      />
    );
  else if (role === "admin" && view === "learners")
    content = (
      <LearnerManagement
        records={learnerRecords}
        setRecords={updateLearnersAndSync}
        attempts={attempts}
        open={(l) => {
          setSelectedLearner(l);
          setView("learnerDetail");
        }}
        remove={deleteLearner}
        resetPassword={resetLearnerPassword}
      />
    );
  else if (role === "admin" && view === "learnerDetail" && selectedLearner) {
    const current =
      learnerRecords.find((l) => l.email === selectedLearner.email) ||
      selectedLearner;
    content = (
      <LearnerDetail
        learner={current}
        attempts={attempts}
        quizzes={quizzes}
        back={() => setView("learners")}
        openResult={(a) => {
          setSelected(a);
          setResultBack("learnerDetail");
          setView("resultDetail");
        }}
      />
    );
  } else if (view === "results") {
    const testAccountNames = new Set(
      learnerRecords
        .filter((learner) => learner.testAccount)
        .map((learner) => learner.name),
    );
    const regularAttempts = attempts.filter(
      (attempt) => !testAccountNames.has(attempt.learner),
    );
    const testAttempts = attempts.filter((attempt) =>
      testAccountNames.has(attempt.learner),
    );
    const rows =
      role === "learner"
        ? attempts.filter((a) => a.learner === activeLearnerName)
        : resultAccountView === "test"
          ? testAttempts
          : regularAttempts;
    content = (
      <>
        <PageTitle
          title={role === "learner" ? "我的提交记录" : "考核结果"}
          desc={
            role === "learner"
              ? "查看你已经提交的考核记录。"
              : "查看成绩、完成情况和专注模式事件。"
          }
        />
        {role === "admin" && (
          <div className="mb-5 inline-flex rounded-2xl bg-slate-100 p-1.5">
            <button
              type="button"
              className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${resultAccountView === "regular" ? "bg-white text-brand shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              onClick={() => setResultAccountView("regular")}
            >
              正式学员（{regularAttempts.length}）
            </button>
            <button
              type="button"
              className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${resultAccountView === "test" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              onClick={() => setResultAccountView("test")}
            >
              测试账号（{testAttempts.length}）
            </button>
          </div>
        )}
        <div className="card overflow-hidden">
          <ResultTable
            attempts={rows}
            names={names}
            hideScores={role === "learner"}
            onOpen={(a) => {
              setSelected(a);
              setResultBack("results");
              setView("resultDetail");
            }}
          />
        </div>
      </>
    );
  } else if (role === "learner" && view === "quizzes")
    content = (
      <>
        <PageTitle title="我的考核" desc="查看分配给你的全部考核。" />
        <div className="grid gap-5 lg:grid-cols-2">
          {quizzes
            .filter((q) => q.status === "Published")
            .map((q) => (
              <div className="card p-6" key={q.id}>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                  可参加
                </span>
                <h2 className="mt-4 text-xl font-bold">{q.title}</h2>
                <p className="mt-2 text-sm text-slate-500">{q.description}</p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    {q.questions.length} 道题 · {q.timeLimit} 分钟
                    {` · 已参加 ${attempts.filter((a) => a.quizId === q.id && a.learner === activeLearnerName).length}/${q.maxAttempts ?? 1} 次`}
                  </span>
                  <button
                    className="btn-primary"
                    disabled={
                      attempts.filter(
                        (a) =>
                          a.quizId === q.id && a.learner === activeLearnerName,
                      ).length >= (q.maxAttempts ?? 1)
                    }
                    onClick={() => {
                      setActive(q);
                      setView("take");
                      if (q.requireFullscreen)
                        document.documentElement
                          .requestFullscreen?.()
                          .catch(() => {});
                    }}
                  >
                    {attempts.filter(
                      (a) =>
                        a.quizId === q.id && a.learner === activeLearnerName,
                    ).length >= (q.maxAttempts ?? 1)
                      ? "已达次数上限"
                      : "开始考核"}
                  </button>
                </div>
              </div>
            ))}
        </div>
      </>
    );
  else
    content = (
      <LearnerDashboard
        quizzes={quizzes}
        attempts={attempts}
        start={(q) => {
          setActive(q);
          setView("take");
          if (q.requireFullscreen)
            document.documentElement.requestFullscreen?.().catch(() => {});
        }}
        setView={setView}
      />
    );
  return (
    <>
      {saveToast && (
        <div className="fixed right-5 top-5 z-[100] flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-xl">
          <CheckCircle2 size={18} />
          保存成功
        </div>
      )}
      <Shell
        role={role}
        view={view}
        setView={setView}
        logout={() => {
          void fetch("/api/auth/logout", { method: "POST" });
          activeLearnerName = "";
          setAttempts([]);
          setSelected(undefined);
          setRole(null);
          setView("dashboard");
        }}
        onAnnounce={() => {
          setAnnouncementDraft(announcement);
          setAnnouncementPersistentDraft(announcementPersistent);
          setAnnounceEditor(true);
        }}
      >
        {content}
      </Shell>
      <Dialog.Root open={announceEditor} onOpenChange={setAnnounceEditor}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-xl font-bold">
                发布公告
              </Dialog.Title>
              <Dialog.Close className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X size={19} />
              </Dialog.Close>
            </div>
            <Dialog.Description className="mt-2 text-sm text-slate-500">
              公告将在学员下次登录后弹出显示。
            </Dialog.Description>
            <textarea
              className="input mt-5 min-h-36"
              value={announcementDraft}
              onChange={(e) => setAnnouncementDraft(e.target.value)}
              placeholder="请输入公告内容"
            />
            <label className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={announcementPersistentDraft}
                onChange={(e) =>
                  setAnnouncementPersistentDraft(e.target.checked)
                }
                className="h-4 w-4 accent-[#2f6e55]"
              />
              长期显示（学员每次重新登录都会弹出）
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close className="btn-secondary">取消</Dialog.Close>
              <button
                className="btn-primary"
                disabled={!announcementDraft.trim()}
                onClick={async () => {
                  const nextAnnouncement = announcementDraft.trim();
                  try {
                    await saveSharedState(
                      quizzes,
                      learnerRecords,
                      nextAnnouncement,
                      announcementPersistentDraft,
                    );
                    setAnnouncement(nextAnnouncement);
                    setAnnouncementPersistent(announcementPersistentDraft);
                    setAnnounceEditor(false);
                    showSaveSuccess();
                  } catch (error) {
                    alert(
                      error instanceof Error ? error.message : "公告发布失败",
                    );
                  }
                }}
              >
                发布公告
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root
        open={showAnnouncement}
        onOpenChange={(open) => {
          if (!open) closeLearnerAnnouncement();
          else setShowAnnouncement(true);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-mint text-brand">
                <Bell size={21} />
              </div>
              <Dialog.Close className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X size={19} />
              </Dialog.Close>
            </div>
            <Dialog.Title className="mt-5 text-xl font-bold">
              管理员公告
            </Dialog.Title>
            <Dialog.Description className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {announcement}
            </Dialog.Description>
            <div className="mt-6 flex justify-end">
              <Dialog.Close className="btn-primary px-7">OK</Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
