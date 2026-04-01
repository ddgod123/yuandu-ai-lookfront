# Emoji Lookfront（管理后台）

基于 Next.js App Router 的管理后台前端，面向运营/审核/管理员，提供：

- 内容审核与运营配置
- 任务、数据、看板与后台工具
- 管理员侧业务入口（合集、表情、任务、订阅等）

---

## 1. 技术栈

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4

---

## 2. 本地开发

```bash
npm install
cp .env.example .env.local
npm run dev
```

默认访问：`http://localhost:5818`

---

## 3. 环境变量

`.env.local` 示例：

```bash
NEXT_PUBLIC_API_BASE=/api
```

---

## 4. 构建与启动

```bash
npm run build
npm run start
```

---

## 5. 部署说明

见：[`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)

---

## 6. 开源注意事项

- 不提交 `.env.local`、私钥、证书、管理员测试数据
- 不提交模型权重、私有提示词、训练数据（已加入 ignore 规则）

---

## 7. License

见仓库 `LICENSE`。

