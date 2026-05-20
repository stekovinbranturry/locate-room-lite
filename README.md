# LocateRoom Lite

Web 端实时位置共享小房间（带回家项目）。最多 4 人同房间，通过 **WebRTC DataChannel P2P** 传输位置；信令服务仅负责建连与成员管理，**不转发坐标**。

## 功能概览

- 创建房间 / 分享链接加入
- 在线成员列表，加入与离开提示
- 地图实时显示全员位置（MapLibre GL）
- 新成员入房后立即看到当前位置（`snapshot`）
- 断网后信令自动重连；成员掉线可感知（列表状态）

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
│       └── location/          # Geolocation 10Hz
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
| 前端 | Vercel / Cloudflare Pages（**HTTPS 必须**） |
| 信令 | 独立进程或容器，`wss` 与前端同域反代 |
| TURN | 复杂 NAT 可选配置；同网/简单 NAT 可用公共 STUN |

移动端定位与 WebRTC 依赖安全上下文，勿在纯 HTTP 生产环境测试。

## AI 协作

使用 Cursor 等 Agent 时：

- 阅读 [AGENTS.md](./AGENTS.md) 与 `.cursor/rules/`
- 项目 skills 在 `.agents/skills/`（安装说明见 [docs/SKILLS.md](./docs/SKILLS.md)）

## License

Private / 面试作业项目。
