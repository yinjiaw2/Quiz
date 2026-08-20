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

export const buildQuestions = (count = 10, startId = 1) =>
  Array.from({ length: count }, (_, i) => {
    const t = topics[i % topics.length];
    return {
      id: startId + i,
      type: "choice" as const,
      text: `${t[0]}${i >= topics.length ? `（情景 ${i + 1}）` : ""}`,
      options: [...t[1]] as string[],
      correct: t[2] as number,
      explanation: t[3] as string,
    };
  });

const essayTopics = [
  "如果客户对服务结果不满意，你会如何了解问题并提出解决方案？",
  "请结合实际工作，说明你将如何在效率与客户信息安全之间取得平衡。",
  "当团队成员对工作优先级意见不一致时，你会如何推动问题解决？",
  "请说明一次高质量客户沟通应当包含哪些关键步骤。",
  "如果你发现现有工作流程存在风险，你会如何记录、汇报并推动改善？",
];

export const buildEssayQuestions = (count = 2, startId = 11) =>
  Array.from({ length: count }, (_, i) => ({
    id: startId + i,
    type: "essay" as const,
    text: essayTopics[i % essayTopics.length],
    options: [],
    correct: 0,
    explanation: "",
  }));

export const buildDefaultQuestions = () => [
  ...buildQuestions(10, 1),
  ...buildEssayQuestions(2, 11),
];

export const seedQuizzes: Quiz[] = [
  {
    id: "sales-foundation-mixed",
    title: "销售基础综合考核",
    description: "包含 10 道选择题和 2 道策论题，考核销售基础与客户沟通能力。",
    deadline: "2026-09-15T17:00",
    passingScore: 75,
    timeLimit: 30,
    maxAttempts: 2,
    status: "Published",
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
  {
    id: "operations-scenario-mixed",
    title: "运营情景综合考核",
    description: "包含 10 道选择题和 2 道策论题，考核运营流程与问题处理能力。",
    deadline: "2026-09-22T17:00",
    passingScore: 75,
    timeLimit: 25,
    maxAttempts: 2,
    status: "Published",
    questions: buildDefaultQuestions(),
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
    id: "workplace-readiness-mixed",
    title: "职场胜任力综合考核",
    description:
      "包含 10 道选择题和 2 道策论题，考核职场规范、协作与风险意识。",
    deadline: "2026-09-29T17:00",
    passingScore: 75,
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
];

export const seedAttempts: Attempt[] = [];

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
