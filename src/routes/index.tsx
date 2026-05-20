import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { createRoomId } from '#/lib/config';

export const Route = createFileRoute('/')({ component: HomePage });

function HomePage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  useEffect(() => {
    setDisplayName(sessionStorage.getItem('locate-display-name') ?? '');
  }, []);

  const startRoom = () => {
    const name = displayName.trim() || `用户-${Math.floor(Math.random() * 900 + 100)}`;
    sessionStorage.setItem('locate-display-name', name);
    const roomId = createRoomId();
    navigate({ to: '/room/$roomId', params: { roomId } });
  };

  const joinRoom = () => {
    const id = window.prompt('输入房间 ID（分享链接中的 UUID）');
    if (!id?.trim()) return;
    const name = displayName.trim() || `用户-${Math.floor(Math.random() * 900 + 100)}`;
    sessionStorage.setItem('locate-display-name', name);
    navigate({ to: '/room/$roomId', params: { roomId: id.trim() } });
  };

  return (
    <main className="page-wrap px-4 pb-8 pt-10">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <p className="island-kicker mb-3">LocateRoom Lite</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-5xl">
          实时位置共享小房间
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          最多 4 人，通过 WebRTC DataChannel P2P 共享位置，信令仅用于建连，不转发坐标。
        </p>

        <label className="mb-6 block max-w-md">
          <span className="mb-2 block text-sm font-semibold text-[var(--sea-ink)]">昵称</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="例如：小明"
            className="w-full rounded-xl border border-[var(--chip-line)] bg-white/70 px-4 py-2.5 text-[var(--sea-ink)] outline-none focus:border-[var(--lagoon-deep)]"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={startRoom}
            className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-5 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)]"
          >
            创建房间
          </button>
          <button
            type="button"
            onClick={joinRoom}
            className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink)] transition hover:-translate-y-0.5"
          >
            加入房间
          </button>
        </div>
      </section>

      <section className="island-shell mt-8 rounded-2xl p-6">
        <p className="island-kicker mb-2">开发提示</p>
        <ul className="m-0 list-disc space-y-2 pl-5 text-sm text-[var(--sea-ink-soft)]">
          <li>
            先启动信令：<code>bun run signal</code>
          </li>
          <li>
            再启动前端：<code>bun run dev</code>（开发环境信令直连 <code>ws://localhost:3001</code>）
          </li>
          <li>多开隐身窗口用分享链接联调；P2P 验证见 chrome://webrtc-internals</li>
        </ul>
      </section>
    </main>
  );
}
