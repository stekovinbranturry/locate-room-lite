import { createFileRoute, Link } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '#/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import MapView from '#/features/map/MapView';
import PerfDevPanel from '#/features/perf/PerfDevPanel';
import { useRoomStore } from '#/features/room/memberStore';
import { useRoomSession } from '#/features/room/useRoomSession';
import { getOrCreatePeerId, persistDisplayName, readStoredDisplayName } from '#/lib/config';

export const Route = createFileRoute('/room/$roomId')({
  component: RoomPage,
});

function RoomPage() {
  const { roomId } = Route.useParams();
  const [name, setName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [namePromptOpen, setNamePromptOpen] = useState(false);
  const [nameReady, setNameReady] = useState(false);

  useEffect(() => {
    const saved = readStoredDisplayName();
    if (saved) {
      setName(saved);
      setNameReady(true);
      return;
    }
    setNameInput('');
    setNamePromptOpen(true);
  }, []);

  const confirmName = useCallback(
    (event?: React.FormEvent) => {
      event?.preventDefault();
      const finalName = persistDisplayName(nameInput);
      setName(finalName);
      setNameInput(finalName);
      setNamePromptOpen(false);
      setNameReady(true);
    },
    [nameInput],
  );

  const peerId = useMemo(() => getOrCreatePeerId(roomId), [roomId]);

  useRoomSession({ roomId, peerId, displayName: name, enabled: nameReady });

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
    <div className="relative w-full overflow-hidden [-webkit-tap-highlight-color:transparent] max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-[calc(3.5rem+env(safe-area-inset-top,0px))] max-sm:h-auto max-sm:min-h-0 sm:h-[calc(100dvh-4rem-env(safe-area-inset-top,0px))] sm:min-h-[480px]">
      <MapView />

      <Dialog
        open={namePromptOpen}
        onOpenChange={(open) => {
          if (open || nameReady) setNamePromptOpen(open);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="gap-5 rounded-2xl border border-chip-line bg-surface-strong sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="text-sea-ink">加入房间</DialogTitle>
            <DialogDescription className="text-sea-ink-soft">
              请输入昵称后再进入房间；留空将自动生成。
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={confirmName}>
            <div className="grid gap-2">
              <Label htmlFor="room-display-name">昵称</Label>
              <Input
                id="room-display-name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="例如：小明"
                autoComplete="nickname"
                autoFocus
                className="rounded-xl border border-chip-line bg-white/70 text-sea-ink"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" asChild>
                <Link to="/">返回首页</Link>
              </Button>
              <Button type="submit">进入房间</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
        <div className="pointer-events-auto flex flex-wrap items-start gap-2">
          <div className="max-w-[min(100%,20rem)] rounded-2xl border border-line bg-[linear-gradient(165deg,var(--surface-strong),var(--surface))] px-4 py-3 shadow-[0_1px_0_var(--inset-glint)_inset,0_22px_44px_rgba(30,90,72,0.1),0_6px_18px_rgba(23,58,64,0.08)] shadow-lg backdrop-blur-sm">
            <p className="m-0 mb-1 text-[0.69rem] font-bold tracking-[0.16em] text-kicker uppercase">房间</p>
            <p className="m-0 truncate font-mono text-xs text-sea-ink-soft">{roomId}</p>
            <p className="mt-2 m-0 text-sm text-sea-ink">
              信令:{' '}
              <span className="font-semibold">
                {!nameReady
                  ? '等待昵称'
                  : connectionStatus === 'connected'
                    ? '已连接'
                    : connectionStatus === 'reconnecting'
                      ? '重连中…'
                      : '连接中…'}
              </span>
            </p>
          </div>

          <Button type="button" size="lg" onClick={() => void copyShareLink()} disabled={!nameReady}>
            复制分享链接
          </Button>

          <Button variant="outline" size="lg" asChild>
            <Link to="/">离开</Link>
          </Button>
        </div>

        <div className="pointer-events-auto flex flex-col gap-2 sm:flex-row sm:items-end">
          <aside className="max-h-[40dvh] w-full overflow-auto rounded-2xl border border-line bg-[linear-gradient(165deg,var(--surface-strong),var(--surface))] p-3 shadow-[0_1px_0_var(--inset-glint)_inset,0_22px_44px_rgba(30,90,72,0.1),0_6px_18px_rgba(23,58,64,0.08)] shadow-lg backdrop-blur-sm sm:max-w-xs">
            <p className="m-0 mb-2 text-[0.69rem] font-bold tracking-[0.16em] text-kicker uppercase">
              成员 ({peerList.length + (nameReady ? 1 : 0)}/4)
            </p>
            <ul className="m-0 list-none space-y-1.5 p-0 text-sm">
              {nameReady ? (
                <li className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sea-ink">{localName || name} (我)</span>
                  <span className="text-xs text-lagoon-deep">在线</span>
                </li>
              ) : null}
              {peerList.map((p) => (
                <li key={p.peerId} className="flex items-center justify-between gap-2">
                  <span className="truncate text-sea-ink">{p.meta.displayName}</span>
                  <span className="text-xs text-sea-ink-soft">
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
            <aside className="max-h-28 w-full overflow-auto rounded-2xl border border-line bg-[linear-gradient(165deg,var(--surface-strong),var(--surface))] p-3 shadow-[0_1px_0_var(--inset-glint)_inset,0_22px_44px_rgba(30,90,72,0.1),0_6px_18px_rgba(23,58,64,0.08)] shadow-lg backdrop-blur-sm sm:max-w-sm">
              <p className="m-0 mb-1 text-[0.69rem] font-bold tracking-[0.16em] text-kicker uppercase">动态</p>
              <ul className="m-0 list-none space-y-1 p-0 text-xs text-sea-ink-soft">
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
