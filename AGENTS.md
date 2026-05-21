# LocateRoom Lite — AI Agent 指南

面向 Cursor / Copilot 等编码 Agent。人类开发者请读 [README.md](./README.md)。

## 项目是什么

Web 端 **4 人实时位置共享房间**：信令走 WebSocket，**位置坐标仅经 WebRTC DataChannel P2P**，服务端不转发 `lat/lng`。

## 必读文档（按优先级）

1. [docs/TECHNICAL.md](./docs/TECHNICAL.md) — 架构与协议，**实现以本文为准**
2. [docs/REQUIREMENTS.md](./docs/REQUIREMENTS.md) — 需求范围
3. [docs/ACCEPTANCE.md](./docs/ACCEPTANCE.md) — 验收清单
4. [docs/TESTING.md](./docs/TESTING.md) — Vitest / Playwright / 人工分工
5. [docs/SKILLS.md](./docs/SKILLS.md) — 已安装 agent skills

## 硬性约束（不可违反）

- 位置数据 **必须** 用 `RTCPeerConnection` + DataChannel，禁止经信令/HTTP 传坐标
- 房间最多 **4 人**，拓扑 **Full Mesh**（不做 SFU）
- 上报 **10 Hz**；地图更新与 React 渲染 **解耦**（Zustand + MapLibre `setData` + rAF）
- 新成员入房：channel open 时发 `snapshot`，保证立即可见
- 信令服务 `server/signal.ts`：**仅** 转发 SDP/ICE 与成员事件

## 目录与职责

```
server/signal.ts              # Bun WebSocket 信令
src/features/webrtc/          # 协议、SignalingClient、PeerConnectionPool
src/features/room/            # memberStore、roomSessionManager、useRoomSession
src/features/map/MapView.tsx  # MapLibre，rAF 批量 setData
src/features/perf/          # perfMonitor、PerfDevPanel
src/features/trajectory/    # trailStore
src/features/network/       # weakNetPolicy
src/features/location/      # watchPosition + 动态 tick
src/routes/                   # / 创建房间，/room/$roomId 主界面
scripts/                      # dual-signaling-test、dual-browser-test
.agents/skills/               # 项目级 skills（勿全局 -g 安装）
```

## 关键实现约定

| 主题 | 约定 |
|------|------|
| 信令 URL | 开发：`ws://localhost:3001` 直连；生产：同源 `wss` 反代 |
| peerId | `getOrCreatePeerId(roomId)` 存 `sessionStorage`，禁止每次 mount 新建 |
| 会话生命周期 | 用 `roomSessionManager` 引用计数 + 延迟销毁；**禁止**在 React effect cleanup 里立即 `disconnect` WS |
| 昵称 / 随机数 | 仅客户端 `useEffect` 设置，避免 SSR 水合不一致 |
| 地图性能 | 禁止 10Hz `setState` 驱动整图；每帧最多一次 `source.setData` |
| UI 组件 | 新增 shadcn：`pnpm dlx shadcn@latest add <component>` |

## 常用命令

```bash
bun run signal          # 信令 :3001
bun run dev             # 前端 :3000
bun run test            # Vitest
bun run test:signal     # 双人信令冒烟
bun run test:dual       # Playwright 双人冒烟（需 dev+signal 已启动）
bun run check           # Biome
```

## 修改时的检查清单

- [ ] 信令 payload 是否含坐标？（必须为否）
- [ ] 是否破坏 `roomSessionManager` 导致双人联调成员回退为 1/4？
- [ ] 地图路径是否引入高频 React 重渲染？
- [ ] 是否更新 `docs/TECHNICAL.md` / `docs/ACCEPTANCE.md`（若架构变更）？

## 不要做的事

- 不要用 Socket.io / Supabase Realtime / 服务端转发位置
- 不要为 MVP 引入 SFU、Redis 房间持久化（除非用户明确要求）
- 不要全局安装 skills（`npx skills add` 勿加 `-g`）
- 不要未经请求创建 git commit

## 项目级 Skills

见 [docs/SKILLS.md](./docs/SKILLS.md)。实现 WebRTC、地图、移动端、部署时可 @ 对应 skill，但与 `TECHNICAL.md` 冲突时以技术设计为准。
