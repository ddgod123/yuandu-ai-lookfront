# 元都AI Lookfront 部署说明（生产）

## 1. 依赖

- Node.js 20+
- npm 10+
- Nginx（推荐）

---

## 2. 构建

```bash
cd lookfront
npm ci --include=dev
npm run build
```

---

## 3. 运行环境变量

创建生产环境文件（示例）：

```bash
cat >/etc/emoji/lookfront.env <<'EOF'
NODE_ENV=production
NEXT_PUBLIC_API_BASE=/api
EOF
```

---

## 4. systemd

`/etc/systemd/system/emoji-lookfront.service`

```ini
[Unit]
Description=Yuandu AI Lookfront (Admin)
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/emoji/lookfront
EnvironmentFile=/etc/emoji/lookfront.env
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

启用：

```bash
systemctl daemon-reload
systemctl enable --now emoji-lookfront
```

---

## 5. Nginx 反向代理（示例）

假设管理后台挂在 `/admin/` 前缀：

```nginx
location /admin/ {
  proxy_pass http://127.0.0.1:5818/;
}
```

> 也可以独立二级域名（如 `admin.example.com`）直接反代到 `127.0.0.1:5818`。

---

## 6. 验证

```bash
curl -I http://127.0.0.1:5818
systemctl status emoji-lookfront --no-pager
```

