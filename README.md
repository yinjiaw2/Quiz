# Redbridge 实习生考核

## 本地运行

```bash
npm run dev
```

未配置数据库时，应用会回退到浏览器本地存储，方便本地预览。

## Vercel + Neon 后端配置

1. 将项目导入 Vercel。
2. 在项目的 **Storage / Marketplace** 中添加 Neon Postgres，并连接到当前项目。
3. 确认 Vercel 已生成 `DATABASE_URL` 环境变量。
4. 在 Vercel 项目 Settings → Environment Variables 中添加：

```text
ADMIN_PASSWORD=Redbridge1982
SESSION_SECRET=请填写一个至少32位的随机字符串
```

5. 重新部署项目。

应用第一次访问 API 时会自动创建：

- `redbridge_users`：学员账户和加密后的密码
- `redbridge_state`：考核、学员资料和公告
- `redbridge_attempts`：逐题作答和成绩

如需在本地连接同一个 Neon 数据库，复制 `.env.example` 为 `.env.local`，并填写 Neon 提供的连接字符串。
