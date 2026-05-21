# LocateRoom Lite

Web 端实时位置共享小房间（带回家项目）。最多 4 人同房间，通过 **WebRTC DataChannel P2P** 传输位置；信令服务仅负责建连与成员管理，**不转发坐标**。

**在线演示：** [https://locate-room-lite.vercel.app/](https://locate-room-lite.vercel.app/)

## 功能概览

- 创建房间 / 分享链接加入
- 在线成员列表，加入与离开提示
- 地图实时显示全员位置（MapLibre GL）
- 新成员入房后立即看到当前位置（`snapshot`）
- 断网后信令自动重连；成员掉线可感知（列表状态）

### 加分项（已实现）

| 功能 | 说明 |
|------|------|
| **性能监控面板** | 房间页右下角，开发环境默认开启；实时显示 10Hz / fps / 首屏 / RTT / DC 流量，可导出 JSON |
| **位置轨迹** | MapLibre 折线层，面板内「轨迹」开关 |
| **弱网降级** | `auto/on/off`：降频至 5Hz + 位移阈值过滤 + RTT/网络类型检测 |
| **移动端优化** | `dvh` 布局、`safe-area` 内边距、触控最小高度 44px |
| 语音对讲 | 未实现（Mesh 重协商成本高，见 TECHNICAL.md） |

## 技术栈

| 层级 | 选型 |
|------|------|
| 前端 | React 19、TanStack Router/Start、Vite 8、Tailwind 4 |
| 地图 | MapLibre GL JS |
| 状态 | Zustand |
| 实时 | WebRTC Full Mesh + 自建 WebSocket 信令（Bun） |
| 质量 | Biome、Vitest、Playwright（双人冒烟） |

架构细节见 [docs/TECHNICAL.md](./docs/TECHNICAL.md)。

## 快速开始

**环境**：Bun ≥ 1.0（推荐）或 Node 20+

```bash
bun install

# 终端 1：信令服务（默认 :3001）
bun run signal

# 终端 2：前端（默认 :3000）
bun run dev
```

浏览器打开 http://localhost:3000 → **创建房间** → 复制链接 → 另一窗口/设备打开链接 → 授权定位。

> 开发环境信令直连 `ws://localhost:3001`，避免 Vite ws 代理在高压下 `ECONNRESET`。生产需 HTTPS + `wss` 反代到信令服务。

## 部署到 Vercel

**生产地址：** [https://locate-room-lite.vercel.app/](https://locate-room-lite.vercel.app/)

前端通过 [Nitro](https://v3.nitro.build/) + `vercel.json` 部署为 SSR；**信令服务**单独部署到 Railway（见下方）。

### Railway 信令（推荐）

仓库已包含 `railway.toml` + `Dockerfile.signal`（仅打包 `server/signal.ts`，镜像约几十 MB）。

1. [Railway](https://railway.app/) → **New Project** → **Deploy from GitHub repo** → 选本仓库。
2. 确认 Service **Settings → Config-as-code** 指向 `railway.toml`（默认根目录即可）。
3. **Networking → Generate Domain** → 当前信令地址：[locate-room-lite-production.up.railway.app](https://locate-room-lite-production.up.railway.app)
4. 验证：`curl https://locate-room-lite-production.up.railway.app/health` 应返回 `{"ok":true,...}`（若 502 说明信令进程未启动，见下方排查）
5. 在 **Vercel** 重新部署前端（`vercel.json` + `.env.production` 已含 `VITE_SIGNAL_URL`）：
   - `VITE_SIGNAL_URL` = `wss://locate-room-lite-production.up.railway.app/signal`

**信令连不上 / 502 排查**

1. Railway → **Deployments** → 最新部署 Success；**Deploy Logs** 应有 `[signal] listening on 0.0.0.0:8080 (PORT=8080, ...)`
2. **Settings → Variables**：删除 `SIGNAL_PORT`（只保留 Railway 自动注入的 `PORT`）
3. **Settings → Networking → Target Port**：设为 **`8080`** 或与 Deploy Log 里 `PORT=` 一致（勿填 3001）
4. **Settings → Config-as-code** = `railway.toml`
5. 自检：`curl https://locate-room-lite-production.up.railway.app/health` → `{"ok":true,...}`，不是 502
6. 仍失败 → **Redeploy**（已改用 `oven/bun:1.2` 镜像，修复 Bun 公网路由问题）

| 文件 | 作用 |
|------|------|
| `railway.toml` | Railway 构建/健康检查配置 |
| `Dockerfile.signal` | Bun 信令容器（监听 `PORT` / `0.0.0.0`） |
| `.env.production` | Vite 生产构建时自动加载的信令 URL |
| `.env.example` | 环境变量说明（本地可选） |

CLI 部署（可选）：

```bash
npm i -g @railway/cli && railway login
railway init          # 新建项目并关联当前目录
railway up            # 按 railway.toml 构建并部署
railway domain        # 生成公网域名
```

> Railway 会自动注入 `PORT`；信令服务已适配，无需再设 `SIGNAL_PORT`。

### Vercel 前端

1. 构建命令与安装命令见 `vercel.json`（`bun run build` / `bun install`）。
2. 信令 URL 通过 **`VITE_SIGNAL_URL`** 注入（见 `.env.production` / `vercel.json`）；Vercel Dashboard 里变量名也必须是 `VITE_SIGNAL_URL`，`PRODUCTION_SIGNAL_URL` 等无前缀变量**不会**进浏览器 bundle。
3. 若需覆盖或存放密钥，仍可在 Vercel Dashboard → Environment Variables 设置（敏感项**不要**写进 git）。

本地预览 Vercel 构建产物：

```bash
bun run build
npx vite preview
```

## 项目结构

```
locate-room-lite/
├── server/signal.ts           # WebSocket 信令
├── src/
│   ├── routes/                # /、/room/$roomId
│   └── features/
│       ├── webrtc/            # P2P 与协议
│       ├── room/              # 房间状态与会话管理
│       ├── map/               # MapLibre
│       ├── location/          # Geolocation 10Hz
│       ├── perf/              # 性能监控与开发者面板
│       ├── trajectory/        # 轨迹 RingBuffer
│       └── network/           # 弱网策略
├── scripts/                   # 联调与冒烟脚本
├── docs/                      # 需求、设计、测试、Skills
├── .agents/skills/            # 项目级 AI skills
└── .cursor/rules/             # Cursor Agent 规则
```

## 脚本

| 命令 | 说明 |
|------|------|
| `bun run dev` | 启动前端 |
| `bun run signal` | 启动信令 |
| `bun run build` | 生产构建 |
| `bun run test` | Vitest 单元测试 |
| `bun run test:signal` | 双人信令自动化（无需浏览器） |
| `bun run test:dual` | Playwright 双人冒烟（需 dev + signal 已启动） |
| `bun run check` | Biome 格式化 + lint |

## 测试

- **自动化**：协议解析、礼貌端等 → `bun run test`
- **信令双人**：`bun run test:signal`
- **浏览器双人**：`bun run test:dual`
- **人工必做**：真机 H5、4 人、断网恢复、`chrome://webrtc-internals` P2P 举证

完整策略见 [docs/TESTING.md](./docs/TESTING.md)，验收项见 [docs/ACCEPTANCE.md](./docs/ACCEPTANCE.md)。

### 性能测量（开发者面板）

1. 双人进房后打开 **性能监控** 面板（开发环境默认显示；生产可点「性能面板」按钮）。
2. 观察 **位置发送 ≥10Hz**、**地图渲染 ≥50fps**、**首屏他人 ≤3000ms**（入房后见他人 marker 时更新）。
3. 点击 **导出 JSON** 粘贴到 README 性能章节。

### P2P 验证（提交前建议）

1. 打开 `chrome://webrtc-internals`，确认存在 `RTCPeerConnection` 与 DataChannel `location` 收发数据。
2. 确认信令日志/抓包中 **无** `lat`、`lng` 字段（仅 SDP/ICE/成员元数据）。
3. 双人入房后成员列表为 **(2/4)**，链路状态显示 **P2P**。

## 文档索引

| 文档 | 说明 |
|------|------|
| [docs/REQUIREMENTS.md](./docs/REQUIREMENTS.md) | 需求说明 |
| [docs/TECHNICAL.md](./docs/TECHNICAL.md) | 技术设计与协议 |
| [docs/ACCEPTANCE.md](./docs/ACCEPTANCE.md) | 验收清单 |
| [docs/TESTING.md](./docs/TESTING.md) | 测试方式（Vitest / Playwright / 人工） |
| [docs/SKILLS.md](./docs/SKILLS.md) | 项目级 Agent Skills |
| [AGENTS.md](./AGENTS.md) | 面向 AI Agent 的协作说明 |

## UI 组件（shadcn）

```bash
pnpm dlx shadcn@latest add button
```

配置见 [components.json](./components.json)。

## 部署提示

| 组件 | 建议 |
|------|------|
| 前端 | [locate-room-lite.vercel.app](https://locate-room-lite.vercel.app/)（Vercel + Nitro SSR） |
| 信令 | [locate-room-lite-production.up.railway.app](https://locate-room-lite-production.up.railway.app)（`wss://…/signal`） |
| TURN | 复杂 NAT 可选配置；同网/简单 NAT 可用公共 STUN |

移动端定位与 WebRTC 依赖安全上下文，勿在纯 HTTP 生产环境测试。

## AI 协作

使用 Cursor 等 Agent 时：

- 阅读 [AGENTS.md](./AGENTS.md) 与 `.cursor/rules/`
- 项目 skills 在 `.agents/skills/`（安装说明见 [docs/SKILLS.md](./docs/SKILLS.md)）

## License

Private / 面试作业项目。
