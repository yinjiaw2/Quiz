import { Quiz, Attempt } from "./types";

const topics: Array<[string, string[], number, string]> = [
  [
    "以下哪种做法最能保护客户的个人信息？",
    [
      "只与团队成员分享",
      "使用公司批准的系统和访问控制",
      "在个人设备上保存副本",
      "通过个人邮箱发送",
    ],
    1,
    "仅使用公司批准的系统，并按照工作需要授予访问权限。",
  ],
  [
    "收到可疑邮件时，首先应该怎么做？",
    [
      "回复邮件询问详情",
      "转发给同事",
      "通过安全渠道上报",
      "直接删除且不告知任何人",
    ],
    2,
    "及时上报可以帮助安全团队迅速保护所有人。",
  ],
  [
    "以下哪种密码使用方式最安全？",
    [
      "重复使用一个复杂密码",
      "使用容易记住的生日",
      "使用独立密码短语并开启多重验证",
      "每月只更改一个字符",
    ],
    2,
    "独立凭据配合多重验证可降低账户被盗风险。",
  ],
  [
    "客户提出投诉时，最佳的第一反应是什么？",
    [
      "解释客户为什么错了",
      "倾听、确认并澄清问题",
      "立即转给其他人",
      "直接承诺退款",
    ],
    1,
    "倾听和澄清有助于了解事实并表达尊重。",
  ],
  [
    "机密工作文件应该存放在哪里？",
    ["公司批准的存储系统", "个人云盘", "公开链接", "U盘"],
    0,
    "公司批准的存储系统具备适当的保留、访问和安全控制。",
  ],
];

export const buildQuestions = () =>
  Array.from({ length: 25 }, (_, i) => {
    const t = topics[i % topics.length];
    return {
      id: i + 1,
      text: `${t[0]}${i >= topics.length ? `（情景 ${i + 1}）` : ""}`,
      options: [...t[1]] as string[],
      correct: t[2] as number,
      explanation: t[3] as string,
    };
  });

const demoAnswers = (wrongQuestions: number[]) =>
  Object.fromEntries(
    buildQuestions().map((question, index) => [
      index,
      wrongQuestions.includes(index)
        ? (question.correct + 1) % question.options.length
        : question.correct,
    ]),
  );

export const seedQuizzes: Quiz[] = [
  {
    id: "product-03",
    title: "产品知识考核 03",
    description: "检验学员对产品、安全与客户体验基础知识的掌握情况。",
    deadline: "2026-08-16T17:00",
    passingScore: 80,
    timeLimit: 30,
    maxAttempts: 2,
    status: "Published",
    questions: buildQuestions(),
    showScore: true,
    answerRelease: "deadline",
    resultsReleased: false,
    requireFullscreen: true,
    detectTabSwitch: true,
    detectFullscreenExit: true,
    maxViolations: 3,
    autoSubmit: true,
  },
  {
    id: "privacy-101",
    title: "隐私与数据处理",
    description: "复习如何安全处理员工和客户信息。",
    deadline: "2026-08-25T17:00",
    passingScore: 80,
    timeLimit: 25,
    maxAttempts: 2,
    status: "Published",
    questions: buildQuestions(),
    showScore: true,
    answerRelease: "immediate",
    resultsReleased: true,
    requireFullscreen: false,
    detectTabSwitch: true,
    detectFullscreenExit: false,
    maxViolations: 3,
    autoSubmit: true,
  },
  {
    id: "conduct",
    title: "职场行为规范",
    description: "针对最新职场行为政策的简短考核。",
    deadline: "2026-09-02T17:00",
    passingScore: 75,
    timeLimit: 30,
    maxAttempts: 1,
    status: "Draft",
    questions: buildQuestions(),
    showScore: true,
    answerRelease: "deadline",
    resultsReleased: false,
    requireFullscreen: true,
    detectTabSwitch: true,
    detectFullscreenExit: true,
    maxViolations: 3,
    autoSubmit: true,
  },
];

export const seedAttempts: Attempt[] = [
  {
    id: "a1",
    quizId: "privacy-101",
    learner: "Eric Zhang",
    date: "2026-08-06T10:22:00",
    score: 92,
    correct: 23,
    total: 25,
    timeUsed: 18,
    answers: demoAnswers([3, 17]),
    status: "Passed",
    tabSwitches: 1,
    fullscreenExits: 0,
  },
  {
    id: "a2",
    quizId: "product-03",
    learner: "Mia Chen",
    date: "2026-08-10T14:06:00",
    score: 88,
    correct: 22,
    total: 25,
    timeUsed: 21,
    answers: demoAnswers([1, 8, 20]),
    status: "Passed",
    tabSwitches: 2,
    fullscreenExits: 1,
  },
  {
    id: "a3",
    quizId: "privacy-101",
    learner: "James Wilson",
    date: "2026-08-11T09:18:00",
    score: 68,
    correct: 17,
    total: 25,
    timeUsed: 24,
    answers: demoAnswers([0, 1, 2, 3, 4, 5, 6, 7]),
    status: "Failed",
    tabSwitches: 0,
    fullscreenExits: 0,
  },
];

export const learners = [
  {
    name: "张艾瑞",
    email: "eric.zhang@redbridge.cn",
    department: "销售部",
    completed: 8,
  },
  {
    name: "陈米娅",
    email: "mia.chen@redbridge.cn",
    department: "客户成功部",
    completed: 9,
  },
  {
    name: "詹姆斯",
    email: "james.wilson@redbridge.cn",
    department: "运营部",
    completed: 7,
  },
  {
    name: "艾娃",
    email: "ava.patel@redbridge.cn",
    department: "财务部",
    completed: 9,
  },
];
