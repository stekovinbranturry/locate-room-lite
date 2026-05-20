# LocateRoom Lite — Agent Skills

> 本项目级 skills，安装于 `.agents/skills/`（**非全局**）。与 [技术设计](./TECHNICAL.md) 对齐。

## 安装位置

```
locate-room-lite/
└── .agents/skills/          # Cursor 等 Agent 自动发现的项目级 skills
    ├── webrtc/
    ├── websocket-realtime-builder/
    ├── maplibre-tile-sources/
    ├── shadcn/
    ├── vercel-react-best-practices/
    ├── mobile-responsiveness/
    └── deploy-to-vercel/
```

## 已安装 Skills

| Skill | 来源 | 用途（本项目） | 对应阶段 |
|-------|------|----------------|----------|
| [webrtc](https://skills.sh/claude-dev-suite/claude-dev-suite/webrtc) | `claude-dev-suite/claude-dev-suite@webrtc` | Full Mesh、DataChannel、`snapshot`/`update`、ICE/STUN | P1、P3 |
| [websocket-realtime-builder](https://skills.sh/patricio0312rev/skills/websocket-realtime-builder) | `patricio0312rev/skills@websocket-realtime-builder` | 信令 WS：房间、重连、鉴权模式（实现用**原生 WebSocket**，非 Socket.io） | P0 |
| [maplibre-tile-sources](https://skills.sh/maplibre/maplibre-agent-skills/maplibre-tile-sources) | `maplibre/maplibre-agent-skills@maplibre-tile-sources` | GeoJSON Source、图层、`setData` 与 rAF 批量更新 | P2 |
| [shadcn](https://skills.sh/shadcn/ui/shadcn) | `shadcn/ui@shadcn` | 成员列表、Toast、按钮、分享 Sheet 等 UI | P2 |
| [vercel-react-best-practices](https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices) | `vercel-labs/agent-skills@vercel-react-best-practices` | 10Hz 避免整树重渲染、memo、bundle | P2、P4 |
| [mobile-responsiveness](https://skills.sh/hoodini/ai-agents-skills/mobile-responsiveness) | `hoodini/ai-agents-skills@mobile-responsiveness` | H5 布局、触控、安全区、viewport | P4、验收 |
| [deploy-to-vercel](https://skills.sh/vercel-labs/agent-skills/deploy-to-vercel) | `vercel-labs/agent-skills@deploy-to-vercel` | 前端 HTTPS 部署 | P5 |

## 使用说明

1. **在 Cursor 中**：对话时 @ 提及相关 skill，或描述任务（如「实现 WebRTC DataChannel」），Agent 会按 `SKILL.md` 触发。
2. **与方案冲突时**：以 [TECHNICAL.md](./TECHNICAL.md) 为准。例如 `websocket-realtime-builder` 示例偏 Socket.io，本项目信令为**原生 WS + 自建协议**。
3. **安全**：Skills 以完整 Agent 权限运行，安装前已在 [skills.sh](https://skills.sh/) 查看安全评估；使用前可阅读各目录下 `SKILL.md`。

## 重新安装（项目级，不加 `-g`）

在仓库根目录执行：

```bash
npx skills add claude-dev-suite/claude-dev-suite@webrtc -y
npx skills add patricio0312rev/skills@websocket-realtime-builder -y
npx skills add maplibre/maplibre-agent-skills@maplibre-tile-sources -y
npx skills add shadcn/ui@shadcn -y
npx skills add vercel-labs/agent-skills@vercel-react-best-practices -y
npx skills add hoodini/ai-agents-skills@mobile-responsiveness -y
npx skills add vercel-labs/agent-skills@deploy-to-vercel -y
```

更新全部已安装 skills：

```bash
npx skills check
npx skills update
```

## 未安装（及原因）

| Skill | 原因 |
|-------|------|
| `team-telnyx/*` | 绑定 Telnyx SDK，与原生 WebRTC 方案不符 |
| `rodydavis/...pocketbase` | 信令架构为 PocketBase，非自建 WS |
| `supabase-realtime` | 位置数据经服务端，违反 DataChannel P2P |
| `amap-maps` | 高德 SDK，与技术方案 MapLibre 不一致 |
| `vercel-composition-patterns` 等 | 误触整包安装后已移除，非 MVP 必需 |

## 维护记录

| 日期 | 操作 |
|------|------|
| 2026-05-20 | 初始安装推荐 bundle 至 `.agents/skills/`；移除误装的 Vercel 整包多余 6 项 |

## 相关文档

- [需求说明](./REQUIREMENTS.md)
- [验收清单](./ACCEPTANCE.md)
- [技术设计](./TECHNICAL.md)
