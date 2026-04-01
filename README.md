# 元都AI Lookfront（运营中台）

元都AI（Yuandu AI）是一个工业级 AI 视觉资产生产平台。  
本仓库为运营与管理中台，负责平台的「**内容治理 + 任务监控 + 质量控制**」，提供：

- 视觉资产运营配置与审核工具
- 任务队列、结果巡检、健康看板
- 质量参数管理与后台治理入口
- 订阅与权益相关运营能力

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
