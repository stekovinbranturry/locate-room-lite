import { createFileRoute, Link } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import MapView from '#/features/map/MapView';
import PerfDevPanel from '#/features/perf/PerfDevPanel';
import { useRoomStore } from '#/features/room/memberStore';
import { useRoomSession } from '#/features/room/useRoomSession';
import { getOrCreatePeerId } from '#/lib/config';

export const Route = createFileRoute('/room/$roomId')({
  component: RoomPage,
});

function RoomPage() {
  const { roomId } = Route.useParams();
  const [name, setName] = useState('Guest');
  useEffect(() => {
    const saved = sessionStorage.getItem('locate-display-name');
    setName(saved || `用户-${Math.floor(Math.random() * 900 + 100)}`);
  }, []);
  const peerId = useMemo(() => getOrCreatePeerId(roomId), [roomId]);

  useRoomSession({ roomId, peerId, displayName: name });

  const copyShareLink = useCallback(async () => {
    const url = `${window.location.origin}/room/${roomId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('分享链接已复制', { description: '可发送给好友加入同一房间' });
    } catch {
      toast.error('复制失败', { description: '请手动复制浏览器地址栏链接' });
    }
  }, [roomId]);

  const connectionStatus = useRoomStore((s) => s.connectionStatus);
  const peers = useRoomStore((s) => s.peers);
  const events = useRoomStore((s) => s.events);
  const localName = useRoomStore((s) => s.localName);

  const peerList = Object.values(peers);

  return (
    <div className="room-shell">
      <MapView />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
        <div className="pointer-events-auto flex flex-wrap items-start gap-2">
          <div className="island-shell max-w-[min(100%,20rem)] rounded-2xl px-4 py-3 shadow-lg">
            <p className="island-kicker m-0 mb-1">房间</p>
            <p className="m-0 truncate font-mono text-xs text-[var(--sea-ink-soft)]">{roomId}</p>
            <p className="mt-2 m-0 text-sm text-[var(--sea-ink)]">
              信令:{' '}
              <span className="font-semibold">
                {connectionStatus === 'connected'
                  ? '已连接'
                  : connectionStatus === 'reconnecting'
                    ? '重连中…'
                    : '连接中…'}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => void copyShareLink()}
            className="min-h-11 rounded-full border-2 border-[rgba(50,143,151,0.45)] bg-[var(--lagoon)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(47,106,74,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.03] hover:border-[var(--lagoon-deep)] hover:bg-[var(--lagoon-deep)] hover:shadow-[0_14px_32px_rgba(47,106,74,0.42)] active:translate-y-0 active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lagoon)] focus-visible:ring-offset-2"
          >
            复制分享链接
          </button>

          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-full border border-[var(--chip-line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm font-semibold text-[var(--sea-ink)] no-underline shadow-lg"
          >
            离开
          </Link>
        </div>

        <div className="pointer-events-auto flex flex-col gap-2 sm:flex-row sm:items-end">
          <aside className="island-shell max-h-[40dvh] w-full overflow-auto rounded-2xl p-3 shadow-lg sm:max-w-xs">
            <p className="island-kicker m-0 mb-2">成员 ({peerList.length + 1}/4)</p>
            <ul className="m-0 list-none space-y-1.5 p-0 text-sm">
              <li className="flex items-center justify-between gap-2">
                <span className="font-medium text-[var(--sea-ink)]">{localName || name} (我)</span>
                <span className="text-xs text-[var(--lagoon-deep)]">在线</span>
              </li>
              {peerList.map((p) => (
                <li key={p.peerId} className="flex items-center justify-between gap-2">
                  <span className="truncate text-[var(--sea-ink)]">{p.meta.displayName}</span>
                  <span className="text-xs text-[var(--sea-ink-soft)]">
                    {p.linkState === 'connected'
                      ? 'P2P'
                      : p.linkState === 'disconnected'
                        ? '重连'
                        : p.linkState === 'failed'
                          ? '离线'
                          : '连接中'}
                  </span>
                </li>
              ))}
            </ul>
          </aside>

          {events.length > 0 && (
            <aside className="island-shell max-h-28 w-full overflow-auto rounded-2xl p-3 shadow-lg sm:max-w-sm">
              <p className="island-kicker m-0 mb-1">动态</p>
              <ul className="m-0 list-none space-y-1 p-0 text-xs text-[var(--sea-ink-soft)]">
                {events.slice(0, 5).map((e) => (
                  <li key={e.id}>{e.text}</li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      </div>

      <PerfDevPanel />
    </div>
  );
}
